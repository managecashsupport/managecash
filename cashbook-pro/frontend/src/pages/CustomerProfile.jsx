import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  ArrowLeftIcon, PhoneIcon, MapPinIcon, IdentificationIcon,
  PlusIcon, MinusIcon, XMarkIcon, CheckCircleIcon,
  ExclamationTriangleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  CalendarIcon, UserIcon, DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0)

const fmtDateTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

const CustomerProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [txnLoading, setTxnLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Credit / Debit modal
  const [modal, setModal] = useState(null) // 'credit' | 'debit' | null
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [payMode, setPayMode] = useState('cash')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  const fetchPassbook = useCallback(async (pg = 1) => {
    setTxnLoading(true)
    try {
      const res = await api.get(`/customers/${id}/passbook`, { params: { page: pg, limit: 20 } })
      setCustomer(res.data.customer)
      setTransactions(pg === 1 ? res.data.transactions : prev => [...prev, ...res.data.transactions])
      setTotal(res.data.total)
      setPage(pg)
    } catch {
      setError('Failed to load passbook')
    } finally {
      setLoading(false)
      setTxnLoading(false)
    }
  }, [id])

  useEffect(() => { fetchPassbook(1) }, [fetchPassbook])

  const openModal = (type) => {
    setModal(type)
    setAmount('')
    setNote('')
    setPaymentDate(new Date().toISOString().split('T')[0]) // default today
    setPayMode('cash')
    setModalError('')
  }

  const handleTransaction = async (e) => {
    e.preventDefault()
    setModalError('')
    if (!amount || Number(amount) <= 0) return setModalError('Enter a valid amount')
    setModalLoading(true)
    try {
      await api.post(`/customers/${id}/${modal}`, { amount: Number(amount), note, date: paymentDate, payMode })
      setModal(null)
      setSuccess(`${modal === 'credit' ? 'Funds added' : 'Amount deducted'} successfully`)
      setTimeout(() => setSuccess(''), 3000)
      fetchPassbook(1) // refresh
    } catch (err) {
      setModalError(err.response?.data?.error || 'Transaction failed')
    } finally {
      setModalLoading(false)
    }
  }

  const exportCSV = () => {
    if (!transactions.length) return
    const rows = [
      ['Payment Date', 'Entry Time', 'Type', 'Amount', 'Balance Before', 'Balance After', 'Note', 'Recorded By'],
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString('en-IN'),
        new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        t.type,
        t.amount,
        t.balanceBefore,
        t.balanceAfter,
        t.note,
        t.recordedBy?.name || '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `passbook-${customer?.customerId || id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3" />
        <div className="card p-6 h-32" />
        <div className="card p-6 h-64" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Customer not found.</p>
        <button onClick={() => navigate('/customers')} className="btn-primary mt-4 mx-auto">Back to Customers</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/customers')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back to Customers
      </button>

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

      {/* Customer Card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0
              ${customer.isLoan ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-violet-500'}`}>
              {customer.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{customer.fullName}</h1>
                {customer.isLoan && (
                  <span className="text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">On Loan</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <IdentificationIcon className="h-4 w-4" />{customer.customerId}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <PhoneIcon className="h-4 w-4" />{customer.mobile}
                </span>
                {customer.village && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    <MapPinIcon className="h-3.5 w-3.5" />{customer.village}
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1.5 text-sm text-slate-500">
                    <MapPinIcon className="h-4 w-4" />{customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Balance */}
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-0.5">Wallet Balance</p>
            <p className={`text-3xl font-bold ${customer.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmt(customer.balance)}
            </p>
            {customer.balance < 0 && (
              <p className="text-xs text-amber-600 mt-0.5">₹{Math.abs(customer.balance).toLocaleString('en-IN')} loan outstanding</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button onClick={() => openModal('credit')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors">
            <PlusIcon className="h-5 w-5" /> Add Funds
          </button>
          <button onClick={() => openModal('debit')}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors">
            <MinusIcon className="h-5 w-5" /> Deduct Amount
          </button>
        </div>
      </div>

      {/* Passbook */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Passbook</h2>
            <p className="text-xs text-slate-400 mt-0.5">{total} transactions</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 text-sm text-slateald-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            <DocumentArrowDownIcon className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map((txn) => (
              <div key={txn._id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                {/* Icon */}
                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0
                  ${txn.type === 'credit' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {txn.type === 'credit'
                    ? <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600" />
                    : <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 capitalize">{txn.type === 'credit' ? 'Funds Added' : 'Amount Deducted'}</p>
                    {txn.balanceAfter < 0 && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">LOAN</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-400">
                      entered {new Date(txn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                    {txn.recordedBy?.name && (
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <UserIcon className="h-3 w-3" />{txn.recordedBy.name}
                      </span>
                    )}
                    {txn.payMode && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${txn.payMode === 'online' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {txn.payMode}
                      </span>
                    )}
                    {txn.note && <span className="text-xs text-slate-400 italic">"{txn.note}"</span>}
                  </div>
                </div>

                {/* Amount & Balance */}
                <div className="flex-shrink-0 text-right">
                  <p className={`text-base font-bold ${txn.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {txn.type === 'credit' ? '+' : '-'}{fmt(txn.amount)}
                  </p>
                  <p className={`text-xs ${txn.balanceAfter >= 0 ? 'text-slate-400' : 'text-amber-600'}`}>
                    bal: {fmt(txn.balanceAfter)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {transactions.length < total && (
          <div className="px-5 py-4 border-t border-slate-100">
            <button onClick={() => fetchPassbook(page + 1)} disabled={txnLoading}
              className="w-full py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              {txnLoading ? 'Loading…' : `Load more (${total - transactions.length} remaining)`}
            </button>
          </div>
        )}
      </div>

      {/* ── Credit / Debit Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {modal === 'credit' ? '➕ Add Funds' : '➖ Deduct Amount'}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-5 ${modal === 'credit' ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className="text-sm font-medium text-slate-700">Customer: <span className="font-bold">{customer.fullName}</span></p>
              <p className={`ml-auto text-sm font-bold ${customer.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {fmt(customer.balance)}
              </p>
            </div>

            {modalError && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{modalError}
              </div>
            )}

            <form onSubmit={handleTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label>
                <input type="number" min="0.01" step="0.01" required className="input-field text-lg font-bold"
                  placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date *</label>
                <input type="date" required className="input-field"
                  value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]} />
                <p className="text-xs text-slate-400 mt-1">Entry time is recorded automatically</p>
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
                <input type="text" className="input-field" placeholder="e.g. Weekly collection, Rice purchase…"
                  value={note} onChange={e => setNote(e.target.value)} />
              </div>

              {modal === 'debit' && amount && customer.balance - Number(amount) < 0 && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2.5 rounded-xl text-sm">
                  <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                  Balance will go to {fmt(customer.balance - Number(amount))} — marked as loan
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={modalLoading}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                    modal === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                  }`}>
                  {modalLoading ? 'Processing…' : modal === 'credit' ? 'Add Funds' : 'Deduct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerProfile
