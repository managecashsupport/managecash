import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  UserGroupIcon, UserPlusIcon, MagnifyingGlassIcon,
  PencilIcon, TrashIcon, XMarkIcon, CheckCircleIcon,
  ExclamationTriangleIcon, PhoneIcon, MapPinIcon, CalendarIcon,
} from '@heroicons/react/24/outline'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0)

// ── Village autocomplete input ──
const VillageInput = ({ value, onChange, villages, placeholder = 'Type village name…' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const filtered = value
    ? villages.filter(v => v.toLowerCase().includes(value.toLowerCase()))
    : villages

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-44 overflow-auto">
          {filtered.map(v => (
            <button
              key={v}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-800 border-b border-slate-50 last:border-0 transition-colors"
              onMouseDown={() => { onChange(v); setOpen(false) }}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const Customers = () => {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [villages, setVillages] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVillage, setFilterVillage] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ fullName: '', mobile: '', address: '', village: '', customerId: '' })
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Edit modal
  const [editCustomer, setEditCustomer] = useState(null)
  const [editForm, setEditForm] = useState({ fullName: '', mobile: '', address: '', village: '', customerId: '' })
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null)

  const fetchVillages = useCallback(async () => {
    try {
      const res = await api.get('/customers/villages')
      setVillages(res.data)
    } catch {}
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (search)        params.search      = search
      if (filterVillage) params.village     = filterVillage
      if (createdFrom)   params.createdFrom = createdFrom
      if (createdTo)     params.createdTo   = createdTo
      const res = await api.get('/customers', { params })
      setCustomers(res.data)
    } catch {
      setError('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [search, filterVillage, createdFrom, createdTo])

  useEffect(() => { fetchVillages() }, [fetchVillages])

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(t)
  }, [fetchCustomers])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError('')
    if (!addForm.fullName || !addForm.mobile) return setAddError('Name and mobile are required')
    setAddLoading(true)
    try {
      await api.post('/customers', addForm)
      setShowAdd(false)
      setAddForm({ fullName: '', mobile: '', address: '', village: '', customerId: '' })
      flash('Customer added')
      fetchCustomers()
      fetchVillages()
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to add customer')
    } finally {
      setAddLoading(false)
    }
  }

  const openEdit = (c) => {
    setEditCustomer(c)
    setEditForm({ fullName: c.fullName, mobile: c.mobile, address: c.address || '', village: c.village || '', customerId: c.customerId })
    setEditError('')
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditLoading(true)
    try {
      await api.put(`/customers/${editCustomer._id}`, editForm)
      setEditCustomer(null)
      flash('Customer updated')
      fetchCustomers()
      fetchVillages()
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/customers/${id}`)
      setDeleteId(null)
      flash('Customer removed')
      fetchCustomers()
    } catch {
      setError('Failed to remove customer')
    }
  }

  const loanCount    = customers.filter(c => c.isLoan).length
  const totalBalance = customers.reduce((s, c) => s + c.balance, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {customers.length} customers
            {loanCount > 0 && <> · <span className="text-amber-600 font-medium">{loanCount} on loan</span></>}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary gap-2">
          <UserPlusIcon className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium flex-1">{error}</p>
          <button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total Wallet Balance</p>
          <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totalBalance)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">On Loan</p>
          <p className="text-2xl font-bold text-amber-600">{loanCount}</p>
        </div>
      </div>

      {/* Search + Village filter + Date filter */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, mobile, customer ID or village…"
            className="input-field pl-9"
          />
        </div>

        {/* Date added filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1 flex-shrink-0">
            <CalendarIcon className="h-3.5 w-3.5" /> Added:
          </span>
          <input type="date" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)}
            className="input-field text-xs py-1.5 px-2 w-36" />
          <span className="text-xs text-slate-400">to</span>
          <input type="date" value={createdTo} onChange={e => setCreatedTo(e.target.value)}
            className="input-field text-xs py-1.5 px-2 w-36" />
          {(createdFrom || createdTo) && (
            <button onClick={() => { setCreatedFrom(''); setCreatedTo('') }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
              <XMarkIcon className="h-3.5 w-3.5" /> Clear
            </button>
          )}
          {(createdFrom || createdTo) && (
            <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">Filtered</span>
          )}
        </div>

        {villages.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5" /> Village:
            </span>
            <button
              onClick={() => setFilterVillage('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterVillage === '' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            {villages.map(v => (
              <button
                key={v}
                onClick={() => setFilterVillage(filterVillage.toLowerCase() === v.toLowerCase() ? '' : v)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterVillage.toLowerCase() === v.toLowerCase() ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="card p-12 text-center">
          <UserGroupIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">{search || filterVillage ? 'No customers found' : 'No customers yet'}</p>
          <p className="text-sm text-slate-400 mt-1">
            {search || filterVillage ? 'Try a different search or village filter' : 'Add your first customer to get started'}
          </p>
          {!search && !filterVillage && (
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-5 mx-auto">
              <UserPlusIcon className="h-4 w-4" /> Add Customer
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map(c => (
            <div key={c._id}
              className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/customers/${c._id}`)}>
              {/* Avatar */}
              <div className={`h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg
                ${c.isLoan ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-violet-500'}`}>
                {c.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900">{c.fullName}</p>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{c.customerId}</span>
                  {c.isLoan && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Loan</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <PhoneIcon className="h-3.5 w-3.5" />{c.mobile}
                  </span>
                  {c.village && (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <MapPinIcon className="h-3 w-3" />{c.village}
                    </span>
                  )}
                  {c.address && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 truncate max-w-xs">
                      {c.address}
                    </span>
                  )}
                </div>
              </div>

              {/* Balance */}
              <div className="flex-shrink-0 text-right">
                <p className={`text-lg font-bold ${c.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(c.balance)}</p>
                <p className="text-xs text-slate-400">balance</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(c)}
                  className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteId(c._id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Add Customer</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {addError && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{addError}
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <input type="text" required className="input-field" placeholder="Customer full name"
                  value={addForm.fullName} onChange={e => setAddForm({ ...addForm, fullName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile (WhatsApp) *</label>
                <input type="tel" required className="input-field" placeholder="10-digit mobile number"
                  value={addForm.mobile} onChange={e => setAddForm({ ...addForm, mobile: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Village <span className="text-slate-400 font-normal">(optional)</span></label>
                <VillageInput
                  value={addForm.village}
                  onChange={v => setAddForm({ ...addForm, village: v })}
                  villages={villages}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input-field" placeholder="House / street address"
                  value={addForm.address} onChange={e => setAddForm({ ...addForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer ID <span className="text-slate-400 font-normal">(leave blank to auto-generate)</span></label>
                <input type="text" className="input-field" placeholder="e.g. CUST001 or leave blank"
                  value={addForm.customerId} onChange={e => setAddForm({ ...addForm, customerId: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 btn-primary py-2.5">
                  {addLoading ? 'Adding…' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditCustomer(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Customer</h2>
              <button onClick={() => setEditCustomer(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {editError && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{editError}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input type="text" required className="input-field"
                  value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile</label>
                <input type="tel" className="input-field"
                  value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Village</label>
                <VillageInput
                  value={editForm.village}
                  onChange={v => setEditForm({ ...editForm, village: v })}
                  villages={villages}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                <input type="text" className="input-field" placeholder="House / street address"
                  value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer ID</label>
                <input type="text" className="input-field"
                  value={editForm.customerId} onChange={e => setEditForm({ ...editForm, customerId: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditCustomer(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 btn-primary py-2.5">
                  {editLoading ? 'Saving…' : 'Save'}
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
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <TrashIcon className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Remove Customer?</h3>
            <p className="text-sm text-slate-500 mt-1">Their wallet history will be preserved.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers
