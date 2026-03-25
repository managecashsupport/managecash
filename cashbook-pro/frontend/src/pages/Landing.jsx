import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChartBarIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  DevicePhoneMobileIcon,
  CheckIcon,
  ArrowRightIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: ChartBarIcon,
    title: 'Sales & Cash Analytics',
    desc: 'Real-time charts for daily sales, cash flow, top customers, and monthly comparisons — all at a glance.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ArchiveBoxIcon,
    title: 'Stock & Inventory',
    desc: 'Track your product stock levels. Get low-stock alerts before you run out. Know what\'s selling and what\'s sitting.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: ShoppingCartIcon,
    title: 'Purchases & Vendors',
    desc: 'Record purchases from suppliers, track vendor bills, and see exactly how much you\'re spending on restocking.',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: UserGroupIcon,
    title: 'Customer Wallet & Passbook',
    desc: 'Maintain a running ledger for each customer. Track credit, collect payments, and share a passbook anytime.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: BanknotesIcon,
    title: 'Staff & Salary Management',
    desc: 'Add staff, set salaries, record monthly payments, and track outstanding dues — no more manual payroll sheets.',
    color: 'bg-cyan-50 text-cyan-600',
  },
  {
    icon: ReceiptPercentIcon,
    title: 'Expense Tracking',
    desc: 'Categorise every business expense — rent, electricity, maintenance. See where your money is going each month.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: UsersIcon,
    title: 'Multi-staff Access',
    desc: 'Give your team role-based access. Staff log entries from their phone; you review everything from yours.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Works on Any Device',
    desc: 'Fully responsive — works seamlessly on mobile, tablet, and desktop without installing anything.',
    color: 'bg-teal-50 text-teal-600',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Secure & Isolated',
    desc: 'Your data is encrypted and completely isolated from other businesses. No one else can see your records.',
    color: 'bg-slate-50 text-slate-600',
  },
]

