import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  PlusCircleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  CurrencyRupeeIcon, CalendarIcon, CreditCardIcon,
  ExclamationTriangleIcon, ChartBarIcon,
} from '@heroicons/react/24/outline'
import TransactionCard from '../components/TransactionCard'
import DonutChart from '../components/DonutChart'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement,
)

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const TIME_RANGES = [
  { label: '7 Days',  value: '7d',  days: 7  },
  { label: '30 Days', value: '30d', days: 30 },
  { label: '90 Days', value: '90d', days: 90 },
]

const Dashboard = () => {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [dashData,   setDashData]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [timeRange,  setTimeRange]  = useState('30d')
  const [chartType,  setChartType]  = useState('bar')

  const fetchDashboard = useCallback(async (days) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/transactions/dashboard', { params: { days } })
      setDashData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const days = TIME_RANGES.find(r => r.value === timeRange)?.days || 30
    fetchDashboard(days)
  }, [timeRange, fetchDashboard])

  // ── Chart data built from server-aggregated daily rows ──────────────
  const { chartLabels, incomeData, expenseData, netData, bestDay } = useMemo(() => {
    const days = TIME_RANGES.find(r => r.value === timeRange)?.days || 30
    const dayMap = {}
    for (const row of (dashData?.chartRows || [])) dayMap[row._id] = row

    const chartLabels = [], incomeData = [], expenseData = [], netData = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const ds = d.toLocaleDateString('en-CA') // YYYY-MM-DD in local time
      const row = dayMap[ds] || {}
      chartLabels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))
      incomeData.push(row.totalIn   || 0)
      expenseData.push(row.totalOut || 0)
      netData.push((row.totalIn || 0) - (row.totalOut || 0))
    }
    return { chartLabels, incomeData, expenseData, netData, bestDay: Math.max(...incomeData, 0) }
  }, [dashData, timeRange])

  // ── Donut data from server-aggregated category rows ──────────────────
  const donutData = useMemo(() => {
    const rows = dashData?.categoryRows || []
    return {
      labels: rows.map(r => {
        const l = r._id || 'Other'
        return l.length > 20 ? l.slice(0, 18) + '…' : l
      }),
      datasets: [{
        data: rows.map(r => Math.abs(r.net || 0)),
        backgroundColor: ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'],
        borderWidth: 0,
      }],
    }
  }, [dashData])

  const chartData = useMemo(() => ({
    labels: chartLabels,
    datasets: [
      { label: 'Payment In',  data: incomeData,  backgroundColor: 'rgba(16,185,129,0.75)', borderColor: '#10b981', borderWidth: 1.5 },
      { label: 'Payment Out', data: expenseData, backgroundColor: 'rgba(239,68,68,0.75)',  borderColor: '#ef4444', borderWidth: 1.5 },
      { label: 'Net',         data: netData,     backgroundColor: 'rgba(59,130,246,0.75)', borderColor: '#3b82f6', borderWidth: 1.5 },
    ],
  }), [chartLabels, incomeData, expenseData, netData])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, padding: 16, font: { size: 12 } } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v) => fmt(v), font: { size: 11 } } },
      x: { ticks: { maxRotation: 45, font: { size: 10 } } },
    },
  }

  const days      = TIME_RANGES.find(r => r.value === timeRange)?.days || 30
  const period    = dashData?.period  || {}
  const today     = dashData?.today   || {}
  const recentTx  = dashData?.recentTx || []
  const margin    = period.totalIn > 0 ? ((period.totalIn - period.totalOut) / period.totalIn * 100).toFixed(1) : '0.0'
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading && !dashData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-20" />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-24" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 card h-72" />
          <div className="card h-72" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700">
        <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium">Error loading dashboard: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">{todayLabel}</p>
        </div>
        <button onClick={() => navigate('/add-transaction')} className="btn-primary gap-2">
          <PlusCircleIcon className="h-4 w-4" /> Add Entry
        </button>
      </div>

      {/* ── Today strip ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Today In</p>
            <p className="text-lg font-bold text-emerald-600">{fmt(today.in)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Today Out</p>
            <p className="text-lg font-bold text-red-500">{fmt(today.out)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${today.net >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <CurrencyRupeeIcon className={`h-5 w-5 ${today.net >= 0 ? 'text-blue-600' : 'text-orange-500'}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Today Net</p>
            <p className={`text-lg font-bold ${today.net >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>{fmt(today.net)}</p>
          </div>
        </div>
      </div>

      {/* ── Period summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total In',    value: fmt(period.totalIn),  color: 'text-emerald-600', bg: 'bg-emerald-50', icon: ArrowTrendingUpIcon,   accent: 'border-t-emerald-500' },
          { label: 'Total Out',   value: fmt(period.totalOut), color: 'text-red-500',     bg: 'bg-red-50',     icon: ArrowTrendingDownIcon, accent: 'border-t-red-500'     },
          { label: 'Net Balance', value: fmt(period.net),      color: period.totalIn >= period.totalOut ? 'text-blue-600' : 'text-orange-500', bg: 'bg-blue-50', icon: CurrencyRupeeIcon, accent: period.totalIn >= period.totalOut ? 'border-t-blue-500' : 'border-t-orange-500' },
          { label: 'Cash / Online', value: `${period.cashTx || 0} / ${period.onlineTx || 0}`, color: 'text-violet-600', bg: 'bg-violet-50', icon: CreditCardIcon, accent: 'border-t-violet-500' },
        ].map(c => (
          <div key={c.label} className={`card p-4 border-t-4 ${c.accent}`}>
            <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Chart controls ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {TIME_RANGES.map(r => (
            <button key={r.value} onClick={() => setTimeRange(r.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${timeRange === r.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[{ v: 'bar', l: 'Bar' }, { v: 'line', l: 'Line' }].map(c => (
            <button key={c.v} onClick={() => setChartType(c.v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${chartType === c.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {c.l}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 ml-auto">
          Showing last {days} days
          {loading && <span className="ml-2 text-slate-300">Refreshing…</span>}
        </p>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Payment In vs Out Trend</h3>
          <div className="h-64">
            {chartType === 'bar'
              ? <Bar data={chartData} options={chartOptions} />
              : <Line data={chartData} options={chartOptions} />}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            <ChartBarIcon className="h-4 w-4 inline mr-1.5 text-slate-400" />
            By Category
          </h3>
          {donutData.labels.length > 0 ? (
            <div className="h-64">
              <DonutChart data={donutData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 10 } } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmt(ctx.raw)}` } },
                },
                cutout: '55%',
              }} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Recent Entries</h3>
            <button onClick={() => navigate('/history')} className="text-xs text-blue-600 font-semibold hover:underline">
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {recentTx.map(t => <TransactionCard key={t._id || t.id} transaction={t} />)}
            {recentTx.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <PlusCircleIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No entries yet.</p>
                <button onClick={() => navigate('/add-transaction')} className="mt-3 text-xs text-blue-600 font-semibold hover:underline">
                  Add your first entry →
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Key Numbers</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <p className="text-xs text-slate-600">Best Day Income</p>
              <p className="text-sm font-bold text-emerald-600">{fmt(bestDay)}</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-slate-600">Profit Margin</p>
              <p className="text-sm font-bold text-blue-600">{margin}%</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-600">Total Entries</p>
              <p className="text-sm font-bold text-slate-700">{period.count || 0}</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-xl">
              <p className="text-xs text-slate-600">Cash Entries</p>
              <p className="text-sm font-bold text-violet-600">{period.cashTx || 0}</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl">
              <p className="text-xs text-slate-600">Online Entries</p>
              <p className="text-sm font-bold text-orange-500">{period.onlineTx || 0}</p>
            </div>
            <div className="border-t border-slate-100 pt-3 mt-1">
              <div className="flex gap-2">
                <button onClick={() => navigate('/add-transaction?type=in')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors">
                  + Money In
                </button>
                <button onClick={() => navigate('/add-transaction?type=out')}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors">
                  + Money Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
