import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Plus, Clock } from 'lucide-react'
import { scansApi } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface ScanItem {
  id: string
  target_url: string
  scan_name: string
  status: string
  overall_score: number | null
  cookies_found: number
  trackers_found: number
  pages_scanned: number
  created_at: string
  completed_at: string | null
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#27AE60' : score >= 50 ? '#E67E22' : '#C0392B'

  return (
    <div className="relative w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e5e5e5" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{Math.round(score)}</span>
        <span className="text-xs text-deudat-gray-400">/100</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    running: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    completed: 'Abgeschlossen',
    running: 'Läuft',
    pending: 'Ausstehend',
    failed: 'Fehlgeschlagen',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [scans, setScans] = useState<ScanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [quickUrl, setQuickUrl] = useState('')

  useEffect(() => {
    scansApi.list({ limit: 10 }).then((r) => {
      setScans(r.data)
    }).finally(() => setLoading(false))
  }, [])

  const completed = scans.filter((s) => s.status === 'completed')
  const avgScore = completed.length
    ? Math.round(completed.reduce((a, s) => a + (s.overall_score || 0), 0) / completed.length)
    : 0
  const criticalCount = 0  // Would need findings data

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault()
    if (quickUrl.trim()) {
      navigate(`/scans/new?url=${encodeURIComponent(quickUrl.trim())}`)
    }
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-deudat-gray-900">
            {t('welcomeBack')}, {user?.first_name}
          </h1>
          <p className="text-deudat-gray-500 mt-1">
            Hier ist eine Übersicht Ihrer DSGVO-Compliance-Aktivitäten
          </p>
        </div>
        <button onClick={() => navigate('/scans/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('newScan')}
        </button>
      </div>

      {/* Quick scan */}
      <div className="card p-6 bg-gradient-to-br from-deudat-red to-deudat-red-dark text-white">
        <h2 className="font-semibold text-lg mb-1">{t('quickScan')}</h2>
        <p className="text-white/70 text-sm mb-4">URL eingeben und sofort scannen</p>
        <form onSubmit={handleQuickScan} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder={t('enterUrl')}
              className="w-full pl-10 pr-4 py-2.5 bg-white/20 border border-white/30
                         rounded-lg text-white placeholder-white/50 focus:outline-none
                         focus:ring-2 focus:ring-white/50"
            />
          </div>
          <button type="submit" className="bg-white text-deudat-red px-4 py-2.5 rounded-lg
                                           font-medium hover:bg-white/90 transition-colors whitespace-nowrap">
            {t('startScan')}
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('totalScans'), value: scans.length, icon: Search, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: t('completedScans'), value: completed.length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
          { label: t('avgScore'), value: `${avgScore}/100`, icon: TrendingUp, color: 'text-deudat-red', bg: 'bg-red-50' },
          { label: 'Scans in Bearbeitung', value: scans.filter(s => s.status === 'running').length, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-deudat-gray-900">{value}</div>
            <div className="text-sm text-deudat-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent scans */}
      <div className="card">
        <div className="px-6 py-4 border-b border-deudat-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-deudat-gray-900">{t('recentScans')}</h3>
          <button onClick={() => navigate('/scans')} className="text-sm text-deudat-red hover:underline flex items-center gap-1">
            Alle anzeigen <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-deudat-gray-400">
            <div className="spinner w-6 h-6 border-2 border-deudat-red border-t-transparent rounded-full mx-auto mb-2" />
            {t('loading')}
          </div>
        ) : scans.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="w-12 h-12 text-deudat-gray-300 mx-auto mb-3" />
            <div className="text-deudat-gray-500">Noch keine Scans vorhanden</div>
            <button onClick={() => navigate('/scans/new')} className="btn-primary mt-4">
              Ersten Scan starten
            </button>
          </div>
        ) : (
          <div className="divide-y divide-deudat-gray-100">
            {scans.slice(0, 8).map((scan) => (
              <div
                key={scan.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-deudat-gray-50
                           cursor-pointer transition-colors"
                onClick={() => navigate(`/scans/${scan.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-medium text-deudat-gray-900 text-sm">
                      {scan.scan_name || scan.target_url}
                    </div>
                    <div className="text-xs text-deudat-gray-400 mt-0.5">
                      {scan.target_url} · {format(new Date(scan.created_at), 'dd.MM.yyyy', { locale: de })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {scan.overall_score !== null && (
                    <div className="text-right">
                      <div
                        className={`font-bold text-lg ${
                          scan.overall_score >= 75 ? 'text-green-600' :
                          scan.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}
                      >
                        {Math.round(scan.overall_score)}
                      </div>
                      <div className="text-xs text-deudat-gray-400">Score</div>
                    </div>
                  )}
                  <StatusBadge status={scan.status} />
                  <ArrowRight className="w-4 h-4 text-deudat-gray-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
