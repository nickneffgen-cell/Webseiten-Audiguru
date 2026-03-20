import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Globe, Mail, Trash2, Edit2, ExternalLink } from 'lucide-react'
import { clientsApi } from '../services/api'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface Client {
  id: string
  name: string
  website_url: string
  contact_person: string | null
  contact_email: string | null
  company_country: string
  scan_count: number
  last_scan_date: string | null
  last_scan_score: number | null
}

const COUNTRY_NAMES: Record<string, string> = {
  DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz',
  FR: 'Frankreich', NL: 'Niederlande', BE: 'Belgien',
  PL: 'Polen', IT: 'Italien', ES: 'Spanien',
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '', website_url: '', contact_person: '',
    contact_email: '', company_country: 'DE', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    clientsApi.list().then((r) => setClients(r.data)).finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await clientsApi.create(formData)
      setClients((prev) => [res.data, ...prev])
      setShowForm(false)
      setFormData({ name: '', website_url: '', contact_person: '', contact_email: '', company_country: 'DE', notes: '' })
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Mandant und alle zugehörigen Scans löschen?')) return
    setDeleting(id)
    try {
      await clientsApi.delete(id)
      setClients((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  const filtered = clients.filter((c) =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.website_url.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-deudat-gray-900">Mandanten</h1>
          <p className="text-deudat-gray-500 mt-1">{clients.length} Mandanten</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Neuer Mandant
        </button>
      </div>

      {/* New client form */}
      {showForm && (
        <div className="card p-6">
          <h3 className="font-semibold text-deudat-gray-900 mb-4">Neuen Mandanten anlegen</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Name *</label>
                <input type="text" className="input" required
                  value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="Musterfirma GmbH"
                />
              </div>
              <div>
                <label className="label">Website *</label>
                <input type="text" className="input" required
                  value={formData.website_url} onChange={(e) => setFormData(p => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://musterfirma.de"
                />
              </div>
              <div>
                <label className="label">Ansprechpartner</label>
                <input type="text" className="input"
                  value={formData.contact_person} onChange={(e) => setFormData(p => ({ ...p, contact_person: e.target.value }))}
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="label">Kontakt-E-Mail</label>
                <input type="email" className="input"
                  value={formData.contact_email} onChange={(e) => setFormData(p => ({ ...p, contact_email: e.target.value }))}
                  placeholder="kontakt@musterfirma.de"
                />
              </div>
              <div>
                <label className="label">Land des Unternehmens</label>
                <select className="input" value={formData.company_country}
                  onChange={(e) => setFormData(p => ({ ...p, company_country: e.target.value }))}>
                  {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>{name} ({code})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Abbrechen
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Speichern...' : 'Mandant anlegen'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-deudat-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mandanten suchen..."
          className="input pl-10"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="spinner w-6 h-6 border-2 border-deudat-red border-t-transparent rounded-full mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-deudat-gray-400">
          Noch keine Mandanten angelegt
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <div key={client.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-deudat-gray-900">{client.name}</h3>
                  <div className="text-xs text-deudat-gray-400 mt-0.5">
                    {COUNTRY_NAMES[client.company_country] || client.company_country}
                  </div>
                </div>
                {client.last_scan_score !== null && (
                  <div className={`text-lg font-bold ${
                    client.last_scan_score >= 75 ? 'text-green-600' :
                    client.last_scan_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(client.last_scan_score)}
                  </div>
                )}
              </div>

              <a href={client.website_url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 text-sm text-deudat-red hover:underline mb-3"
                 onClick={(e) => e.stopPropagation()}>
                <Globe className="w-3.5 h-3.5" />
                {client.website_url.replace(/^https?:\/\//, '')}
                <ExternalLink className="w-3 h-3" />
              </a>

              {client.contact_email && (
                <div className="flex items-center gap-1.5 text-sm text-deudat-gray-500 mb-3">
                  <Mail className="w-3.5 h-3.5" />
                  {client.contact_email}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-deudat-gray-400 mb-4">
                <span>{client.scan_count} Scans</span>
                {client.last_scan_date && (
                  <span>Zuletzt: {format(new Date(client.last_scan_date), 'dd.MM.yy', { locale: de })}</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/scans/new?client=${client.id}&url=${encodeURIComponent(client.website_url)}`)}
                  className="btn-primary flex-1 text-sm py-1.5"
                >
                  Neuer Scan
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  disabled={deleting === client.id}
                  className="p-1.5 text-deudat-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
