import React, { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  UserPlusIcon, UserIcon, ShieldCheckIcon, TrashIcon, PencilIcon,
  XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, LinkIcon,
  ClipboardDocumentIcon, ClockIcon, BanknotesIcon, PlusIcon,
  ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline'

const fmt     = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const now     = new Date()
const YEARS   = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

const STATUS_STYLE  = { pending: 'bg-red-100 text-red-700', partial: 'bg-orange-100 text-orange-700', paid: 'bg-green-100 text-green-700' }
const STATUS_BORDER = { pending: 'border-l-4 border-l-red-400', partial: 'border-l-4 border-l-orange-400', paid: '' }

const Staff = () => {
  const { user } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── Staff invite / edit / delete ──
  const [showInvite, setShowInvite]         = useState(false)
  const [inviteRole, setInviteRole]         = useState('staff')
  const [generatedLink, setGeneratedLink]   = useState('')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copied, setCopied]                 = useState(false)
  const [editMember, setEditMember]         = useState(null)
  const [editForm, setEditForm]             = useState({ name: '', role: 'staff' })
  const [editError, setEditError]           = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteId, setDeleteId]             = useState(null)

  // ── Salary panel (per staff) ──
  const [salaryPanelId, setSalaryPanelId]   = useState(null)
  const [panelMonth, setPanelMonth]         = useState(now.getMonth() + 1)
  const [panelYear, setPanelYear]           = useState(now.getFullYear())
  const [panelSalaries, setPanelSalaries]   = useState([])
  const [panelSummary, setPanelSummary]     = useState(null)
  const [panelLoading, setPanelLoading]     = useState(false)
  const [expandedSal, setExpandedSal]       = useState(null) // expanded payment history row

  // Add salary record
  const [showAddSal, setShowAddSal]         = useState(false)
  const [addSalForm, setAddSalForm]         = useState({ month: now.getMonth() + 1, year: now.getFullYear(), baseSalary: '', deductions: '', notes: '' })
  const [addSalError, setAddSalError]       = useState('')
  const [addSalLoading, setAddSalLoading]   = useState(false)

  // Pay salary
  const [payTarget, setPayTarget]           = useState(null)
  const [payAmount, setPayAmount]           = useState('')
  const [payNote, setPayNote]               = useState('')
  const [payDate, setPayDate]               = useState(new Date().toISOString().split('T')[0])
  const [payMode, setPayMode]               = useState('cash')
  const [payLoading, setPayLoading]         = useState(false)
  const [payError, setPayError]             = useState('')

  // Edit salary record
  const [editSalTarget, setEditSalTarget]   = useState(null)
  const [editSalForm, setEditSalForm]       = useState({ baseSalary: '', deductions: '', notes: '' })
  const [editSalError, setEditSalError]     = useState('')
  const [editSalLoading, setEditSalLoading] = useState(false)

  const flash = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }

  // ── Staff ──────────────────────────────────────────────────
  const fetchStaff = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users')
      setStaff(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchStaff() }, [])

  const openInvite = () => { setGeneratedLink(''); setInviteRole('staff'); setCopied(false); setShowInvite(true) }
  const generateInvite = async () => {
    setGeneratingInvite(true)
    try {
      const res = await api.post('/auth/invite', { role: inviteRole })
      setGeneratedLink(`${window.location.origin}/join?code=${res.data.code}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate invite')
      setShowInvite(false)
    } finally { setGeneratingInvite(false) }
  }
  const copyLink = () => { navigator.clipboard.writeText(generatedLink); setCopied(true); setTimeout(() => setCopied(false), 2500) }

  const openEdit = (member) => { setEditMember(member); setEditForm({ name: member.name, role: member.role }); setEditError('') }
  const handleEdit = async (e) => {
    e.preventDefault(); setEditError('')
    if (!editForm.name.trim()) return setEditError('Name is required')
    setEditSubmitting(true)
    try {
      await api.put(`/users/${editMember.id}`, { name: editForm.name, role: editForm.role })
      flash('Staff member updated'); setEditMember(null); fetchStaff()
    } catch (err) { setEditError(err.response?.data?.error || 'Failed to update') }
    finally { setEditSubmitting(false) }
  }
  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`)
      setDeleteId(null); flash('Staff member removed'); fetchStaff()
    } catch (err) { setError(err.response?.data?.error || 'Failed to remove') }
  }

  // ── Salary panel ───────────────────────────────────────────
  const fetchPanelSalaries = useCallback(async (staffId, month, year) => {
    if (!staffId) return
    setPanelLoading(true)
    try {
      const res = await api.get('/salaries', { params: { staffId, month, year } })
      setPanelSalaries(res.data)
    } catch { setPanelSalaries([]) }
    finally { setPanelLoading(false) }
    try {
      const sumRes = await api.get('/salaries/summary', { params: { month, year } })
      setPanelSummary(sumRes.data)
    } catch { setPanelSummary(null) }
  }, [])

  const toggleSalaryPanel = (memberId) => {
    if (salaryPanelId === memberId) {
      setSalaryPanelId(null)
    } else {
      setSalaryPanelId(memberId)
      setPanelMonth(now.getMonth() + 1)
      setPanelYear(now.getFullYear())
      setPanelSalaries([])
      setPanelSummary(null)
      setExpandedSal(null)
      fetchPanelSalaries(memberId, now.getMonth() + 1, now.getFullYear())
    }
  }

  useEffect(() => {
    if (salaryPanelId) fetchPanelSalaries(salaryPanelId, panelMonth, panelYear)
  }, [panelMonth, panelYear, salaryPanelId, fetchPanelSalaries])

  // Add salary
  const openAddSal = () => {
    setAddSalForm({ month: panelMonth, year: panelYear, baseSalary: '', deductions: '', notes: '' })
    setAddSalError('')
    setShowAddSal(true)
  }
  const handleAddSal = async (e) => {
    e.preventDefault(); setAddSalError('')
    if (!addSalForm.baseSalary) return setAddSalError('Base salary is required')
    setAddSalLoading(true)
    try {
      await api.post('/salaries', { ...addSalForm, staffId: salaryPanelId })
      setShowAddSal(false); flash('Salary record created')
      fetchPanelSalaries(salaryPanelId, panelMonth, panelYear)
    } catch (err) { setAddSalError(err.response?.data?.error || 'Failed to create') }
    finally { setAddSalLoading(false) }
  }

  // Pay
  const openPay = (s) => { setPayTarget(s); setPayAmount(''); setPayNote(''); setPayDate(new Date().toISOString().split('T')[0]); setPayMode('cash'); setPayError('') }
  const handlePay = async (e) => {
    e.preventDefault(); setPayError('')
    if (!payAmount || Number(payAmount) <= 0) return setPayError('Enter valid amount')
    if (Number(payAmount) > payTarget.balance) return setPayError(`Max payable: ${fmt(payTarget.balance)}`)
    setPayLoading(true)
    try {
      await api.post(`/salaries/${payTarget._id}/payment`, { amount: Number(payAmount), note: payNote, date: payDate, payMode })
      setPayTarget(null); flash('Payment recorded')
      fetchPanelSalaries(salaryPanelId, panelMonth, panelYear)
    } catch (err) { setPayError(err.response?.data?.error || 'Failed') }
    finally { setPayLoading(false) }
  }

  // Edit salary
  const openEditSal = (s) => { setEditSalTarget(s); setEditSalForm({ baseSalary: s.baseSalary, deductions: s.deductions, notes: s.notes }); setEditSalError('') }
  const handleEditSal = async (e) => {
    e.preventDefault(); setEditSalError('')
    setEditSalLoading(true)
    try {
      await api.put(`/salaries/${editSalTarget._id}`, editSalForm)
      setEditSalTarget(null); flash('Updated')
      fetchPanelSalaries(salaryPanelId, panelMonth, panelYear)
    } catch (err) { setEditSalError(err.response?.data?.error || 'Failed') }
    finally { setEditSalLoading(false) }
  }

  // Delete salary record
  const [deleteSalId, setDeleteSalId] = useState(null)
  const handleDeleteSal = async () => {
    try {
      await api.delete(`/salaries/${deleteSalId}`)
      setDeleteSalId(null); flash('Deleted')
      fetchPanelSalaries(salaryPanelId, panelMonth, panelYear)
    } catch { setError('Failed to delete') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff & Salary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage team members and their salary records</p>
        </div>
        <button onClick={openInvite} className="btn-primary gap-2">
          <UserPlusIcon className="h-4 w-4" /> Invite Member
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium flex-1">{error}</p>
          <button onClick={() => setError('')}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* How it works banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">How to add a team member</p>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Click <strong>Invite Member</strong> → choose role → click <strong>Generate Link</strong></li>
          <li>Copy the link and send it via WhatsApp, SMS, or email</li>
          <li>They open the link, fill in their details, and create a password</li>
          <li>They log in using the <strong>Staff</strong> tab on the login page</li>
        </ol>
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <UserIcon className="h-7 w-7 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-700">No team members yet</p>
          <p className="text-sm text-slate-400 mt-1">Invite your first staff member to get started</p>
          <button onClick={openInvite} className="btn-primary mt-5 mx-auto">
            <UserPlusIcon className="h-4 w-4" /> Invite Member
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div key={member.id} className="card overflow-hidden">
              {/* Staff row */}
              <div className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold
                  ${member.role === 'admin' ? 'bg-gradient-to-br from-blue-500 to-violet-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                  {member.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{member.name}</p>
                    <span className={`chip text-[10px] ${member.role === 'admin' ? 'chip-blue' : 'chip-green'}`}>
                      {member.role === 'admin'
                        ? <><ShieldCheckIcon className="h-3 w-3" /> Admin</>
                        : <><UserIcon className="h-3 w-3" /> Staff</>}
                    </span>
                    {member.id === user?.id && <span className="chip chip-purple text-[10px]">You</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{member.username}</p>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <BanknotesIcon className="h-3.5 w-3.5" />{member.transactionCount} entries
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Salary toggle */}
                  <button
                    onClick={() => toggleSalaryPanel(member.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      salaryPanelId === member.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                    title="Salary"
                  >
                    <BanknotesIcon className="h-3.5 w-3.5" />
                    Salary
                    {salaryPanelId === member.id
                      ? <ChevronUpIcon className="h-3 w-3" />
                      : <ChevronDownIcon className="h-3 w-3" />}
                  </button>
                  {member.id !== user?.id && (
                    <>
                      <button onClick={() => openEdit(member)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(member.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── Salary Panel ── */}
              {salaryPanelId === member.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
                  {/* Month/Year filter + Add button */}
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <select value={panelMonth} onChange={e => setPanelMonth(Number(e.target.value))} className="input-field w-auto text-sm py-1.5">
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                      </select>
                      <select value={panelYear} onChange={e => setPanelYear(Number(e.target.value))} className="input-field w-auto text-sm py-1.5">
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <button onClick={openAddSal} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                      <PlusIcon className="h-3.5 w-3.5" /> Add Salary Record
                    </button>
                  </div>

                  {/* Records */}
                  {panelLoading ? (
                    <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />)}</div>
                  ) : panelSalaries.length === 0 ? (
                    <div className="text-center py-6">
                      <BanknotesIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No salary record for {MONTHS[panelMonth - 1]} {panelYear}</p>
                      <button onClick={openAddSal} className="mt-3 text-xs text-emerald-600 font-semibold hover:underline">+ Add one now</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {panelSalaries.map(s => (
                        <div key={s._id} className={`bg-white rounded-xl overflow-hidden border border-slate-200 ${STATUS_BORDER[s.status]}`}>
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-800">{MONTHS[s.month - 1]} {s.year}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span>Base: {fmt(s.baseSalary)}</span>
                                {s.deductions > 0 && <span className="text-red-500">- {fmt(s.deductions)} cut</span>}
                                <span className="font-semibold text-slate-700">Net: {fmt(s.netSalary)}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold text-slate-900">{fmt(s.netSalary)}</p>
                              <p className="text-xs text-slate-400">Paid: {fmt(s.paidAmount)}</p>
                              {s.status !== 'paid' && <p className="text-xs text-orange-600 font-semibold">Due: {fmt(s.balance)}</p>}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {s.status !== 'paid' && (
                                <button onClick={() => openPay(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Pay">
                                  <BanknotesIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button onClick={() => openEditSal(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => setDeleteSalId(s._id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                              {s.payments.length > 0 && (
                                <button onClick={() => setExpandedSal(expandedSal === s._id ? null : s._id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                                  {expandedSal === s._id ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Payment history */}
                          {expandedSal === s._id && (
                            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment History</p>
                              {s.payments.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 text-xs">
                                  <ClockIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="text-slate-500">{fmtDate(p.date)}</span>
                                  <span className="font-semibold text-emerald-600">{fmt(p.amount)}</span>
                                  <span className="text-slate-400 capitalize">{p.payMode}</span>
                                  {p.note && <span className="text-slate-400 italic">{p.note}</span>}
                                </div>
                              ))}
                              {s.notes && <p className="text-xs text-slate-400 italic mt-1">Note: {s.notes}</p>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Invite Modal ── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Invite Team Member</h2>
              <button onClick={() => setShowInvite(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {!generatedLink ? (
              <>
                <p className="text-sm text-slate-500 mb-5">Choose a role and generate a one-time invite link. Valid for <strong>7 days</strong>, single use.</p>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role for this member</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'staff', label: '👤 Staff', desc: 'Can add and view own entries' },
                      { value: 'admin', label: '🛡️ Admin', desc: 'Full access to all data and settings' },
                    ].map(r => (
                      <button key={r.value} type="button" onClick={() => setInviteRole(r.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${inviteRole === r.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <p className={`text-sm font-semibold ${inviteRole === r.value ? 'text-blue-700' : 'text-slate-700'}`}>{r.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={generateInvite} disabled={generatingInvite} className="w-full btn-primary py-3">
                  {generatingInvite
                    ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</>
                    : <><LinkIcon className="h-4 w-4" /> Generate Invite Link</>}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
                  <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-700">Invite link generated! Valid for 7 days.</p>
                </div>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Share this link</label>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <p className="flex-1 text-xs text-slate-600 font-mono truncate">{generatedLink}</p>
                    <button onClick={copyLink}
                      className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Send via WhatsApp, SMS, or email. They register themselves.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Done</button>
                  <button onClick={() => setGeneratedLink('')} className="flex-1 btn-primary py-2.5">New Invite</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Staff Modal ── */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditMember(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Member</h2>
              <button onClick={() => setEditMember(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {editError && <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl"><ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" /><p className="text-sm">{editError}</p></div>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input type="text" required className="input-field" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {['staff', 'admin'].map(r => (
                    <button key={r} type="button" onClick={() => setEditForm({ ...editForm, role: r })}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${editForm.role === r ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {r === 'admin' ? '🛡️ Admin' : '👤 Staff'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditMember(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 btn-primary py-2.5">{editSubmitting ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Staff Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><TrashIcon className="h-6 w-6 text-red-500" /></div>
            <h3 className="text-lg font-bold text-slate-900">Remove Member?</h3>
            <p className="text-sm text-slate-500 mt-1">Their account will be deactivated. All their entries remain.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Salary Modal ── */}
      {showAddSal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddSal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Add Salary Record</h2>
              <button onClick={() => setShowAddSal(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {addSalError && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">{addSalError}</div>}
            <form onSubmit={handleAddSal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Month *</label>
                  <select className="input-field" value={addSalForm.month} onChange={e => setAddSalForm({ ...addSalForm, month: e.target.value })}>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Year *</label>
                  <select className="input-field" value={addSalForm.year} onChange={e => setAddSalForm({ ...addSalForm, year: e.target.value })}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Salary (₹) *</label>
                  <input type="number" min="0" required className="input-field" placeholder="0" value={addSalForm.baseSalary} onChange={e => setAddSalForm({ ...addSalForm, baseSalary: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Deductions (₹)</label>
                  <input type="number" min="0" className="input-field" placeholder="0" value={addSalForm.deductions} onChange={e => setAddSalForm({ ...addSalForm, deductions: e.target.value })} />
                  {addSalForm.baseSalary && <p className="text-xs text-emerald-600 mt-1">Net: {fmt(Number(addSalForm.baseSalary) - Number(addSalForm.deductions || 0))}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" className="input-field" placeholder="e.g. 2 days leave deducted" value={addSalForm.notes} onChange={e => setAddSalForm({ ...addSalForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddSal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={addSalLoading} className="flex-1 btn-primary py-2.5">{addSalLoading ? 'Creating…' : 'Create Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Pay Salary Modal ── */}
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

      {/* ── Edit Salary Modal ── */}
      {editSalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditSalTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Salary</h2>
              <button onClick={() => setEditSalTarget(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {editSalError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{editSalError}</div>}
            <form onSubmit={handleEditSal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Base Salary (₹)</label><input type="number" min="0" className="input-field" value={editSalForm.baseSalary} onChange={e => setEditSalForm({ ...editSalForm, baseSalary: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Deductions (₹)</label><input type="number" min="0" className="input-field" value={editSalForm.deductions} onChange={e => setEditSalForm({ ...editSalForm, deductions: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label><input type="text" className="input-field" value={editSalForm.notes} onChange={e => setEditSalForm({ ...editSalForm, notes: e.target.value })} /></div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditSalTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={editSalLoading} className="flex-1 btn-primary py-2.5">{editSalLoading ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Salary Confirm ── */}
      {deleteSalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteSalId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><TrashIcon className="h-6 w-6 text-red-500" /></div>
            <h3 className="text-lg font-bold text-slate-900">Delete Salary Record?</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteSalId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeleteSal} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Staff
