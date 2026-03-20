import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, Search, Users, FileText, Settings,
  Shield, LogOut, Globe, ChevronDown, Bell, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import i18n from '../i18n/i18n'

const NAV_ITEMS = [
  { key: 'dashboard', path: '/dashboard', icon: LayoutDashboard },
  { key: 'scans', path: '/scans', icon: Search },
  { key: 'clients', path: '/clients', icon: Users },
  { key: 'reports', path: '/scans', icon: FileText },
  { key: 'settings', path: '/settings', icon: Settings },
]

export default function Layout() {
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const isAdmin = user?.role === 'super_admin' || user?.role === 'saas_admin'
  const isDeudat = user?.role === 'super_admin' || user?.role === 'deudat_employee'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleLang = () => {
    const newLang = i18n.language === 'de' ? 'en' : 'de'
    i18n.changeLanguage(newLang)
    localStorage.setItem('lang', newLang)
    setLangOpen(false)
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-deudat-red text-white'
        : 'text-deudat-gray-600 hover:bg-deudat-gray-100 hover:text-deudat-gray-900'
    }`

  const Sidebar = () => (
    <aside className="w-64 bg-white border-r border-deudat-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-deudat-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-deudat-red rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-deudat-gray-900 text-sm">DSGVO-Audit Pro</div>
            <div className="text-xs text-deudat-gray-400">by Deudat</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ key, path, icon: Icon }) => (
          <NavLink key={key} to={path} className={navLinkClass}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {t(key)}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink to="/admin" className={navLinkClass}>
            <Shield className="w-4 h-4 flex-shrink-0" />
            {t('admin')}
          </NavLink>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-deudat-gray-200">
        {isDeudat && (
          <div className="mb-3 px-3 py-1.5 bg-deudat-red/10 rounded-lg text-xs font-medium text-deudat-red text-center">
            Deudat {user?.role === 'super_admin' ? 'Admin' : 'Mitarbeiter'}
          </div>
        )}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-deudat-gray-200 rounded-full flex items-center justify-center text-deudat-gray-600 font-medium text-sm">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-deudat-gray-900 truncate">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-deudat-gray-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-deudat-gray-600
                     hover:text-deudat-red hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-deudat-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
          <button
            className="absolute top-4 right-4 text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-deudat-gray-200 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            className="md:hidden p-1.5 rounded-lg text-deudat-gray-500 hover:bg-deudat-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {/* Language switcher */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-deudat-gray-600
                         hover:text-deudat-gray-900 hover:bg-deudat-gray-100 rounded-lg transition-colors"
            >
              <Globe className="w-4 h-4" />
              {i18n.language.toUpperCase()}
            </button>

            {/* Notification bell */}
            <button className="p-1.5 rounded-lg text-deudat-gray-500 hover:bg-deudat-gray-100 relative">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
