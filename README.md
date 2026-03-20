# DSGVO-Audit Pro

**Professioneller DSGVO/BDSG Compliance Scanner** für Webseiten von Deudat GmbH

## Features

- 🔍 **Tiefes Website-Scanning** – bis zu 50 Unterseiten, JavaScript-Rendering mit Playwright
- 🍪 **Cookie-Analyse** – Tracking-Cookies, Drittanbieter, Consent-Management
- 📜 **Datenschutzerklärung** – Vollständigkeitsprüfung nach Art. 13/14 DSGVO
- ⚖️ **Rechtliche Checks** – DSGVO, BDSG, TTDSG, ePrivacy, länderspezifische Gesetze
- 🤖 **KI-Analyse** – Claude (Anthropic) für tiefgehende Textanalyse
- 📊 **Berichte** – PDF + Word/DOCX mit Deudat-Branding
- 👥 **Mandantenverwaltung** – Deudat-intern + SaaS-Kunden
- 💳 **SaaS-Modell** – Abo + Pay-per-Scan
- 📱 **Mobile App** – Android APK via Capacitor

## Schnellstart

```bash
# 1. Repository klonen
git clone ...

# 2. .env konfigurieren
cp .env.example .env
# .env bearbeiten und Werte eintragen

# 3. Starten
docker compose up -d

# App läuft auf http://localhost:80
```

## Standard-Login

```
E-Mail: admin@deudat.de
Passwort: DsgvoAudit2024!
```

**Passwort sofort nach erstem Login ändern!**

## Berechtigungskonzept

| Rolle | Beschreibung | Scans | Mandanten |
|-------|-------------|-------|-----------|
| `super_admin` | Deudat Administrator | Unbegrenzt | Alle |
| `deudat_employee` | Deudat Mitarbeiter | Unbegrenzt, kostenlos | Eigene |
| `saas_admin` | SaaS Organisations-Admin | Laut Plan | Eigene Org |
| `saas_user` | SaaS Nutzer | Laut Plan | Eigene Org |

## Android APK erstellen

```bash
cd frontend
npm install
npm run build

# Capacitor initialisieren
npx cap add android
npx cap sync

# APK bauen (Android Studio erforderlich)
npx cap open android
# In Android Studio: Build → Generate Signed APK
```

## Tech Stack

- **Backend**: Python 3.12 + FastAPI + PostgreSQL + SQLAlchemy
- **Scanner**: Playwright + BeautifulSoup4
- **KI**: Claude API (Anthropic)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Mobile**: Capacitor (Android APK)
- **Reports**: ReportLab (PDF) + python-docx (Word)
- **Deploy**: Docker + Docker Compose

## Farben (Deudat Corporate Design)

- **Primärfarbe**: `#92200d` (Deudat Rot)
- **Sekundär**: Grau-Töne

## API-Dokumentation

Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`
