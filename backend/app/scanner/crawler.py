"""
Crawler: Besucht alle Unterseiten einer Website mit Playwright
Erkennt JavaScript-gerenderte Inhalte, Cookies, externe Ressourcen
"""
import asyncio
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin, urlparse
import re
from loguru import logger

try:
    from playwright.async_api import async_playwright, Page, BrowserContext, Cookie
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

import httpx
from bs4 import BeautifulSoup
import tldextract


@dataclass
class PageResult:
    url: str
    status_code: int
    title: str = ""
    html: str = ""
    text_content: str = ""
    cookies: list = field(default_factory=list)
    external_scripts: list = field(default_factory=list)
    external_iframes: list = field(default_factory=list)
    forms: list = field(default_factory=list)
    links: list = field(default_factory=list)
    meta_tags: dict = field(default_factory=dict)
    headers: dict = field(default_factory=dict)
    has_ssl: bool = False
    load_time_ms: int = 0
    error: Optional[str] = None


@dataclass
class CrawlResult:
    base_url: str
    pages: list[PageResult] = field(default_factory=list)
    all_cookies: list = field(default_factory=list)
    all_external_scripts: set = field(default_factory=set)
    all_external_domains: set = field(default_factory=set)
    ssl_valid: bool = False
    server_headers: dict = field(default_factory=dict)
    robots_txt: str = ""
    privacy_policy_url: Optional[str] = None
    imprint_url: Optional[str] = None
    error: Optional[str] = None


PRIVACY_POLICY_PATTERNS = [
    r"datenschutz", r"privacy.policy", r"privacy", r"datenschutzerkl",
    r"privacy-policy", r"data-protection", r"daten-schutz",
]

IMPRINT_PATTERNS = [
    r"impressum", r"imprint", r"legal.notice", r"about.legal",
    r"kontakt.*impressum",
]

COOKIE_CONSENT_PATTERNS = [
    "cookiebot", "onetrust", "usercentrics", "cookieconsent",
    "klaro", "cookiehub", "trustarc", "crownpeak", "didomi",
    "consentmanager", "borlabs", "real-cookie-banner",
]

KNOWN_TRACKERS = {
    "google-analytics.com": "Google Analytics",
    "googletagmanager.com": "Google Tag Manager",
    "google-tag-manager": "Google Tag Manager",
    "doubleclick.net": "Google DoubleClick (Werbung)",
    "facebook.com/tr": "Facebook Pixel",
    "connect.facebook.net": "Facebook SDK",
    "linkedin.com/px": "LinkedIn Insight Tag",
    "snap.licdn.com": "LinkedIn Insight Tag",
    "analytics.tiktok.com": "TikTok Pixel",
    "sc-static.net": "Snapchat Pixel",
    "hotjar.com": "Hotjar (Session Recording)",
    "clarity.ms": "Microsoft Clarity",
    "mouseflow.com": "Mouseflow",
    "fullstory.com": "FullStory",
    "crazyegg.com": "Crazy Egg",
    "hubspot.com": "HubSpot",
    "salesforce.com": "Salesforce",
    "marketo.com": "Marketo",
    "intercom.io": "Intercom",
    "fonts.googleapis.com": "Google Fonts (DSGVO-kritisch)",
    "fonts.gstatic.com": "Google Fonts CDN (DSGVO-kritisch)",
    "maps.googleapis.com": "Google Maps",
    "youtube.com/embed": "YouTube Embed",
    "vimeo.com": "Vimeo",
    "twitter.com": "Twitter/X Widget",
    "platform.twitter.com": "Twitter Widget",
    "instagram.com": "Instagram Widget",
    "cdn.jsdelivr.net": "jsDelivr CDN",
    "unpkg.com": "UNPKG CDN",
    "cloudflare.com": "Cloudflare",
    "nr-data.net": "New Relic",
    "sentry.io": "Sentry (Error Tracking)",
    "segment.com": "Segment Analytics",
    "mixpanel.com": "Mixpanel",
    "amplitude.com": "Amplitude Analytics",
}


