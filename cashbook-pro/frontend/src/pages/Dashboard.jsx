import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useTransactions from '../hooks/useTransactions'
import { 
  PlusCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import TransactionCard from '../components/TransactionCard'
import SummaryCards from '../components/SummaryCards'
import DonutChart from '../components/DonutChart'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { transactions, summary, loading, error, fetchTransactions } = useTransactions()
  const [showTrialWarning, setShowTrialWarning] = useState(false)

  // Check trial expiry
  useEffect(() => {
    if (user?.plan === 'trial') {
      const trialEndsAt = new Date(user.trialEndsAt)
      const daysLeft = Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24))
      
      if (daysLeft <= 3) {
        setShowTrialWarning(true)
      }
    }
  }, [user])

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleAddTransaction = () => {
    navigate('/add-transaction')
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getTodaySummary = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayTransactions = transactions.filter(t => t.date?.split('T')[0] === today)
    
    const todayIn = todayTransactions
      .filter(t => t.type === 'in')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    
    const todayOut = todayTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    return {
      todayIn,
      todayOut,
      todayNet: todayIn - todayOut
    }
  }

  const todaySummary = getTodaySummary()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-6">
                    <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <div className="space-y-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
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
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="font-medium">Error loading dashboard</p>
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
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Trial Warning */}
          {showTrialWarning && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                  <span className="font-medium">
                    Your trial expires in {Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24))} days
                  </span>
                  <span className="ml-2 text-yellow-600">— Upgrade to continue using Managecash</span>
                </div>
                <button
                  onClick={() => navigate('/billing')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          )}

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your shop today.
            </p>
          </div>

          {/* Summary Cards */}
          <SummaryCards summary={summary} />

          {/* Today's Summary */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600">Today's Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(todaySummary.todayIn)}</p>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-2">
                  <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-sm text-gray-600">Today's Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(todaySummary.todayOut)}</p>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                  <CurrencyRupeeIcon className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold ${todaySummary.todayNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(todaySummary.todayNet)}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Charts Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Donut Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
                <DonutChart 
                  data={{
                    labels: ['Income', 'Expenses'],
                    datasets: [{
                      data: [summary.totalIn || 0, summary.totalOut || 0],
                      backgroundColor: ['#10b981', '#ef4444'],
                      borderWidth: 0
                    }]
                  }}
                />
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                  <button
                    onClick={() => navigate('/history')}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((transaction) => (
                    <TransactionCard key={transaction.id} transaction={transaction} />
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No transactions yet. Add your first transaction to get started!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="space-y-6">
              {/* Quick Add */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Quick Add</h3>
                  <PlusCircleIcon className="h-8 w-8 text-primary-200" />
                </div>
                <p className="text-primary-100 mb-6">
                  Add a new transaction quickly without leaving the dashboard.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/add-transaction?type=in')}
                    className="w-full bg-white text-primary-600 px-4 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center"
                  >
                    <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
                    Add Income
                  </button>
                  <button
                    onClick={() => navigate('/add-transaction?type=out')}
                    className="w-full bg-primary-500 bg-opacity-90 px-4 py-3 rounded-lg font-medium hover:bg-opacity-100 transition-colors flex items-center justify-center"
                  >
                    <ArrowTrendingDownIcon className="h-5 w-5 mr-2" />
                    Add Expense
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-600">This Month</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {transactions.filter(t => new Date(t.date).getMonth() === new Date().getMonth()).length} transactions
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <UserGroupIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-600">Staff</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {user?.role === 'admin' ? 'Manage team' : 'View profile'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-600">Last Activity</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {transactions.length > 0 ? new Date(transactions[0].createdAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm text-gray-600">Analytics</span>
                    </div>
                    <button
                      onClick={() => navigate('/analytics')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View Reports
                    </button>
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              {user?.plan && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Plan</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Current Plan</span>
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                      {user.plan.toUpperCase()}
                    </span>
                  </div>
                  {user.plan === 'trial' && (
                    <div className="text-xs text-gray-500 mb-4">
                      Trial ends: {new Date(user.trialEndsAt).toLocaleDateString()}
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/billing')}
                    className="w-full bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {user.plan === 'trial' ? 'Upgrade Plan' : 'Manage Subscription'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard