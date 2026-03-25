import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpenIcon,
  KeyIcon,
  UserIcon,
  PhoneIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import api from '../services/api'

const Join = () => {
  const [searchParams] = useSearchParams()
  const codeFromUrl = searchParams.get('code') || ''
  const navigate = useNavigate()

  const [step, setStep] = useState(codeFromUrl ? 'form' : 'code')
  const [inviteCode, setInviteCode] = useState(codeFromUrl)
  const [codeInfo, setCodeInfo] = useState(null) // { shopName, shopId }
  const [formData, setFormData] = useState({ name: '', identifier: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Validate invite code when coming from URL
  useEffect(() => {
    if (codeFromUrl) validateCode(codeFromUrl)
  }, [])

  const validateCode = async (code) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await api.get(`/auth/invite/${code}`)
      setCodeInfo(res.data)
      setStep('form')
    } catch {
      setError('Invalid or expired invite code.')
      setStep('code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    if (inviteCode.trim()) validateCode(inviteCode.trim())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)
    try {
      await api.post('/auth/join', {
        inviteCode,
        name: formData.name,
        identifier: formData.identifier,
        password: formData.password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">You're in!</h2>
          <p className="mt-2 text-slate-500 text-sm">
            Your account has been created. Redirecting to sign in…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal nav */}
      <header className="bg-white border-b border-slate-100 px-6 h-14 flex items-center">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <BookOpenIcon className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">CashBook <span className="text-blue-600">Pro</span></span>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Step 1 — enter invite code */}
          {step === 'code' && (
            <>
              <div className="mb-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <KeyIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Join a workspace</h2>
                <p className="mt-1.5 text-slate-500 text-sm">Enter the invite code shared by your manager</p>
              </div>

              {error && (
                <div className="mb-5 flex gap-3 items-start bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Invite Code</label>
                  <div className="relative">
                    <KeyIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text" required
                      className="input-field pl-10 uppercase tracking-widest font-mono"
                      placeholder="e.g. ABC123"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full btn-primary py-3">
                  {isLoading ? (
                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                  ) : 'Continue'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{' '}
                <button onClick={() => navigate('/login')} className="font-semibold text-blue-600 hover:text-blue-700">
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* Step 2 — fill registration details */}
          {step === 'form' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
                <p className="mt-1.5 text-slate-500 text-sm">Joining workspace</p>
                {codeInfo && (
                  <div className="mt-3 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <BookOpenIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-500 font-medium">Workspace</p>
                      <p className="text-sm font-bold text-blue-900">{codeInfo.shopName}</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-5 flex gap-3 items-start bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text" required
                      className="input-field pl-10"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email or Phone</label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text" required
                      className="input-field pl-10"
                      placeholder="your@email.com or 9876543210"
                      value={formData.identifier}
                      onChange={e => setFormData({ ...formData, identifier: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'} required
                      className="input-field pl-10 pr-10"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="password" required
                      className="input-field pl-10"
                      placeholder="Repeat your password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 mt-2">
                  {isLoading ? (
                    <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
                  ) : 'Create Account'}
                </button>
              </form>

              <button
                onClick={() => { setStep('code'); setError('') }}
                className="mt-4 w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Use a different invite code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Join
