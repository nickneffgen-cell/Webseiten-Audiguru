"""
Scan Orchestrator - koordiniert den gesamten Scan-Prozess
"""
import asyncio
import uuid
from datetime import datetime
from loguru import logger

from app.database import AsyncSessionLocal
from app.models.scan import Scan, ScanStatus, ScanFinding
from sqlalchemy import select


async def run_scan_task(scan_id: str):
    """Hauptfunktion die den kompletten Scan ausführt"""
    from app.scanner.crawler import WebsiteCrawler
    from app.scanner.gdpr_checker import GDPRChecker
    from app.scanner.ai_analyzer import AIAnalyzer

    async with AsyncSessionLocal() as db:
        try:
            # Load scan
            result = await db.execute(select(Scan).where(Scan.id == uuid.UUID(scan_id)))
            scan = result.scalar_one_or_none()
            if not scan:
                logger.error(f"Scan {scan_id} nicht gefunden")
                return

            # Update status
            scan.status = ScanStatus.RUNNING
            scan.started_at = datetime.utcnow()
            scan.progress = 5
            await db.commit()

            config = scan.scan_config or {}
            logger.info(f"Starte Scan: {scan.target_url}")

            # ─── 1. Crawl ────────────────────────────────────────
            scan.progress = 10
            await db.commit()

            crawler = WebsiteCrawler(
                max_pages=config.get("max_pages", 50),
                max_depth=config.get("max_depth", 3),
            )

            crawl_result = await crawler.crawl(scan.target_url)

            if crawl_result.error and not crawl_result.pages:
                scan.status = ScanStatus.FAILED
                scan.error_message = f"Crawling fehlgeschlagen: {crawl_result.error}"
                await db.commit()
                return

            scan.pages_scanned = len(crawl_result.pages)
            scan.cookies_found = len(crawl_result.all_cookies)
            scan.progress = 40
            await db.commit()

            # ─── 2. DSGVO-Checks ─────────────────────────────────
            from app.models.client import Client
            country = "DE"
            if scan.client_id:
                client_result = await db.execute(
                    select(Client).where(Client.id == scan.client_id)
                )
                client = client_result.scalar_one_or_none()
                if client:
                    country = client.company_country

            checker = GDPRChecker(
                country=country,
                strictness=config.get("strictness", "standard"),
            )
            check_results = checker.run_all_checks(crawl_result, config)

            scan.progress = 60
            await db.commit()

            # ─── 3. AI-Analyse ───────────────────────────────────
            analyzer = AIAnalyzer()

            # Get privacy policy text
            privacy_text = ""
            if crawl_result.privacy_policy_url:
                pp_page = next(
                    (p for p in crawl_result.pages if crawl_result.privacy_policy_url in p.url),
                    None
                )
                if pp_page:
                    privacy_text = pp_page.text_content

            language = config.get("report_language", "de")

            ai_analysis = await analyzer.analyze_privacy_policy(
                privacy_text, crawl_result, check_results, language, country
            )

            scan.progress = 80
            await db.commit()

            # ─── 4. Score berechnen ───────────────────────────────
            overall_score, score_breakdown = analyzer.calculate_score(check_results)

            # Count trackers
            from app.scanner.crawler import KNOWN_TRACKERS
            trackers_found = sum(
                1 for domain in crawl_result.all_external_domains
                if any(t in domain for t in KNOWN_TRACKERS.keys())
            )

            # ─── 5. Findings speichern ────────────────────────────
            for check in check_results:
                finding = ScanFinding(
                    scan_id=scan.id,
                    category=check.category,
                    check_id=check.check_id,
                    title=check.title,
                    description=check.description,
                    severity=check.severity,
                    law_reference=check.law_reference,
                    recommendation=check.recommendation,
                    affected_url=check.affected_url,
                    evidence=check.evidence,
                    is_included_in_report=True,
                )
                db.add(finding)

            # ─── 6. Scan abschließen ──────────────────────────────
            raw_data = {
                "pages": [{"url": p.url, "status": p.status_code, "title": p.title} for p in crawl_result.pages],
                "external_domains": list(crawl_result.all_external_domains),
                "privacy_policy_url": crawl_result.privacy_policy_url,
                "imprint_url": crawl_result.imprint_url,
                "ssl_valid": crawl_result.ssl_valid,
                "cookies": crawl_result.all_cookies[:50],  # Max 50 cookies in raw data
            }

            scan.status = ScanStatus.COMPLETED
            scan.completed_at = datetime.utcnow()
            scan.progress = 100
            scan.overall_score = overall_score
            scan.score_breakdown = score_breakdown
            scan.trackers_found = trackers_found
            scan.ai_analysis = ai_analysis
            scan.raw_data = raw_data
            scan.error_message = None

            await db.commit()
            logger.info(f"Scan {scan_id} abgeschlossen. Score: {overall_score}")

        except Exception as e:
            logger.exception(f"Scan {scan_id} fehlgeschlagen: {e}")
            async with AsyncSessionLocal() as err_db:
                err_result = await err_db.execute(select(Scan).where(Scan.id == uuid.UUID(scan_id)))
                err_scan = err_result.scalar_one_or_none()
                if err_scan:
                    err_scan.status = ScanStatus.FAILED
                    err_scan.error_message = str(e)
                    err_scan.completed_at = datetime.utcnow()
                    await err_db.commit()
