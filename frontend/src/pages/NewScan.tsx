import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, Settings2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { scansApi, clientsApi } from '../services/api'

interface Client {
  id: string
  name: string
  website_url: string
}

const DEFAULT_CONFIG = {
  max_pages: 50,
  max_depth: 3,
  strictness: 'standard',
  check_cookies: true,
  check_privacy_policy: true,
  check_imprint: true,
  check_ssl: true,
  check_trackers: true,
  check_consent_management: true,
  check_google_fonts: true,
  check_external_scripts: true,
  check_contact_forms: true,
  check_newsletter: true,
  check_social_media: true,
  report_language: 'de',
  report_blocks: [
    'executive_summary',
    'score_overview',
    'cookie_analysis',
    'privacy_policy_analysis',
    'tracker_analysis',
    'consent_management',
    'legal_requirements',
    'recommendations',
    'technical_details',
    'appendix',
  ],
}

const REPORT_BLOCKS_DE: Record<string, string> = {
  executive_summary: 'Zusammenfassung',
  score_overview: 'Score-Übersicht',
  cookie_analysis: 'Cookie-Analyse',
  privacy_policy_analysis: 'Datenschutzerklärung',
  tracker_analysis: 'Tracker & externe Dienste',
  consent_management: 'Einwilligungsmanagement',
  legal_requirements: 'Rechtliche Anforderungen',
  recommendations: 'Empfehlungen',
  technical_details: 'Technische Details',
  appendix: 'Anhang',
}

export default function NewScanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [url, setUrl] = useState(searchParams.get('url') || '')
  const [scanName, setScanName] = useState('')
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    clientsApi.list().then((r) => setClients(r.data)).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) { setError('Bitte geben Sie eine URL ein'); return }
    setError('')
    setLoading(true)

    try {
      const res = await scansApi.create({
        target_url: url.trim(),
        client_id: clientId || undefined,
        scan_name: scanName || undefined,
        scan_config: config,
      })
      navigate(`/scans/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Scan konnte nicht gestartet werden')
    } finally {
      setLoading(false)
    }
  }

  const toggleCheck = (key: string) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const toggleBlock = (block: string) => {
    setConfig((prev) => ({
      ...prev,
      report_blocks: prev.report_blocks.includes(block)
        ? prev.report_blocks.filter((b) => b !== block)
        : [...prev.report_blocks, block],
    }))
  }

  const checks = [
    { key: 'check_cookies', label: 'Cookies' },
    { key: 'check_privacy_policy', label: 'Datenschutzerklärung' },
    { key: 'check_imprint', label: 'Impressum' },
    { key: 'check_ssl', label: 'SSL/HTTPS' },
    { key: 'check_trackers', label: 'Tracker' },
    { key: 'check_consent_management', label: 'Einwilligungsmanagement (CMP)' },
    { key: 'check_google_fonts', label: 'Google Fonts' },
    { key: 'check_external_scripts', label: 'Externe Scripts' },
    { key: 'check_contact_forms', label: 'Kontaktformulare' },
    { key: 'check_newsletter', label: 'Newsletter' },
    { key: 'check_social_media', label: 'Social Media' },
  ]

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-deudat-gray-900">{t('newScan')}</h1>
        <p className="text-deudat-gray-500 mt-1">Starten Sie einen neuen DSGVO-Compliance-Scan</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL */}
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">{t('scanTarget')} *</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-deudat-gray-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input pl-10"
                placeholder="https://beispiel.de"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">{t('scanName')}</label>
            <input
              type="text"
              value={scanName}
              onChange={(e) => setScanName(e.target.value)}
              className="input"
              placeholder="z.B. Quartalsaudit Q1 2024"
            />
          </div>

          <div>
            <label className="label">{t('selectClient')}</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input"
            >
              <option value="">Kein Mandant</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced settings */}
        <div className="card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-deudat-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-deudat-gray-500" />
              <span className="font-medium text-deudat-gray-900">Erweiterte Einstellungen</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="px-6 pb-6 space-y-6 border-t border-deudat-gray-100">
              {/* Scan params */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="label">{t('maxPages')}</label>
                  <input
                    type="number"
                    value={config.max_pages}
                    onChange={(e) => setConfig(p => ({ ...p, max_pages: +e.target.value }))}
                    className="input"
                    min={1} max={200}
                  />
                </div>
                <div>
                  <label className="label">{t('scanDepth')}</label>
                  <input
                    type="number"
                    value={config.max_depth}
                    onChange={(e) => setConfig(p => ({ ...p, max_depth: +e.target.value }))}
                    className="input"
                    min={1} max={5}
                  />
                </div>
              </div>

              {/* Strictness */}
              <div>
                <label className="label">{t('strictness')}</label>
                <div className="flex gap-2">
                  {['lenient', 'standard', 'strict'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setConfig(p => ({ ...p, strictness: s }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        config.strictness === s
                          ? 'bg-deudat-red text-white border-deudat-red'
                          : 'bg-white text-deudat-gray-600 border-deudat-gray-200 hover:border-deudat-red'
                      }`}
                    >
                      {t(s as any)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="label">{t('reportLanguage')}</label>
                <div className="flex gap-2">
                  {['de', 'en'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setConfig(p => ({ ...p, report_language: lang }))}
                      className={`px-6 py-2 rounded-lg text-sm font-medium border transition-all ${
                        config.report_language === lang
                          ? 'bg-deudat-red text-white border-deudat-red'
                          : 'bg-white text-deudat-gray-600 border-deudat-gray-200'
                      }`}
                    >
                      {lang === 'de' ? 'Deutsch' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Check toggles */}
              <div>
                <label className="label mb-2">Prüfbereiche</label>
                <div className="grid grid-cols-2 gap-2">
                  {checks.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={Boolean(config[key as keyof typeof config])}
                        onChange={() => toggleCheck(key)}
                        className="w-4 h-4 rounded border-deudat-gray-300 text-deudat-red
                                   focus:ring-deudat-red"
                      />
                      <span className="text-sm text-deudat-gray-700 group-hover:text-deudat-gray-900">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Report blocks */}
              <div>
                <label className="label mb-2">Bericht-Blöcke</label>
                <div className="space-y-2">
                  {Object.entries(REPORT_BLOCKS_DE).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={config.report_blocks.includes(key)}
                        onChange={() => toggleBlock(key)}
                        className="w-4 h-4 rounded border-deudat-gray-300 text-deudat-red
                                   focus:ring-deudat-red"
                      />
                      <span className="text-sm text-deudat-gray-700 group-hover:text-deudat-gray-900">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
            {t('cancel')}
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scan wird gestartet...
              </span>
            ) : (
              <>{t('startScan')}</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
