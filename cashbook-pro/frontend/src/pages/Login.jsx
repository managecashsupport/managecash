import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  BuildingStorefrontIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline'

const Login = () => {
  const [searchParams] = useSearchParams()
  const shopFromUrl = searchParams.get('shop') || ''

  // if employee link → default to staff tab, else admin
  const [tab, setTab] = useState(shopFromUrl ? 'staff' : 'admin')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [resendDone, setResendDone] = useState(false)

  const [staffForm, setStaffForm] = useState({ identifier: '', password: '' })
  const [adminForm, setAdminForm] = useState({ shopId: shopFromUrl, username: '', password: '' })

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    let result
    if (tab === 'staff') {
      // Staff: identifier (email/phone) acts as username, shopId resolved by backend
      result = await login('', staffForm.identifier, staffForm.password)
    } else {
      result = await login(adminForm.shopId, adminForm.username, adminForm.password)
    }

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error)
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(result.email || '')
      }
    }
    setIsLoading(false)
  }

  const handleResendVerification = async () => {
    try {
      await import('../services/api').then(m => m.default.post('/auth/resend-verification', { email: unverifiedEmail }))
      setResendDone(true)
    } catch {}
  }

  const switchTab = (t) => {
    setTab(t)
    setError('')
    setShowPassword(false)
    setUnverifiedEmail('')
    setResendDone(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(37,99,235,0.35)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.25)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative flex flex-col h-full p-12">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Managecash" className="h-10 w-10 rounded-xl object-contain" />
            <span className="text-xl font-bold text-white">Managecash</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="max-w-sm">
              <h1 className="text-4xl font-bold text-white leading-snug mb-4">
                Smart cash flow for modern businesses
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed">
                Track every rupee, understand your finances, and grow with confidence.
              </p>

              <div className="mt-10 grid grid-cols-3 gap-3">
                {[
                  { value: '10K+', label: 'Transactions' },
                  { value: '500+', label: 'Businesses' },
                  { value: '99.9%', label: 'Uptime' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                {['Real-time cash tracking', 'Multi-user access control', 'Smart analytics & reports'].map(f => (
                  <div key={f} className="flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    <p className="text-sm text-slate-300">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-slate-600 text-xs">© 2025 Managecash. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <img src="/logo.png" alt="Managecash" className="h-9 w-9 rounded-xl object-contain" />
            <span className="text-lg font-bold text-slate-900">Managecash</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-1.5 text-slate-500 text-sm">Choose how you'd like to sign in</p>
          </div>

          {/* Tab toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => switchTab('staff')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'staff'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <PhoneIcon className="h-4 w-4" />
              Staff
            </button>
            <button
              type="button"
              onClick={() => switchTab('admin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheckIcon className="h-4 w-4" />
              Admin
            </button>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl">
              <div className="flex gap-3 items-start">
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-400" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              {unverifiedEmail && (
                <div className="mt-2 pl-8">
                  {resendDone ? (
                    <p className="text-xs text-emerald-600 font-medium">Verification email sent! Check your inbox.</p>
                  ) : (
                    <button type="button" onClick={handleResendVerification}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline underline-offset-2">
                      Resend verification email
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── STAFF fields ── */}
            {tab === 'staff' && (
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email or Phone
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="identifier" name="identifier" type="text" required
                    className="input-field pl-10"
                    placeholder="your@email.com or 9876543210"
                    value={staffForm.identifier}
                    onChange={e => setStaffForm({ ...staffForm, identifier: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* ── ADMIN fields ── */}
            {tab === 'admin' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="shopId" className="block text-sm font-medium text-slate-700">
                      Business ID
                    </label>
                    <span className="text-xs text-slate-400">Given at registration</span>
                  </div>
                  <div className="relative">
                    <BuildingStorefrontIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="shopId" name="shopId" type="text" required
                      className="input-field pl-10"
                      placeholder="e.g. kapil-electricals"
                      value={adminForm.shopId}
                      onChange={e => setAdminForm({ ...adminForm, shopId: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email / Phone / Username
                  </label>
                  <div className="relative">
                    <ShieldCheckIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="username" name="username" type="text" required
                      className="input-field pl-10"
                      placeholder="your@email.com or {shopId}_admin"
                      value={adminForm.username}
                      onChange={e => setAdminForm({ ...adminForm, username: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Password — shared */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'} required
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                  value={tab === 'staff' ? staffForm.password : adminForm.password}
                  onChange={e =>
                    tab === 'staff'
                      ? setStaffForm({ ...staffForm, password: e.target.value })
                      : setAdminForm({ ...adminForm, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 mt-2 text-base"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : `Sign in as ${tab === 'staff' ? 'Staff' : 'Admin'}`}
            </button>
          </form>

          {tab === 'staff' && (
            <p className="mt-4 text-center text-xs text-slate-400">
              Use the invite link shared by your manager to sign in
            </p>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
