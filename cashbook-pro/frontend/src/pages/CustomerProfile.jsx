import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  ArrowLeftIcon, PhoneIcon, MapPinIcon, IdentificationIcon,
  PlusIcon, MinusIcon, XMarkIcon, CheckCircleIcon,
  ExclamationTriangleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  CalendarIcon, UserIcon, DocumentArrowDownIcon, CubeIcon, BanknotesIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0)


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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Credit / Debit modal
  const [modal, setModal] = useState(null) // 'credit' | 'debit' | null
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [payMode, setPayMode] = useState('cash')
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState('')

  // Debit — stock-item mode
  const [debitMode, setDebitMode] = useState('money') // 'money' | 'stock'
  const [stockList, setStockList] = useState([])
  const [stockSearch, setStockSearch] = useState('')
  const [selectedStock, setSelectedStock] = useState(null)
  const [stockQty, setStockQty] = useState('')

  const fetchPassbook = useCallback(async (pg = 1) => {
    setTxnLoading(true)
    try {
      const params = { page: pg, limit: 20 }
      if (dateFrom) params.dateFrom = dateFrom
      if (dateTo)   params.dateTo   = dateTo
      const res = await api.get(`/customers/${id}/passbook`, { params })
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
  }, [id, dateFrom, dateTo])

  useEffect(() => { fetchPassbook(1) }, [fetchPassbook])

  const openModal = async (type) => {
    setModal(type)
    setAmount('')
    setNote('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPayMode('cash')
    setModalError('')
    setDebitMode('money')
    setSelectedStock(null)
    setStockSearch('')
    setStockQty('')
    if (type === 'debit' && stockList.length === 0) {
      try {
        const res = await api.get('/stock', { params: { limit: 200 } })
        setStockList(res.data.items || res.data || [])
      } catch {}
    }
  }

  const handleTransaction = async (e) => {
    e.preventDefault()
    setModalError('')

    if (modal === 'debit' && debitMode === 'stock') {
      if (!selectedStock) return setModalError('Select a stock item')
      if (!stockQty || Number(stockQty) <= 0) return setModalError('Enter a valid quantity')
      if (Number(stockQty) > selectedStock.quantity) return setModalError(`Only ${selectedStock.quantity} ${selectedStock.unit} in stock`)
    } else {
      if (!amount || Number(amount) <= 0) return setModalError('Enter a valid amount')
    }

    setModalLoading(true)
    try {
      let payload
      if (modal === 'debit' && debitMode === 'stock') {
        payload = {
          stockId:  selectedStock._id,
          quantity: Number(stockQty),
          note:     note || `${selectedStock.name} × ${stockQty}`,
          date:     paymentDate,
          payMode,
        }
      } else {
        payload = { amount: Number(amount), note, date: paymentDate, payMode }
      }

      await api.post(`/customers/${id}/${modal}`, payload)
      setModal(null)
      setSuccess(modal === 'credit' ? 'Funds added successfully'
        : debitMode === 'stock' ? `${selectedStock.name} given — balance updated`
        : 'Amount deducted successfully')
      setTimeout(() => setSuccess(''), 3000)
      fetchPassbook(1)
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
            {customer.balance > 0 ? (
              <>
                <p className="text-3xl font-bold text-emerald-600">₹{customer.balance.toLocaleString('en-IN')}</p>
                <p className="text-xs text-emerald-600 mt-0.5">advance / credit</p>
              </>
            ) : customer.balance < 0 ? (
              <>
                <p className="text-3xl font-bold text-orange-500">₹{Math.abs(customer.balance).toLocaleString('en-IN')}</p>
                <p className="text-xs text-orange-500 font-semibold mt-0.5">loan outstanding</p>
              </>
            ) : (
              <p className="text-3xl font-bold text-slate-400">Cleared</p>
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
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-900">Passbook</h2>
              <p className="text-xs text-slate-400 mt-0.5">{total} transactions</p>
            </div>
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <DocumentArrowDownIcon className="h-4 w-4" /> Export CSV
            </button>
          </div>
          {/* Date filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <div className="flex items-center gap-1.5">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="input-field text-xs py-1.5 px-2 w-36" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="input-field text-xs py-1.5 px-2 w-36" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                <XMarkIcon className="h-3.5 w-3.5" /> Clear
              </button>
            )}
            {(dateFrom || dateTo) && (
              <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                Filtered
              </span>
            )}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map((txn) => {
              const isCredit = txn.type === 'credit' || txn.type === 'payment'
              const isSale   = txn.type === 'sale'
              const label =
                txn.type === 'credit'  ? 'Funds Added' :
                txn.type === 'debit'   ? 'Amount Deducted' :
                txn.type === 'payment' ? 'Payment Received' :
                txn.productDescription ? `Sale — ${txn.productDescription}` : 'Sale'
              return (
              <div key={txn._id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                {/* Icon */}
                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0
                  ${isCredit ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {isCredit
                    ? <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600" />
                    : <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    {isSale && txn.quantitySold && (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                        {txn.quantitySold} {txn.unit || 'pcs'}
                      </span>
                    )}
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
                    {txn.note && !isSale && <span className="text-xs text-slate-400 italic">"{txn.note}"</span>}
                  </div>
                </div>

                {/* Amount & Balance */}
                <div className="flex-shrink-0 text-right space-y-1">
                  <p className={`text-base font-bold ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : '-'}{fmt(txn.amount)}
                  </p>
                  {txn.balanceAfter < 0 ? (
                    <span className="inline-block text-[11px] font-bold bg-orange-100 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                      ₹{Math.abs(txn.balanceAfter).toLocaleString('en-IN')} due
                    </span>
                  ) : txn.balanceAfter === 0 ? (
                    <span className="inline-block text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Cleared
                    </span>
                  ) : (
                    <span className="inline-block text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ₹{txn.balanceAfter.toLocaleString('en-IN')} advance
                    </span>
                  )}
                </div>
              </div>
              )
            })}
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
              <p className={`ml-auto text-sm font-bold ${customer.balance > 0 ? 'text-emerald-600' : customer.balance < 0 ? 'text-orange-500' : 'text-slate-400'}`}>
                {customer.balance > 0 ? `₹${customer.balance.toLocaleString('en-IN')} advance`
                  : customer.balance < 0 ? `₹${Math.abs(customer.balance).toLocaleString('en-IN')} loan`
                  : 'Cleared'}
              </p>
            </div>

            {modalError && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />{modalError}
              </div>
            )}

            <form onSubmit={handleTransaction} className="space-y-4">

              {/* Debit mode toggle */}
              {modal === 'debit' && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setDebitMode('money'); setSelectedStock(null); setStockQty('') }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border transition-all ${debitMode === 'money' ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <BanknotesIcon className="h-4 w-4" /> Cash / Money
                  </button>
                  <button type="button" onClick={() => { setDebitMode('stock'); setAmount('') }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold border transition-all ${debitMode === 'stock' ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <CubeIcon className="h-4 w-4" /> Give Items
                  </button>
                </div>
              )}

              {/* Stock item picker */}
              {modal === 'debit' && debitMode === 'stock' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Stock Item *</label>
                    <div className="relative mb-2">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input type="text" className="input-field pl-9 text-sm" placeholder="Search item…"
                        value={stockSearch} onChange={e => { setStockSearch(e.target.value); setSelectedStock(null) }} />
                    </div>
                    {!selectedStock && (
                      <div className="border border-slate-200 rounded-xl max-h-36 overflow-auto">
                        {stockList
                          .filter(s => s.quantity > 0 && (!stockSearch || s.name.toLowerCase().includes(stockSearch.toLowerCase())))
                          .map(s => (
                          <button key={s._id} type="button"
                            onClick={() => { setSelectedStock(s); setStockSearch(s.name) }}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-800">{s.name}</span>
                            <span className="text-xs text-slate-400">{s.quantity} {s.unit} · ₹{s.pricePerUnit}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedStock && (
                      <div className="flex items-center justify-between bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-orange-700">{selectedStock.name}</p>
                          <p className="text-xs text-orange-500">In stock: {selectedStock.quantity} {selectedStock.unit} · ₹{selectedStock.pricePerUnit}/{selectedStock.unit}</p>
                        </div>
                        <button type="button" onClick={() => { setSelectedStock(null); setStockSearch(''); setStockQty('') }}
                          className="text-orange-400 hover:text-orange-600"><XMarkIcon className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Quantity * {selectedStock && <span className="text-slate-400 font-normal">(max {selectedStock.quantity})</span>}
                    </label>
                    <input type="number" min="0.01" step="any" className="input-field" placeholder="0"
                      value={stockQty} onChange={e => setStockQty(e.target.value)} />
                    {selectedStock && stockQty && Number(stockQty) > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Amount: ₹{(Number(stockQty) * selectedStock.pricePerUnit).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹) *</label>
                  <input type="number" min="0.01" step="0.01" required className="input-field text-lg font-bold"
                    placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
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

              {/* Loan warning */}
              {modal === 'debit' && (() => {
                const deductAmt = debitMode === 'stock' && selectedStock && stockQty
                  ? Number(stockQty) * selectedStock.pricePerUnit
                  : Number(amount) || 0
                return deductAmt > 0 && customer.balance - deductAmt < 0 ? (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2.5 rounded-xl text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                    Loan of ₹{Math.abs(customer.balance - deductAmt).toLocaleString('en-IN')} will be pending
                  </div>
                ) : null
              })()}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={modalLoading}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                    modal === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                  }`}>
                  {modalLoading ? 'Processing…'
                    : modal === 'credit' ? 'Add Funds'
                    : debitMode === 'stock' ? 'Give Items'
                    : 'Deduct'}
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
