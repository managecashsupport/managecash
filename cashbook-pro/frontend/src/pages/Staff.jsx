import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  UserPlusIcon,
  UserIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'

const Staff = () => {
  const { user } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState('staff')
  const [generatedLink, setGeneratedLink] = useState('')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copied, setCopied] = useState(false)

  // Edit modal
  const [editMember, setEditMember] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', role: 'staff' })
  const [editError, setEditError] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null)

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

  // ── Invite flow ────────────────────────────────────
  const openInvite = () => {
    setGeneratedLink('')
    setInviteRole('staff')
    setCopied(false)
    setShowInvite(true)
  }

  const generateInvite = async () => {
    setGeneratingInvite(true)
    try {
      const res = await api.post('/auth/invite', { role: inviteRole })
      const link = `${window.location.origin}/join?code=${res.data.code}`
      setGeneratedLink(link)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate invite')
      setShowInvite(false)
    } finally {
      setGeneratingInvite(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── Edit flow ──────────────────────────────────────
  const openEdit = (member) => {
    setEditMember(member)
    setEditForm({ name: member.name, role: member.role })
    setEditError('')
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    if (!editForm.name.trim()) return setEditError('Name is required')
    setEditSubmitting(true)
    try {
      await api.put(`/users/${editMember.id}`, { name: editForm.name, role: editForm.role })
      setSuccess('Staff member updated')
      setEditMember(null)
      fetchStaff()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update')
    } finally {
      setEditSubmitting(false)
    }
  }

  // ── Delete flow ────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`)
      setDeleteId(null)
      setSuccess('Staff member removed')
      fetchStaff()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
          <p className="text-sm text-slate-500 mt-0.5">Invite team members and manage their access</p>
        </div>
        <button onClick={openInvite} className="btn-primary gap-2">
          <UserPlusIcon className="h-4 w-4" />
          Invite Member
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
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError('')} className="ml-auto"><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* How it works banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-blue-800 mb-2">How to add a team member</p>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Click <strong>Invite Member</strong> → choose role → click <strong>Generate Link</strong></li>
          <li>Copy the link and send it via WhatsApp, SMS, or email</li>
          <li>They open the link, fill in their name, email/phone, and create a password</li>
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
            <div key={member.id} className="card p-5 flex items-center gap-4">
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
                    <BanknotesIcon className="h-3.5 w-3.5" />{member.transactionCount} transactions
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {new Date(member.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {member.id !== user?.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(member)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(member.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove">
                    <TrashIcon className="h-4 w-4" />
                  </button>
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
              <button onClick={() => setShowInvite(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {!generatedLink ? (
              <>
                <p className="text-sm text-slate-500 mb-5">
                  Choose a role and generate a one-time invite link. The link is valid for <strong>7 days</strong> and can only be used once.
                </p>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role for this member</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'staff', label: '👤 Staff', desc: 'Can add and view own transactions' },
                      { value: 'admin', label: '🛡️ Admin', desc: 'Full access to all data and settings' },
                    ].map(r => (
                      <button key={r.value} type="button"
                        onClick={() => setInviteRole(r.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          inviteRole === r.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
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
                      className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        copied ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}>
                      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Send this via WhatsApp, SMS, or email. The member registers themselves — you don't need to set a password.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowInvite(false)}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Done
                  </button>
                  <button onClick={() => setGeneratedLink('')}
                    className="flex-1 btn-primary py-2.5">
                    New Invite
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditMember(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Edit Member</h2>
              <button onClick={() => setEditMember(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            {editError && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{editError}</p>
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input type="text" required className="input-field"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {['staff', 'admin'].map(r => (
                    <button key={r} type="button"
                      onClick={() => setEditForm({ ...editForm, role: r })}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                        editForm.role === r ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      {r === 'admin' ? '🛡️ Admin' : '👤 Staff'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditMember(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting} className="flex-1 btn-primary py-2.5">
                  {editSubmitting ? 'Saving…' : 'Save'}
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
            <h3 className="text-lg font-bold text-slate-900">Remove Member?</h3>
            <p className="text-sm text-slate-500 mt-1">Their account will be deactivated. All their transactions remain.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Staff
