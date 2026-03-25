import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import {
  ReceiptPercentIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  CheckCircleIcon, ExclamationTriangleIcon, FunnelIcon,
} from '@heroicons/react/24/outline'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const PRESET_CATEGORIES = ['Rent', 'Electricity', 'Water', 'Internet', 'Transport', 'Maintenance', 'Packaging', 'Marketing', 'Other']

export default function Expenses() {
  const [expenses, setExpenses]     = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  const [filterCat, setFilterCat]   = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState({ category: '', customCategory: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], payMode: 'cash' })
  const [addError, setAddError]     = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm]     = useState({})
  const [editError, setEditError]   = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editCustomCat, setEditCustomCat] = useState('')

  const [deleteId, setDeleteId]     = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterCat) params.category = filterCat
      if (dateFrom)  params.dateFrom = dateFrom
      if (dateTo)    params.dateTo   = dateTo
      const [eRes, catRes, sumRes] = await Promise.all([
        api.get('/expenses', { params }),
        api.get('/expenses/categories'),
        api.get('/expenses/summary', { params: { dateFrom, dateTo } }),
      ])
      setExpenses(eRes.data.expenses)
      setCategories(catRes.data)
      setSummary(sumRes.data)
    } catch { setError('Failed to load expenses') }
    finally { setLoading(false) }
  }, [filterCat, dateFrom, dateTo])

  useEffect(() => { fetchAll() }, [fetchAll])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  const resolvedCategory = (form) => form.category === '__custom__' ? form.customCategory : form.category

  const handleAdd = async (e) => {
    e.preventDefault(); setAddError('')
    const cat = resolvedCategory(addForm)
    if (!cat?.trim()) return setAddError('Category is required')
    if (!addForm.amount || Number(addForm.amount) <= 0) return setAddError('Amount must be greater than 0')
    setAddLoading(true)
    try {
      await api.post('/expenses', { ...addForm, category: cat })
      setShowAdd(false)
      setAddForm({ category: '', customCategory: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], payMode: 'cash' })
      flash('Expense added'); fetchAll()
    } catch (err) { setAddError(err.response?.data?.error || 'Failed') }
    finally { setAddLoading(false) }
  }

  const openEdit = (ex) => {
    setEditTarget(ex)
    const isPreset = PRESET_CATEGORIES.includes(ex.category)
    const isKnown  = categories.includes(ex.category)
    setEditForm({
      category: (isPreset || isKnown) ? ex.category : '__custom__',
      customCategory: (isPreset || isKnown) ? '' : ex.category,
      amount: ex.amount, description: ex.description || '',
      date: ex.date.split('T')[0], payMode: ex.payMode,
    })
    setEditCustomCat((isPreset || isKnown) ? '' : ex.category)
    setEditError('')
  }
  const handleEdit = async (e) => {
    e.preventDefault(); setEditError('')
    const cat = editForm.category === '__custom__' ? editCustomCat : editForm.category
    if (!cat?.trim()) return setEditError('Category is required')
    setEditLoading(true)
    try {
      await api.put(`/expenses/${editTarget._id}`, { ...editForm, category: cat })
      setEditTarget(null); flash('Updated'); fetchAll()
    } catch (err) { setEditError(err.response?.data?.error || 'Failed') }
    finally { setEditLoading(false) }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/expenses/${deleteId}`)
      setDeleteId(null); flash('Deleted'); fetchAll()
    } catch { setError('Failed to delete') }
  }

  const openAddWithCategory = (cat) => {
    setAddForm({ category: cat, customCategory: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], payMode: 'cash' })
    setAddError('')
    setShowAdd(true)
  }

  const catColor = (cat) => {
    const colors = ['bg-blue-100 text-blue-700','bg-purple-100 text-purple-700','bg-pink-100 text-pink-700','bg-orange-100 text-orange-700','bg-teal-100 text-teal-700','bg-indigo-100 text-indigo-700']
    return colors[Math.abs([...cat].reduce((s, c) => s + c.charCodeAt(0), 0)) % colors.length]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Shop running costs — rent, utilities and more</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary gap-2"><PlusIcon className="h-4 w-4" /> Add Expense</button>
      </div>

      {success && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl"><CheckCircleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm font-medium">{success}</p></div>}
      {error   && <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"><ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm flex-1">{error}</p><button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button></div>}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="card p-4 md:col-span-1"><p className="text-xs text-slate-500 mb-1">Total Expenses</p><p className="text-2xl font-bold text-red-600">{fmt(summary.total)}</p></div>
          <div className="card p-4 col-span-2 md:col-span-2">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">By Category</p>
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.slice(0, 8).map(c => (
                <button key={c._id} onClick={() => openAddWithCategory(c._id)} title={`Quick-add ${c._id} expense`} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75 ${catColor(c._id)}`}>
                  {c._id}: {fmt(c.total)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap items-center">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input-field w-auto flex-1">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${showFilters ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            <FunnelIcon className="h-4 w-4" /> Date
          </button>
        </div>
        {showFilters && (
          <div className="flex gap-3 flex-wrap">
            <div><label className="block text-xs text-slate-500 mb-1">From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm" /></div>
            <div><label className="block text-xs text-slate-500 mb-1">To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm" /></div>
            <div className="flex items-end gap-2">
              <button onClick={() => { const t = new Date(); const f = new Date(t.getFullYear(), t.getMonth(), 1); setDateFrom(f.toISOString().split('T')[0]); setDateTo(t.toISOString().split('T')[0]) }} className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">This Month</button>
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="card p-4 animate-pulse h-16" />)}</div>
      ) : expenses.length === 0 ? (
        <div className="card p-12 text-center">
          <ReceiptPercentIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No expenses recorded</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto"><PlusIcon className="h-4 w-4" /> Add Expense</button>
        </div>
      ) : (
        <div className="card divide-y divide-slate-50">
          {expenses.map(ex => (
            <div key={ex._id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${catColor(ex.category)}`}>{ex.category}</span>
              <div className="flex-1 min-w-0">
                {ex.description && <p className="text-sm text-slate-700 truncate">{ex.description}</p>}
                <p className="text-xs text-slate-400">{fmtDate(ex.date)} · {ex.payMode}</p>
              </div>
              <p className="text-base font-bold text-red-600 flex-shrink-0">{fmt(ex.amount)}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(ex)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><PencilIcon className="h-4 w-4" /></button>
                <button onClick={() => setDeleteId(ex._id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><TrashIcon className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Add Expense</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {addError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">{addError}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category *</label>
                <select className="input-field" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value, customCategory: '' })}>
                  <option value="">Select category…</option>
                  {categories.length > 0 && (
                    <optgroup label="— Used Categories">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  )}
                  {PRESET_CATEGORIES.filter(c => !categories.includes(c)).length > 0 && (
                    <optgroup label="— Other Presets">
                      {PRESET_CATEGORIES.filter(c => !categories.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  )}
                  <option value="__custom__">+ Add new category</option>
                </select>
                {addForm.category === '__custom__' && (
                  <input type="text" className="input-field mt-2" placeholder="Enter category name" autoFocus value={addForm.customCategory} onChange={e => setAddForm({ ...addForm, customCategory: e.target.value })} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label>
                  <input type="number" min="0.01" step="0.01" required className="input-field" placeholder="0.00" value={addForm.amount} onChange={e => setAddForm({ ...addForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Mode</label>
                  <select className="input-field" value={addForm.payMode} onChange={e => setAddForm({ ...addForm, payMode: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
                <input type="date" required className="input-field" value={addForm.date} onChange={e => setAddForm({ ...addForm, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input-field" placeholder="e.g. Monthly rent payment" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 btn-primary py-2.5">{addLoading ? 'Saving…' : 'Add Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Expense</h2>
              <button onClick={() => setEditTarget(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {editError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{editError}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select className="input-field" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value, customCategory: '' })}>
                  <option value="">Select category…</option>
                  {categories.length > 0 && (
                    <optgroup label="— Used Categories">
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  )}
                  {PRESET_CATEGORIES.filter(c => !categories.includes(c)).length > 0 && (
                    <optgroup label="— Other Presets">
                      {PRESET_CATEGORIES.filter(c => !categories.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  )}
                  <option value="__custom__">+ Add new category</option>
                </select>
                {editForm.category === '__custom__' && (
                  <input type="text" className="input-field mt-2" placeholder="Enter category name" autoFocus value={editCustomCat} onChange={e => setEditCustomCat(e.target.value)} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹)</label><input type="number" min="0.01" className="input-field" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Mode</label><select className="input-field" value={editForm.payMode} onChange={e => setEditForm({ ...editForm, payMode: e.target.value })}><option value="cash">Cash</option><option value="online">Online</option></select></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label><input type="date" className="input-field" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label><input type="text" className="input-field" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 btn-primary py-2.5">{editLoading ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><TrashIcon className="h-6 w-6 text-red-500" /></div>
            <h3 className="text-lg font-bold text-slate-900">Delete Expense?</h3>
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
