import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Trash2, ExternalLink } from 'lucide-react'
import { scansApi } from '../services/api'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Scan {
  id: string
  target_url: string
  scan_name: string | null
  status: string
  overall_score: number | null
  pages_scanned: number
  cookies_found: number
  trackers_found: number
  created_at: string
  completed_at: string | null
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Ausstehend', cls: 'bg-yellow-100 text-yellow-700' },
  running: { label: 'Läuft', cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Abgeschlossen', cls: 'bg-green-100 text-green-700' },
  failed: { label: 'Fehlgeschlagen', cls: 'bg-red-100 text-red-700' },
}

export default function ScansPage() {
  const navigate = useNavigate()
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    const params: any = { limit: 100 }
    if (statusFilter !== 'all') params.status = statusFilter
    scansApi.list(params).then((r) => setScans(r.data)).finally(() => setLoading(false))
  }, [statusFilter])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Scan wirklich löschen?')) return
    setDeleting(id)
    try {
      await scansApi.delete(id)
      setScans((prev) => prev.filter((s) => s.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const filtered = scans.filter((s) =>
    search === '' ||
    s.target_url.toLowerCase().includes(search.toLowerCase()) ||
    s.scan_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-deudat-gray-900">Scans</h1>
          <p className="text-deudat-gray-500 mt-1">{scans.length} Scans insgesamt</p>
        </div>
        <button onClick={() => navigate('/scans/new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Neuer Scan
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-deudat-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'completed', 'running', 'pending', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                statusFilter === s
                  ? 'bg-deudat-red text-white border-deudat-red'
                  : 'bg-white text-deudat-gray-600 border-deudat-gray-200 hover:border-deudat-gray-300'
              }`}
            >
              {s === 'all' ? 'Alle' : STATUS_LABELS[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="spinner w-6 h-6 border-2 border-deudat-red border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-deudat-gray-400">Keine Scans gefunden</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-deudat-gray-100 bg-deudat-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Website</th>
                  <th className="px-4 py-3 text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Score</th>
                  <th className="px-4 py-3 text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Seiten</th>
                  <th className="px-4 py-3 text-xs font-semibold text-deudat-gray-500 uppercase tracking-wide">Datum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-deudat-gray-100">
                {filtered.map((scan) => {
                  const st = STATUS_LABELS[scan.status] || { label: scan.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr
                      key={scan.id}
                      className="hover:bg-deudat-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/scans/${scan.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-deudat-gray-900 text-sm">
                          {scan.scan_name || scan.target_url}
                        </div>
                        {scan.scan_name && (
                          <div className="text-xs text-deudat-gray-400 mt-0.5">{scan.target_url}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {scan.overall_score !== null ? (
                          <span className={`font-bold ${
                            scan.overall_score >= 75 ? 'text-green-600' :
                            scan.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {Math.round(scan.overall_score)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-deudat-gray-600">{scan.pages_scanned}</td>
                      <td className="px-4 py-4 text-sm text-deudat-gray-500">
                        {format(new Date(scan.created_at), 'dd.MM.yy', { locale: de })}
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDelete(scan.id, e)}
                          disabled={deleting === scan.id}
                          className="p-1.5 text-deudat-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
