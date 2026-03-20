import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Shield, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react'
import { authApi, DEMO_MODE } from '../services/api'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('admin@deudat.de')
  const [password, setPassword] = useState('DsgvoAudit2024!')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let res
      if (mode === 'login') {
        res = await authApi.login(email, password)
      } else {
        res = await authApi.register({ email, password, first_name: firstName, last_name: lastName })
      }

      const { access_token, refresh_token, user } = res.data
      setAuth(user, access_token, refresh_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-deudat-red flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-xl">DSGVO-Audit Pro</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Datenschutz-Compliance<br />auf Knopfdruck
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Scannen Sie Webseiten automatisch auf DSGVO-, BDSG- und
            ePrivacy-Konformität. Professionelle Berichte in PDF und Word –
            direkt zum Download.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: 'Prüfpunkte', value: '50+' },
              { label: 'Rechtliche Referenzen', value: '20+' },
              { label: 'Bericht-Formate', value: 'PDF + DOCX' },
              { label: 'KI-gestützte Analyse', value: 'Claude AI' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl p-4">
                <div className="text-white font-bold text-xl">{value}</div>
                <div className="text-white/70 text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-white/50 text-sm">
          © 2024 Deudat GmbH · Alle Rechte vorbehalten
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-deudat-red rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-deudat-gray-900 text-xl">DSGVO-Audit Pro</span>
          </div>

          {/* Demo banner */}
          {DEMO_MODE && (
            <div className="mb-6 p-4 bg-deudat-red/5 border border-deudat-red/20 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-deudat-red flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-deudat-red text-sm">Demo-Modus</div>
                <div className="text-sm text-deudat-gray-600 mt-0.5">
                  Sie sehen eine Live-Demo mit Beispieldaten. Zugangsdaten sind vorausgefüllt.
                </div>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-deudat-gray-900 mb-1">
            {mode === 'login' ? t('loginTitle') : 'Konto erstellen'}
          </h2>
          <p className="text-deudat-gray-500 mb-8">
            {mode === 'login' ? t('loginSubtitle') : 'Registrieren Sie sich für DSGVO-Audit Pro'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('firstName')}</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" required placeholder="Max" />
                </div>
                <div>
                  <label className="label">{t('lastName')}</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" required placeholder="Mustermann" />
                </div>
              </div>
            )}

            <div>
              <label className="label">{t('email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required placeholder="name@unternehmen.de" autoComplete="email" />
            </div>

            <div>
              <label className="label">{t('password')}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input pr-10" required placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-deudat-gray-400 hover:text-deudat-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Anmelden...
                </span>
              ) : mode === 'login' ? t('login') : 'Registrieren'}
            </button>
          </form>

          {!DEMO_MODE && (
            <div className="mt-6 text-center text-sm text-deudat-gray-500">
              {mode === 'login' ? (
                <>
                  {t('noAccount')}{' '}
                  <button onClick={() => setMode('register')} className="text-deudat-red font-medium hover:underline">
                    Registrieren
                  </button>
                </>
              ) : (
                <>
                  {t('hasAccount')}{' '}
                  <button onClick={() => setMode('login')} className="text-deudat-red font-medium hover:underline">
                    {t('login')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
