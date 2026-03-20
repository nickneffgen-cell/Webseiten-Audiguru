"""
Claude AI Analyzer - nutzt Claude API für tiefgehende DSGVO-Textanalyse
"""
import anthropic
from typing import Optional
from loguru import logger
from app.core.config import settings
from app.scanner.crawler import CrawlResult
from app.scanner.gdpr_checker import CheckResult


class AIAnalyzer:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL

    async def analyze_privacy_policy(
        self,
        privacy_text: str,
        crawl_result: CrawlResult,
        findings: list[CheckResult],
        language: str = "de",
        country: str = "DE",
    ) -> str:
        """Analyse der Datenschutzerklärung mit Claude"""
        if not settings.ANTHROPIC_API_KEY:
            return self._get_fallback_analysis(findings, language)

        severity_summary = {}
        for f in findings:
            severity_summary[f.severity] = severity_summary.get(f.severity, 0) + 1

        findings_text = "\n".join([
            f"[{f.severity.upper()}] {f.title}: {f.description}"
            for f in findings if f.severity in ("critical", "high")
        ])

        if language == "de":
            prompt = f"""Du bist ein DSGVO-Experte und Datenschutzjurist. Analysiere die folgende Website auf DSGVO-Konformität.

Website: {crawl_result.base_url}
Land des Unternehmens: {country}
Gescannte Seiten: {len(crawl_result.pages)}
Gefundene Cookies: {len(crawl_result.all_cookies)}
Externe Domains: {len(crawl_result.all_external_domains)}

Kritische und schwerwiegende Befunde:
{findings_text}

Datenschutzerklärungstext (Auszug):
{privacy_text[:3000] if privacy_text else "Keine Datenschutzerklärung gefunden."}

Bitte erstelle eine strukturierte Zusammenfassung mit:
1. Gesamtbewertung (1-2 Sätze)
2. Wichtigste Risiken
3. Dringlichste Handlungsempfehlungen
4. Rechtliche Risikoeinschätzung (Bußgeldpotential)
5. Positive Aspekte (falls vorhanden)

Halte die Antwort professionell, präzise und für Nicht-Juristen verständlich. Maximal 400 Wörter."""
        else:
            prompt = f"""You are a GDPR expert and data protection attorney. Analyze the following website for GDPR compliance.

Website: {crawl_result.base_url}
Company country: {country}
Pages scanned: {len(crawl_result.pages)}
Cookies found: {len(crawl_result.all_cookies)}
External domains: {len(crawl_result.all_external_domains)}

Critical and high severity findings:
{findings_text}

Privacy policy text (excerpt):
{privacy_text[:3000] if privacy_text else "No privacy policy found."}

Please provide a structured summary with:
1. Overall assessment (1-2 sentences)
2. Key risks
3. Most urgent recommendations
4. Legal risk assessment (fine potential)
5. Positive aspects (if any)

Keep the response professional, precise and understandable for non-lawyers. Maximum 400 words."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"Claude API Fehler: {e}")
            return self._get_fallback_analysis(findings, language)

    async def generate_recommendations(
        self,
        findings: list[CheckResult],
        website_url: str,
        language: str = "de",
    ) -> str:
        """Generiere konkrete Handlungsempfehlungen mit Priorität"""
        if not settings.ANTHROPIC_API_KEY:
            return ""

        critical_findings = [f for f in findings if f.severity in ("critical", "high")]
        if not critical_findings:
            return ""

        findings_text = "\n".join([
            f"- [{f.severity.upper()}] {f.title}: {f.recommendation or f.description}"
            for f in critical_findings[:10]
        ])

        if language == "de":
            prompt = f"""Du bist ein DSGVO-Berater. Erstelle einen konkreten Aktionsplan für {website_url}.

Befunde:
{findings_text}

Erstelle einen priorisierten Maßnahmenplan:
1. SOFORT (innerhalb 24h)
2. KURZFRISTIG (innerhalb 1 Woche)
3. MITTELFRISTIG (innerhalb 1 Monat)

Sei konkret und praktisch. Maximal 300 Wörter."""
        else:
            prompt = f"""You are a GDPR consultant. Create a concrete action plan for {website_url}.

Findings:
{findings_text}

Create a prioritized action plan:
1. IMMEDIATE (within 24h)
2. SHORT-TERM (within 1 week)
3. MID-TERM (within 1 month)

Be concrete and practical. Maximum 300 words."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"Claude API Fehler: {e}")
            return ""

    def calculate_score(self, findings: list[CheckResult]) -> tuple[float, dict]:
        """Berechne Gesamt-Score und Kategorie-Scores"""
        weights = {
            "critical": -25,
            "high": -10,
            "medium": -5,
            "low": -2,
            "info": 0,
        }

        base_score = 100.0
        deductions = sum(weights.get(f.severity, 0) for f in findings if not f.passed)
        score = max(0.0, min(100.0, base_score + deductions))

        # Category breakdown
        categories = {}
        for f in findings:
            cat = f.category
            if cat not in categories:
                categories[cat] = {"score": 100, "findings": 0, "passed": 0}

            if f.passed:
                categories[cat]["passed"] += 1
            else:
                categories[cat]["findings"] += 1
                categories[cat]["score"] += weights.get(f.severity, 0)
                categories[cat]["score"] = max(0, categories[cat]["score"])

        return round(score, 1), categories

    def _get_fallback_analysis(self, findings: list[CheckResult], language: str) -> str:
        critical = sum(1 for f in findings if f.severity == "critical" and not f.passed)
        high = sum(1 for f in findings if f.severity == "high" and not f.passed)

        if language == "de":
            return f"""**KI-Analyse nicht verfügbar** (kein API-Key konfiguriert)

Automatische Auswertung:
- Kritische Befunde: {critical}
- Schwerwiegende Befunde: {high}

Bitte konfigurieren Sie den Anthropic Claude API-Key für detaillierte KI-Analysen."""
        else:
            return f"""**AI Analysis not available** (no API key configured)

Automated assessment:
- Critical findings: {critical}
- High severity findings: {high}

Please configure the Anthropic Claude API key for detailed AI analysis."""
