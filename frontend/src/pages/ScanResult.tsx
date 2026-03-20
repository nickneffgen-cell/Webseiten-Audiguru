import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Download, ChevronDown, ChevronUp, RefreshCw, Trash2,
  ExternalLink, AlertTriangle, CheckCircle, Info, Brain
} from 'lucide-react'
import { scansApi, reportsApi } from '../services/api'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Finding {
  id: string
  category: string
  check_id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  law_reference: string | null
  recommendation: string | null
  affected_url: string | null
  evidence: any
  is_included_in_report: boolean
}

interface Scan {
  id: string
  target_url: string
  scan_name: string | null
  status: string
  progress: number
  pages_scanned: number
  cookies_found: number
  trackers_found: number
  overall_score: number | null
  score_breakdown: Record<string, any> | null
  ai_analysis: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
  findings: Finding[]
}

const SEVERITY_CONFIG = {
  critical: { label: 'Kritisch', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', badge: 'badge-critical' },
  high: { label: 'Schwerwiegend', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'badge-high' },
  medium: { label: 'Mittel', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'badge-medium' },
  low: { label: 'Niedrig', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'badge-low' },
  info: { label: 'Information', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', badge: 'badge-info' },
}

const CATEGORY_LABELS: Record<string, string> = {
  ssl: 'SSL / HTTPS',
  imprint: 'Impressum',
  privacy_policy: 'Datenschutzerklärung',
  cookies: 'Cookies',
  consent_management: 'Einwilligungsmanagement',
  trackers: 'Tracker & externe Dienste',
  google_fonts: 'Google Fonts',
  external_scripts: 'Externe Scripts',
  contact_forms: 'Kontaktformulare',
  newsletter: 'Newsletter',
  social_media: 'Social Media',
  security_headers: 'Sicherheits-Header',
  country_specific: 'Länderspezifisch',
}

function ScoreCircle({ score }: { score: number }) {
  const r = 70
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#27AE60' : score >= 50 ? '#E67E22' : '#C0392B'
  const label = score >= 75 ? 'Gut' : score >= 50 ? 'Verbesserungsbedarf' : 'Kritisch'

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e5e5" strokeWidth="12" />
          <circle
            cx="80" cy="80" r={r}
            fill="none" stroke={color} strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{Math.round(score)}</span>
          <span className="text-sm text-deudat-gray-400">/100</span>
        </div>
      </div>
      <div className="font-semibold mt-2" style={{ color }}>{label}</div>
    </div>
  )
}

export default function ScanResultPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [scan, setScan] = useState<Scan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeSeverity, setActiveSeverity] = useState<string>('all')

  const fetchScan = useCallback(async () => {
    if (!id) return
    try {
      const res = await scansApi.get(id)
      setScan(res.data)
      setError('')
    } catch {
      setError('Scan nicht gefunden')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchScan()
  }, [fetchScan])

  // Poll while running
  useEffect(() => {
    if (!scan || !['pending', 'running'].includes(scan.status)) return
    const interval = setInterval(fetchScan, 3000)
    return () => clearInterval(interval)
  }, [scan?.status, fetchScan])

  const handleGenerateReport = async (format: 'pdf' | 'docx') => {
    if (!id) return
    setGeneratingReport(format)
    try {
      const res = await reportsApi.generate(id, format)
      const reportId = res.data.report_id

      // Download
      const blob = await reportsApi.download(reportId)
      const url = window.URL.createObjectURL(new Blob([blob.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `DSGVO-Bericht.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(`Fehler beim Erstellen des Berichts: ${e.response?.data?.detail || e.message}`)
    } finally {
      setGeneratingReport(null)
    }
  }

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleFindingInReport = async (findingId: string, included: boolean) => {
    if (!id) return
    await scansApi.updateFinding(id, findingId, { is_included_in_report: !included })
    setScan((prev) => prev ? {
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === findingId ? { ...f, is_included_in_report: !f.is_included_in_report } : f
      )
    } : null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8 border-2 border-deudat-red border-t-transparent rounded-full" />
    </div>
  )

  if (error || !scan) return (
    <div className="text-center py-16">
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
      <div className="text-deudat-gray-500">{error || 'Scan nicht gefunden'}</div>
    </div>
  )

  const isRunning = ['pending', 'running'].includes(scan.status)
  const findings = scan.findings || []

  const filtered = findings.filter((f) => {
    if (activeCategory !== 'all' && f.category !== activeCategory) return false
    if (activeSeverity !== 'all' && f.severity !== activeSeverity) return false
    return true
  })

  const categories = [...new Set(findings.map((f) => f.category))]
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info']
  const sortedFiltered = [...filtered].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  )

  const counts: Record<string, number> = {}
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-deudat-gray-900">
            {scan.scan_name || scan.target_url}
          </h1>
          <a href={scan.target_url} target="_blank" rel="noopener noreferrer"
             className="text-deudat-red text-sm hover:underline flex items-center gap-1 mt-1">
            {scan.target_url} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchScan} className="btn-secondary p-2" title="Aktualisieren">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Running state */}
      {isRunning && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="spinner w-5 h-5 border-2 border-deudat-red border-t-transparent rounded-full" />
            <span className="font-medium text-deudat-gray-900">
              {scan.status === 'pending' ? 'Scan wird vorbereitet...' : 'Scan läuft...'}
            </span>
          </div>
          <div className="w-full bg-deudat-gray-200 rounded-full h-2.5">
            <div
              className="bg-deudat-red h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${scan.progress}%` }}
            />
          </div>
          <div className="text-sm text-deudat-gray-500 mt-2 text-right">{scan.progress}%</div>
        </div>
      )}

      {/* Failed state */}
      {scan.status === 'failed' && (
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Scan fehlgeschlagen</span>
          </div>
          {scan.error_message && (
            <p className="text-red-600 text-sm mt-2">{scan.error_message}</p>
          )}
        </div>
      )}

      {/* Completed results */}
      {scan.status === 'completed' && (
        <>
          {/* Score + Stats */}
          <div className="card p-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {scan.overall_score !== null && <ScoreCircle score={scan.overall_score} />}

              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-deudat-gray-900">{scan.pages_scanned}</div>
                    <div className="text-xs text-deudat-gray-400">Seiten gescannt</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-deudat-gray-900">{scan.cookies_found}</div>
                    <div className="text-xs text-deudat-gray-400">Cookies gefunden</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-deudat-gray-900">{scan.trackers_found}</div>
                    <div className="text-xs text-deudat-gray-400">Tracker gefunden</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-deudat-gray-900">{findings.length}</div>
                    <div className="text-xs text-deudat-gray-400">Befunde gesamt</div>
                  </div>
                </div>

                {/* Severity bars */}
                <div className="space-y-2">
                  {severityOrder.filter(s => counts[s]).map((sev) => {
                    const cfg = SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG]
                    const pct = Math.round((counts[sev] / findings.length) * 100)
                    return (
                      <div key={sev} className="flex items-center gap-3">
                        <div className="w-24 text-right">
                          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="flex-1 bg-deudat-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full bg-current ${cfg.color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-8 text-right text-xs text-deudat-gray-500">{counts[sev]}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Report download */}
          <div className="card p-6">
            <h3 className="font-semibold text-deudat-gray-900 mb-4">Bericht herunterladen</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleGenerateReport('pdf')}
                disabled={generatingReport !== null}
                className="btn-primary flex items-center gap-2 flex-1 justify-center"
              >
                {generatingReport === 'pdf' ? (
                  <><div className="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Erstelle PDF...</>
                ) : (
                  <><Download className="w-4 h-4" /> PDF herunterladen</>
                )}
              </button>
              <button
                onClick={() => handleGenerateReport('docx')}
                disabled={generatingReport !== null}
                className="btn-secondary flex items-center gap-2 flex-1 justify-center"
              >
                {generatingReport === 'docx' ? (
                  <><div className="spinner w-4 h-4 border-2 border-deudat-gray-600 border-t-transparent rounded-full" /> Erstelle Word...</>
                ) : (
                  <><Download className="w-4 h-4" /> Word herunterladen</>
                )}
              </button>
            </div>
          </div>

          {/* AI Analysis */}
          {scan.ai_analysis && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-deudat-red" />
                <h3 className="font-semibold text-deudat-gray-900">KI-Analyse (Claude)</h3>
              </div>
              <div className="prose prose-sm max-w-none text-deudat-gray-700 whitespace-pre-wrap">
                {scan.ai_analysis}
              </div>
            </div>
          )}

          {/* Findings */}
          <div className="card">
            <div className="px-6 py-4 border-b border-deudat-gray-100">
              <h3 className="font-semibold text-deudat-gray-900 mb-3">
                Detaillierte Befunde ({filtered.length})
              </h3>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveSeverity('all')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    activeSeverity === 'all'
                      ? 'bg-deudat-red text-white border-deudat-red'
                      : 'bg-white text-deudat-gray-600 border-deudat-gray-200'
                  }`}
                >
                  Alle ({findings.length})
                </button>
                {severityOrder.filter(s => counts[s]).map((sev) => {
                  const cfg = SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG]
                  return (
                    <button
                      key={sev}
                      onClick={() => setActiveSeverity(sev === activeSeverity ? 'all' : sev)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                        activeSeverity === sev
                          ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                          : 'bg-white text-deudat-gray-600 border-deudat-gray-200'
                      }`}
                    >
                      {cfg.label} ({counts[sev]})
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="divide-y divide-deudat-gray-100">
              {sortedFiltered.map((finding) => {
                const cfg = SEVERITY_CONFIG[finding.severity]
                const isExpanded = expandedFindings.has(finding.id)

                return (
                  <div key={finding.id} className={`${!finding.is_included_in_report ? 'opacity-50' : ''}`}>
                    <div
                      className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-deudat-gray-50 transition-colors"
                      onClick={() => toggleFinding(finding.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cfg.badge}>{cfg.label}</span>
                          <span className="text-xs text-deudat-gray-400 font-mono">{finding.check_id}</span>
                          <span className="text-xs text-deudat-gray-400">
                            {CATEGORY_LABELS[finding.category] || finding.category}
                          </span>
                        </div>
                        <div className="font-medium text-deudat-gray-900 mt-1">{finding.title}</div>
                        {!isExpanded && (
                          <div className="text-sm text-deudat-gray-500 mt-0.5 line-clamp-2">
                            {finding.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFindingInReport(finding.id, finding.is_included_in_report) }}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            finding.is_included_in_report
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                              : 'bg-deudat-gray-50 text-deudat-gray-500 border-deudat-gray-200 hover:bg-green-50 hover:text-green-700'
                          }`}
                          title={finding.is_included_in_report ? 'Aus Bericht entfernen' : 'In Bericht aufnehmen'}
                        >
                          {finding.is_included_in_report ? '✓ Im Bericht' : '− Ausgeblendet'}
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-deudat-gray-400" /> : <ChevronDown className="w-4 h-4 text-deudat-gray-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={`px-6 pb-4 ${cfg.bg} border-l-4 ${cfg.border} ml-6`}>
                        <p className="text-sm text-deudat-gray-700 mb-3">{finding.description}</p>
                        {finding.law_reference && (
                          <div className="mb-2">
                            <span className="text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Rechtsgrundlage</span>
                            <p className="text-sm text-deudat-gray-700">{finding.law_reference}</p>
                          </div>
                        )}
                        {finding.recommendation && (
                          <div className="mb-2">
                            <span className="text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Empfehlung</span>
                            <p className="text-sm text-deudat-gray-700 whitespace-pre-line">{finding.recommendation}</p>
                          </div>
                        )}
                        {finding.affected_url && (
                          <div>
                            <span className="text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Betroffene URL</span>
                            <a href={finding.affected_url} target="_blank" rel="noopener noreferrer"
                               className="text-sm text-deudat-red hover:underline block mt-0.5 flex items-center gap-1">
                              {finding.affected_url} <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
