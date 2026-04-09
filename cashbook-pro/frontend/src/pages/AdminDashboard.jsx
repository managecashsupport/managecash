import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const fmt = (n) => (n ?? 0).toLocaleString('en-IN')

const STATUS_COLOR = {
  trial:        'bg-blue-100 text-blue-700',
  active:       'bg-green-100 text-green-700',
  grace_period: 'bg-yellow-100 text-yellow-700',
  suspended:    'bg-red-100 text-red-700',
  cancelled:    'bg-gray-100 text-gray-500',
}

const PLAN_LABEL = {
  monthly:    'Monthly',
  yearly:     'Yearly',
  yearly_pro: 'Yearly Pro',
  null:       'No Plan',
  none:       'No Plan',
}

function timeAgo(date) {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function AdminDashboard() {
  const [authed, setAuthed]     = useState(() => !!sessionStorage.getItem('adm_key'))
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy]     = useState('createdAt')
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchStats = useCallback(async (key) => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API}/admin3636secret/stats`, {
        headers: { 'x-admin-key': key || sessionStorage.getItem('adm_key') }
      })
      setData(res.data)
      setLastRefresh(new Date())
    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem('adm_key')
        setAuthed(false)
        setKeyError('Wrong password.')
      } else {
        setError('Failed to load data. Try refreshing.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) fetchStats()
  }, [authed, fetchStats])

  // Auto-refresh every 60s
  useEffect(() => {
    if (!authed) return
    const id = setInterval(() => fetchStats(), 60000)
    return () => clearInterval(id)
  }, [authed, fetchStats])

  const handleLogin = async (e) => {
    e.preventDefault()
    setKeyError('')
    sessionStorage.setItem('adm_key', keyInput)
    await fetchStats(keyInput)
    setAuthed(true)
  }

  // --- Login screen ---
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-1">Admin Access</h1>
          <p className="text-sm text-gray-400 mb-6">Enter the admin password to continue.</p>
          <input
            type="password"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 mb-3"
            placeholder="Password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            autoFocus
          />
          {keyError && <p className="text-sm text-red-400 mb-3">{keyError}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors">
            Enter
          </button>
        </form>
      </div>
    )
  }

  // --- Loading ---
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-700 border-t-blue-500 mx-auto" />
          <p className="mt-4 text-sm text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => fetchStats()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Retry</button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { overview, byStatus, byPlan, tenants } = data

  // Filter + sort tenants
  const filtered = tenants
    .filter(t => {
      const matchesSearch = !search ||
        t.shopName.toLowerCase().includes(search.toLowerCase()) ||
        t.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        t.ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
        t.shopId.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'createdAt')    return new Date(b.createdAt) - new Date(a.createdAt)
      if (sortBy === 'txCount')      return b.txCount - a.txCount
      if (sortBy === 'lastActivity') return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0)
      if (sortBy === 'shopName')     return a.shopName.localeCompare(b.shopName)
      return 0
    })

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">ManageCash Admin</h1>
          <p className="text-xs text-gray-500">
            {lastRefresh ? `Last updated ${timeAgo(lastRefresh)}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('adm_key'); setAuthed(false) }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-7xl mx-auto">

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Shops',      value: fmt(overview.totalTenants),   sub: `+${overview.newThisMonth} this month`, color: 'text-white' },
            { label: 'Active This Week', value: fmt(overview.activeThisWeek), sub: `of ${overview.totalTenants} total`,    color: 'text-green-400' },
            { label: 'New Today',        value: fmt(overview.newToday),       sub: `+${overview.newThisWeek} this week`,   color: 'text-blue-400' },
            { label: 'Total Users',      value: fmt(overview.totalUsers),     sub: 'across all shops',                     color: 'text-purple-400' },
          ].map(card => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-600 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Transactions Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Transactions Today', value: fmt(overview.txToday) },
            { label: 'This Week',          value: fmt(overview.txThisWeek) },
            { label: 'This Month',         value: fmt(overview.txThisMonth) },
          ].map(card => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className="text-xl font-bold text-orange-400">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Status + Plan breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-300 mb-3">By Status</p>
            <div className="space-y-2">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] || 'bg-gray-700 text-gray-300'}`}>
                    {status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-300 mb-3">By Plan</p>
            <div className="space-y-2">
              {Object.entries(byPlan).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{PLAN_LABEL[plan] || plan}</span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tenant Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <p className="text-sm font-semibold text-gray-300">All Shops ({filtered.length})</p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search shop, owner, email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-52"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="grace_period">Grace Period</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
              >
                <option value="createdAt">Newest First</option>
                <option value="txCount">Most Transactions</option>
                <option value="lastActivity">Last Active</option>
                <option value="shopName">Shop Name</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Shop</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Owner</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Status</th>
                  <th className="text-left text-xs text-gray-500 font-medium px-4 py-2.5">Plan</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5">Users</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5">Txns</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5">Last Active</th>
                  <th className="text-right text-xs text-gray-500 font-medium px-4 py-2.5">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray-600 py-8">No shops found</td>
                  </tr>
                ) : filtered.map(t => (
                  <tr key={t.shopId} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-[160px]">{t.shopName}</p>
                      <p className="text-xs text-gray-600 font-mono">{t.shopId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-300 truncate max-w-[140px]">{t.ownerName}</p>
                      <p className="text-xs text-gray-600 truncate max-w-[140px]">{t.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] || 'bg-gray-700 text-gray-300'}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      {t.activeThisWeek && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 bg-green-400 rounded-full" title="Active this week" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{PLAN_LABEL[t.plan] || 'No Plan'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{t.userCount}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{fmt(t.txCount)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{timeAgo(t.lastActivity)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