class WebsiteCrawler:
    def __init__(self, max_pages: int = 50, max_depth: int = 3, timeout: int = 30):
        self.max_pages = max_pages
        self.max_depth = max_depth
        self.timeout = timeout
        self.visited_urls: set[str] = set()
        self.base_domain: str = ""

    def _normalize_url(self, url: str) -> str:
        parsed = urlparse(url)
        # Remove fragments
        return parsed._replace(fragment="").geturl()

    def _is_same_domain(self, url: str) -> bool:
        ext = tldextract.extract(url)
        base_ext = tldextract.extract(self.base_domain)
        return ext.registered_domain == base_ext.registered_domain

    def _is_crawlable(self, url: str) -> bool:
        parsed = urlparse(url)
        skip_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg',
                          '.css', '.js', '.woff', '.woff2', '.ttf', '.ico',
                          '.zip', '.tar', '.gz', '.mp4', '.mp3', '.avi'}
        path_lower = parsed.path.lower()
        return not any(path_lower.endswith(ext) for ext in skip_extensions)

    def _extract_links(self, html: str, base_url: str) -> list[str]:
        soup = BeautifulSoup(html, "lxml")
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
                continue
            full_url = urljoin(base_url, href)
            normalized = self._normalize_url(full_url)
            if self._is_same_domain(normalized) and self._is_crawlable(normalized):
                links.append(normalized)
        return list(set(links))

    def _extract_page_data(self, html: str, url: str, cookies: list, headers: dict) -> PageResult:
        soup = BeautifulSoup(html, "lxml")
        parsed_base = urlparse(url)
        base_domain = parsed_base.netloc

        # Title
        title = soup.title.string.strip() if soup.title and soup.title.string else ""

        # Text content
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text_content = " ".join(soup.get_text().split())

        # External scripts
        external_scripts = []
        for script in soup.find_all("script", src=True):
            src = script["src"]
            if src.startswith("//"):
                src = "https:" + src
            if src.startswith("http") and base_domain not in src:
                external_scripts.append(src)

        # External iframes
        external_iframes = []
        for iframe in soup.find_all("iframe", src=True):
            src = iframe["src"]
            if src.startswith("//"):
                src = "https:" + src
            if src.startswith("http") and base_domain not in src:
                external_iframes.append(src)

        # Forms
        forms = []
        for form in soup.find_all("form"):
            form_data = {
                "action": form.get("action", ""),
                "method": form.get("method", "GET").upper(),
                "has_privacy_hint": False,
                "fields": [],
            }
            # Check for privacy hint near form
            form_text = form.get_text().lower()
            if any(kw in form_text for kw in ["datenschutz", "privacy", "einwilligung", "consent"]):
                form_data["has_privacy_hint"] = True

            for inp in form.find_all(["input", "textarea", "select"]):
                inp_type = inp.get("type", "text")
                inp_name = inp.get("name", inp.get("id", ""))
                form_data["fields"].append({"type": inp_type, "name": inp_name})

            forms.append(form_data)

        # Meta tags
        meta_tags = {}
        for meta in soup.find_all("meta"):
            name = meta.get("name", meta.get("property", "")).lower()
            content = meta.get("content", "")
            if name:
                meta_tags[name] = content

        # Privacy & Imprint link detection
        links = self._extract_links(html, url)

        return PageResult(
            url=url,
            status_code=200,
            title=title,
            html=html,
            text_content=text_content[:10000],  # Limit
            cookies=cookies,
            external_scripts=external_scripts,
            external_iframes=external_iframes,
            forms=forms,
            links=links,
            meta_tags=meta_tags,
            headers=dict(headers),
            has_ssl=url.startswith("https://"),
        )

    def _detect_special_pages(self, links: list[str]) -> tuple[Optional[str], Optional[str]]:
        privacy_url = None
        imprint_url = None

        for link in links:
            link_lower = link.lower()
            if not privacy_url and any(re.search(p, link_lower) for p in PRIVACY_POLICY_PATTERNS):
                privacy_url = link
            if not imprint_url and any(re.search(p, link_lower) for p in IMPRINT_PATTERNS):
                imprint_url = link

        return privacy_url, imprint_url

    async def crawl(self, url: str) -> CrawlResult:
        if not url.startswith("http"):
            url = "https://" + url

        self.base_domain = url
        result = CrawlResult(base_url=url)

        if PLAYWRIGHT_AVAILABLE:
            result = await self._crawl_with_playwright(url)
        else:
            result = await self._crawl_with_httpx(url)

        return result

    async def _crawl_with_playwright(self, start_url: str) -> CrawlResult:
        result = CrawlResult(base_url=start_url)
        urls_to_visit = [(start_url, 0)]
        all_links = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
                viewport={"width": 1920, "height": 1080},
                locale="de-DE",
                ignore_https_errors=True,
            )

            while urls_to_visit and len(result.pages) < self.max_pages:
                current_url, depth = urls_to_visit.pop(0)
                normalized = self._normalize_url(current_url)

                if normalized in self.visited_urls:
                    continue
                self.visited_urls.add(normalized)

                try:
                    page = await context.new_page()
                    import time
                    start_time = time.time()

                    response = await page.goto(
                        current_url,
                        wait_until="domcontentloaded",
                        timeout=self.timeout * 1000,
                    )

                    # Wait a bit for JS to load
                    await asyncio.sleep(2)

                    load_time = int((time.time() - start_time) * 1000)
                    html = await page.content()
                    cookies = await context.cookies()

                    page_result = self._extract_page_data(
                        html,
                        current_url,
                        [{"name": c["name"], "domain": c["domain"], "httpOnly": c.get("httpOnly"), "secure": c.get("secure"), "sameSite": c.get("sameSite"), "expires": c.get("expires")} for c in cookies],
                        dict(response.headers) if response else {},
                    )
                    page_result.status_code = response.status if response else 0
                    page_result.load_time_ms = load_time

                    result.pages.append(page_result)
                    all_links.extend(page_result.links)

                    # Add new links to crawl
                    if depth < self.max_depth:
                        for link in page_result.links:
                            if link not in self.visited_urls:
                                urls_to_visit.append((link, depth + 1))

                    await page.close()

                except Exception as e:
                    logger.warning(f"Fehler beim Crawlen von {current_url}: {e}")
                    if not result.pages:  # First page failed
                        result.error = str(e)

            await browser.close()

        # Aggregate results
        self._aggregate_results(result)
        result.privacy_policy_url, result.imprint_url = self._detect_special_pages(all_links + [p.url for p in result.pages])

        return result

    async def _crawl_with_httpx(self, start_url: str) -> CrawlResult:
        """Fallback ohne Playwright"""
        result = CrawlResult(base_url=start_url)

        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=self.timeout,
            headers={"User-Agent": "Mozilla/5.0 Chrome/120.0.0.0"},
            verify=False,
        ) as client:
            urls_to_visit = [(start_url, 0)]

            while urls_to_visit and len(result.pages) < self.max_pages:
                current_url, depth = urls_to_visit.pop(0)
                normalized = self._normalize_url(current_url)

                if normalized in self.visited_urls:
                    continue
                self.visited_urls.add(normalized)

                try:
                    response = await client.get(current_url)
                    html = response.text

                    page_result = self._extract_page_data(
                        html, current_url, [], dict(response.headers)
                    )
                    page_result.status_code = response.status_code
                    result.pages.append(page_result)

                    if depth < self.max_depth:
                        for link in page_result.links:
                            if link not in self.visited_urls:
                                urls_to_visit.append((link, depth + 1))

                except Exception as e:
                    logger.warning(f"Fehler: {current_url}: {e}")

        self._aggregate_results(result)
        all_links = [link for p in result.pages for link in p.links]
        result.privacy_policy_url, result.imprint_url = self._detect_special_pages(all_links)
        return result

    def _aggregate_results(self, result: CrawlResult):
        all_cookies = []
        all_scripts = set()

        for page in result.pages:
            for cookie in page.cookies:
                if cookie not in all_cookies:
                    all_cookies.append(cookie)

            for script in page.external_scripts:
                all_scripts.add(script)
                domain = urlparse(script).netloc
                if domain:
                    result.all_external_domains.add(domain)

            for iframe in page.external_iframes:
                domain = urlparse(iframe).netloc
                if domain:
                    result.all_external_domains.add(domain)

        result.all_cookies = all_cookies
        result.all_external_scripts = all_scripts
        result.ssl_valid = all(p.has_ssl for p in result.pages if p.url.startswith("http"))

        if result.pages and result.pages[0].headers:
            result.server_headers = result.pages[0].headers
