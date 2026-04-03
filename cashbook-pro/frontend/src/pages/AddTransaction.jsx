import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import useTransactions from '../hooks/useTransactions'
import useUpload from '../hooks/useUpload'
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
import ImageUpload from '../components/ImageUpload'

const AddTransaction = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: editId } = useParams()
  const isEditing = Boolean(editId)
  const existingTx = location.state?.transaction

  const { createTransaction, updateTransaction, loading: transactionLoading } = useTransactions()
  const { uploadFile, loading: uploadLoading } = useUpload()

  const [formData, setFormData] = useState({
    type: existingTx?.type || location.state?.type || 'in',
    customerName: existingTx?.customerName || '',
    amount: existingTx?.amount || '',
    productDescription: existingTx?.productDescription || '',
    date: existingTx?.date ? existingTx.date.split('T')[0] : new Date().toISOString().split('T')[0],
    payMode: existingTx?.payMode || 'cash',
    notes: existingTx?.notes || ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Bill No
  const [billNo, setBillNo] = useState(existingTx?.billNo || '')

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
    // Auto-fill amount if quantity already entered
    if (quantitySold) {
      setFormData(prev => ({ ...prev, amount: (item.pricePerUnit * Number(quantitySold)).toFixed(2) }))
    }
  }

  const handleQuantityChange = (qty) => {
    setQuantitySold(qty)
    if (selectedStock && qty) {
      setFormData(prev => ({ ...prev, amount: (selectedStock.pricePerUnit * Number(qty)).toFixed(2) }))
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
    setFormData(prev => ({ ...prev, customerName: customer.fullName }))
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
    
    // Clear specific errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

  }

  const handleImageChange = (file) => {
    setImageFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required'
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required'
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Amount must be a positive number'
      } else if (amount > 1000000) {
        newErrors.amount = 'Amount cannot exceed ₹1,000,000'
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
      let imageUrl = null

      // Upload image if provided
      if (imageFile) {
        const uploadResult = await uploadFile(imageFile)
        if (uploadResult.success) {
          imageUrl = uploadResult.fileUrl
        } else {
          throw new Error(uploadResult.error || 'Failed to upload image')
        }
      }

      const transactionData = {
        type: formData.type,
        customerName: formData.customerName,
        amount: parseFloat(formData.amount),
        productDescription: formData.productDescription || null,
        date: formData.date,
        payMode: formData.payMode,
        imageUrl,
        notes: formData.notes || null,
        billNo: billNo.trim() || null,
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
    setImageFile(null)
    setImagePreview(null)
    setErrors({})
    setShowSuccess(false)
    setSelectedCustomer(null)
    setCustomerQuery('')
    setBillNo('')
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
                      Type: {formData.type === 'in' ? 'Cash In' : 'Cash Out'}
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
                <p className="text-gray-600">{isEditing ? 'Update the entry details below.' : 'Record a new payment in or out for your shop.'}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry Type
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'in' }))}
                    className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                      formData.type === 'in'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                    Payment In
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'out' }))}
                    className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                      formData.type === 'out'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ArrowTrendingDownIcon className="h-5 w-5 mr-2" />
                    Payment Out
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
                        <p className={`text-xs font-semibold mt-0.5 ${selectedCustomer.balance < 0 ? 'text-red-500' : selectedCustomer.balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          Wallet: {selectedCustomer.balance > 0
                            ? `₹${selectedCustomer.balance.toLocaleString('en-IN')} advance`
                            : selectedCustomer.balance < 0
                              ? `₹${Math.abs(selectedCustomer.balance).toLocaleString('en-IN')} loan due`
                              : 'Cleared'}
                        </p>
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

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount (₹) *
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
              </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode
                  </label>
                  <PaymentModeToggle
                    value={formData.payMode}
                    onChange={(mode) => setFormData(prev => ({ ...prev, payMode: mode }))}
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill/Receipt Image
                </label>
                <ImageUpload
                  file={imageFile}
                  preview={imagePreview}
                  onChange={handleImageChange}
                  accept="image/*"
                  maxSize={5 * 1024 * 1024} // 5MB
                />
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
                    disabled={isSubmitting || transactionLoading || uploadLoading}
                    className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting || transactionLoading || uploadLoading ? (
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