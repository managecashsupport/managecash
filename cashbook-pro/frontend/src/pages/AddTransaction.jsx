import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import useTransactions from '../hooks/useTransactions'
import api from '../services/api'
import { 
  PlusCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserIcon,
  CalendarIcon,
  BanknotesIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import PaymentModeToggle from '../components/PaymentModeToggle'

const AddTransaction = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: editId } = useParams()
  const isEditing = Boolean(editId)
  const existingTx = location.state?.transaction

  const { createTransaction, updateTransaction, loading: transactionLoading } = useTransactions()

  const [formData, setFormData] = useState({
    type: existingTx?.type || location.state?.type || 'in',
    customerName: existingTx?.customerName || '',
    amount: existingTx?.amount || '',
    productDescription: existingTx?.productDescription || '',
    date: existingTx?.date ? existingTx.date.split('T')[0] : new Date().toISOString().split('T')[0],
    payMode: existingTx?.payMode || 'cash',
    notes: existingTx?.notes || ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Bill No
  const [billNo, setBillNo] = useState(existingTx?.billNo || '')

  // Partial payment
  const [totalAmount, setTotalAmount] = useState(existingTx?.totalAmount || '')
  const dueAmount = totalAmount && formData.amount && parseFloat(totalAmount) > parseFloat(formData.amount)
    ? parseFloat(totalAmount) - parseFloat(formData.amount)
    : null

  // Stock linkage
  const [stockItems, setStockItems] = useState([])
  const [selectedStock, setSelectedStock] = useState(null)
  const [stockSearch, setStockSearch] = useState(existingTx?.stockName || '')
  const [showStockDropdown, setShowStockDropdown] = useState(false)
  const [quantitySold, setQuantitySold] = useState(existingTx?.quantitySold || '')

  useEffect(() => {
    api.get('/stock').then(res => {
      const items = res.data.items
      setStockItems(items)
      // Pre-select stock item when editing
      if (isEditing && existingTx?.stockId) {
        const found = items.find(i => i._id === existingTx.stockId)
        if (found) setSelectedStock(found)
      }
    }).catch(() => {})
  }, [])

  const filteredStock = stockItems.filter(s =>
    s.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(stockSearch.toLowerCase())
  )

  const handleSelectStock = (item) => {
    setSelectedStock(item)
    setStockSearch(item.name)
    setShowStockDropdown(false)
    if (quantitySold) {
      const price = (item.pricePerUnit * Number(quantitySold)).toFixed(2)
      setFormData(prev => ({ ...prev, amount: price }))
      setTotalAmount(price)
    }
  }

  const handleQuantityChange = (qty) => {
    setQuantitySold(qty)
    if (selectedStock && qty) {
      const price = (selectedStock.pricePerUnit * Number(qty)).toFixed(2)
      setFormData(prev => ({ ...prev, amount: price }))
      setTotalAmount(price)
    }
  }

  const clearStock = () => {
    setSelectedStock(null)
    setStockSearch('')
    setQuantitySold('')
  }

  // Customer autocomplete
  const [customerQuery, setCustomerQuery] = useState(existingTx?.customerName || '')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const customerRef = React.useRef(null)

  // Wallet coverage (computed — no state needed)
  // These must be defined after selectedCustomer state to avoid TDZ (Temporal Dead Zone)
  const itemPrice      = parseFloat(totalAmount || formData.amount) || 0
  const walletBalance  = selectedCustomer?.balance || 0
  const isLinkedSale   = !!selectedCustomer && formData.type === 'out'
  const isLinkedReceipt= !!selectedCustomer && formData.type === 'in'
  const walletCovers   = isLinkedSale && walletBalance > 0 ? Math.min(walletBalance, itemPrice) : 0
  const cashNeeded     = isLinkedSale ? Math.max(0, itemPrice - walletCovers) : itemPrice
  const fullyFromWallet= isLinkedSale && itemPrice > 0 && walletCovers >= itemPrice
  const newWalletBal   = selectedCustomer && itemPrice > 0
    ? walletBalance + (formData.type === 'in' ? (parseFloat(formData.amount) || 0) : -itemPrice)
    : null

  // Pre-load linked customer when editing
  useEffect(() => {
    if (isEditing && existingTx?.linkedCustomerId) {
      api.get(`/customers/${existingTx.linkedCustomerId}`)
        .then(res => setSelectedCustomer(res.data))
        .catch(() => {}) // if customer was deleted, just leave unlinked
    }
  }, [])

  // Quick-add new customer
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickForm, setQuickForm] = useState({ fullName: '', mobile: '', village: '' })
  const [quickError, setQuickError] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch customer suggestions as user types
  useEffect(() => {
    if (customerQuery.length < 2) { setCustomerSuggestions([]); return }
    const timer = setTimeout(() => {
      api.get(`/customers?search=${encodeURIComponent(customerQuery)}&limit=8`)
        .then(res => setCustomerSuggestions(res.data.customers || res.data || []))
        .catch(() => setCustomerSuggestions([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [customerQuery])

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setFormData(prev => {
      const updated = { ...prev, customerName: customer.fullName }
      // If it's a "Sale / Gave" entry and customer has advance balance, pre-fill from wallet
      if (prev.type === 'out' && customer.balance > 0 && !prev.amount) {
        const walletAmt = customer.balance.toFixed(2)
        updated.amount = walletAmt
        setTotalAmount(walletAmt)
      }
      return updated
    })
    setCustomerQuery(customer.fullName)
    setShowCustomerDropdown(false)
    setShowQuickAdd(false)
  }

  const clearCustomer = () => {
    setSelectedCustomer(null)
    setCustomerQuery('')
    setFormData(prev => ({ ...prev, customerName: '' }))
    setShowQuickAdd(false)
  }

  const openQuickAdd = () => {
    setQuickForm({ fullName: customerQuery, mobile: '', village: '' })
    setQuickError('')
    setShowQuickAdd(true)
    setShowCustomerDropdown(false)
  }

  const handleQuickAdd = async () => {
    setQuickError('')
    if (!quickForm.fullName.trim()) return setQuickError('Name is required')
    if (!/^\d{7,15}$/.test(quickForm.mobile.replace(/\s+/g, '')))
      return setQuickError('Enter a valid mobile number')
    setQuickLoading(true)
    try {
      const res = await api.post('/customers', {
        fullName: quickForm.fullName.trim(),
        mobile:   quickForm.mobile.replace(/\s+/g, ''),
        village:  quickForm.village.trim(),
      })
      handleSelectCustomer(res.data)
    } catch (err) {
      setQuickError(err.response?.data?.error || 'Failed to create customer')
    } finally {
      setQuickLoading(false)
    }
  }

  useEffect(() => {
    // Set default type from URL params if provided
    const params = new URLSearchParams(location.search)
    const type = params.get('type')
    if (type === 'in' || type === 'out') {
      setFormData(prev => ({ ...prev, type }))
    }
  }, [location.search])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    const amtToCheck = totalAmount || formData.amount
    if (!amtToCheck) {
      newErrors.amount = 'Amount is required'
    } else {
      const amount = parseFloat(amtToCheck)
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number'
      } else if (amount > 1000000) {
        newErrors.amount = 'Amount cannot exceed ₹1,000,000'
      }
      // Paying Now must not exceed Total
      if (totalAmount && formData.amount) {
        const paying = parseFloat(formData.amount)
        const total  = parseFloat(totalAmount)
        if (paying > total) newErrors.amount = 'Paying now cannot exceed total amount'
      }
      // Ensure paying now is set
      if (!formData.amount) {
        setFormData(prev => ({ ...prev, amount: totalAmount }))
      }
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const transactionData = {
        type: formData.type,
        customerName: formData.customerName,
        amount: parseFloat(formData.amount),
        productDescription: formData.productDescription || null,
        date: formData.date,
        payMode: formData.payMode,
        notes: formData.notes || null,
        billNo: billNo.trim() || null,
        ...(totalAmount && parseFloat(totalAmount) > 0 ? { totalAmount: parseFloat(totalAmount) } : {}),
        ...(selectedStock && quantitySold ? {
          stockId: selectedStock._id,
          quantitySold: Number(quantitySold),
        } : {}),
        ...(selectedCustomer ? { linkedCustomerId: selectedCustomer._id } : {}),
      }

      const result = isEditing
        ? await updateTransaction(editId, transactionData)
        : await createTransaction(transactionData)

      if (result.success) {
        setShowSuccess(true)
        setTimeout(() => {
          navigate('/history')
        }, 2000)
      } else {
        setErrors({ submit: result.error })
      }

    } catch (err) {
      setErrors({ submit: err.message || 'Failed to save entry' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'in',
      customerName: '',
      amount: '',
      productDescription: '',
      date: new Date().toISOString().split('T')[0],
      payMode: 'cash',
      notes: ''
    })
    setErrors({})
    setShowSuccess(false)
    setSelectedCustomer(null)
    setCustomerQuery('')
    setBillNo('')
    setTotalAmount('')
    clearStock()
  }

  const formatCurrency = (amount) => {
    if (!amount) return '₹0'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">{isEditing ? 'Entry Updated!' : 'Entry Saved!'} ✅</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your {formData.type === 'in' ? 'payment in' : 'payment out'} has been {isEditing ? 'updated' : 'recorded'}.
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg border border-gray-200 sm:rounded-lg sm:px-10">
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Amount: {formatCurrency(formData.amount)}
                    </p>
                    <p className="text-sm text-green-700">
                      Customer: {formData.customerName}
                    </p>
                    <p className="text-sm text-green-700">
                      Type: {formData.type === 'in' ? 'Received' : 'Sale / Gave'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Redirecting to dashboard in 2 seconds...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Entry' : 'Add Entry'}</h1>
                <p className="text-gray-600">{isEditing ? 'Update the entry details below.' : 'Record money received or a sale / amount given.'}</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  ← Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
                <p className="text-xs text-slate-400 mb-2">
                  {formData.type === 'in'
                    ? 'Customer paid you / money received in shop'
                    : 'You sold goods or gave money to customer'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'in' }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                      formData.type === 'in'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Received</p>
                      <p className="text-[10px] font-normal opacity-70">Money came in</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'out' }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                      formData.type === 'out'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowTrendingDownIcon className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-bold">Sale / Gave</p>
                      <p className="text-[10px] font-normal opacity-70">Goods or money given</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Product from Stock */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Product / Item <span className="text-slate-400 font-normal">(optional — links to stock & auto-deducts)</span></p>

                  {selectedStock ? (
                    <div className="flex items-center gap-3 bg-white border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{selectedStock.name}</p>
                        <p className="text-xs text-slate-400">{selectedStock.category} · ₹{selectedStock.pricePerUnit} per {selectedStock.unit} · {selectedStock.quantity} in stock</p>
                      </div>
                      <button type="button" onClick={clearStock} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input type="text" className="input-field pl-9" placeholder="Search stock items…"
                        value={stockSearch}
                        onChange={e => { setStockSearch(e.target.value); setShowStockDropdown(true) }}
                        onFocus={() => setShowStockDropdown(true)}
                      />
                      {showStockDropdown && filteredStock.length > 0 && (
                        <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-auto">
                          {filteredStock.map(item => (
                            <button key={item._id} type="button"
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                              onClick={() => handleSelectStock(item)}>
                              <p className="text-sm font-medium text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-400">{item.category} · ₹{item.pricePerUnit}/{item.unit} · {item.quantity} left</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedStock && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity Sold ({selectedStock.unit})</label>
                      <input type="number" min="0.01" step="0.01" className="input-field"
                        placeholder={`e.g. 2 ${selectedStock.unit}`}
                        value={quantitySold}
                        onChange={e => handleQuantityChange(e.target.value)}
                      />
                      <p className="text-xs text-slate-400 mt-1">Amount auto-fills as qty × ₹{selectedStock.pricePerUnit}</p>
                    </div>
                  )}
                </div>

              {/* Customer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>

                  {selectedCustomer ? (
                    /* Confirmed customer card */
                    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{selectedCustomer.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          ID: <span className="font-mono font-semibold text-blue-600">{selectedCustomer.customerId}</span>
                          {selectedCustomer.village ? ` · ${selectedCustomer.village}` : ''}
                        </p>
                        {selectedCustomer.balance < 0 ? (
                          <span className="inline-block mt-1 text-[11px] font-bold bg-orange-100 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">
                            ₹{Math.abs(selectedCustomer.balance).toLocaleString('en-IN')} loan due
                          </span>
                        ) : selectedCustomer.balance === 0 ? (
                          <span className="inline-block mt-1 text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Cleared
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full">
                            ₹{selectedCustomer.balance.toLocaleString('en-IN')} advance
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={clearCustomer}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    /* Search input with dropdown */
                    <div className="relative" ref={customerRef}>
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        className={`input-field pl-9 ${errors.customerName ? 'border-red-300' : ''}`}
                        placeholder="Search by name or ID…"
                        value={customerQuery}
                        onChange={e => { setCustomerQuery(e.target.value); setShowCustomerDropdown(true) }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        autoComplete="off"
                      />
                      {showCustomerDropdown && customerQuery.length >= 2 && (
                        <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-64 overflow-auto">
                          {customerSuggestions.map(c => (
                            <button key={c._id} type="button"
                              onMouseDown={() => handleSelectCustomer(c)}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                              <p className="text-sm font-semibold text-slate-900">{c.fullName}</p>
                              <p className="text-xs text-slate-400">
                                ID: <span className="font-mono text-blue-500">{c.customerId}</span>
                                {c.village ? ` · ${c.village}` : ''}
                                {c.mobile ? ` · ${c.mobile}` : ''}
                              </p>
                            </button>
                          ))}
                          {/* Add new customer option */}
                          <button type="button"
                            onMouseDown={openQuickAdd}
                            className="w-full text-left px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border-t border-slate-100 transition-colors flex items-center gap-2">
                            <PlusCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-blue-700">Add "<span>{customerQuery}</span>" as new customer</p>
                          </button>
                          {/* Use without linking */}
                          <button type="button"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, customerName: customerQuery }))
                              setShowCustomerDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <p className="text-xs text-slate-500">Use <span className="font-semibold text-slate-700">"{customerQuery}"</span> without linking</p>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick-add new customer form */}
                  {showQuickAdd && !selectedCustomer && (
                    <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-blue-800 mb-3">New Customer Details</p>
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          className="input-field text-sm"
                          placeholder="Full name *"
                          value={quickForm.fullName}
                          onChange={e => setQuickForm(p => ({ ...p, fullName: e.target.value }))}
                        />
                        <input
                          type="tel"
                          className="input-field text-sm"
                          placeholder="Mobile number *"
                          value={quickForm.mobile}
                          onChange={e => setQuickForm(p => ({ ...p, mobile: e.target.value }))}
                        />
                        <input
                          type="text"
                          className="input-field text-sm"
                          placeholder="Village (optional)"
                          value={quickForm.village}
                          onChange={e => setQuickForm(p => ({ ...p, village: e.target.value }))}
                        />
                        {quickError && <p className="text-xs text-red-600">{quickError}</p>}
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={handleQuickAdd} disabled={quickLoading}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors">
                            {quickLoading ? 'Saving…' : 'Save & Select'}
                          </button>
                          <button type="button" onClick={() => setShowQuickAdd(false)}
                            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Total item price */}
                  <div>
                    <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700">
                      Total Amount (₹) *
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BanknotesIcon className="h-5 w-5 text-gray-300" />
                      </div>
                      <input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field pl-10"
                        placeholder="0.00"
                        value={totalAmount}
                        onChange={e => {
                          setTotalAmount(e.target.value)
                          // Only auto-fill paying now if it's currently empty
                          if (!formData.amount) {
                            setFormData(prev => ({ ...prev, amount: e.target.value }))
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Amount paying now — only shown when partial */}
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                      Paying Now (₹) *
                      {totalAmount && formData.amount === totalAmount && (
                        <span className="text-xs text-emerald-600 font-normal ml-2">full amount</span>
                      )}
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <BanknotesIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        className={`input-field pl-10 ${errors.amount ? 'border-red-300' : ''}`}
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={handleInputChange}
                      />
                    </div>
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                    )}
                  </div>

                  {/* Due preview */}
                  {dueAmount !== null && dueAmount > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <span className="text-xs text-orange-700 font-medium">Still to pay:</span>
                      <span className="text-sm font-bold text-orange-600">₹{dueAmount.toLocaleString('en-IN')}</span>
                      <span className="text-xs text-orange-400 ml-auto">will appear as due</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Wallet impact banner — shown when existing customer + amount */}
              {selectedCustomer && itemPrice > 0 && (
                isLinkedSale ? (
                  fullyFromWallet ? (
                    <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">Fully covered by wallet balance</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          ₹{itemPrice.toLocaleString('en-IN')} deducted from wallet ·
                          Balance: <span className="font-bold">₹{walletBalance.toLocaleString('en-IN')}</span> →{' '}
                          <span className={`font-bold ${(walletBalance - itemPrice) < 0 ? 'text-orange-600' : 'text-emerald-700'}`}>
                            ₹{(walletBalance - itemPrice).toLocaleString('en-IN')}
                          </span>
                        </p>
                        <p className="text-[11px] text-emerald-500 mt-0.5">No cash / online payment needed</p>
                      </div>
                    </div>
                  ) : walletCovers > 0 ? (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">Partial wallet coverage</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          ₹{walletCovers.toLocaleString('en-IN')} from wallet ·{' '}
                          <span className="font-bold">₹{cashNeeded.toLocaleString('en-IN')} cash/online</span> needed (or becomes loan)
                        </p>
                        <p className="text-[11px] text-amber-500 mt-0.5">
                          Wallet: ₹{walletBalance.toLocaleString('en-IN')} → ₹0 · Loan: ₹{cashNeeded.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <InformationCircleIcon className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-orange-700">
                          {walletBalance < 0 ? 'Adding to existing loan' : 'Full amount on loan'}
                        </p>
                        <p className="text-xs text-orange-600 mt-0.5">
                          Loan will be: <span className="font-bold">₹{Math.abs(walletBalance - itemPrice).toLocaleString('en-IN')}</span>
                        </p>
                      </div>
                    </div>
                  )
                ) : isLinkedReceipt && (
                  <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
                    newWalletBal >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <CheckCircleIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${newWalletBal >= 0 ? 'text-emerald-500' : 'text-orange-400'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${newWalletBal >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                        {walletBalance < 0 ? 'Reducing loan' : 'Adding to advance'}
                      </p>
                      <p className={`text-xs mt-0.5 ${newWalletBal >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        Balance: <span className="font-bold">
                          {walletBalance < 0 ? `-₹${Math.abs(walletBalance).toLocaleString('en-IN')}` : `₹${walletBalance.toLocaleString('en-IN')}`}
                        </span> →{' '}
                        <span className="font-bold">
                          {newWalletBal < 0 ? `-₹${Math.abs(newWalletBal).toLocaleString('en-IN')} loan remaining` : `₹${newWalletBal.toLocaleString('en-IN')} ${newWalletBal === 0 ? '(cleared)' : 'advance'}`}
                        </span>
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Product Description + Bill No */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700">
                    Item / Details
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="productDescription"
                      name="productDescription"
                      rows={2}
                      className="input-field"
                      placeholder="What was sold or bought (e.g. Rice 10kg, Electric wire)"
                      value={formData.productDescription}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="billNo" className="block text-sm font-medium text-gray-700">
                    Bill / Invoice No.
                  </label>
                  <div className="mt-1">
                    <input
                      id="billNo"
                      type="text"
                      className="input-field"
                      placeholder="e.g. INV-2024-001"
                      value={billNo}
                      onChange={e => setBillNo(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Date and Payment Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="date"
                      name="date"
                      type="date"
                      className={`input-field pl-10 ${errors.date ? 'border-red-300' : ''}`}
                      value={formData.date}
                      onChange={handleInputChange}
                    />
                  </div>
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                  )}
                </div>

                {fullyFromWallet ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700">From Wallet Balance</span>
                      <span className="text-xs text-emerald-500 ml-auto">No cash needed</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Mode
                      {walletCovers > 0 && cashNeeded > 0 && (
                        <span className="text-xs text-amber-500 font-normal ml-2">for ₹{cashNeeded.toLocaleString('en-IN')} cash portion</span>
                      )}
                    </label>
                    <PaymentModeToggle
                      value={formData.payMode}
                      onChange={(mode) => setFormData(prev => ({ ...prev, payMode: mode }))}
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="input-field"
                    placeholder="Any extra notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Error Display */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{errors.submit}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                  >
                    Reset Form
                  </button>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <InformationCircleIcon className="h-4 w-4" />
                    <span>Tip: Use Tab to navigate quickly</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting || transactionLoading}
                    className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting || transactionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <PlusCircleIcon className="h-5 w-5 mr-2" />
                        {isEditing ? 'Update Entry' : 'Save Entry'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Today's Summary</h3>
              <p className="text-2xl font-bold text-gray-900">₹0</p>
              <p className="text-xs text-gray-500">No entries yet today</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">This Month</h3>
              <p className="text-2xl font-bold text-gray-900">₹0</p>
              <p className="text-xs text-gray-500">No entries this month</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Quick Tips</h3>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Always verify customer details</li>
                <li>• Upload bill images for better record keeping</li>
                <li>• Use descriptive notes for future reference</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddTransaction