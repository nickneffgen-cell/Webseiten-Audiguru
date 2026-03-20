/**
 * Demo-Modus: Mock-Daten wenn kein Backend verfügbar
 * Aktiviert durch VITE_DEMO_MODE=true oder wenn API nicht erreichbar
 */

export const DEMO_SCANS = [
  {
    id: '1',
    target_url: 'https://beispiel-shop.de',
    scan_name: 'Beispiel Online-Shop – DSGVO-Audit Q1 2024',
    status: 'completed',
    progress: 100,
    pages_scanned: 34,
    cookies_found: 12,
    trackers_found: 4,
    overall_score: 42,
    score_breakdown: {},
    ai_analysis: `**Gesamtbewertung:** Die Website beispiel-shop.de weist erhebliche DSGVO-Mängel auf und erreicht einen Score von nur 42/100. Sofortige Maßnahmen sind erforderlich.

**Wichtigste Risiken:**
1. Tracking-Cookies (Google Analytics, Facebook Pixel) werden ohne Einwilligung gesetzt – klarer Verstoß gegen § 25 TTDSG und Art. 6 DSGVO
2. Google Fonts wird extern von Google-Servern geladen (IP-Übertragung in die USA ohne Einwilligung)
3. Datenschutzerklärung fehlt Pflichtangaben zur Drittlandübertragung (Art. 44ff. DSGVO)

**Dringlichste Empfehlungen:**
1. SOFORT: Cookie-Consent-Management-System implementieren (z.B. Usercentrics oder Borlabs)
2. KURZFRISTIG: Google Fonts lokal hosten
3. MITTELFRISTIG: Datenschutzerklärung durch Fachanwalt überarbeiten lassen

**Rechtliche Risikoeinschätzung:** Bußgeldpotential bei DSGVO-Verstoß: bis zu 20 Mio. € oder 4% des weltweiten Jahresumsatzes (Art. 83 DSGVO).

**Positives:** SSL-Verschlüsselung vorhanden, Impressum gefunden.`,
    error_message: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    client_id: '1',
    findings: [
      {
        id: 'f1', category: 'ssl', check_id: 'SSL_001', severity: 'info',
        title: 'HTTPS-Verschlüsselung vorhanden',
        description: 'Die Website verwendet HTTPS-Verschlüsselung.',
        law_reference: null, recommendation: null, affected_url: null, evidence: null, is_included_in_report: true,
      },
      {
        id: 'f2', category: 'cookies', check_id: 'COOKIE_002', severity: 'critical',
        title: 'Tracking-Cookies gefunden (6 Stück)',
        description: 'Es wurden Tracking-/Analytics-Cookies gefunden, die eine Einwilligung gemäß § 25 TTDSG erfordern: _ga, _gid, _fbp, _fbc, __utma, IDE',
        law_reference: '§ 25 TTDSG, Art. 6 Abs. 1 lit. a DSGVO',
        recommendation: 'Implementieren Sie ein Cookie-Consent-Management-System (CMP). Setzen Sie Tracking-Cookies erst nach aktiver Einwilligung des Nutzers.',
        affected_url: 'https://beispiel-shop.de',
        evidence: { tracking_cookies: ['_ga', '_gid', '_fbp', '_fbc', '__utma', 'IDE'] },
        is_included_in_report: true,
      },
      {
        id: 'f3', category: 'consent_management', check_id: 'CMP_001', severity: 'critical',
        title: 'Kein Cookie-Consent-Management-System gefunden',
        description: 'Es wurden Tracking-/Analyse-Scripts gefunden, aber kein Cookie-Consent-Banner oder CMP-System.',
        law_reference: '§ 25 TTDSG, Art. 6 Abs. 1 lit. a DSGVO, EuGH Planet49-Urteil',
        recommendation: 'Implementieren Sie ein Cookie-Consent-Management-System (z.B. Cookiebot, Usercentrics, Borlabs Cookie).',
        affected_url: null, evidence: null, is_included_in_report: true,
      },
      {
        id: 'f4', category: 'trackers', check_id: 'TRACKER_001', severity: 'critical',
        title: 'Kritische Tracking-Dienste gefunden (3 Dienste)',
        description: 'Folgende Tracking-Dienste wurden gefunden: Google Analytics, Google Tag Manager, Facebook Pixel. Diese übertragen Daten an Dritte, teils in die USA.',
        law_reference: 'Art. 6, 44ff DSGVO, § 25 TTDSG, EuGH Schrems II',
        recommendation: '1. Holen Sie explizite Einwilligung vor der Aktivierung ein. 2. Prüfen Sie Drittlandübertragungen. 3. Dokumentieren Sie alle Tracker in der Datenschutzerklärung.',
        affected_url: null,
        evidence: { trackers: ['Google Analytics', 'Google Tag Manager', 'Facebook Pixel'] },
        is_included_in_report: true,
      },
      {
        id: 'f5', category: 'google_fonts', check_id: 'GF_001', severity: 'high',
        title: 'Google Fonts (externe Einbindung) gefunden',
        description: 'Google Fonts wird direkt von Google-Servern geladen. Dabei wird die IP-Adresse des Nutzers an Google (USA) übermittelt.',
        law_reference: 'Art. 6 Abs. 1, Art. 44 DSGVO, LG München I Az. 3 O 17493/20',
        recommendation: 'Laden Sie Google Fonts lokal herunter und hosten Sie diese selbst.',
        affected_url: 'https://beispiel-shop.de',
        evidence: { affected_pages: ['https://beispiel-shop.de', 'https://beispiel-shop.de/produkte'] },
        is_included_in_report: true,
      },
      {
        id: 'f6', category: 'privacy_policy', check_id: 'PP_002', severity: 'high',
        title: 'Datenschutzerklärung unvollständig (3 Punkte fehlen)',
        description: 'Die Datenschutzerklärung enthält nicht alle Pflichtinformationen. Fehlende Elemente: Drittlandübermittlung, Speicherdauer, Beschwerderecht',
        law_reference: 'Art. 13, 14 DSGVO',
        recommendation: 'Ergänzen Sie die Datenschutzerklärung um die fehlenden Elemente. Lassen Sie den Text rechtlich prüfen.',
        affected_url: 'https://beispiel-shop.de/datenschutz',
        evidence: { missing_elements: ['Drittlandübermittlung', 'Speicherdauer', 'Beschwerderecht'] },
        is_included_in_report: true,
      },
      {
        id: 'f7', category: 'security_headers', check_id: 'HEADER_001', severity: 'medium',
        title: 'Sicherheits-Header fehlen (2 Header)',
        description: 'Folgende HTTP-Sicherheitsheader fehlen: X-Content-Type-Options, Referrer-Policy',
        law_reference: 'Art. 32 DSGVO',
        recommendation: 'Setzen Sie die fehlenden HTTP-Response-Header auf Ihrem Webserver.',
        affected_url: null,
        evidence: { missing: ['X-Content-Type-Options', 'Referrer-Policy'] },
        is_included_in_report: true,
      },
      {
        id: 'f8', category: 'contact_forms', check_id: 'FORM_001', severity: 'high',
        title: 'Kontaktformulare ohne Datenschutzhinweis',
        description: 'Es wurden Kontaktformulare ohne Hinweis auf die Datenverarbeitung gefunden.',
        law_reference: 'Art. 13 DSGVO',
        recommendation: 'Fügen Sie bei jedem Formular einen Datenschutzhinweis mit Verlinkung der Datenschutzerklärung hinzu.',
        affected_url: 'https://beispiel-shop.de/kontakt',
        evidence: { affected_pages: ['https://beispiel-shop.de/kontakt'] },
        is_included_in_report: true,
      },
      {
        id: 'f9', category: 'country_specific', check_id: 'BDSG_001', severity: 'medium',
        title: 'Kein Datenschutzbeauftragter (DSB) erkennbar',
        description: 'In der Datenschutzerklärung ist kein Datenschutzbeauftragter genannt.',
        law_reference: '§ 38 BDSG, Art. 37 DSGVO',
        recommendation: 'Prüfen Sie, ob die Bestellung eines DSB gemäß § 38 BDSG verpflichtend ist.',
        affected_url: null, evidence: null, is_included_in_report: true,
      },
      {
        id: 'f10', category: 'imprint', check_id: 'IMPRINT_001', severity: 'info',
        title: 'Impressum vorhanden',
        description: 'Ein Impressum wurde gefunden.',
        law_reference: null, recommendation: null,
        affected_url: 'https://beispiel-shop.de/impressum',
        evidence: null, is_included_in_report: true,
      },
    ],
  },
  {
    id: '2',
    target_url: 'https://muster-kanzlei.de',
    scan_name: 'Muster Rechtsanwaltskanzlei',
    status: 'completed',
    progress: 100,
    pages_scanned: 12,
    cookies_found: 3,
    trackers_found: 1,
    overall_score: 78,
    score_breakdown: {},
    ai_analysis: `**Gesamtbewertung:** Die Website muster-kanzlei.de erreicht einen guten Score von 78/100 und ist weitgehend DSGVO-konform.

**Hauptbefunde:** Google Fonts wird noch extern geladen. Ein kleiner Verbesserungsbedarf bei den Sicherheits-Headern.

**Empfehlung:** Fonts lokal hosten und HSTS-Header setzen – dann wäre ein Score von 90+ erreichbar.`,
    error_message: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
    client_id: '2',
    findings: [],
  },
  {
    id: '3',
    target_url: 'https://test-webseite.de',
    scan_name: 'Test-Scan (läuft)',
    status: 'running',
    progress: 65,
    pages_scanned: 28,
    cookies_found: 0,
    trackers_found: 0,
    overall_score: null,
    score_breakdown: null,
    ai_analysis: null,
    error_message: null,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    completed_at: null,
    client_id: null,
    findings: [],
  },
]

