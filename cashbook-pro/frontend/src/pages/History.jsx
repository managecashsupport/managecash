import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useTransactions from '../hooks/useTransactions'
import api from '../services/api'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PhotoIcon,
  XMarkIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import SearchBar from '../components/SearchBar'
import useDeleteWithUndo from '../hooks/useDeleteWithUndo'
import UndoToast from '../components/UndoToast'

const History = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { transactions, summary, loading, loadingMore, error, total, page, fetchTransactions, fetchMoreTransactions, deleteTransaction, exportTransactions } = useTransactions()

  // track active filters for load-more
  const [activeParams, setActiveParams] = useState({})

  const [staffList, setStaffList] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    payMode: 'all',
    staffId: 'all',
    dateFrom: '',
    dateTo: ''
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [removedIds, setRemovedIds] = useState(new Set())
  const { scheduleDelete, undoPending, undoCountdown, cancelUndo } = useDeleteWithUndo()

  // Fetch staff list for filter (admin only)
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/users').then(res => setStaffList(res.data)).catch(() => {})
    }
  }, [user?.role])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)

    return () => clearTimeout(timer)
  }, [filters.search])

  // Apply filters
  useEffect(() => {
    const params = {}

    if (debouncedSearch) params.search = debouncedSearch
    if (filters.type !== 'all') params.type = filters.type
    if (filters.payMode !== 'all') params.payMode = filters.payMode
    if (filters.staffId !== 'all') params.staff_id = filters.staffId
    if (filters.dateFrom) params.date_from = filters.dateFrom
    if (filters.dateTo) params.date_to = filters.dateTo

    setActiveParams(params)
    fetchTransactions(params)
  }, [debouncedSearch, filters.type, filters.payMode, filters.staffId, filters.dateFrom, filters.dateTo])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      payMode: 'all',
      staffId: 'all',
      dateFrom: '',
      dateTo: ''
    })
    setDebouncedSearch('')
  }

  const handleDelete = (transaction) => {
    const id = transaction.id || transaction._id
    setRemovedIds(prev => new Set([...prev, id]))
    scheduleDelete({
      label: `Entry deleted — ${transaction.customerName}`,
      onConfirm: async () => {
        const result = await deleteTransaction(id)
        if (!result.success) setDeleteError(result.error || 'Failed to delete entry')
      },
      onUndo: () => setRemovedIds(prev => { const s = new Set(prev); s.delete(id); return s }),
    })
  }

  const handleExport = async () => {
    const params = {}
    if (filters.dateFrom) params.date_from = filters.dateFrom
    if (filters.dateTo) params.date_to = filters.dateTo
    
    await exportTransactions(params)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // Filter transactions based on search (client-side for instant feedback)
  const filteredTransactions = transactions.filter(transaction => !removedIds.has(transaction.id || transaction._id)).filter(transaction => {
    const matchesSearch = !debouncedSearch || 
      transaction.customerName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (transaction.productDescription && transaction.productDescription.toLowerCase().includes(debouncedSearch.toLowerCase()))
    
    const matchesType = filters.type === 'all' || transaction.type === filters.type
    const matchesPayMode = filters.payMode === 'all' || transaction.payMode === filters.payMode
    const matchesStaff = filters.staffId === 'all' || transaction.staffId === filters.staffId
    
    return matchesSearch && matchesType && matchesPayMode && matchesStaff
  })

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-300 rounded mb-2"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="font-medium">Error loading transactions</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">All Entries</h1>
                <p className="text-gray-600">View and manage all your transactions.</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/add-transaction')}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Add Transaction
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIn)}</p>
                  </div>
                  <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOut)}</p>
                  </div>
                  <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Balance</p>
                    <p className={`text-2xl font-bold ${summary.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.net)}
                    </p>
                  </div>
                  <BanknotesIcon className={`h-8 w-8 ${summary.net >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
                  </div>
                  <CreditCardIcon className="h-8 w-8 text-gray-500" />
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="flex-1">
                <SearchBar
                  value={filters.search}
                  onChange={(value) => handleFilterChange('search', value)}
                  placeholder="Search by customer name or description..."
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center px-3 py-2 rounded-lg border transition-colors ${
                    showFilters ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filters
                </button>
                
                <button
                  onClick={clearFilters}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Clear
                </button>
                
                <button
                  onClick={handleExport}
                  className="flex items-center px-3 py-2 text-green-600 hover:text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 pt-4 border-t border-gray-100">
                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="in">Cash In</option>
                    <option value="out">Cash Out</option>
                  </select>
                </div>

                {/* Payment Mode Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={filters.payMode}
                    onChange={(e) => handleFilterChange('payMode', e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="all">All Modes</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                {/* Staff Filter */}
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Staff</label>
                    <select
                      value={filters.staffId}
                      onChange={(e) => handleFilterChange('staffId', e.target.value)}
                      className="input-field text-sm"
                    >
                      <option value="all">All Staff</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Date Range Filters */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="input-field text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="input-field text-sm"
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex items-end space-x-2">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0]
                      handleFilterChange('dateFrom', today)
                      handleFilterChange('dateTo', today)
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
                      const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
                      handleFilterChange('dateFrom', firstDay)
                      handleFilterChange('dateTo', lastDay)
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    This Month
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Entries ({filteredTransactions.length})
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{filters.type !== 'all' && `${filters.type === 'in' ? 'Payment In' : 'Payment Out'} • `}</span>
                  <span>{filters.payMode !== 'all' && `${filters.payMode} • `}</span>
                  <span>{(filters.dateFrom || filters.dateTo) && `${filters.dateFrom ? formatDate(filters.dateFrom) : 'Start'} - ${filters.dateTo ? formatDate(filters.dateTo) : 'Today'}`}</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {deleteError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {deleteError}
                </div>
              )}
              {filteredTransactions.length > 0 ? (
                <div className="space-y-4">
                  {filteredTransactions.map((transaction) => (
                    <div key={transaction.id || transaction._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        {/* Left side: Transaction details */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'in' ? (
                                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                              ) : (
                                <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                              )}
                              {transaction.type === 'in' ? 'Cash In' : 'Cash Out'}
                            </span>
                            
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.payMode === 'cash' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {transaction.payMode === 'cash' ? (
                                <BanknotesIcon className="h-3 w-3 mr-1" />
                              ) : (
                                <CreditCardIcon className="h-3 w-3 mr-1" />
                              )}
                              {transaction.payMode === 'cash' ? 'Cash' : 'Online'}
                            </span>

                            {transaction.imageUrl && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <PhotoIcon className="h-3 w-3 mr-1" />
                                Bill
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-4 mb-2">
                            <h3 className="text-sm font-medium text-gray-900">{transaction.customerName}</h3>
                            {transaction.productDescription && (
                              <span className="text-xs text-gray-500 truncate max-w-xs">
                                {transaction.productDescription}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-6 text-sm">
                            <span className={`font-semibold ${
                              transaction.type === 'in' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'in' ? '+' : '-'} {formatCurrency(transaction.amount)}
                            </span>
                            
                            <div className="flex items-center text-gray-500">
                              <UserIcon className="h-4 w-4 mr-1" />
                              <span className="text-xs">{transaction.staffName}</span>
                            </div>
                            
                            <div className="flex items-center text-gray-500">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              <span className="text-xs">{formatDate(transaction.date)}</span>
                            </div>
                          </div>

                          {transaction.notes && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-600 italic">
                                "{transaction.notes}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Right side: Actions */}
                        <div className="flex items-center space-x-2">
                          {transaction.imageUrl && (
                            <button
                              onClick={() => window.open(transaction.imageUrl, '_blank')}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                              title="View Bill"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={() => navigate(`/add-transaction/${transaction.id}`, { state: { transaction } })}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit Transaction"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => handleDelete(transaction)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete Entry"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                  <p className="text-gray-600 mb-6">
                    {filters.search || filters.type !== 'all' || filters.payMode !== 'all'
                      ? "Try adjusting your search or filters to find what you're looking for."
                      : "No transactions have been recorded yet. Start by adding your first transaction."}
                  </p>
                  <button
                    onClick={() => navigate('/add-transaction')}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Add Your First Transaction
                  </button>
                </div>
              )}

              {/* Load More */}
              {transactions.length < total && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => fetchMoreTransactions(activeParams, page + 1)}
                    disabled={loadingMore}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : `Load more (${total - transactions.length} remaining)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    <UndoToast undoPending={undoPending} undoCountdown={undoCountdown} onUndo={cancelUndo} />
    </>
  )
}

export default History