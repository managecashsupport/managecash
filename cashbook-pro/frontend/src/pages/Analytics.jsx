import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import useTransactions from '../hooks/useTransactions'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  UsersIcon,
  CreditCardIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import DonutChart from '../components/DonutChart'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const Analytics = () => {
  const { user } = useAuth()
  const { transactions, summary, loading, error, fetchTransactions } = useTransactions()
  
  const [timeRange, setTimeRange] = useState('30d')
  const [chartType, setChartType] = useState('bar')
  const [comparisonType, setComparisonType] = useState('daily')

  // Re-fetch with date range + high limit whenever timeRange changes
  useEffect(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)
    fetchTransactions({
      date_from: dateFrom.toISOString().split('T')[0],
      limit: 1000,
    })
  }, [timeRange])

  // Chart data preparation
  const prepareChartData = () => {
    const now = new Date()
    const daysToShow = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    
    // Generate date labels
    const labels = []
    const incomeData = []
    const expenseData = []
    const netData = []

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      labels.push(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }))
      
      // Filter transactions for this date
      const dateStr = date.toISOString().split('T')[0]
      const dayTransactions = transactions.filter(t => t.date?.split('T')[0] === dateStr)
      
      const income = dayTransactions
        .filter(t => t.type === 'in')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      const expense = dayTransactions
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      
      const net = income - expense
      
      incomeData.push(income)
      expenseData.push(expense)
      netData.push(net)
    }

    return {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
        {
          label: 'Expense',
          data: expenseData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
        },
        {
          label: 'Net',
          data: netData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        }
      ]
    }
  }

  const prepareDonutData = () => {
    const categories = {}
    
    // Group by product description or customer name
    transactions.forEach(transaction => {
      const category = transaction.productDescription || transaction.customerName || 'Other'
      if (!categories[category]) {
        categories[category] = { income: 0, expense: 0 }
      }
      
      if (transaction.type === 'in') {
        categories[category].income += parseFloat(transaction.amount)
      } else {
        categories[category].expense += parseFloat(transaction.amount)
      }
    })

    const labels = Object.keys(categories).slice(0, 10) // Top 10 categories
    const data = labels.map(label => categories[label].income - categories[label].expense)
    const colors = labels.map((_, i) => {
      const hues = [140, 200, 260, 320, 380, 40, 100, 160, 220, 280]
      return `hsl(${hues[i % hues.length]}, 70%, 50%)`
    })

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0
      }]
    }
  }

  const prepareSummaryData = () => {
    const totalIncome = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const totalExpense = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const avgDailyIncome = totalIncome / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90)
    const avgDailyExpense = totalExpense / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90)
    
    const recentTransactions = transactions.slice(0, 10)
    const cashTransactions = recentTransactions.filter(t => t.payMode === 'cash').length
    const onlineTransactions = recentTransactions.filter(t => t.payMode === 'online').length

    return {
      totalIncome,
      totalExpense,
      avgDailyIncome,
      avgDailyExpense,
      cashTransactions,
      onlineTransactions
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value)
          }
        }
      }
    }
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.parsed
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${formatCurrency(value)} (${percentage}%)`
          }
        }
      }
    },
    cutout: '60%'
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-6">
                    <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
                  <div className="h-64 bg-gray-300 rounded"></div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-300 rounded w-1/3 mb-4"></div>
                  <div className="h-64 bg-gray-300 rounded"></div>
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
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="font-medium">Error loading analytics</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const summaryData = prepareSummaryData()
  const chartData = prepareChartData()
  const donutData = prepareDonutData()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                <p className="text-gray-600">Detailed insights and trends for your business.</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <InformationCircleIcon className="h-4 w-4" />
                  <span>Charts update in real-time</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summaryData.totalIncome)}</p>
                </div>
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Average per day: {formatCurrency(summaryData.avgDailyIncome)}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(summaryData.totalExpense)}</p>
                </div>
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Average per day: {formatCurrency(summaryData.avgDailyExpense)}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Methods</p>
                  <div className="flex space-x-4 mt-1">
                    <span className="text-xs text-gray-500">Cash: {summaryData.cashTransactions}</span>
                    <span className="text-xs text-gray-500">Online: {summaryData.onlineTransactions}</span>
                  </div>
                </div>
                <CreditCardIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time Range</label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Chart Type</label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Comparison</label>
                  <select
                    value={comparisonType}
                    onChange={(e) => setComparisonType(e.target.value)}
                    className="input-field text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                Showing data for the last {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Main Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Income vs Expenses Trend
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <CurrencyRupeeIcon className="h-4 w-4" />
                  <span>{timeRange === '7d' ? 'Daily' : timeRange === '30d' ? 'Daily' : 'Daily'} view</span>
                </div>
              </div>
              
              <div className="h-80">
                {chartType === 'bar' ? (
                  <Bar data={chartData} options={chartOptions} />
                ) : (
                  <Line data={chartData} options={chartOptions} />
                )}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Category Breakdown
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <ChartBarIcon className="h-4 w-4" />
                  <span>Top 10 categories</span>
                </div>
              </div>
              
              <div className="h-80">
                <DonutChart data={donutData} options={donutOptions} />
              </div>
            </div>
          </div>

          {/* Additional Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Performance Metrics */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Best Day</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(Math.max(...chartData.datasets[0].data))}
                  </p>
                  <p className="text-xs text-gray-500">Highest income day</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Worst Day</h4>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(Math.min(...chartData.datasets[1].data))}
                  </p>
                  <p className="text-xs text-gray-500">Highest expense day</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Growth Rate</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {((summaryData.totalIncome - summaryData.totalExpense) / summaryData.totalIncome * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">Net profit margin</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Transaction Count</h4>
                  <p className="text-2xl font-bold text-purple-600">
                    {transactions.length}
                  </p>
                  <p className="text-xs text-gray-500">Total transactions</p>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Insights</h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-800 mb-2">📈 Positive Trend</h4>
                  <p className="text-xs text-green-700">
                    Your income has been consistently higher than expenses over the selected period.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Recommendation</h4>
                  <p className="text-xs text-blue-700">
                    Consider diversifying your income sources to reduce dependency on single categories.
                  </p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">📊 Data Quality</h4>
                  <p className="text-xs text-yellow-700">
                    {transactions.length > 0 ? 'Good data coverage' : 'Start recording transactions for better insights'}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">📅 Next Review</h4>
                  <p className="text-xs text-gray-600">
                    Consider reviewing your financial performance weekly for better tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Export Reports</h3>
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  PDF Report
                </button>
                <button className="px-4 py-2 border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors">
                  Excel Export
                </button>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Custom Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics