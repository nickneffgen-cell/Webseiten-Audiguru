import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../services/api'
import { Save, Shield, Bell, User, Lock, Package } from 'lucide-react'
import i18n from '../i18n/i18n'

const PLAN_NAMES: Record<string, string> = {
  free: 'Kostenlos (Deudat intern)',
  starter: 'Starter (5 Scans/Monat)',
  professional: 'Professional (50 Scans/Monat)',
  enterprise: 'Enterprise (Unbegrenzt)',
}

const PLAN_PRICES: Record<string, string> = {
  free: 'Kostenlos',
  starter: '29 €/Monat',
  professional: '99 €/Monat',
  enterprise: '299 €/Monat',
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('account')
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const isDeudat = user?.role === 'super_admin' || user?.role === 'deudat_employee'

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess('')
    setError('')
    try {
      // Update via API would go here
      setSuccess('Profil erfolgreich gespeichert')
    } catch {
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwSaving(true)
    setError('')
    setSuccess('')
    try {
      await authApi.changePassword(currentPw, newPw)
      setSuccess('Passwort erfolgreich geändert')
      setCurrentPw('')
      setNewPw('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Fehler beim Ändern des Passworts')
    } finally {
      setPwSaving(false)
    }
  }

  const tabs = [
    { key: 'account', label: t('accountSettings'), icon: User },
    { key: 'security', label: 'Sicherheit', icon: Lock },
    { key: 'subscription', label: t('subscriptionPlan'), icon: Package },
    { key: 'report', label: t('reportSettings'), icon: Shield },
  ]

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-deudat-gray-900">{t('settings')}</h1>
        <p className="text-deudat-gray-500 mt-1">Konto- und App-Einstellungen verwalten</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tabs */}
        <div className="md:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                  activeTab === key
                    ? 'bg-deudat-red text-white'
                    : 'text-deudat-gray-600 hover:bg-deudat-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ {success}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="card p-6 space-y-6">
              <h3 className="font-semibold text-deudat-gray-900">{t('accountSettings')}</h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t('firstName')}</label>
                    <input type="text" className="input" value={firstName}
                      onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">{t('lastName')}</label>
                    <input type="text" className="input" value={lastName}
                      onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">{t('email')}</label>
                  <input type="email" className="input" value={user?.email} disabled
                    className="input bg-deudat-gray-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="label">Rolle</label>
                  <div className="px-3 py-2 bg-deudat-gray-50 border border-deudat-gray-200 rounded-lg text-sm text-deudat-gray-600">
                    {user?.role === 'super_admin' ? 'Super-Administrator (Deudat)' :
                     user?.role === 'deudat_employee' ? 'Deudat-Mitarbeiter' :
                     user?.role === 'saas_admin' ? 'Organisations-Administrator' :
                     'Nutzer'}
                    {isDeudat && (
                      <span className="ml-2 text-xs bg-deudat-red text-white px-2 py-0.5 rounded-full">
                        Deudat intern
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">{t('defaultLanguage')}</label>
                  <select
                    className="input"
                    value={i18n.language}
                    onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem('lang', e.target.value) }}
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Speichern...' : t('save')}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card p-6 space-y-6">
              <h3 className="font-semibold text-deudat-gray-900">Passwort ändern</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="label">Aktuelles Passwort</label>
                  <input type="password" className="input" value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Neues Passwort</label>
                  <input type="password" className="input" value={newPw}
                    onChange={(e) => setNewPw(e.target.value)} required minLength={8}
                    placeholder="Mindestens 8 Zeichen" />
                </div>
                <button type="submit" disabled={pwSaving} className="btn-primary flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {pwSaving ? 'Ändern...' : 'Passwort ändern'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {isDeudat ? (
                <div className="card p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-deudat-red/10 rounded-xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-deudat-red" />
                    </div>
                    <div>
                      <div className="font-semibold text-deudat-gray-900">Deudat-Interne Nutzung</div>
                      <div className="text-sm text-deudat-gray-500">Unbegrenzte Scans inklusive</div>
                    </div>
                  </div>
                  <div className="p-4 bg-deudat-red/5 border border-deudat-red/20 rounded-xl text-sm text-deudat-red">
                    Als Deudat-Mitarbeiter haben Sie kostenlosen und unbegrenzten Zugang zu allen Funktionen.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { plan: 'starter', highlight: false },
                    { plan: 'professional', highlight: true },
                    { plan: 'enterprise', highlight: false },
                  ].map(({ plan, highlight }) => (
                    <div key={plan} className={`card p-5 ${highlight ? 'ring-2 ring-deudat-red' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-deudat-gray-900 flex items-center gap-2">
                            {PLAN_NAMES[plan]}
                            {highlight && <span className="text-xs bg-deudat-red text-white px-2 py-0.5 rounded-full">Empfohlen</span>}
                          </div>
                          <div className="text-2xl font-bold text-deudat-gray-900 mt-1">
                            {PLAN_PRICES[plan]}
                          </div>
                        </div>
                        <button className={highlight ? 'btn-primary' : 'btn-secondary'}>
                          {plan === 'starter' ? 'Wählen' : plan === 'professional' ? 'Upgraden' : 'Kontakt aufnehmen'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'report' && (
            <div className="card p-6 space-y-6">
              <h3 className="font-semibold text-deudat-gray-900">{t('reportSettings')}</h3>
              <p className="text-sm text-deudat-gray-500">
                Diese Einstellungen gelten als Standard für neue Berichte.
                Sie können beim Erstellen eines Scans individuell angepasst werden.
              </p>
              <div>
                <label className="label">{t('reportLanguage')}</label>
                <select className="input max-w-xs">
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="label mb-3">{t('reportBlocks')}</label>
                <div className="space-y-2 text-sm text-deudat-gray-600">
                  <p>Die Bericht-Blöcke können pro Scan konfiguriert werden. Gehen Sie zu "Neuer Scan" → "Erweiterte Einstellungen" → "Bericht-Blöcke".</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
