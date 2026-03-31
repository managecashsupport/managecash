import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockClosedIcon, EnvelopeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import api from '../services/api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <LockClosedIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">Manage<span className="text-blue-600">Cash</span></span>
        </div>

        {sent ? (
          <div className="card p-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
            <p className="mt-2 text-sm text-slate-500">
              If <span className="font-semibold text-slate-700">{email}</span> is registered as an admin account, a password reset link has been sent. It expires in 1 hour.
            </p>
            <button onClick={() => navigate('/login')} className="mt-6 btn-primary w-full py-2.5">
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Forgot password?</h2>
              <p className="mt-1.5 text-slate-500 text-sm">Enter your admin email and we'll send you a reset link.</p>
            </div>

            {error && (
              <div className="mb-5 flex gap-3 items-start bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Admin Email</label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email" required autoFocus
                    className="input-field pl-10"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                ) : 'Send Reset Link'}
              </button>
            </form>

            <button onClick={() => navigate('/login')} className="mt-5 w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  )
}