const plans = [
  {
    name: 'Monthly',
    price: '₹300',
    cycle: '/month',
    note: null,
    badge: null,
    maxStaff: 5,
    features: [
      '5 staff members',
      'Unlimited transactions',
      'Customer wallet & passbook',
      'Stock & inventory management',
      'Purchase & vendor tracking',
      'Expense management',
      'Salary management',
      'Analytics & reports',
      'WhatsApp notifications',
      'Village-wise customer filter',
    ],
    popular: false,
    btnClass: 'bg-slate-800 hover:bg-slate-900 text-white',
  },
  {
    name: 'Yearly Basic',
    price: '₹3,000',
    cycle: '/year',
    note: '≈ ₹250/month — Save ₹600',
    badge: 'Save ₹600',
    maxStaff: 5,
    features: [
      '5 staff members',
      'Unlimited transactions',
      'Customer wallet & passbook',
      'Stock & inventory management',
      'Purchase & vendor tracking',
      'Expense management',
      'Salary management',
      'Analytics & reports',
      'WhatsApp notifications',
      'Village-wise customer filter',
      'Priority support',
    ],
    popular: false,
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  {
    name: 'Yearly Pro',
    price: '₹5,000',
    cycle: '/year',
    note: '≈ ₹417/month',
    badge: 'Most Popular',
    maxStaff: 10,
    features: [
      '10 staff members',
      'Unlimited transactions',
      'Customer wallet & passbook',
      'Stock & inventory management',
      'Purchase & vendor tracking',
      'Expense management',
      'Salary management',
      'Analytics & reports',
      'WhatsApp notifications',
      'Village-wise customer filter',
      'Priority support',
      'Dedicated account manager',
    ],
    popular: true,
    btnClass: 'bg-violet-600 hover:bg-violet-700 text-white',
  },
]

const Landing = () => {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [showJoinBox, setShowJoinBox] = useState(false)

  const handleJoin = (e) => {
    e.preventDefault()
    if (inviteCode.trim()) {
      navigate(`/join?code=${inviteCode.trim()}`)
    }
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Managecash" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-bold text-slate-900 text-lg">Managecash</span>
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowJoinBox(!showJoinBox)}
              className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2"
            >
              Join with Code
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-secondary text-sm px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn-primary text-sm px-4 py-2"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Join with invite code dropdown */}
        {showJoinBox && (
          <div className="border-t border-slate-100 bg-white px-4 py-4">
            <div className="max-w-md mx-auto">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Have an invite code from your manager?
              </p>
              <form onSubmit={handleJoin} className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Enter invite code"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-primary px-5">
                  Join
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.3)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(124,58,237,0.2)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-32 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Built for Indian small businesses
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6 max-w-3xl mx-auto">
            The smartest way to manage your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              cash flow
            </span>
          </h1>

          <p className="text-slate-400 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Track every rupee coming in and going out. Give your staff access. Get instant analytics. All in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 text-base"
            >
              Start Free Trial
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-3.5 rounded-xl transition-all text-base"
            >
              Sign In
            </button>
          </div>

          <p className="mt-5 text-slate-500 text-sm">
            No credit card required · 14-day free trial · Cancel anytime
          </p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-sm mx-auto">
            {[
              { value: '10K+', label: 'Transactions tracked' },
              { value: '500+', label: 'Businesses' },
              { value: '99.9%', label: 'Uptime' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything your business needs
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Designed for shop owners, retailers, and small businesses who want to stay on top of their money.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card-hover p-6">
                <div className={`inline-flex p-3 rounded-xl ${f.color} mb-4`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Module highlights ── */}
      <section className="py-20 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">One app. Every business need.</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              From tracking daily sales to managing your entire inventory — Managecash covers it all.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: ArrowTrendingUpIcon, label: 'Sales Tracking',    color: 'from-blue-500/20 to-blue-600/5',    icon_color: 'text-blue-400' },
              { icon: ArchiveBoxIcon,      label: 'Inventory & Stock', color: 'from-orange-500/20 to-orange-600/5', icon_color: 'text-orange-400' },
              { icon: ShoppingCartIcon,    label: 'Purchases',         color: 'from-violet-500/20 to-violet-600/5', icon_color: 'text-violet-400' },
              { icon: UserGroupIcon,       label: 'Customer Wallet',   color: 'from-emerald-500/20 to-emerald-600/5',icon_color: 'text-emerald-400' },
              { icon: BanknotesIcon,       label: 'Salary & Staff',    color: 'from-cyan-500/20 to-cyan-600/5',    icon_color: 'text-cyan-400' },
              { icon: ReceiptPercentIcon,  label: 'Expenses',          color: 'from-pink-500/20 to-pink-600/5',    icon_color: 'text-pink-400' },
            ].map(m => (
              <div key={m.label} className={`flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-b ${m.color} border border-white/5 text-center`}>
                <div className={`p-3 rounded-xl bg-white/5 ${m.icon_color}`}>
                  <m.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-semibold text-white leading-tight">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-slate-500 text-lg">Up and running in minutes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Register your business',
                desc: 'Create your workspace with your business name. You get a unique Business ID.',
                color: 'text-blue-600 bg-blue-50',
              },
              {
                step: '02',
                title: 'Invite your staff',
                desc: 'Generate invite codes from your dashboard and share with your team. They join instantly.',
                color: 'text-violet-600 bg-violet-50',
              },
              {
                step: '03',
                title: 'Track & grow',
                desc: 'Staff logs cash in/out from their phone. You see everything in real-time on your dashboard.',
                color: 'text-emerald-600 bg-emerald-50',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${item.color} font-bold text-xl mb-5`}>
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-500 text-lg">All plans include a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card p-6 relative flex flex-col ${plan.popular ? 'ring-2 ring-violet-500 border-violet-200' : ''}`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${
                    plan.badge === 'Most Popular' ? 'bg-violet-600 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.cycle}</span>
                </div>
                {plan.note && (
                  <p className="text-xs text-emerald-600 font-medium mb-4">{plan.note}</p>
                )}
                {!plan.note && <div className="mb-4" />}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckIcon className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${plan.btnClass}`}
                >
                  Start Free Trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-20 bg-slate-900 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to take control of your cash?</h2>
          <p className="text-slate-400 mb-8">Join hundreds of businesses already using Managecash.</p>
          <button
            onClick={() => navigate('/register')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-base"
          >
            Create Your Free Account
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 border-t border-white/5 py-6 text-center">
        <p className="text-slate-500 text-sm">© 2025 Managecash. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Landing
