import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle 401
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
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { email: string; password: string; first_name: string; last_name: string }) =>
    api.post('/auth/register', data),

  me: () => api.get('/auth/me'),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }),
}

// ─── Clients ─────────────────────────────────────────────────
export const clientsApi = {
  list: () => api.get('/clients'),
  create: (data: any) => api.post('/clients', data),
  get: (id: string) => api.get(`/clients/${id}`),
  update: (id: string, data: any) => api.patch(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
}

// ─── Scans ───────────────────────────────────────────────────
export const scansApi = {
  list: (params?: { client_id?: string; status?: string; limit?: number; offset?: number }) =>
    api.get('/scans', { params }),

  create: (data: {
    target_url: string
    client_id?: string
    scan_name?: string
    scan_config?: any
  }) => api.post('/scans', data),

  get: (id: string) => api.get(`/scans/${id}`),

  updateFinding: (scanId: string, findingId: string, data: { is_included_in_report: boolean }) =>
    api.patch(`/scans/${scanId}/findings/${findingId}`, data),

  delete: (id: string) => api.delete(`/scans/${id}`),
}

// ─── Reports ─────────────────────────────────────────────────
export const reportsApi = {
  generate: (scanId: string, format: 'pdf' | 'docx', language: string = 'de') =>
    api.post(`/reports/generate/${scanId}`, null, { params: { format, language } }),

  download: (reportId: string) =>
    api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),

  listByScan: (scanId: string) =>
    api.get(`/reports/scan/${scanId}`),
}
