import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon,
  SparklesIcon, CalendarDaysIcon, UserGroupIcon, BoltIcon,
  ShieldCheckIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const PLAN_COLORS = {
  monthly:    'border-slate-200',
  yearly:     'border-blue-400 ring-2 ring-blue-100',
  yearly_pro: 'border-violet-400 ring-2 ring-violet-100',
}
const PLAN_BTN = {
  monthly:    'bg-slate-800 hover:bg-slate-900 text-white',
  yearly:     'bg-blue-600 hover:bg-blue-700 text-white',
  yearly_pro: 'bg-violet-600 hover:bg-violet-700 text-white',
}
const PLAN_BADGE_COLORS = {
  'Save ₹600':   'bg-emerald-100 text-emerald-700',
  'Most Popular':'bg-violet-100 text-violet-700',
}

// Load Razorpay script dynamically
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload  = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Billing() {
  const { user } = useAuth()
  const [plans,   setPlans]   = useState([])
  const [status,  setStatus]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(null)   // planId being processed
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/billing/plans'),
      api.get('/billing/status'),
    ]).then(([pRes, sRes]) => {
      setPlans(pRes.data)
      setStatus(sRes.data)
    }).catch(() => setError('Failed to load billing info'))
    .finally(() => setLoading(false))
  }, [])

  const handleSubscribe = async (plan) => {
    setError('')
    setPaying(plan.id)
    try {
      const loaded = await loadRazorpay()
      if (!loaded) { setError('Payment gateway failed to load. Try again.'); setPaying(null); return }

      const orderRes = await api.post('/billing/create-order', { planId: plan.id })
      const { orderId, amount, currency, keyId, shopName, email } = orderRes.data

      const options = {
        key:         keyId,
        amount,
        currency,
        name:        'Managecash',
        description: `${plan.name} Plan`,
        order_id:    orderId,
        prefill:     { name: user?.name, email },
        notes:       { planId: plan.id },
        theme:       { color: '#2563EB' },
        handler: async (response) => {
          try {
            await api.post('/billing/verify', {
              planId:              plan.id,
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
            })
            setSuccess(`🎉 ${plan.name} activated! Your subscription is now active.`)
            // Refresh status
            const sRes = await api.get('/billing/status')
            setStatus(sRes.data)
          } catch {
            setError('Payment received but activation failed. Contact support.')
          } finally {
            setPaying(null)
          }
        },
        modal: { ondismiss: () => setPaying(null) },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(`Payment failed: ${resp.error.description}`)
        setPaying(null)
      })
      rzp.open()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate payment')
      setPaying(null)
    }
  }

  // Trial days remaining
  const trialDays = status?.status === 'trial' && status?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(status.trialEndsAt) - new Date()) / 86400000))
    : null

  const isActive    = status?.status === 'active'
  const currentPlan = plans.find(p => p.id === status?.plan)

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-3 gap-6">{[1,2,3].map(i => <div key={i} className="h-96 bg-slate-200 rounded-2xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your Managecash plan</p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium flex-1">{success}</p>
          <button onClick={() => setSuccess('')}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium flex-1">{error}</p>
          <button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Current Status Card */}
      {status && (
        <div className={`card p-6 border-l-4 ${isActive ? 'border-l-emerald-500' : trialDays !== null && trialDays <= 5 ? 'border-l-amber-400' : 'border-l-blue-500'}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Status</p>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-100 text-emerald-700' :
                  status.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {isActive ? 'Active' : status.status === 'trial' ? 'Trial' : status.status}
                </span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                {isActive && currentPlan ? currentPlan.name : 'Free Trial'}
              </p>
              {isActive && status.subscriptionEndsAt && (
                <p className="text-sm text-slate-500 mt-1">
                  <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                  Renews / Expires: <span className="font-medium text-slate-700">{fmtDate(status.subscriptionEndsAt)}</span>
                </p>
              )}
              {status.status === 'trial' && (
                <p className={`text-sm mt-1 font-medium ${trialDays <= 5 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {trialDays <= 5
                    ? `⚠️ Trial ends in ${trialDays} day${trialDays !== 1 ? 's' : ''} — upgrade now to keep access`
                    : `Trial ends: ${fmtDate(status.trialEndsAt)} (${trialDays} days left)`}
                </p>
              )}
            </div>
            {isActive && currentPlan && (
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{fmt(currentPlan.price)}</p>
                <p className="text-xs text-slate-400">/{currentPlan.cycle === 'monthly' ? 'month' : 'year'}</p>
                <p className="text-xs text-slate-400 mt-1">{currentPlan.maxStaff} staff members</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Choose a Plan</h2>
        <p className="text-sm text-slate-500 mb-5">All plans include unlimited transactions and all features. Yearly plans save you money.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map(plan => {
            const isCurrent = status?.plan === plan.id && isActive
            return (
              <div key={plan.id} className={`card p-6 flex flex-col border-2 transition-all ${PLAN_COLORS[plan.id] || 'border-slate-200'}`}>
                {/* Badge */}
                <div className="h-6 mb-3">
                  {plan.badge && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_BADGE_COLORS[plan.badge] || 'bg-slate-100 text-slate-600'}`}>
                      {plan.badge}
                    </span>
                  )}
                </div>

                {/* Name & Price */}
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-bold text-slate-900">{fmt(plan.price)}</span>
                  <span className="text-sm text-slate-400 ml-1">/{plan.cycle === 'monthly' ? 'mo' : 'yr'}</span>
                  {plan.cycle === 'yearly' && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      ≈ {fmt(Math.round(plan.price / 12))}/month
                    </p>
                  )}
                </div>

                {/* Staff limit */}
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-slate-50 rounded-xl">
                  <UserGroupIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700">{plan.maxStaff} staff members</span>
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={paying === plan.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${PLAN_BTN[plan.id]} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {paying === plan.id ? 'Processing…' : `Get ${plan.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Feature comparison note */}
      <div className="card p-5 bg-slate-50 border border-slate-200">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Secure payments via Razorpay</p>
            <p className="text-xs text-slate-500 mt-0.5">All payments are encrypted and processed securely. You'll receive a confirmation once payment is complete. For support, contact us.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
