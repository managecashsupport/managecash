import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'
import {
  ShoppingCartIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  CheckCircleIcon, ExclamationTriangleIcon, BanknotesIcon,
  MagnifyingGlassIcon, FunnelIcon, ClockIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline'
import useDeleteWithUndo from '../hooks/useDeleteWithUndo'
import UndoToast from '../components/UndoToast'

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

const emptyItem = { productName: '', category: '', subCategory: '', otherSubCategory: '', quantity: '', unit: 'pcs', pricePerUnit: '' }
const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'dozen', 'packet', 'roll', 'set', 'pair']

const CATEGORIES = {
  'Electrical':   ['Wiring', 'Switches', 'Fans', 'Bulbs', 'Tubelight', 'Cables', 'Meters', 'Other'],
  'Furniture':    ['Chair', 'Table', 'Bed', 'Almirah', 'Sofa', 'Rack', 'Shelf', 'Other'],
  'Grocery':      ['Grains', 'Daal', 'Oil', 'Ghee', 'Sugar', 'Salt', 'Spices', 'Biscuits', 'Snacks', 'Other'],
  'Hardware':     ['Nails', 'Screws', 'Paint', 'Cement', 'Sand', 'Tools', 'Locks', 'Hinges', 'Pipes', 'Other'],
  'Clothing':     ['Shirt', 'T-Shirt', 'Pant', 'Jeans', 'Saree', 'Dupatta', 'Undergarments', 'Other'],
  'Electronics':  ['Mobile', 'TV', 'Monitor', 'Fridge', 'AC', 'Fan', 'Cooler', 'Cables', 'Charger', 'Other'],
  'Medicine':     ['Tablet', 'Syrup', 'Injection', 'Drip', 'Ointment', 'Other'],
  'Stationery':   ['Paper', 'Register', 'Pen', 'Pencil', 'Ink', 'Toner', 'Files', 'Folders', 'Other'],
  'Packaging':    ['Bags', 'Pouches', 'Boxes', 'Tape', 'Rope', 'Labels', 'Other'],
  'Cleaning':     ['Broom', 'Mop', 'Phenyl', 'Soap', 'Dustbin', 'Other'],
  'Other':        ['Other'],
}

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
  const [addForm, setAddForm]       = useState({ vendor: '', billNo: '', gstNo: '', date: new Date().toISOString().split('T')[0], notes: '', initialPayment: '', initialPayMode: 'cash' })
  const [addItems, setAddItems]     = useState([{ ...emptyItem }])
  const [addError, setAddError]     = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Vendor autocomplete
  const [vendors, setVendors]               = useState([])
  const [vendorInput, setVendorInput]       = useState('')
  const [showVendorDrop, setShowVendorDrop] = useState(false)
  const [openPurchase, setOpenPurchase]     = useState(null)   // existing pending/partial purchase for this vendor
  const [vendorMode, setVendorMode]         = useState(null)   // null | 'existing' | 'new'
  const [checkingVendor, setCheckingVendor] = useState(false)
  const vendorRef = useRef(null)

  // Payment modal
  const [payTarget, setPayTarget]     = useState(null)
  const [payAmount, setPayAmount]     = useState('')
  const [payNote, setPayNote]         = useState('')
  const [payDate, setPayDate]         = useState(new Date().toISOString().split('T')[0])
  const [payMode, setPayMode]         = useState('cash')
  const [payReceiptNo, setPayReceiptNo] = useState('')
  const [payLoading, setPayLoading]   = useState(false)
  const [payError, setPayError]       = useState('')

  // Edit modal
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm]     = useState({ vendor: '', billNo: '', gstNo: '', notes: '', date: '' })
  const [editItems, setEditItems]   = useState([])
  const [editError, setEditError]   = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Detail expand
  const [expanded, setExpanded]     = useState(null)
  const [removedIds, setRemovedIds] = useState(new Set())
  const { scheduleDelete, undoPending, undoCountdown, cancelUndo } = useDeleteWithUndo()

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

  const fetchVendors = useCallback(async () => {
    try {
      const res = await api.get('/purchases/vendors')
      setVendors(res.data.vendors)
    } catch {}
  }, [])

  useEffect(() => {
    const t = setTimeout(fetchPurchases, 300)
    return () => clearTimeout(t)
  }, [fetchPurchases])

  useEffect(() => { fetchVendors() }, [fetchVendors])

  // Close vendor dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (vendorRef.current && !vendorRef.current.contains(e.target)) {
        setShowVendorDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  const resetAddForm = () => {
    setAddForm({ vendor: '', billNo: '', gstNo: '', date: new Date().toISOString().split('T')[0], notes: '', initialPayment: '', initialPayMode: 'cash' })
    setAddItems([{ ...emptyItem }])
    setVendorInput('')
    setOpenPurchase(null)
    setVendorMode(null)
    setAddError('')
  }

  // ── Vendor autocomplete ──
  const filteredVendors = vendors.filter(v =>
    vendorInput.length > 0 && v.toLowerCase().includes(vendorInput.toLowerCase())
  )
  const isExactVendorMatch = vendors.some(v => v.toLowerCase() === vendorInput.trim().toLowerCase())

  const checkOpenPurchase = async (vendorName) => {
    const trimmed = vendorName.trim()
    if (!trimmed) return
    const exists = vendors.some(v => v.toLowerCase() === trimmed.toLowerCase())
    if (!exists) { setOpenPurchase(null); setVendorMode('new'); return }

    setCheckingVendor(true)
    try {
      const res = await api.get('/purchases/open-by-vendor', { params: { vendor: trimmed } })
      if (res.data.purchase) {
        setOpenPurchase(res.data.purchase)
        setVendorMode(null) // force user to choose
      } else {
        setOpenPurchase(null)
        setVendorMode('new')
      }
    } catch {
      setOpenPurchase(null)
    } finally {
      setCheckingVendor(false)
    }
  }

  const handleVendorSelect = (name) => {
    setVendorInput(name)
    setAddForm(f => ({ ...f, vendor: name }))
    setShowVendorDrop(false)
    setOpenPurchase(null)
    setVendorMode(null)
    checkOpenPurchase(name)
  }

  // ── Add ──
  const addItemRow    = () => setAddItems(p => [...p, { ...emptyItem }])
  const removeItemRow = (i) => setAddItems(p => p.filter((_, idx) => idx !== i))
  const updateItem    = (i, field, val) => setAddItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  const changeItemCategory = (i, cat) => setAddItems(p => p.map((it, idx) => idx === i ? { ...it, category: cat, subCategory: '', otherSubCategory: '' } : it))
  const changeItemSubCategory = (i, val) => setAddItems(p => p.map((it, idx) => idx === i ? { ...it, subCategory: val, otherSubCategory: '' } : it))

  const totalCalc = addItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.pricePerUnit) || 0), 0)

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError('')
    if (!addForm.vendor.trim()) return setAddError('Vendor name is required')
    if (addItems.some(it => !it.productName || !it.quantity || !it.pricePerUnit)) return setAddError('Fill all item fields')
    if (openPurchase && !vendorMode) return setAddError('Choose whether to add to the existing purchase or start a new order')

    setAddLoading(true)
    try {
      const itemsToSend = addItems.map(it => {
        const resolvedSub = it.subCategory === 'Other' ? (it.otherSubCategory?.trim() || 'Other') : it.subCategory
        return {
          ...it,
          category: resolvedSub ? `${it.category} > ${resolvedSub}` : (it.category || 'Other'),
        }
      })

      if (vendorMode === 'existing' && openPurchase) {
        await api.put(`/purchases/${openPurchase._id}`, { items: itemsToSend })
        flash('Items added to existing purchase & stock updated')
      } else {
        await api.post('/purchases', { ...addForm, items: itemsToSend })
        flash('Purchase recorded & stock updated')
      }

      setShowAdd(false)
      resetAddForm()
      fetchPurchases()
      fetchVendors()
    } catch (err) { setAddError(err.response?.data?.error || 'Failed to save') }
    finally { setAddLoading(false) }
  }

  // ── Payment ──
  const openPay = (p) => { setPayTarget(p); setPayAmount(''); setPayNote(''); setPayDate(new Date().toISOString().split('T')[0]); setPayMode('cash'); setPayReceiptNo(''); setPayError('') }
  const handlePay = async (e) => {
    e.preventDefault(); setPayError('')
    if (!payAmount || Number(payAmount) <= 0) return setPayError('Enter a valid amount')
    if (Number(payAmount) > payTarget.balance) return setPayError(`Maximum payable is ${fmt(payTarget.balance)}`)
    setPayLoading(true)
    try {
      await api.post(`/purchases/${payTarget._id}/payment`, { amount: Number(payAmount), note: payNote, date: payDate, payMode, receiptNo: payReceiptNo })
      setPayTarget(null); flash('Payment recorded'); fetchPurchases()
    } catch (err) { setPayError(err.response?.data?.error || 'Failed to record payment') }
    finally { setPayLoading(false) }
  }

  // ── Edit ──
  const openEdit = (p) => {
    setEditTarget(p)
    setEditForm({ vendor: p.vendor, billNo: p.billNo || '', gstNo: p.gstNo || '', notes: p.notes || '', date: p.date.split('T')[0] })
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
  const handleDelete = (p) => {
    setRemovedIds(prev => new Set([...prev, p._id]))
    scheduleDelete({
      label: `Purchase deleted — ${p.vendor}`,
      onConfirm: async () => {
        try { await api.delete(`/purchases/${p._id}`); fetchPurchases(); fetchVendors() }
        catch { setError('Failed to delete purchase') }
      },
      onUndo: () => setRemovedIds(prev => { const s = new Set(prev); s.delete(p._id); return s }),
    })
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
          {purchases.filter(p => !removedIds.has(p._id)).map(p => (
            <div key={p._id} className={`card overflow-hidden ${STATUS_BORDER[p.status]}`}>
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === p._id ? null : p._id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900">{p.vendor}</p>
                    {p.billNo && <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">#{p.billNo}</span>}
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
                  <button onClick={() => handleDelete(p)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === p._id && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">
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
                  {p.payments.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Payment History</p>
                      <div className="space-y-1">
                        {p.payments.map((pay, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs">
                            <ClockIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-500">{fmtDate(pay.date)}</span>
                            <span className="font-semibold text-emerald-600">{fmt(pay.amount)}</span>
                            {pay.receiptNo && <span className="font-mono text-blue-600 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded">{pay.receiptNo}</span>}
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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowAdd(false); resetAddForm() }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">New Purchase</h2>
              <button onClick={() => { setShowAdd(false); resetAddForm() }} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {addError && <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{addError}</div>}

            <form onSubmit={handleAdd} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">

                {/* Vendor autocomplete */}
                <div className="col-span-2 md:col-span-1" ref={vendorRef}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor / Shop Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      className="input-field pr-8"
                      placeholder="e.g. Sharma Traders"
                      value={vendorInput}
                      onChange={e => {
                        const val = e.target.value
                        setVendorInput(val)
                        setAddForm(f => ({ ...f, vendor: val }))
                        setShowVendorDrop(val.length > 0)
                        setOpenPurchase(null)
                        setVendorMode(null)
                      }}
                      onFocus={() => vendorInput.length > 0 && setShowVendorDrop(true)}
                      onBlur={() => {
                        // Small delay so dropdown click registers first
                        setTimeout(() => {
                          setShowVendorDrop(false)
                          if (vendorInput.trim()) checkOpenPurchase(vendorInput)
                        }, 180)
                      }}
                    />
                    <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />

                    {/* Dropdown */}
                    {showVendorDrop && (filteredVendors.length > 0 || vendorInput) && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-48 overflow-y-auto">
                        {filteredVendors.map(v => (
                          <button
                            key={v}
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                            onMouseDown={() => handleVendorSelect(v)}
                          >
                            <span>{v}</span>
                            <span className="text-xs text-slate-400">existing</span>
                          </button>
                        ))}
                        {vendorInput && !isExactVendorMatch && (
                          <div className="px-4 py-2.5 text-xs text-blue-600 font-medium border-t border-slate-100">
                            New vendor: "{vendorInput}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {checkingVendor && <p className="text-xs text-slate-400 mt-1">Checking vendor…</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill / Invoice No <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="text" className="input-field" placeholder="e.g. INV-2024-001"
                    value={addForm.billNo}
                    onChange={e => setAddForm({ ...addForm, billNo: e.target.value })}
                    disabled={vendorMode === 'existing'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GST No <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="text" className="input-field" placeholder="22AAAAA0000A1Z5" value={addForm.gstNo}
                    onChange={e => setAddForm({ ...addForm, gstNo: e.target.value })}
                    disabled={vendorMode === 'existing'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Purchase Date *</label>
                  <input type="date" required className="input-field" value={addForm.date}
                    onChange={e => setAddForm({ ...addForm, date: e.target.value })} />
                </div>
              </div>

              {/* Existing open purchase banner */}
              {openPurchase && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-900 mb-0.5">
                    Open purchase found for {openPurchase.vendor}
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    {openPurchase.items.length} item(s) · Total {fmt(openPurchase.totalAmount)} · Due {fmt(openPurchase.balance)} · {fmtDate(openPurchase.date)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVendorMode('existing')}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${vendorMode === 'existing' ? 'bg-amber-500 border-amber-500 text-white' : 'border-amber-300 text-amber-700 hover:bg-amber-100'}`}
                    >
                      Add to existing purchase
                    </button>
                    <button
                      type="button"
                      onClick={() => setVendorMode('new')}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${vendorMode === 'new' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      New separate order
                    </button>
                  </div>
                  {vendorMode === 'existing' && (
                    <p className="text-xs text-amber-700 mt-2">Items below will be added to the existing purchase. Use the payment button on that entry to record payment.</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Items to add *
                    {vendorMode === 'existing' && <span className="ml-2 text-xs font-normal text-amber-600">(will be added to existing purchase)</span>}
                  </label>
                  <button type="button" onClick={addItemRow} className="text-xs text-blue-600 font-semibold hover:underline">+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {addItems.map((it, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2 relative">
                      {addItems.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(i)} className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600">
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Product Name *</label>
                        <input type="text" placeholder="e.g. Anchor Wire 1.5mm" className="input-field text-sm" value={it.productName} onChange={e => updateItem(i, 'productName', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Category</label>
                          <select className="input-field text-sm" value={it.category} onChange={e => changeItemCategory(i, e.target.value)}>
                            <option value="">-- Select --</option>
                            {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Sub-Category</label>
                          <select className="input-field text-sm" value={it.subCategory} onChange={e => changeItemSubCategory(i, e.target.value)} disabled={!it.category}>
                            <option value="">-- Select --</option>
                            {(CATEGORIES[it.category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                          </select>
                          {it.subCategory === 'Other' && (
                            <input
                              type="text"
                              className="input-field text-sm mt-1.5"
                              placeholder="Specify sub-category…"
                              value={it.otherSubCategory}
                              onChange={e => updateItem(i, 'otherSubCategory', e.target.value)}
                            />
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Qty *</label>
                          <input type="number" placeholder="0" min="0.01" step="any" className="input-field text-sm" value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Unit</label>
                          <select className="input-field text-sm" value={it.unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Price/Unit (₹) *</label>
                          <input type="number" placeholder="0.00" min="0" step="0.01" className="input-field text-sm" value={it.pricePerUnit} onChange={e => updateItem(i, 'pricePerUnit', e.target.value)} />
                        </div>
                      </div>
                      {it.quantity && it.pricePerUnit && (
                        <p className="text-xs text-right text-slate-500 font-medium">= {fmt((Number(it.quantity)||0)*(Number(it.pricePerUnit)||0))}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right text-sm font-semibold text-slate-700">Total: {fmt(totalCalc)}</div>
              </div>

              {/* Initial payment — only for new purchases */}
              {vendorMode !== 'existing' && (
                <>
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
                </>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowAdd(false); resetAddForm() }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 btn-primary py-2.5">
                  {addLoading ? 'Saving…' : vendorMode === 'existing' ? 'Add to Existing Purchase' : 'Save Purchase'}
                </button>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Receipt No. <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input-field" placeholder="e.g. RCP-001" value={payReceiptNo} onChange={e => setPayReceiptNo(e.target.value)} />
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
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Bill / Invoice No</label><input type="text" className="input-field" placeholder="e.g. INV-2024-001" value={editForm.billNo} onChange={e => setEditForm({ ...editForm, billNo: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">GST No</label><input type="text" className="input-field" value={editForm.gstNo} onChange={e => setEditForm({ ...editForm, gstNo: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label><input type="date" className="input-field" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label><input type="text" className="input-field" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Items</label>
                <div className="space-y-2">
                  {editItems.map((it, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-600">{it.productName}</p>
                        {it.category && <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">{it.category}</span>}
                      </div>
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

      <UndoToast undoPending={undoPending} undoCountdown={undoCountdown} onUndo={cancelUndo} />
    </div>
  )
}
