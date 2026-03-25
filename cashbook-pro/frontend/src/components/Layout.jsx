import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  HomeIcon, PlusCircleIcon, ChartBarIcon, ClockIcon,
  Cog6ToothIcon, CreditCardIcon, Bars3Icon, XMarkIcon,
  ArrowRightOnRectangleIcon, UsersIcon, UserGroupIcon,
  ArchiveBoxIcon, ShoppingCartIcon, BanknotesIcon, ReceiptPercentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

const mainNav = [
  { name: 'Dashboard',       href: '/dashboard',       icon: HomeIcon },
  { name: 'Add Transaction', href: '/add-transaction', icon: PlusCircleIcon },
  { name: 'History',         href: '/history',         icon: ClockIcon },
  { name: 'Analytics',       href: '/analytics',       icon: ChartBarIcon },
  { name: 'Customers',       href: '/customers',       icon: UserGroupIcon },
  { name: 'Stock',           href: '/stock',           icon: ArchiveBoxIcon },
  { name: 'Purchases',       href: '/purchases',       icon: ShoppingCartIcon },
]

const adminNav = [
  { name: 'Staff',    href: '/staff',    icon: UsersIcon },
  { name: 'Salary',   href: '/salary',   icon: BanknotesIcon },
  { name: 'Expenses', href: '/expenses', icon: ReceiptPercentIcon },
]

const accountNav = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
]

const NavItem = ({ item, active, onClick }) => (
  <Link
    to={item.href}
    onClick={onClick}
    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
      active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${
      active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
    }`} />
    <span className="flex-1">{item.name}</span>
    {active && <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_2px_rgba(96,165,250,0.5)]" />}
  </Link>
)

const SidebarInner = ({ activeHref, onLinkClick, onLogout, user, isAdmin }) => (
  <div className="flex flex-col h-full bg-slate-900">
    {/* Brand */}
    <div className="flex items-center gap-3 h-16 px-5 border-b border-white/5 flex-shrink-0">
      <img src="/logo.png" alt="Managecash" className="h-8 w-8 rounded-lg object-contain" />
      <span className="font-bold text-white text-lg tracking-tight">Managecash</span>
    </div>

    {/* Navigation */}
    <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
      <div>
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Main</p>
        <div className="space-y-0.5">
          {mainNav.map(item => (
            <NavItem key={item.name} item={item} active={activeHref === item.href} onClick={onLinkClick} />
          ))}
          {isAdmin && adminNav.map(item => (
            <NavItem key={item.name} item={item} active={activeHref === item.href} onClick={onLinkClick} />
          ))}
        </div>
      </div>
      <div>
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Account</p>
        <div className="space-y-0.5">
          {accountNav.map(item => (
            <NavItem key={item.name} item={item} active={activeHref === item.href} onClick={onLinkClick} />
          ))}
          {/* Subscription — admin only */}
          {isAdmin && (
            <NavItem
              item={{ name: 'Subscription', href: '/billing', icon: CreditCardIcon }}
              active={activeHref === '/billing'}
              onClick={onLinkClick}
            />
          )}
        </div>
      </div>
    </nav>

    {/* User profile */}
    <div className="flex-shrink-0 p-4 border-t border-white/5">
      <div className="group flex items-center gap-3 rounded-xl p-2 hover:bg-white/5 transition-colors cursor-default">
        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg">
          <span className="text-sm font-bold text-white">{user?.name?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 capitalize truncate">{user?.role}</p>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
)

// Trial / expiry warning banner
const SubscriptionBanner = ({ user, isAdmin, navigate }) => {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !isAdmin) return null

  const status = user?.subscriptionStatus
  const now = new Date()

  let msg = null
  let urgent = false

  if (status === 'trial' && user?.trialEndsAt) {
    const days = Math.max(0, Math.ceil((new Date(user.trialEndsAt) - now) / 86400000))
    if (days <= 5) {
      msg = `Your free trial ends in ${days} day${days !== 1 ? 's' : ''}. Upgrade now to keep access.`
      urgent = days <= 2
    }
  } else if (status === 'active' && user?.subscriptionEndsAt) {
    const days = Math.max(0, Math.ceil((new Date(user.subscriptionEndsAt) - now) / 86400000))
    if (days <= 7) {
      msg = `Your subscription expires in ${days} day${days !== 1 ? 's' : ''}. Renew to avoid interruption.`
      urgent = days <= 2
    }
  } else if (status === 'grace_period') {
    msg = 'Your subscription has expired. Renew now to restore full access.'
    urgent = true
  }

  if (!msg) return null

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
      urgent ? 'bg-red-600 text-white' : 'bg-amber-50 border-b border-amber-200 text-amber-800'
    }`}>
      <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{msg}</span>
      <button
        onClick={() => navigate('/billing')}
        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
          urgent ? 'bg-white text-red-600 hover:bg-red-50' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'
        }`}
      >
        Upgrade
      </button>
      <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

const Layout = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeHref = location.pathname
  const isAdmin = user?.role === 'admin'

  if (!isAuthenticated) return <Outlet />

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-64 shadow-2xl">
            <SidebarInner
              activeHref={activeHref}
              onLinkClick={() => setSidebarOpen(false)}
              onLogout={logout}
              user={user}
              isAdmin={isAdmin}
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-[18px] right-3 p-1.5 rounded-lg bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 shadow-xl">
        <SidebarInner activeHref={activeHref} onLogout={logout} user={user} isAdmin={isAdmin} />
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Trial / expiry banner */}
        <SubscriptionBanner user={user} isAdmin={isAdmin} navigate={navigate} />

        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Managecash" className="h-7 w-7 rounded-lg object-contain" />
              <span className="font-bold text-slate-900">Managecash</span>
            </div>
            <div className="w-9" />
          </div>
        </header>

        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