export const DEMO_CLIENTS = [
  {
    id: '1', name: 'Beispiel Online-Shop GmbH', website_url: 'https://beispiel-shop.de',
    contact_person: 'Thomas Müller', contact_email: 'mueller@beispiel-shop.de',
    company_country: 'DE', scan_count: 3, last_scan_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    last_scan_score: 42, notes: null, organization_id: '1', assigned_user_id: null,
    company_industry: 'E-Commerce', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '2', name: 'Muster Rechtsanwaltskanzlei', website_url: 'https://muster-kanzlei.de',
    contact_person: 'Dr. Anna Schmidt', contact_email: 'info@muster-kanzlei.de',
    company_country: 'DE', scan_count: 1, last_scan_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    last_scan_score: 78, notes: 'Mandant seit 2023', organization_id: '1', assigned_user_id: null,
    company_industry: 'Rechtsberatung', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: '3', name: 'Muster GmbH – Maschinenbau', website_url: 'https://mustergmbh-maschinen.de',
    contact_person: 'Klaus Weber', contact_email: 'k.weber@mustergmbh.de',
    company_country: 'DE', scan_count: 0, last_scan_date: null,
    last_scan_score: null, notes: null, organization_id: '1', assigned_user_id: null,
    company_industry: 'Maschinenbau', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
]

export const DEMO_USER = {
  id: '1', email: 'admin@deudat.de', first_name: 'Admin', last_name: 'Deudat',
  role: 'super_admin' as const, is_active: true, is_verified: true,
  organization_id: '1', preferred_language: 'de', last_login: new Date().toISOString(),
}
