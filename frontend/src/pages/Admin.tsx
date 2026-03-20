import { useEffect, useState } from 'react'
import { Users, Building2, Activity, ShieldCheck } from 'lucide-react'
import { api } from '../services/api'

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    api.get('/stats').then((r) => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-deudat-gray-900">Verwaltung</h1>
        <p className="text-deudat-gray-500 mt-1">System-Übersicht und Administration</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Scans gesamt', value: stats.scans_total, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Abgeschlossen', value: stats.scans_completed, icon: ShieldCheck, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Nutzer', value: stats.users_total, icon: Users, color: 'text-deudat-red', bg: 'bg-red-50' },
            { label: 'Mandanten', value: stats.clients_total, icon: Building2, color: 'text-purple-500', bg: 'bg-purple-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card p-5">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-deudat-gray-900">{value}</div>
              <div className="text-sm text-deudat-gray-500">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold text-deudat-gray-900 mb-4">System-Informationen</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-deudat-gray-100">
            <span className="text-deudat-gray-500">Anwendung</span>
            <span className="font-medium">DSGVO-Audit Pro v1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-deudat-gray-100">
            <span className="text-deudat-gray-500">Hersteller</span>
            <span className="font-medium">Deudat GmbH</span>
          </div>
          <div className="flex justify-between py-2 border-b border-deudat-gray-100">
            <span className="text-deudat-gray-500">KI-Modell</span>
            <span className="font-medium">Claude (Anthropic)</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-deudat-gray-500">Scanner-Engine</span>
            <span className="font-medium">Playwright + BeautifulSoup4</span>
          </div>
        </div>
      </div>
    </div>
  )
}
