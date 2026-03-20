"""
DSGVO/BDSG Compliance Checker
Prüft auf alle relevanten DSGVO-Anforderungen, BDSG, TTDSG, ePrivacy
"""
import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

from app.scanner.crawler import CrawlResult, KNOWN_TRACKERS, COOKIE_CONSENT_PATTERNS


@dataclass
class CheckResult:
    check_id: str
    category: str
    title: str
    description: str
    severity: str  # critical, high, medium, low, info
    law_reference: Optional[str] = None
    recommendation: Optional[str] = None
    affected_url: Optional[str] = None
    evidence: Optional[dict] = None
    passed: bool = False


# Country-specific additional laws
COUNTRY_LAWS = {
    "DE": ["BDSG", "TTDSG", "TMG/DDG"],
    "AT": ["DSG (Österreich)"],
    "CH": ["revDSG (Schweiz)"],
    "FR": ["CNIL", "Loi Informatique et Libertés"],
    "NL": ["Autoriteit Persoonsgegevens"],
    "BE": ["APD (Belgien)"],
    "PL": ["UODO (Polen)"],
    "IT": ["Garante (Italien)"],
    "ES": ["LOPDGDD (Spanien)", "AEPD"],
    "SE": ["IMY (Schweden)"],
    "DK": ["Datatilsynet (Dänemark)"],
    "FI": ["Tietosuojavaltuutettu (Finnland)"],
    "PT": ["CNPD (Portugal)"],
    "IE": ["DPC (Irland)"],
    "LU": ["CNPD (Luxemburg)"],
}


class GDPRChecker:
    def __init__(self, country: str = "DE", strictness: str = "standard"):
        self.country = country
        self.strictness = strictness  # lenient, standard, strict
        self.findings: list[CheckResult] = []

    def run_all_checks(self, crawl_result: CrawlResult, config: dict) -> list[CheckResult]:
        self.findings = []

        if config.get("check_ssl", True):
            self._check_ssl(crawl_result)

        if config.get("check_imprint", True):
            self._check_imprint(crawl_result)

        if config.get("check_privacy_policy", True):
            self._check_privacy_policy(crawl_result)

        if config.get("check_cookies", True):
            self._check_cookies(crawl_result)

        if config.get("check_consent_management", True):
            self._check_consent_management(crawl_result)

        if config.get("check_trackers", True):
            self._check_trackers(crawl_result)

        if config.get("check_google_fonts", True):
            self._check_google_fonts(crawl_result)

        if config.get("check_external_scripts", True):
            self._check_external_scripts(crawl_result)

        if config.get("check_contact_forms", True):
            self._check_contact_forms(crawl_result)

        if config.get("check_newsletter", True):
            self._check_newsletter(crawl_result)

        if config.get("check_social_media", True):
            self._check_social_media(crawl_result)

        self._check_security_headers(crawl_result)
        self._check_country_specific(crawl_result)

        return self.findings

    def _add_finding(self, **kwargs):
        self.findings.append(CheckResult(**kwargs))

    # ─── SSL / HTTPS ─────────────────────────────────────────────
    def _check_ssl(self, cr: CrawlResult):
        if not cr.ssl_valid:
            self._add_finding(
                check_id="SSL_001",
                category="ssl",
                title="Keine HTTPS-Verschlüsselung",
                description="Die Website verwendet keine SSL/TLS-Verschlüsselung (HTTPS). Dies gefährdet die Übertragung personenbezogener Daten.",
                severity="critical",
                law_reference="Art. 32 DSGVO, Art. 5 Abs. 1 lit. f DSGVO",
                recommendation="Installieren Sie ein SSL-Zertifikat und aktivieren Sie HTTPS. Leiten Sie alle HTTP-Anfragen auf HTTPS weiter. Let's Encrypt bietet kostenlose Zertifikate an.",
                passed=False,
            )
        else:
            self._add_finding(
                check_id="SSL_001",
                category="ssl",
                title="HTTPS-Verschlüsselung vorhanden",
                description="Die Website verwendet HTTPS-Verschlüsselung.",
                severity="info",
                passed=True,
            )

        # Check HSTS header
        hsts = cr.server_headers.get("strict-transport-security", "")
        if not hsts and cr.ssl_valid:
            self._add_finding(
                check_id="SSL_002",
                category="ssl",
                title="HSTS-Header fehlt",
                description="Der HTTP Strict Transport Security (HSTS) Header ist nicht gesetzt. Dies kann HTTPS-Downgrade-Angriffe ermöglichen.",
                severity="medium",
                law_reference="Art. 32 DSGVO",
                recommendation="Setzen Sie den HSTS-Header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
                passed=False,
            )

    # ─── IMPRESSUM ────────────────────────────────────────────────
    def _check_imprint(self, cr: CrawlResult):
        if not cr.imprint_url:
            self._add_finding(
                check_id="IMPRINT_001",
                category="imprint",
                title="Kein Impressum gefunden",
                description="Es wurde kein Impressum auf der Website gefunden. Das Impressum ist gesetzlich vorgeschrieben.",
                severity="critical",
                law_reference="§ 5 DDG (früher TMG), Art. 13 DSGVO",
                recommendation="Erstellen Sie eine Impressums-Seite mit vollständigen Angaben: Name, Adresse, Kontakt, Verantwortlicher. Verlinken Sie das Impressum auf jeder Seite.",
                passed=False,
            )
        else:
            # Check imprint content
            imprint_page = next(
                (p for p in cr.pages if cr.imprint_url and cr.imprint_url in p.url), None
            )
            if imprint_page:
                text = imprint_page.text_content.lower()
                missing_elements = []

                if not any(kw in text for kw in ["gmbh", "ag", "kg", "e.k.", "gbr", "inhaber", "unternehmen"]):
                    missing_elements.append("Rechtsform / Unternehmensbezeichnung")
                if not re.search(r'\d{5}', text):  # PLZ
                    missing_elements.append("Postleitzahl / vollständige Adresse")
                if not any(kw in text for kw in ["telefon", "tel.", "phone", "@"]):
                    missing_elements.append("Kontaktdaten (Telefon/E-Mail)")

                if missing_elements:
                    self._add_finding(
                        check_id="IMPRINT_002",
                        category="imprint",
                        title="Impressum unvollständig",
                        description=f"Das Impressum scheint unvollständig zu sein. Möglicherweise fehlende Angaben: {', '.join(missing_elements)}",
                        severity="high",
                        law_reference="§ 5 DDG",
                        recommendation="Stellen Sie sicher, dass folgende Angaben im Impressum enthalten sind: vollständiger Name/Firma, Adresse, Vertretungsberechtigte, Kontaktdaten (E-Mail, Telefon), Handelsregisternummer (falls vorhanden), USt-IdNr.",
                        affected_url=cr.imprint_url,
                        passed=False,
                    )
                else:
                    self._add_finding(
                        check_id="IMPRINT_001",
                        category="imprint",
                        title="Impressum vorhanden und vollständig",
                        description="Ein Impressum wurde gefunden und enthält die wesentlichen Pflichtangaben.",
                        severity="info",
                        affected_url=cr.imprint_url,
                        passed=True,
                    )

    # ─── DATENSCHUTZERKLÄRUNG ────────────────────────────────────
    def _check_privacy_policy(self, cr: CrawlResult):
        if not cr.privacy_policy_url:
            self._add_finding(
                check_id="PP_001",
                category="privacy_policy",
                title="Keine Datenschutzerklärung gefunden",
                description="Auf der Website wurde keine Datenschutzerklärung gefunden. Dies ist ein schwerwiegender DSGVO-Verstoß.",
                severity="critical",
                law_reference="Art. 13, 14 DSGVO",
                recommendation="Erstellen Sie eine umfassende Datenschutzerklärung gemäß Art. 13/14 DSGVO. Diese muss auf jeder Seite erreichbar sein.",
                passed=False,
            )
            return

        pp_page = next(
            (p for p in cr.pages if cr.privacy_policy_url and cr.privacy_policy_url in p.url), None
        )
        if not pp_page:
            return

        text = pp_page.text_content.lower()
        missing = []

        # Art. 13 DSGVO required elements
        checks = {
            "Verantwortlicher (Name/Adresse)": ["verantwortliche", "verantwortlicher", "controller"],
            "Datenschutzbeauftragter": ["datenschutzbeauftragter", "dsb", "data protection officer", "dpo"],
            "Verarbeitungszwecke (Art. 13 Abs. 1c)": ["zweck", "purpose", "zwecke der verarbeitung"],
            "Rechtsgrundlage (Art. 6 DSGVO)": ["art. 6", "rechtsgrundlage", "legal basis", "berechtigte interessen"],
            "Empfänger / Dritte": ["empfänger", "dritte", "recipient", "weitergabe"],
            "Drittlandübermittlung": ["drittland", "usa", "third country", "standard contractual"],
            "Speicherdauer": ["speicherdauer", "löschung", "aufbewahrung", "retention"],
            "Betroffenenrechte": ["widerspruchsrecht", "auskunftsrecht", "löschungsrecht", "berichtigung"],
            "Beschwerderecht (Art. 77)": ["beschwerde", "aufsichtsbehörde", "supervisory authority", "datenschutzbehörde"],
            "Widerrufsrecht (Art. 7 Abs. 3)": ["widerrufen", "widerruf", "einwilligung.*widerrufen"],
        }

        for element, keywords in checks.items():
            if not any(re.search(kw, text) for kw in keywords):
                missing.append(element)

        if missing:
            severity = "critical" if len(missing) > 5 else ("high" if len(missing) > 2 else "medium")
            self._add_finding(
                check_id="PP_002",
                category="privacy_policy",
                title=f"Datenschutzerklärung unvollständig ({len(missing)} Punkte fehlen)",
                description=f"Die Datenschutzerklärung enthält nicht alle Pflichtinformationen nach Art. 13/14 DSGVO. Fehlende Elemente: {', '.join(missing)}",
                severity=severity,
                law_reference="Art. 13, 14 DSGVO",
                recommendation="Ergänzen Sie die Datenschutzerklärung um die fehlenden Elemente. Nutzen Sie einen DSGVO-konformen Datenschutzgenerator und lassen Sie den Text rechtlich prüfen.",
                affected_url=cr.privacy_policy_url,
                evidence={"missing_elements": missing},
                passed=False,
            )
        else:
            self._add_finding(
                check_id="PP_001",
                category="privacy_policy",
                title="Datenschutzerklärung vollständig",
                description="Die Datenschutzerklärung enthält alle wesentlichen Pflichtinformationen nach Art. 13/14 DSGVO.",
                severity="info",
                affected_url=cr.privacy_policy_url,
                passed=True,
            )

    # ─── COOKIES ─────────────────────────────────────────────────
    def _check_cookies(self, cr: CrawlResult):
        if not cr.all_cookies:
            self._add_finding(
                check_id="COOKIE_001",
                category="cookies",
                title="Keine Cookies gefunden",
                description="Es wurden keine Cookies gesetzt.",
                severity="info",
                passed=True,
            )
            return

        tracking_cookies = []
        session_cookies = []
        third_party_cookies = []
        long_lived_cookies = []

        base_domain = urlparse(cr.base_url).netloc.replace("www.", "")

        TRACKING_COOKIE_NAMES = [
            "_ga", "_gid", "_gat", "_fbp", "_fbc", "fbclid",
            "__utma", "__utmb", "__utmc", "__utmz",
            "_gcl_au", "AMP_TOKEN", "_dc_gtm",
            "IDE", "DSID", "FLC", "AID",
            "UID", "uuid", "visitor_id",
        ]

        for cookie in cr.all_cookies:
            name = cookie.get("name", "")
            domain = cookie.get("domain", "").lstrip(".")
            expires = cookie.get("expires", -1)
            http_only = cookie.get("httpOnly", False)
            secure = cookie.get("secure", False)

            # Tracking cookie check
            if any(name.startswith(tc) for tc in TRACKING_COOKIE_NAMES):
                tracking_cookies.append(cookie)

            # Third party
            if domain and base_domain not in domain:
                third_party_cookies.append(cookie)

            # Long-lived (> 1 year)
            if expires and expires > 0:
                from datetime import datetime
                try:
                    exp_date = datetime.fromtimestamp(expires)
                    if (exp_date - datetime.now()).days > 365:
                        long_lived_cookies.append({**cookie, "days": (exp_date - datetime.now()).days})
                except Exception:
                    pass

        if tracking_cookies:
            self._add_finding(
                check_id="COOKIE_002",
                category="cookies",
                title=f"Tracking-Cookies gefunden ({len(tracking_cookies)} Stück)",
                description=f"Es wurden {len(tracking_cookies)} Tracking-/Analytics-Cookies gefunden, die eine Einwilligung gemäß § 25 TTDSG erfordern: {', '.join(c['name'] for c in tracking_cookies[:5])}",
                severity="critical",
                law_reference="§ 25 TTDSG, Art. 6 Abs. 1 lit. a DSGVO",
                recommendation="Implementieren Sie ein Cookie-Consent-Management-System (CMP). Setzen Sie Tracking-Cookies erst nach aktiver Einwilligung des Nutzers. Dokumentieren Sie alle Cookie-Zwecke in der Datenschutzerklärung.",
                evidence={"tracking_cookies": [c["name"] for c in tracking_cookies]},
                passed=False,
            )

        if third_party_cookies:
            self._add_finding(
                check_id="COOKIE_003",
                category="cookies",
                title=f"Drittanbieter-Cookies ({len(third_party_cookies)} Stück)",
                description=f"Es wurden Cookies von Drittanbietern gefunden: {', '.join(set(c.get('domain', '') for c in third_party_cookies))}",
                severity="high",
                law_reference="§ 25 TTDSG, Art. 6, 44ff DSGVO",
                recommendation="Überprüfen Sie alle Drittanbieter-Cookies. Falls diese für Analyse, Werbung oder Tracking verwendet werden, ist eine explizite Einwilligung erforderlich. Prüfen Sie die Datenübertragung in Drittländer (z.B. USA).",
                evidence={"third_party_domains": list(set(c.get("domain", "") for c in third_party_cookies))},
                passed=False,
            )

        if long_lived_cookies:
            self._add_finding(
                check_id="COOKIE_004",
                category="cookies",
                title=f"Langlebige Cookies ({len(long_lived_cookies)} Stück)",
                description=f"Es wurden Cookies mit einer Laufzeit von mehr als 1 Jahr gefunden.",
                severity="medium" if self.strictness == "strict" else "low",
                law_reference="Erwägungsgrund 32 DSGVO, § 25 TTDSG",
                recommendation="Überprüfen Sie, ob die langen Cookie-Laufzeiten notwendig sind. Reduzieren Sie die Lebensdauer auf das notwendige Minimum.",
                evidence={"long_lived_cookies": [{k: v for k, v in c.items() if k in ["name", "domain", "days"]} for c in long_lived_cookies]},
                passed=False,
            )

        # Cookie security flags
        insecure_cookies = [c for c in cr.all_cookies if not c.get("secure") and cr.ssl_valid]
        if insecure_cookies and self.strictness in ("standard", "strict"):
            self._add_finding(
                check_id="COOKIE_005",
                category="cookies",
                title=f"Cookies ohne Secure-Flag ({len(insecure_cookies)} Stück)",
                description="Cookies werden ohne das Secure-Flag gesetzt, obwohl HTTPS verfügbar ist.",
                severity="medium",
                law_reference="Art. 32 DSGVO",
                recommendation="Setzen Sie das Secure-Flag für alle Cookies: Set-Cookie: name=value; Secure; HttpOnly; SameSite=Lax",
                evidence={"insecure_cookies": [c.get("name") for c in insecure_cookies[:10]]},
                passed=False,
            )

    # ─── CONSENT MANAGEMENT ──────────────────────────────────────
    def _check_consent_management(self, cr: CrawlResult):
        has_cmp = False
        cmp_name = None

        for page in cr.pages[:3]:  # Check first 3 pages
            html_lower = page.html.lower()
            for pattern in COOKIE_CONSENT_PATTERNS:
                if pattern in html_lower:
                    has_cmp = True
                    cmp_name = pattern.title()
                    break

        has_tracking = any(
            any(tracker in script for tracker in KNOWN_TRACKERS.keys())
            for script in cr.all_external_scripts
        )

        if has_tracking and not has_cmp:
            self._add_finding(
                check_id="CMP_001",
                category="consent_management",
                title="Kein Cookie-Consent-Management-System gefunden",
                description="Es wurden Tracking-/Analyse-Scripts gefunden, aber kein Cookie-Consent-Banner oder CMP-System. Nutzer können keine informierte Einwilligung geben.",
                severity="critical",
                law_reference="§ 25 TTDSG, Art. 6 Abs. 1 lit. a DSGVO, EuGH Planet49-Urteil",
                recommendation="Implementieren Sie ein Cookie-Consent-Management-System (z.B. Cookiebot, Usercentrics, Borlabs Cookie). Der Banner muss vor dem Setzen nicht-essentieller Cookies erscheinen.",
                passed=False,
            )
        elif has_cmp:
            self._add_finding(
                check_id="CMP_001",
                category="consent_management",
                title=f"Cookie-Consent-System erkannt: {cmp_name}",
                description=f"Ein Cookie-Consent-Management-System ({cmp_name}) wurde erkannt.",
                severity="info",
                passed=True,
            )

            # Check if cookies are set before consent
            if cr.all_cookies:
                tracking_before_consent = [
                    c for c in cr.all_cookies
                    if any(c.get("name", "").startswith(tc) for tc in ["_ga", "_gid", "_fbp"])
                ]
                if tracking_before_consent:
                    self._add_finding(
                        check_id="CMP_002",
                        category="consent_management",
                        title="Tracking-Cookies vor Einwilligung gesetzt",
                        description=f"Tracking-Cookies werden möglicherweise vor der Nutzereinwilligung gesetzt: {', '.join(c['name'] for c in tracking_before_consent)}. Dies verstößt gegen das Einwilligungserfordernis.",
                        severity="critical",
                        law_reference="§ 25 Abs. 1 TTDSG, Art. 6 Abs. 1 lit. a DSGVO",
                        recommendation="Konfigurieren Sie Ihr CMP so, dass Tracking-Scripts erst nach aktiver Einwilligung geladen werden. Prüfen Sie die CMP-Konfiguration auf Vorabeinwilligungen ('Consent by scroll' etc.).",
                        evidence={"cookies": [c["name"] for c in tracking_before_consent]},
                        passed=False,
                    )

    # ─── TRACKER ─────────────────────────────────────────────────
    def _check_trackers(self, cr: CrawlResult):
        found_trackers = {}

        for script_url in cr.all_external_scripts:
            for tracker_pattern, tracker_name in KNOWN_TRACKERS.items():
                if tracker_pattern in script_url:
                    found_trackers[tracker_name] = script_url
                    break

        for domain in cr.all_external_domains:
            for tracker_pattern, tracker_name in KNOWN_TRACKERS.items():
                if tracker_pattern in domain:
                    if tracker_name not in found_trackers:
                        found_trackers[tracker_name] = domain

        if found_trackers:
            # Separate critical trackers
            critical = {k: v for k, v in found_trackers.items() if "Google Analytics" in k or "Facebook" in k or "TikTok" in k}
            other = {k: v for k, v in found_trackers.items() if k not in critical}

            if critical:
                self._add_finding(
                    check_id="TRACKER_001",
                    category="trackers",
                    title=f"Kritische Tracking-Dienste gefunden ({len(critical)} Dienste)",
                    description=f"Folgende Tracking-Dienste wurden gefunden: {', '.join(critical.keys())}. Diese übertragen Daten an Dritte, teils in die USA.",
                    severity="critical",
                    law_reference="Art. 6, 44ff DSGVO, § 25 TTDSG, EuGH Schrems II",
                    recommendation="1. Holen Sie explizite Einwilligung vor der Aktivierung ein. 2. Prüfen Sie Drittlandübertragungen (USA-Transfer, Standardvertragsklauseln). 3. Dokumentieren Sie alle Tracker in der Datenschutzerklärung. 4. Erwägen Sie datenschutzfreundliche Alternativen (z.B. Matomo statt Google Analytics).",
                    evidence={"trackers": list(critical.keys())},
                    passed=False,
                )

            if other:
                self._add_finding(
                    check_id="TRACKER_002",
                    category="trackers",
                    title=f"Weitere externe Dienste gefunden ({len(other)} Dienste)",
                    description=f"Weitere externe Dienste: {', '.join(other.keys())}",
                    severity="medium",
                    law_reference="Art. 13, 28 DSGVO",
                    recommendation="Prüfen Sie alle externen Dienste auf Datenschutzkonformität. Schließen Sie Auftragsverarbeitungsverträge (AVV) ab. Informieren Sie in der Datenschutzerklärung.",
                    evidence={"trackers": list(other.keys())},
                    passed=False,
                )
        else:
            self._add_finding(
                check_id="TRACKER_001",
                category="trackers",
                title="Keine bekannten Tracking-Dienste gefunden",
                description="Es wurden keine bekannten Tracking-Dienste gefunden.",
                severity="info",
                passed=True,
            )

    # ─── GOOGLE FONTS ────────────────────────────────────────────
    def _check_google_fonts(self, cr: CrawlResult):
        google_fonts_pages = []
        for page in cr.pages:
            if "fonts.googleapis.com" in page.html or "fonts.gstatic.com" in page.html:
                google_fonts_pages.append(page.url)

        if google_fonts_pages:
            self._add_finding(
                check_id="GF_001",
                category="google_fonts",
                title="Google Fonts (externe Einbindung) gefunden",
                description=f"Google Fonts wird direkt von Google-Servern geladen. Dabei wird die IP-Adresse des Nutzers an Google (USA) übermittelt. Betroffen: {', '.join(google_fonts_pages[:3])}",
                severity="high",
                law_reference="Art. 6 Abs. 1, Art. 44 DSGVO, LG München I Az. 3 O 17493/20",
                recommendation="Laden Sie Google Fonts lokal herunter und hosten Sie diese selbst. Tool: https://gwfh.mranftl.com/ - Oder nutzen Sie system fonts.",
                evidence={"affected_pages": google_fonts_pages},
                passed=False,
            )

    # ─── EXTERNAL SCRIPTS ────────────────────────────────────────
    def _check_external_scripts(self, cr: CrawlResult):
        sri_missing = []
        for page in cr.pages:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(page.html, "lxml")
            for script in soup.find_all("script", src=True):
                src = script.get("src", "")
                if src.startswith("http") and urlparse(src).netloc != urlparse(page.url).netloc:
                    if not script.get("integrity"):
                        sri_missing.append(src)

        if sri_missing and self.strictness == "strict":
            self._add_finding(
                check_id="SCRIPT_001",
                category="external_scripts",
                title=f"Externe Scripts ohne Subresource Integrity ({len(sri_missing[:5])} Skripte)",
                description="Externe JavaScript-Dateien werden ohne Integritätsprüfung eingebunden.",
                severity="low",
                law_reference="Art. 32 DSGVO",
                recommendation="Fügen Sie das integrity-Attribut zu externen Script-Tags hinzu: <script src='...' integrity='sha384-...' crossorigin='anonymous'>",
                evidence={"scripts": sri_missing[:5]},
                passed=False,
            )

    # ─── KONTAKTFORMULARE ─────────────────────────────────────────
    def _check_contact_forms(self, cr: CrawlResult):
        forms_without_privacy = []
        for page in cr.pages:
            for form in page.forms:
                has_email_field = any(
                    f.get("type") == "email" or "mail" in f.get("name", "").lower()
                    for f in form.get("fields", [])
                )
                if has_email_field and not form.get("has_privacy_hint"):
                    forms_without_privacy.append(page.url)
                    break

        if forms_without_privacy:
            self._add_finding(
                check_id="FORM_001",
                category="contact_forms",
                title="Kontaktformulare ohne Datenschutzhinweis",
                description=f"Es wurden Kontakt-/E-Mail-Formulare ohne Hinweis auf die Datenverarbeitung gefunden. Betroffen: {', '.join(forms_without_privacy[:3])}",
                severity="high",
                law_reference="Art. 13 DSGVO",
                recommendation="Fügen Sie bei jedem Formular einen Datenschutzhinweis hinzu. Minimum: Hinweis auf die Verarbeitung der Daten, Verlinkung der Datenschutzerklärung, ggf. Checkbox für Einwilligung.",
                evidence={"affected_pages": forms_without_privacy},
                passed=False,
            )

    # ─── NEWSLETTER ──────────────────────────────────────────────
    def _check_newsletter(self, cr: CrawlResult):
        newsletter_pages = []
        for page in cr.pages:
            text_lower = page.text_content.lower()
            html_lower = page.html.lower()
            if any(kw in text_lower for kw in ["newsletter", "e-mail-benachrichtigung", "email alert"]):
                # Check for double opt-in indication
                has_doi = any(kw in html_lower for kw in ["double opt-in", "bestätigungs-e-mail", "confirmation email", "doi"])
                if not has_doi:
                    newsletter_pages.append(page.url)

        if newsletter_pages:
            self._add_finding(
                check_id="NEWSLETTER_001",
                category="newsletter",
                title="Newsletter ohne Double-Opt-In-Hinweis",
                description=f"Es wurden Newsletter-Anmeldeformulare ohne erkennbares Double-Opt-In-Verfahren gefunden.",
                severity="medium",
                law_reference="Art. 6 Abs. 1 lit. a, Art. 7 DSGVO, § 7 UWG",
                recommendation="Implementieren Sie das Double-Opt-In-Verfahren für alle Newsletter-Anmeldungen. Speichern Sie Einwilligungen dokumentiert (Zeitstempel, IP-Adresse).",
                evidence={"affected_pages": newsletter_pages[:3]},
                passed=False,
            )

    # ─── SOCIAL MEDIA ────────────────────────────────────────────
    def _check_social_media(self, cr: CrawlResult):
        social_found = {}
        patterns = {
            "Facebook": ["facebook.com", "fb.com"],
            "Twitter/X": ["twitter.com", "platform.twitter.com", "x.com"],
            "Instagram": ["instagram.com"],
            "LinkedIn": ["linkedin.com/in", "linkedin.com/company"],
            "YouTube": ["youtube.com/embed"],
            "TikTok": ["tiktok.com"],
        }

        for page in cr.pages:
            for platform, urls in patterns.items():
                if any(u in page.html for u in urls):
                    if platform not in social_found:
                        social_found[platform] = page.url

        if social_found:
            uses_two_click = any(
                "shariff" in page.html.lower() or "two-click" in page.html.lower() or "2-click" in page.html.lower()
                for page in cr.pages
            )

            if not uses_two_click:
                self._add_finding(
                    check_id="SOCIAL_001",
                    category="social_media",
                    title=f"Social-Media-Buttons ohne 2-Klick-Lösung ({', '.join(social_found.keys())})",
                    description="Direkt eingebundene Social-Media-Plugins übermitteln Nutzerdaten beim Seitenaufruf ohne Einwilligung an Dritte.",
                    severity="high",
                    law_reference="Art. 6 Abs. 1 DSGVO, § 25 TTDSG",
                    recommendation="Nutzen Sie die 2-Klick-Lösung (z.B. Shariff) oder ersetzen Sie Share-Buttons durch datenschutzfreundliche Alternativen. Social-Embeds erfordern eine Einwilligung über das CMP.",
                    evidence={"platforms": list(social_found.keys())},
                    passed=False,
                )

    # ─── SICHERHEITS-HEADER ──────────────────────────────────────
    def _check_security_headers(self, cr: CrawlResult):
        headers = {k.lower(): v for k, v in cr.server_headers.items()}

        missing_headers = []
        if "x-content-type-options" not in headers:
            missing_headers.append("X-Content-Type-Options")
        if "x-frame-options" not in headers and "content-security-policy" not in headers:
            missing_headers.append("X-Frame-Options / CSP")
        if "referrer-policy" not in headers:
            missing_headers.append("Referrer-Policy")

        if missing_headers:
            self._add_finding(
                check_id="HEADER_001",
                category="security_headers",
                title=f"Sicherheits-Header fehlen ({len(missing_headers)} Header)",
                description=f"Folgende HTTP-Sicherheitsheader fehlen: {', '.join(missing_headers)}. Dies kann die Datensicherheit beeinträchtigen.",
                severity="medium" if self.strictness != "lenient" else "low",
                law_reference="Art. 32 DSGVO",
                recommendation=f"Setzen Sie folgende HTTP-Response-Header:\n- X-Content-Type-Options: nosniff\n- X-Frame-Options: SAMEORIGIN\n- Referrer-Policy: strict-origin-when-cross-origin\n- Content-Security-Policy (CSP)",
                evidence={"missing": missing_headers},
                passed=False,
            )

    # ─── LÄNDERSPEZIFISCH ────────────────────────────────────────
    def _check_country_specific(self, cr: CrawlResult):
        additional_laws = COUNTRY_LAWS.get(self.country, [])
        if not additional_laws:
            return

        if self.country == "DE":
            # BDSG-spezifische Prüfungen
            all_text = " ".join(p.text_content.lower() for p in cr.pages[:5])

            # Betrieblicher Datenschutzbeauftragter
            if "datenschutzbeauftragter" not in all_text and "dsb" not in all_text:
                # > 20 Mitarbeiter mit Datenverarbeitung → DSB Pflicht
                self._add_finding(
                    check_id="BDSG_001",
                    category="country_specific",
                    title="Kein Datenschutzbeauftragter (DSB) erkennbar",
                    description="In der Datenschutzerklärung ist kein Datenschutzbeauftragter (DSB) genannt. Falls das Unternehmen regelmäßig mehr als 20 Personen mit personenbezogenen Daten beschäftigt, ist ein DSB gemäß § 38 BDSG verpflichtend.",
                    severity="medium",
                    law_reference="§ 38 BDSG, Art. 37 DSGVO",
                    recommendation="Prüfen Sie, ob die Bestellung eines DSB gemäß § 38 BDSG verpflichtend ist. Falls ja, benennen Sie einen DSB und veröffentlichen Sie dessen Kontaktdaten in der Datenschutzerklärung.",
                    passed=False,
                )
