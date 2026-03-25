import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

const SuperAdmin = () => {
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState('tenants')
  const [tenants, setTenants] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Mock data for demonstration
  useEffect(() => {
    const mockTenants = [
      {
        id: 'shop-001',
        name: 'ABC General Store',
        owner: 'John Doe',
        email: 'john@abcstore.com',
        plan: 'starter',
        status: 'active',
        createdAt: '2024-01-15',
        lastActivity: '2024-01-20',
        transactions: 1250,
        revenue: 450000
      },
      {
        id: 'shop-002',
        name: 'XYZ Electronics',
        owner: 'Jane Smith',
        email: 'jane@xyzelectronics.com',
        plan: 'growth',
        status: 'active',
        createdAt: '2024-01-10',
        lastActivity: '2024-01-22',
        transactions: 3500,
        revenue: 1200000
      },
      {
        id: 'shop-003',
        name: 'Quick Mart',
        owner: 'Bob Johnson',
        email: 'bob@quickmart.com',
        plan: 'pro',
        status: 'suspended',
        createdAt: '2024-01-05',
        lastActivity: '2024-01-18',
        transactions: 800,
        revenue: 250000
      },
      {
        id: 'shop-004',
        name: 'Daily Needs',
        owner: 'Alice Brown',
        email: 'alice@dailneeds.com',
        plan: 'starter',
        status: 'active',
        createdAt: '2024-01-12',
        lastActivity: '2024-01-21',
        transactions: 950,
        revenue: 320000
      }
    ]

    const mockStats = {
      totalTenants: 4,
      activeTenants: 3,
      suspendedTenants: 1,
      totalRevenue: 2220000,
      monthlyRevenue: 550000,
      totalTransactions: 6500,
      growthRate: 15.5
    }

    setTenants(mockTenants)
    setStats(mockStats)
    setLoading(false)
  }, [])

  const handleSuspendTenant = async (tenantId) => {
    if (!window.confirm('Are you sure you want to suspend this tenant?')) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // In a real app, this would call the superadmin API
      setTenants(prev => prev.map(tenant => 
        tenant.id === tenantId 
          ? { ...tenant, status: 'suspended' }
          : tenant
      ))
      setStats(prev => ({
        ...prev,
        suspendedTenants: prev.suspendedTenants + 1,
        activeTenants: prev.activeTenants - 1
      }))
    } catch (err) {
      setError(err.message || 'Failed to suspend tenant')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateTenant = async (tenantId) => {
    setLoading(true)
    setError(null)
    
    try {
      // In a real app, this would call the superadmin API
      setTenants(prev => prev.map(tenant => 
        tenant.id === tenantId 
          ? { ...tenant, status: 'active' }
          : tenant
      ))
      setStats(prev => ({
        ...prev,
        suspendedTenants: prev.suspendedTenants - 1,
        activeTenants: prev.activeTenants + 1
      }))
    } catch (err) {
      setError(err.message || 'Failed to activate tenant')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTenant = async (tenantId) => {
    if (!window.confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // In a real app, this would call the superadmin API
      const tenantToDelete = tenants.find(t => t.id === tenantId)
      setTenants(prev => prev.filter(tenant => tenant.id !== tenantId))
      setStats(prev => ({
        ...prev,
        totalTenants: prev.totalTenants - 1,
        activeTenants: prev.activeTenants - (tenantToDelete.status === 'active' ? 1 : 0),
        suspendedTenants: prev.suspendedTenants - (tenantToDelete.status === 'suspended' ? 1 : 0),
        totalRevenue: prev.totalRevenue - tenantToDelete.revenue,
        totalTransactions: prev.totalTransactions - tenantToDelete.transactions
      }))
    } catch (err) {
      setError(err.message || 'Failed to delete tenant')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePlan = async (tenantId, newPlan) => {
    setLoading(true)
    setError(null)
    
    try {
      // In a real app, this would call the superadmin API
      setTenants(prev => prev.map(tenant => 
        tenant.id === tenantId 
          ? { ...tenant, plan: newPlan }
          : tenant
      ))
    } catch (err) {
      setError(err.message || 'Failed to update plan')
    } finally {
      setLoading(false)
    }
  }

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = !searchQuery || 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || tenant.status === filterStatus
    
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const renderTenantsTab = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
            </div>
            <BuildingStorefrontIcon className="h-10 w-10 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tenants</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeTenants}</p>
            </div>
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspended</p>
              <p className="text-2xl font-bold text-red-600">{stats.suspendedTenants}</p>
            </div>
            <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <CurrencyRupeeIcon className="h-10 w-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <FunnelIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors">
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Tenant Management</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shop
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-sm text-gray-500">{tenant.id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tenant.owner}</div>
                      <div className="text-sm text-gray-500">{tenant.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      tenant.plan === 'starter' ? 'bg-blue-100 text-blue-800' :
                      tenant.plan === 'growth' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {tenant.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tenant.transactions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(tenant.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-gray-600 hover:text-gray-900">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => tenant.status === 'active' ? handleSuspendTenant(tenant.id) : handleActivateTenant(tenant.id)}
                      className={`${
                        tenant.status === 'active' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'
                      }`}
                    >
                      {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderStatsTab = () => (
    <div className="space-y-6">
      {/* Platform Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <CurrencyRupeeIcon className="h-10 w-10 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
              <ChartBarIcon className="h-10 w-10 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Total Transactions</p>
                <p className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</p>
              </div>
              <UsersIcon className="h-10 w-10 text-purple-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Growth Rate</p>
                <p className="text-2xl font-bold">+{stats.growthRate}%</p>
              </div>
              <ArrowTrendingUpIcon className="h-10 w-10 text-orange-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-medium text-blue-900 mb-2">Starter Plan</h4>
            <p className="text-2xl font-bold text-blue-900">2</p>
            <p className="text-sm text-blue-700">40% of tenants</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="font-medium text-green-900 mb-2">Growth Plan</h4>
            <p className="text-2xl font-bold text-green-900">1</p>
            <p className="text-sm text-green-700">25% of tenants</p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h4 className="font-medium text-purple-900 mb-2">Pro Plan</h4>
            <p className="text-2xl font-bold text-purple-900">1</p>
            <p className="text-sm text-purple-700">25% of tenants</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <BuildingStorefrontIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{tenant.name}</p>
                  <p className="text-sm text-gray-600">Last activity: {tenant.lastActivity}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(tenant.revenue)}</p>
                <p className="text-sm text-gray-600">{tenant.transactions} transactions</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderActionsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Super Admin Actions</h3>
        <p className="text-gray-600 mb-6">
          Perform administrative actions across all tenants.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h4 className="font-medium text-gray-900 mb-2">System Maintenance</h4>
            <p className="text-sm text-gray-600 mb-4">
              Perform system-wide maintenance operations and updates.
            </p>
            <button className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Maintenance Mode
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h4 className="font-medium text-gray-900 mb-2">Data Export</h4>
            <p className="text-sm text-gray-600 mb-4">
              Export platform-wide data for analysis and reporting.
            </p>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Export Data
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h4 className="font-medium text-gray-900 mb-2">Bulk Operations</h4>
            <p className="text-sm text-gray-600 mb-4">
              Perform bulk operations across multiple tenants.
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Bulk Actions
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
            <h4 className="font-medium text-gray-900 mb-2">System Health</h4>
            <p className="text-sm text-gray-600 mb-4">
              Monitor system health and performance metrics.
            </p>
            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Health Check
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Log</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Tenant suspended</p>
                <p className="text-sm text-gray-600">Quick Mart - System Admin</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">2 hours ago</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <PlusCircleIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">New tenant registered</p>
                <p className="text-sm text-gray-600">ABC General Store</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">1 day ago</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">System backup completed</p>
                <p className="text-sm text-gray-600">Database backup successful</p>
              </div>
            </div>
            <span className="text-sm text-gray-500">2 days ago</span>
          </div>
        </div>
      </div>
    </div>
  )

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-sm text-gray-600">
              You don't have permission to access the Super Admin panel.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Panel</h1>
                <p className="text-gray-600">Manage platform-wide operations and tenant administration.</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Super Admin
                </span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('tenants')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'tenants'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BuildingStorefrontIcon className="h-5 w-5" />
                  <span>Tenants</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'stats'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ChartBarIcon className="h-5 w-5" />
                  <span>Statistics</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'actions'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>Actions</span>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content */}
              {activeTab === 'tenants' && renderTenantsTab()}
              {activeTab === 'stats' && renderStatsTab()}
              {activeTab === 'actions' && renderActionsTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdmin