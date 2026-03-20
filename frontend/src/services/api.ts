import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { DEMO_SCANS, DEMO_CLIENTS, DEMO_USER } from './demoData'

const API_URL = import.meta.env.VITE_API_URL || '/api'
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

// ─── Demo helpers ────────────────────────────────────────────
function demoResponse(data: any) {
  return Promise.resolve({ data })
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, null, {
            params: { refresh_token: refreshToken },
          })
          const { access_token, refresh_token, user } = res.data
          useAuthStore.getState().setAuth(user, access_token, refresh_token)
          original.headers.Authorization = `Bearer ${access_token}`
          return api(original)
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => {
    if (DEMO_MODE) {
      if (email === 'admin@deudat.de' && password === 'DsgvoAudit2024!') {
        return demoResponse({
          access_token: 'demo-token',
          refresh_token: 'demo-refresh',
          user: DEMO_USER,
        })
      }
      return Promise.reject({ response: { data: { detail: 'Demo: Verwenden Sie admin@deudat.de / DsgvoAudit2024!' } } })
    }
    return api.post('/auth/login', { email, password })
  },

  register: (data: any) =>
    DEMO_MODE
      ? Promise.reject({ response: { data: { detail: 'Demo-Modus: Registrierung nicht verfügbar' } } })
      : api.post('/auth/register', data),

  me: () => DEMO_MODE ? demoResponse(DEMO_USER) : api.get('/auth/me'),

  changePassword: (current_password: string, new_password: string) =>
    DEMO_MODE ? demoResponse({ message: 'Demo: Passwort geändert' }) : api.post('/auth/change-password', { current_password, new_password }),
}

// ─── Clients ─────────────────────────────────────────────────
export const clientsApi = {
  list: () => DEMO_MODE ? demoResponse(DEMO_CLIENTS) : api.get('/clients'),
  create: (data: any) =>
    DEMO_MODE
      ? demoResponse({ ...data, id: Date.now().toString(), scan_count: 0, organization_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      : api.post('/clients', data),
  get: (id: string) => DEMO_MODE ? demoResponse(DEMO_CLIENTS.find(c => c.id === id) || DEMO_CLIENTS[0]) : api.get(`/clients/${id}`),
  update: (id: string, data: any) => DEMO_MODE ? demoResponse({ ...DEMO_CLIENTS[0], ...data }) : api.patch(`/clients/${id}`, data),
  delete: (id: string) => DEMO_MODE ? demoResponse({}) : api.delete(`/clients/${id}`),
}

// ─── Scans ───────────────────────────────────────────────────
export const scansApi = {
  list: (params?: any) => DEMO_MODE ? demoResponse(DEMO_SCANS) : api.get('/scans', { params }),

  create: (data: any) => {
    if (DEMO_MODE) {
      const newScan = {
        id: Date.now().toString(),
        target_url: data.target_url,
        scan_name: data.scan_name || data.target_url,
        status: 'completed',
        progress: 100,
        pages_scanned: 23,
        cookies_found: 7,
        trackers_found: 2,
        overall_score: 58,
        score_breakdown: {},
        ai_analysis: `**Demo-Analyse für ${data.target_url}**\n\nDies ist eine Demo-Analyse. In der Vollversion wird Ihre Website durch Claude AI analysiert.\n\nBei echtem Betrieb würden hier echte Befunde zur DSGVO-Konformität erscheinen.`,
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        client_id: data.client_id || null,
        findings: DEMO_SCANS[0].findings,
      }
      return demoResponse(newScan)
    }
    return api.post('/scans', data)
  },

  get: (id: string) => {
    if (DEMO_MODE) {
      const scan = DEMO_SCANS.find(s => s.id === id)
      return demoResponse(scan || DEMO_SCANS[0])
    }
    return api.get(`/scans/${id}`)
  },

  updateFinding: (scanId: string, findingId: string, data: any) =>
    DEMO_MODE ? demoResponse({}) : api.patch(`/scans/${scanId}/findings/${findingId}`, data),

  delete: (id: string) => DEMO_MODE ? demoResponse({}) : api.delete(`/scans/${id}`),
}

// ─── Reports ─────────────────────────────────────────────────
export const reportsApi = {
  generate: (scanId: string, format: 'pdf' | 'docx', language: string = 'de') =>
    DEMO_MODE
      ? demoResponse({ report_id: 'demo-report', format, download_url: '#' })
      : api.post(`/reports/generate/${scanId}`, null, { params: { format, language } }),

  download: (reportId: string) =>
    DEMO_MODE
      ? Promise.resolve({ data: new Blob(['Demo-Report: Im Vollbetrieb wird hier ein echter PDF/Word-Bericht generiert.'], { type: 'text/plain' }) })
      : api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),

  listByScan: (scanId: string) => DEMO_MODE ? demoResponse([]) : api.get(`/reports/scan/${scanId}`),
}
