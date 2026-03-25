import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import {
  ArchiveBoxIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon,
  ArrowPathIcon, ChartBarIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import { Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend, BarController, PieController,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, BarController, PieController)

const LOW = 5
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0)

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'dozen', 'packet', 'roll', 'set', 'pair']

const emptyForm = { name: '', category: '', description: '', quantity: '', unit: 'pcs', pricePerUnit: '' }

const Stock = () => {
  const [items, setItems] = useState([])
  const [grouped, setGrouped] = useState({})
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('inventory') // inventory | analytics
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modals
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(emptyForm)
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [restockItem, setRestockItem] = useState(null)
  const [restockQty, setRestockQty] = useState('')
  const [restockNote, setRestockNote] = useState('')
  const [restockLoading, setRestockLoading] = useState(false)

  const [deleteId, setDeleteId] = useState(null)

  // Analytics
  const [analytics, setAnalytics] = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search
      if (filterCat) params.category = filterCat
      if (showLowOnly) params.lowStock = 'true'
      const res = await api.get('/stock', { params })
      setItems(res.data.items)
      setGrouped(res.data.grouped)
    } catch { setError('Failed to load stock') }
    finally { setLoading(false) }
  }, [search, filterCat, showLowOnly])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/stock/categories')
      setCategories(res.data)
    } catch {}
  }, [])

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const params = {}
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo)   params.dateTo   = dateTo
      const res = await api.get('/stock/analytics/sales', { params })
      setAnalytics(res.data)
    } catch { setError('Failed to load analytics') }
    finally { setAnalyticsLoading(false) }
  }, [dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(fetchItems, 300)
    return () => clearTimeout(t)
  }, [fetchItems])

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { if (activeTab === 'analytics') fetchAnalytics() }, [activeTab, fetchAnalytics])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  // ── Add ──
  const handleAdd = async (e) => {
    e.preventDefault(); setAddError('')
    if (!addForm.name || !addForm.category) return setAddError('Name and category are required')
    if (addForm.pricePerUnit === '') return setAddError('Price per unit is required')
    setAddLoading(true)
    try {
      await api.post('/stock', addForm)
      setShowAdd(false); setAddForm(emptyForm)
      flash('Item added'); fetchItems(); fetchCategories()
    } catch (err) { setAddError(err.response?.data?.error || 'Failed to add item') }
    finally { setAddLoading(false) }
  }

  // ── Edit ──
  const openEdit = (item) => {
    setEditItem(item)
    setEditForm({ name: item.name, category: item.category, description: item.description, quantity: item.quantity, unit: item.unit, pricePerUnit: item.pricePerUnit })
    setEditError('')
  }
  const handleEdit = async (e) => {
    e.preventDefault(); setEditError('')
    setEditLoading(true)
    try {
      await api.put(`/stock/${editItem._id}`, editForm)
      setEditItem(null); flash('Item updated'); fetchItems(); fetchCategories()
    } catch (err) { setEditError(err.response?.data?.error || 'Failed to update') }
    finally { setEditLoading(false) }
  }

  // ── Restock ──
  const handleRestock = async (e) => {
    e.preventDefault()
    if (!restockQty || restockQty <= 0) return
    setRestockLoading(true)
    try {
      await api.post(`/stock/${restockItem._id}/restock`, { quantity: Number(restockQty), note: restockNote })
      setRestockItem(null); setRestockQty(''); setRestockNote('')
      flash('Stock updated'); fetchItems()
    } catch (err) { setError(err.response?.data?.error || 'Failed to restock') }
    finally { setRestockLoading(false) }
  }

  // ── Delete ──
  const handleDelete = async (id) => {
    try {
      await api.delete(`/stock/${id}`)
      setDeleteId(null); flash('Item removed'); fetchItems(); fetchCategories()
    } catch { setError('Failed to remove item') }
  }

  // ── Analytics chart data ──
  const barData = analytics?.byCategory ? {
    labels: analytics.byCategory.map(c => c._id),
    datasets: [
      {
        label: 'Quantity Sold',
        data: analytics.byCategory.map(c => c.totalQuantity),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Revenue (₹)',
        data: analytics.byCategory.map(c => c.totalRevenue),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderRadius: 6,
        yAxisID: 'y1',
      },
    ],
  } : null

  const pieData = analytics?.byCategory ? {
    labels: analytics.byCategory.map(c => c._id),
    datasets: [{
      data: analytics.byCategory.map(c => c.totalRevenue),
      backgroundColor: [
        '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6',
        '#EC4899','#06B6D4','#84CC16','#F97316','#6366F1',
      ],
      borderWidth: 2, borderColor: '#fff',
    }],
  } : null

  const lowStockItems = items.filter(i => i.quantity <= LOW)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {items.length} items
            {lowStockItems.length > 0 && <span className="text-amber-600 font-medium"> · {lowStockItems.length} low stock</span>}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary gap-2">
          <PlusIcon className="h-4 w-4" /> Add Item
        </button>
      </div>

      {/* Alerts */}
      {success && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl"><CheckCircleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm font-medium">{success}</p></div>}
      {error && <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"><ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm font-medium flex-1">{error}</p><button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button></div>}

      {/* Low stock banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Low Stock Alert (≤ {LOW} units)</p>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(i => (
              <span key={i._id} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                {i.name} — {i.quantity} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[['inventory', 'Inventory'], ['analytics', 'Sales Analytics']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Filters */}
          <div className="card p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search items…" className="input-field pl-9" />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input-field w-auto">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={() => setShowLowOnly(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${showLowOnly ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <FunnelIcon className="h-4 w-4" /> Low Stock
            </button>
          </div>

          {/* Item list grouped by category */}
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-16" />)}</div>
          ) : items.length === 0 ? (
            <div className="card p-12 text-center">
              <ArchiveBoxIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">{search || filterCat ? 'No items found' : 'No stock items yet'}</p>
              {!search && !filterCat && <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto"><PlusIcon className="h-4 w-4" /> Add First Item</button>}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat}>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">{cat}</h2>
                  <div className="space-y-2">
                    {catItems.map(item => (
                      <div key={item._id} className={`card p-4 flex items-center gap-4 ${item.quantity <= LOW ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.quantity <= LOW ? 'bg-amber-100' : 'bg-blue-50'}`}>
                          <ArchiveBoxIcon className={`h-5 w-5 ${item.quantity <= LOW ? 'text-amber-500' : 'text-blue-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            {item.quantity <= LOW && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">LOW</span>}
                          </div>
                          {item.description && <p className="text-xs text-slate-400 truncate mt-0.5">{item.description}</p>}
                          <p className="text-xs text-slate-400 mt-0.5">{fmt(item.pricePerUnit)} per {item.unit}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-bold ${item.quantity <= LOW ? 'text-amber-600' : 'text-slate-900'}`}>{item.quantity} <span className="text-sm font-normal text-slate-400">{item.unit}</span></p>
                          <p className="text-xs text-slate-400">{fmt(item.quantity * item.pricePerUnit)} value</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => { setRestockItem(item); setRestockQty(''); setRestockNote('') }}
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Restock">
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(item)}
                            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteId(item._id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* ── Analytics Tab ── */
        <div className="space-y-6">
          {/* Date filters */}
          <div className="card p-4 flex flex-wrap gap-3 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm" />
            </div>
            <div className="flex gap-2 items-end pb-0.5">
              <button onClick={() => { const t = new Date().toISOString().split('T')[0]; setDateFrom(t); setDateTo(t) }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">Today</button>
              <button onClick={() => {
                const now = new Date()
                setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
                setDateTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0])
              }} className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">This Month</button>
              <button onClick={() => { setDateFrom(''); setDateTo('') }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">All Time</button>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="card p-12 text-center animate-pulse"><div className="h-64 bg-slate-100 rounded-xl" /></div>
          ) : !analytics || analytics.byCategory.length === 0 ? (
            <div className="card p-12 text-center">
              <ChartBarIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No sales data yet for the selected period</p>
            </div>
          ) : (
            <>
              {/* Bar chart — qty + revenue by category */}
              <div className="card p-5">
                <h2 className="font-bold text-slate-900 mb-4">Sales by Category</h2>
                <div style={{ height: 320 }}>
                  <Bar data={barData} options={{
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend: { position: 'top' } },
                    scales: {
                      y:  { type: 'linear', position: 'left',  title: { display: true, text: 'Qty Sold' } },
                      y1: { type: 'linear', position: 'right', title: { display: true, text: 'Revenue (₹)' }, grid: { drawOnChartArea: false } },
                    },
                  }} />
                </div>
              </div>

              {/* Pie chart — revenue share */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-5">
                  <h2 className="font-bold text-slate-900 mb-4">Revenue Share by Category</h2>
                  <div style={{ height: 280 }}>
                    <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>

                {/* Top selling items table */}
                <div className="card p-5">
                  <h2 className="font-bold text-slate-900 mb-4">Top Selling Items</h2>
                  <div className="space-y-2">
                    {analytics.byItem.slice(0, 8).map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item._id.stockName}</p>
                          <p className="text-xs text-slate-400">{item._id.stockCategory}</p>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{item.totalQuantity} sold</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category summary table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900">Category Summary</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Category', 'Items Sold', 'Revenue'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {analytics.byCategory.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900">{c._id}</td>
                        <td className="px-5 py-3 text-slate-600">{c.totalQuantity}</td>
                        <td className="px-5 py-3 font-semibold text-emerald-600">{fmt(c.totalRevenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Add Stock Item</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {addError && <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{addError}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              {[['name', 'Item Name *', 'text', 'e.g. Wooden Chair'], ['category', 'Category *', 'text', 'e.g. Furniture'], ['description', 'Description', 'text', 'Optional details']].map(([field, label, type, ph]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                  <input type={type} className="input-field" placeholder={ph}
                    value={addForm[field]} onChange={e => setAddForm({ ...addForm, [field]: e.target.value })} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Initial Qty</label>
                  <input type="number" min="0" className="input-field" placeholder="0"
                    value={addForm.quantity} onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
                  <select className="input-field" value={addForm.unit} onChange={e => setAddForm({ ...addForm, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Price per {addForm.unit} (₹) *</label>
                <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00"
                  value={addForm.pricePerUnit} onChange={e => setAddForm({ ...addForm, pricePerUnit: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 btn-primary py-2.5">{addLoading ? 'Adding…' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditItem(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Item</h2>
              <button onClick={() => setEditItem(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {editError && <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{editError}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              {[['name', 'Item Name'], ['category', 'Category'], ['description', 'Description']].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                  <input type="text" className="input-field"
                    value={editForm[field]} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
                  <select className="input-field" value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Price per {editForm.unit} (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field"
                    value={editForm.pricePerUnit} onChange={e => setEditForm({ ...editForm, pricePerUnit: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditItem(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 btn-primary py-2.5">{editLoading ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Restock Modal ── */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setRestockItem(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Restock</h2>
              <button onClick={() => setRestockItem(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm font-semibold text-slate-900">{restockItem.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Current stock: <span className="font-bold text-slate-700">{restockItem.quantity} {restockItem.unit}</span></p>
            </div>
            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity to Add ({restockItem.unit})</label>
                <input type="number" min="1" required className="input-field text-lg font-bold" placeholder="0"
                  value={restockQty} onChange={e => setRestockQty(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Note <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input-field" placeholder="e.g. New stock arrived"
                  value={restockNote} onChange={e => setRestockNote(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setRestockItem(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={restockLoading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  {restockLoading ? 'Updating…' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><TrashIcon className="h-6 w-6 text-red-500" /></div>
            <h3 className="text-lg font-bold text-slate-900">Remove Item?</h3>
            <p className="text-sm text-slate-500 mt-1">Movement history will be preserved.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Stock
