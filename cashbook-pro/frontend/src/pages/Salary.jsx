import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import {
  UserIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  CheckCircleIcon, ExclamationTriangleIcon, BanknotesIcon, ClockIcon,
} from '@heroicons/react/24/outline'

const fmt  = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const STATUS_STYLE  = { pending: 'bg-red-100 text-red-700', partial: 'bg-orange-100 text-orange-700', paid: 'bg-green-100 text-green-700' }
const STATUS_BORDER = { pending: 'border-l-4 border-l-red-400', partial: 'border-l-4 border-l-orange-400', paid: '' }

const now = new Date()

export default function Salary() {
  const [salaries, setSalaries]   = useState([])
  const [staff, setStaff]         = useState([])
  const [summary, setSummary]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [filterYear,  setFilterYear]  = useState(now.getFullYear())
  const [filterStaff, setFilterStaff] = useState('')
  const [filterStatus,setFilterStatus]= useState('')

  const [showAdd, setShowAdd]     = useState(false)
  const [addForm, setAddForm]     = useState({ staffId: '', month: now.getMonth() + 1, year: now.getFullYear(), baseSalary: '', deductions: '', notes: '' })
  const [addError, setAddError]   = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm]     = useState({ baseSalary: '', deductions: '', notes: '' })
  const [editError, setEditError]   = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [payTarget, setPayTarget]   = useState(null)
  const [payAmount, setPayAmount]   = useState('')
  const [payNote,   setPayNote]     = useState('')
  const [payDate,   setPayDate]     = useState(new Date().toISOString().split('T')[0])
  const [payMode,   setPayMode]     = useState('cash')
  const [payLoading, setPayLoading] = useState(false)
  const [payError,  setPayError]    = useState('')

  const [expanded,  setExpanded]    = useState(null)
  const [deleteId,  setDeleteId]    = useState(null)

  const fetchSalaries = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filterMonth)  params.month   = filterMonth
      if (filterYear)   params.year    = filterYear
      if (filterStaff)  params.staffId = filterStaff
      if (filterStatus) params.status  = filterStatus

      const sRes = await api.get('/salaries', { params })
      setSalaries(sRes.data.salaries ?? sRes.data)
    } catch {
      setError('Failed to load salaries')
    } finally {
      setLoading(false)
    }

    // Summary separately — failure here should not block the list
    try {
      const sumRes = await api.get('/salaries/summary', { params: { month: filterMonth, year: filterYear } })
      setSummary(sumRes.data)
    } catch {}
  }, [filterMonth, filterYear, filterStaff, filterStatus])

  useEffect(() => { fetchSalaries() }, [fetchSalaries])
  useEffect(() => { api.get('/users').then(r => setStaff(r.data)).catch(() => {}) }, [])

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  const handleAdd = async (e) => {
    e.preventDefault(); setAddError('')
    if (!addForm.staffId || !addForm.baseSalary) return setAddError('Staff and base salary are required')
    setAddLoading(true)
    try {
      await api.post('/salaries', addForm)
      setShowAdd(false); flash('Salary record created'); fetchSalaries()
    } catch (err) { setAddError(err.response?.data?.error || 'Failed to create') }
    finally { setAddLoading(false) }
  }

  const openEdit = (s) => {
    setEditTarget(s)
    setEditForm({ baseSalary: s.baseSalary, deductions: s.deductions, notes: s.notes })
    setEditError('')
  }
  const handleEdit = async (e) => {
    e.preventDefault(); setEditError('')
    setEditLoading(true)
    try {
      await api.put(`/salaries/${editTarget._id}`, editForm)
      setEditTarget(null); flash('Updated'); fetchSalaries()
    } catch (err) { setEditError(err.response?.data?.error || 'Failed') }
    finally { setEditLoading(false) }
  }

  const openPay = (s) => { setPayTarget(s); setPayAmount(''); setPayNote(''); setPayDate(new Date().toISOString().split('T')[0]); setPayMode('cash'); setPayError('') }
  const handlePay = async (e) => {
    e.preventDefault(); setPayError('')
    if (!payAmount || Number(payAmount) <= 0) return setPayError('Enter valid amount')
    if (Number(payAmount) > payTarget.balance) return setPayError(`Max payable: ${fmt(payTarget.balance)}`)
    setPayLoading(true)
    try {
      await api.post(`/salaries/${payTarget._id}/payment`, { amount: Number(payAmount), note: payNote, date: payDate, payMode })
      setPayTarget(null); flash('Payment recorded'); fetchSalaries()
    } catch (err) { setPayError(err.response?.data?.error || 'Failed') }
    finally { setPayLoading(false) }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/salaries/${deleteId}`)
      setDeleteId(null); flash('Deleted'); fetchSalaries()
    } catch { setError('Failed to delete') }
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Salary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage staff salary payments</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary gap-2"><PlusIcon className="h-4 w-4" /> Add Salary Record</button>
      </div>

      {success && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl"><CheckCircleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm font-medium">{success}</p></div>}
      {error   && <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"><ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" /><p className="text-sm flex-1">{error}</p><button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button></div>}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Payable', value: fmt(summary.totalNet),  color: 'text-slate-900' },
            { label: 'Total Paid',    value: fmt(summary.totalPaid), color: 'text-emerald-600' },
            { label: 'Total Due',     value: fmt(summary.totalDue),  color: 'text-orange-600' },
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
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input-field w-auto">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="input-field w-auto">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)} className="input-field w-auto">
          <option value="">All Staff</option>
          {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-20" />)}</div>
      ) : salaries.length === 0 ? (
        <div className="card p-12 text-center">
          <UserIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">
            {filterStaff
              ? `No salary records found for this staff member`
              : `No salary records for this period`}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {filterStaff ? 'Create a salary record to get started.' : `${MONTHS[filterMonth - 1]} ${filterYear}`}
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto"><PlusIcon className="h-4 w-4" /> Add Record</button>
        </div>
      ) : (
        <div className="space-y-3">
          {salaries.map(s => (
            <div key={s._id} className={`card overflow-hidden ${STATUS_BORDER[s.status]}`}>
              <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(expanded === s._id ? null : s._id)}>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {s.staffName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900">{s.staffName}</p>
                    <span className="text-xs text-slate-400">{MONTHS[s.month - 1]} {s.year}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Base: {fmt(s.baseSalary)}</span>
                    {s.deductions > 0 && <span className="text-red-500">- {fmt(s.deductions)} deductions</span>}
                    {s.status !== 'paid' && <span className="text-orange-600 font-semibold">Due: {fmt(s.balance)}</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-slate-900">{fmt(s.netSalary)}</p>
                  <p className="text-xs text-slate-400">Paid: {fmt(s.paidAmount)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {s.status !== 'paid' && (
                    <button onClick={() => openPay(s)} className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Pay">
                      <BanknotesIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => openEdit(s)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><PencilIcon className="h-4 w-4" /></button>
                  <button onClick={() => setDeleteId(s._id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><TrashIcon className="h-4 w-4" /></button>
                </div>
              </div>

              {expanded === s._id && s.payments.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Payment History</p>
                  <div className="space-y-1">
                    {s.payments.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <ClockIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-500">{fmtDate(p.date)}</span>
                        <span className="font-semibold text-emerald-600">{fmt(p.amount)}</span>
                        {p.note && <span className="text-slate-400 italic">{p.note}</span>}
                      </div>
                    ))}
                  </div>
                  {s.notes && <p className="text-xs text-slate-400 italic mt-2">Note: {s.notes}</p>}
                </div>
              )}
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
              <h2 className="text-lg font-bold text-slate-900">Add Salary Record</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {addError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">{addError}</div>}
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Staff Member *</label>
                <select required className="input-field" value={addForm.staffId} onChange={e => setAddForm({ ...addForm, staffId: e.target.value })}>
                  <option value="">Select staff…</option>
                  {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Month *</label>
                  <select className="input-field" value={addForm.month} onChange={e => setAddForm({ ...addForm, month: e.target.value })}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Year *</label>
                  <select className="input-field" value={addForm.year} onChange={e => setAddForm({ ...addForm, year: e.target.value })}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Salary (₹) *</label>
                  <input type="number" min="0" required className="input-field" placeholder="0" value={addForm.baseSalary} onChange={e => setAddForm({ ...addForm, baseSalary: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Deductions (₹)</label>
                  <input type="number" min="0" className="input-field" placeholder="0" value={addForm.deductions} onChange={e => setAddForm({ ...addForm, deductions: e.target.value })} />
                  {addForm.baseSalary && <p className="text-xs text-emerald-600 mt-1">Net: {fmt(Number(addForm.baseSalary) - Number(addForm.deductions || 0))}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input-field" placeholder="e.g. 2 days leave deducted" value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addLoading} className="flex-1 btn-primary py-2.5">{addLoading ? 'Creating…' : 'Create Record'}</button>
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
              <h2 className="text-lg font-bold text-slate-900">Edit Salary</h2>
              <button onClick={() => setEditTarget(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {editError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{editError}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Salary (₹)</label>
                  <input type="number" min="0" className="input-field" value={editForm.baseSalary} onChange={e => setEditForm({ ...editForm, baseSalary: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Deductions (₹)</label>
                  <input type="number" min="0" className="input-field" value={editForm.deductions} onChange={e => setEditForm({ ...editForm, deductions: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <input type="text" className="input-field" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editLoading} className="flex-1 btn-primary py-2.5">{editLoading ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPayTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
              <button onClick={() => setPayTarget(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm font-semibold">{payTarget.staffName} — {MONTHS[payTarget.month - 1]} {payTarget.year}</p>
              <p className="text-xs text-orange-700 mt-0.5">Outstanding: <span className="font-bold">{fmt(payTarget.balance)}</span></p>
            </div>
            {payError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{payError}</div>}
            <form onSubmit={handlePay} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label><input type="number" min="0.01" step="0.01" required autoFocus className="input-field text-lg font-bold" placeholder="0" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label><input type="date" required className="input-field" value={payDate} onChange={e => setPayDate(e.target.value)} /></div>
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
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Note <span className="text-slate-400 font-normal">(optional)</span></label><input type="text" className="input-field" value={payNote} onChange={e => setPayNote(e.target.value)} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPayTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={payLoading} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold">{payLoading ? 'Saving…' : 'Record Payment'}</button>
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
            <h3 className="text-lg font-bold text-slate-900">Delete Record?</h3>
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
