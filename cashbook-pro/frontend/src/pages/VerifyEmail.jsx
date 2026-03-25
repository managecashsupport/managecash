import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [shopId, setShopId] = useState('')
  const [username, setUsername] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('No verification token found in the link.')
      return
    }

    fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShopId(data.shopId)
          setUsername(data.username)
          setStatus('success')
        } else {
          setStatus('error')
          setErrorMsg(data.error || 'Verification failed.')
        }
      })
      .catch(() => {
        setStatus('error')
        setErrorMsg('Something went wrong. Please try again.')
      })
  }, [])

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Verifying your email…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md card p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <XCircleIcon className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Verification failed</h2>
          <p className="mt-2 text-sm text-slate-500">{errorMsg}</p>
          <p className="mt-1 text-sm text-slate-500">
            The link may have expired. Go back and request a new one.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-all"
          >
            Back to Register
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md card p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Email verified!</h2>
        <p className="mt-2 text-slate-500 text-sm">
          Your account is now active. Sign in to start your 14-day free trial.
        </p>

        <div className="mt-6 bg-slate-50 rounded-xl p-4 text-left border border-slate-200 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your login details</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Business ID</span>
            <span className="text-sm font-bold text-slate-800 font-mono">{shopId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Username</span>
            <span className="text-sm font-bold text-blue-600 font-mono">{username}</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all"
        >
          Go to Sign In
        </button>
      </div>
    </div>
  )
}
