import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import {
  ShoppingCartIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  CheckCircleIcon, ExclamationTriangleIcon, BanknotesIcon,
  MagnifyingGlassIcon, FunnelIcon, ClockIcon,
} from '@heroicons/react/24/outline'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const STATUS_STYLE = {
  pending: 'bg-red-100 text-red-700',
  partial: 'bg-orange-100 text-orange-700',
  paid:    'bg-green-100 text-green-700',
}
const STATUS_BORDER = {
  pending: 'border-l-4 border-l-red-400',
  partial: 'border-l-4 border-l-orange-400',
  paid:    '',
}

const emptyItem = { productName: '', category: '', quantity: '', unit: 'pcs', pricePerUnit: '' }
const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'dozen', 'packet', 'roll', 'set', 'pair']

export default function Purchases() {
  const [purchases, setPurchases]   = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Add modal
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState({ vendor: '', gstNo: '', date: new Date().toISOString().split('T')[0], notes: '', initialPayment: '', initialPayMode: 'cash' })
  const [addItems, setAddItems]     = useState([{ ...emptyItem }])
  const [addError, setAddError]     = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Payment modal
  const [payTarget, setPayTarget]   = useState(null)
  const [payAmount, setPayAmount]   = useState('')
  const [payNote, setPayNote]       = useState('')
  const [payDate, setPayDate]       = useState(new Date().toISOString().split('T')[0])
  const [payMode, setPayMode]       = useState('cash')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError]     = useState('')

  // Edit modal
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm]     = useState({ vendor: '', gstNo: '', notes: '', date: '' })
  const [editItems, setEditItems]   = useState([])
  const [editError, setEditError]   = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Detail expand
  const [expanded, setExpanded]     = useState(null)
  const [deleteId, setDeleteId]     = useState(null)

  const fetchPurchases = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status  = filterStatus
      if (search)       params.vendor  = search
      if (dateFrom)     params.dateFrom = dateFrom
      if (dateTo)       params.dateTo  = dateTo
      const [pRes, sRes] = await Promise.all([
        api.get('/purchases', { params }),
        api.get('/purchases/summary'),
      ])
      setPurchases(pRes.data.purchases)
      setSummary(sRes.data)
    } catch { setError('Failed to load purchases') }
    finally { setLoading(false) }
  }, [filterStatus, search, dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(fetchPurchases, 300)
    return () => clearTimeout(t)
  }, [fetchPurchases])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  // ── Add ──
  const addItemRow  = () => setAddItems(p => [...p, { ...emptyItem }])
  const removeItemRow = (i) => setAddItems(p => p.filter((_, idx) => idx !== i))
  const updateItem  = (i, field, val) => setAddItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))

  const totalCalc = addItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.pricePerUnit) || 0), 0)

  const handleAdd = async (e) => {
    e.preventDefault(); setAddError('')
    if (!addForm.vendor.trim()) return setAddError('Vendor name is required')
    if (addItems.some(it => !it.productName || !it.quantity || !it.pricePerUnit)) return setAddError('Fill all item fields')
    setAddLoading(true)
    try {
      await api.post('/purchases', { ...addForm, items: addItems })
      setShowAdd(false)
      setAddForm({ vendor: '', gstNo: '', date: new Date().toISOString().split('T')[0], notes: '', initialPayment: '', initialPayMode: 'cash' })
      setAddItems([{ ...emptyItem }])
      flash('Purchase recorded & stock updated')
      fetchPurchases()
    } catch (err) { setAddError(err.response?.data?.error || 'Failed to save') }
    finally { setAddLoading(false) }
  }

  // ── Payment ──
  const openPay = (p) => { setPayTarget(p); setPayAmount(''); setPayNote(''); setPayDate(new Date().toISOString().split('T')[0]); setPayMode('cash'); setPayError('') }
  const handlePay = async (e) => {
    e.preventDefault(); setPayError('')
    if (!payAmount || Number(payAmount) <= 0) return setPayError('Enter a valid amount')
    if (Number(payAmount) > payTarget.balance) return setPayError(`Maximum payable is ${fmt(payTarget.balance)}`)
    setPayLoading(true)
    try {
      await api.post(`/purchases/${payTarget._id}/payment`, { amount: Number(payAmount), note: payNote, date: payDate, payMode })
      setPayTarget(null); flash('Payment recorded'); fetchPurchases()
    } catch (err) { setPayError(err.response?.data?.error || 'Failed to record payment') }
    finally { setPayLoading(false) }
  }

  // ── Edit ──
  const openEdit = (p) => {
    setEditTarget(p)
    setEditForm({ vendor: p.vendor, gstNo: p.gstNo || '', notes: p.notes || '', date: p.date.split('T')[0] })
    setEditItems(p.items.map(it => ({ productName: it.productName, quantity: it.quantity, pricePerUnit: it.pricePerUnit, unit: it.unit || 'pcs', category: it.category || '' })))
    setEditError('')
  }
  const updateEditItem = (i, field, val) => setEditItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  const editTotalCalc = editItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.pricePerUnit) || 0), 0)

  const handleEdit = async (e) => {
    e.preventDefault(); setEditError('')
    if (editItems.some(it => !it.quantity || !it.pricePerUnit)) return setEditError('Fill all item quantities and prices')
    setEditLoading(true)
    try {
      await api.put(`/purchases/${editTarget._id}`, { ...editForm, items: editItems })
      setEditTarget(null); flash('Purchase updated'); fetchPurchases()
    } catch (err) { setEditError(err.response?.data?.error || 'Failed to update') }
    finally { setEditLoading(false) }
  }

  // ── Delete ──
  const handleDelete = async () => {
    try {
      await api.delete(`/purchases/${deleteId}`)
      setDeleteId(null); flash('Purchase deleted'); fetchPurchases()
    } catch { setError('Failed to delete') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchases</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track vendor purchases and payments</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary gap-2">
          <PlusIcon className="h-4 w-4" /> New Purchase
        </button>
      </div>

      {/* Alerts */}
      {success && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl"><CheckCircleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm font-medium">{success}</p></div>}
      {error   && <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"><ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm flex-1">{error}</p><button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button></div>}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Purchased', value: fmt(summary.totalPurchased), color: 'text-slate-900' },
            { label: 'Total Paid',      value: fmt(summary.totalPaid),      color: 'text-emerald-600' },
            { label: 'Total Due',       value: fmt(summary.totalBalance),   color: 'text-orange-600' },
            { label: 'Pending / Partial', value: `${summary.pending} / ${summary.partial}`, color: 'text-red-600' },
          ].map(c => (
            <div key={c.label} className="card p-4">
              <p className="text-xs text-slate-500 mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Search vendor…" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-auto">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <button onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${showFilters ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            <FunnelIcon className="h-4 w-4" /> Date
          </button>
        </div>
        {showFilters && (
          <div className="flex gap-3 flex-wrap">
            <div><label className="block text-xs text-slate-500 mb-1">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm" /></div>
            <div><label className="block text-xs text-slate-500 mb-1">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm" /></div>
            <div className="flex items-end"><button onClick={() => { setDateFrom(''); setDateTo('') }} className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">Clear</button></div>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-20" />)}</div>
      ) : purchases.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingCartIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No purchases yet</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto"><PlusIcon className="h-4 w-4" /> New Purchase</button>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map(p => (
            <div key={p._id} className={`card overflow-hidden ${STATUS_BORDER[p.status]}`}>
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === p._id ? null : p._id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900">{p.vendor}</p>
                    {p.gstNo && <span className="text-xs text-slate-400 font-mono">GST: {p.gstNo}</span>}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{fmtDate(p.date)}</span>
                    <span>{p.items.length} item{p.items.length > 1 ? 's' : ''}</span>
                    {p.status !== 'paid' && <span className="text-orange-600 font-semibold">Due: {fmt(p.balance)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-slate-900">{fmt(p.totalAmount)}</p>
                  <p className="text-xs text-slate-400">Paid: {fmt(p.paidAmount)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {p.status !== 'paid' && (
                    <button onClick={() => openPay(p)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Add Payment">
                      <BanknotesIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(p._id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === p._id && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
                  {/* Items table */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Items</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-slate-400">{['Product','Category','Qty','Price/Unit','Total'].map(h => <th key={h} className="text-left pb-1">{h}</th>)}</tr></thead>
                      <tbody>
                        {p.items.map((it, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="py-1.5 font-medium text-slate-800">{it.productName}</td>
                            <td className="py-1.5 text-slate-500">{it.category}</td>
                            <td className="py-1.5">{it.quantity} {it.unit}</td>
                            <td className="py-1.5">{fmt(it.pricePerUnit)}</td>
                            <td className="py-1.5 font-semibold">{fmt(it.totalPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Payment history */}
                  {p.payments.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Payment History</p>
                      <div className="space-y-1">
                        {p.payments.map((pay, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs">
                            <ClockIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-500">{fmtDate(pay.date)}</span>
                            <span className="font-semibold text-emerald-600">{fmt(pay.amount)}</span>
                            {pay.note && <span className="text-slate-400 italic">{pay.note}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.notes && <p className="text-xs text-slate-400 italic">Note: {p.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add Purchase Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">New Purchase</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {addError && <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{addError}</div>}
            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor / Shop Name *</label>
                  <input type="text" required className="input-field" placeholder="e.g. Sharma Traders" value={addForm.vendor} onChange={e => setAddForm({ ...addForm, vendor: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GST No <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="text" className="input-field" placeholder="22AAAAA0000A1Z5" value={addForm.gstNo} onChange={e => setAddForm({ ...addForm, gstNo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase Date *</label>
                  <input type="date" required className="input-field" value={addForm.date} onChange={e => setAddForm({ ...addForm, date: e.target.value })} />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Items *</label>
                  <button type="button" onClick={addItemRow} className="text-xs text-blue-600 font-semibold hover:underline">+ Add Row</button>
                </div>
                <div className="space-y-2">
                  {addItems.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" placeholder="Product name" className="input-field col-span-3 text-sm" value={it.productName} onChange={e => updateItem(i, 'productName', e.target.value)} />
                      <input type="text" placeholder="Category" className="input-field col-span-2 text-sm" value={it.category} onChange={e => updateItem(i, 'category', e.target.value)} />
                      <input type="number" placeholder="Qty" min="0.01" step="any" className="input-field col-span-2 text-sm" value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                      <select className="input-field col-span-2 text-sm" value={it.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" placeholder="Price/unit" min="0" step="0.01" className="input-field col-span-2 text-sm" value={it.pricePerUnit} onChange={e => updateItem(i, 'pricePerUnit', e.target.value)} />
                      {addItems.length > 1
                        ? <button type="button" onClick={() => removeItemRow(i)} className="col-span-1 p-2 text-red-400 hover:text-red-600"><XMarkIcon className="h-4 w-4" /></button>
                        : <div className="col-span-1" />}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-sm font-semibold text-slate-700">Total: {fmt(totalCalc)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Initial Payment <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00" value={addForm.initialPayment} onChange={e => setAddForm({ ...addForm, initialPayment: e.target.value })} />
                  {addForm.initialPayment && <p className="text-xs text-orange-600 mt-1">Remaining: {fmt(totalCalc - Number(addForm.initialPayment))}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="text" className="input-field" placeholder="Any notes…" value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} />
                </div>
              </div>
              {addForm.initialPayment && Number(addForm.initialPayment) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Mode for Initial Payment</label>
                  <div className="flex gap-2">
                    {['cash', 'online'].map(m => (
                      <button key={m} type="button" onClick={() => setAddForm({ ...addForm, initialPayMode: m })}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${addForm.initialPayMode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        {m === 'cash' ? '💵 Cash' : '📱 Online'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 btn-primary py-2.5">{addLoading ? 'Saving…' : 'Save Purchase'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add Payment</h2>
              <button onClick={() => setPayTarget(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-slate-800">{payTarget.vendor}</p>
              <p className="text-xs text-orange-700 mt-0.5">Outstanding: <span className="font-bold">{fmt(payTarget.balance)}</span></p>
            </div>
            {payError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{payError}</div>}
            <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label>
                <input type="number" min="0.01" step="0.01" required autoFocus className="input-field text-lg font-bold" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
                <input type="date" required className="input-field" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Mode</label>
                <div className="flex gap-2">
                  {['cash', 'online'].map(m => (
                    <button key={m} type="button" onClick={() => setPayMode(m)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${payMode === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {m === 'cash' ? '💵 Cash' : '📱 Online'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Note <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input-field" placeholder="e.g. Cash payment" value={payNote} onChange={e => setPayNote(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPayTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={payLoading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">{payLoading ? 'Saving…' : 'Record Payment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Purchase</h2>
              <button onClick={() => setEditTarget(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {editError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{editError}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor *</label><input type="text" required className="input-field" value={editForm.vendor} onChange={e => setEditForm({ ...editForm, vendor: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">GST No</label><input type="text" className="input-field" value={editForm.gstNo} onChange={e => setEditForm({ ...editForm, gstNo: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label><input type="date" className="input-field" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label><input type="text" className="input-field" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Items</label>
                <div className="space-y-2">
                  {editItems.map((it, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-600">{it.productName}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Qty ({it.unit})</label>
                          <input type="number" min="0.01" step="any" className="input-field text-sm"
                            value={it.quantity} onChange={e => updateEditItem(i, 'quantity', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Price/unit (₹)</label>
                          <input type="number" min="0" step="0.01" className="input-field text-sm"
                            value={it.pricePerUnit} onChange={e => updateEditItem(i, 'pricePerUnit', e.target.value)} />
                        </div>
                      </div>
                      <p className="text-xs text-right text-slate-500">= {fmt((Number(it.quantity)||0)*(Number(it.pricePerUnit)||0))}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold text-slate-700 text-right mt-2">New Total: {fmt(editTotalCalc)}</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 btn-primary py-2.5">{editLoading ? 'Saving…' : 'Save'}</button>
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
            <h3 className="text-lg font-bold text-slate-900">Delete Purchase?</h3>
            <p className="text-sm text-slate-500 mt-1">This will not reverse any stock changes.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
