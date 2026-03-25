import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import useTransactions from '../hooks/useTransactions'
import api from '../services/api'
import {
  UserIcon,
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

const Settings = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { transactions } = useTransactions()
  const [staffCount, setStaffCount] = useState(null)
  
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'business', name: 'Business', icon: BuildingStorefrontIcon },
    { id: 'billing', name: 'Billing', icon: CreditCardIcon }
  ]

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (activeTab === 'profile') {
      if (!formData.name.trim()) {
        newErrors.name = 'Name is required'
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
    } else if (activeTab === 'security') {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required'
      }
      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required'
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = 'Password must be at least 8 characters'
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      if (activeTab === 'profile') {
        await api.put('/users/me', { name: formData.name, email: formData.email })
        setSuccess('Profile updated successfully!')
      } else if (activeTab === 'security') {
        await api.put('/users/me/password', {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        })
        setSuccess('Password changed successfully!')
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      }

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || err.message || 'An error occurred' })
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/users').then(res => setStaffCount(res.data.length)).catch(() => {})
    }
  }, [user?.role])

  const getBusinessStats = () => {
    const totalTransactions = transactions.length
    const totalIncome = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const totalExpense = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + parseFloat(t.amount), 0)

    return {
      totalTransactions,
      totalIncome,
      totalExpense,
      staffCount: staffCount ?? (user?.role === 'admin' ? '...' : 1)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const stats = getBusinessStats()

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`input-field ${errors.name ? 'border-red-300' : ''}`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`input-field ${errors.email ? 'border-red-300' : ''}`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Account Type</p>
                <p className="text-lg font-bold text-green-900">{user?.role?.toUpperCase()}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Shop ID</p>
                <p className="text-lg font-bold text-blue-900">{user?.shopId}</p>
              </div>
              <BuildingStorefrontIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Member Since</p>
                <p className="text-lg font-bold text-purple-900">
                  {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
              <InformationCircleIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose a strong password to keep your account secure.
        </p>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className={`input-field pr-10 ${errors.currentPassword ? 'border-red-300' : ''}`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
          </div>
          
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`input-field pr-10 ${errors.newPassword ? 'border-red-300' : ''}`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-300' : ''}`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Password should be at least 8 characters long
          </div>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Update Password
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Recommendations</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Use a unique password for this account</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Enable two-factor authentication (coming soon)</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">Regularly review your account activity</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderBusinessTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalTransactions}</p>
              </div>
              <CreditCardIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Total Income</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalIncome)}</p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Total Expenses</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(stats.totalExpense)}</p>
              </div>
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Staff Members</p>
                <p className="text-2xl font-bold text-purple-900">{stats.staffCount}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Business Name</h4>
            <p className="text-lg font-semibold">{user?.shopId}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Plan Type</h4>
            <p className="text-lg font-semibold">{user?.plan?.toUpperCase() || 'TRIAL'}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Registration Date</h4>
            <p className="text-lg font-semibold">
              {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Last Activity</h4>
            <p className="text-lg font-semibold">
              {transactions.length > 0 
                ? new Date(transactions[0].createdAt).toLocaleDateString()
                : 'Never'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <CreditCardIcon className="h-6 w-6 text-gray-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Manage Subscription</p>
              <p className="text-sm text-gray-600">View and update your billing plan</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/staff')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UsersIcon className="h-6 w-6 text-gray-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Manage Staff</p>
              <p className="text-sm text-gray-600">Add and manage team members</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/history')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="h-6 w-6 text-gray-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Reports</p>
              <p className="text-sm text-gray-600">Access detailed analytics</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <InformationCircleIcon className="h-6 w-6 text-gray-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Business Insights</p>
              <p className="text-sm text-gray-600">Get performance recommendations</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
            <h4 className="text-sm font-medium mb-2">Current Plan</h4>
            <p className="text-2xl font-bold">{user?.plan?.toUpperCase() || 'TRIAL'}</p>
            {user?.plan === 'trial' && (
              <p className="text-sm opacity-90 mt-2">
                Trial expires: {new Date(user.trialEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h4 className="text-sm font-medium text-green-800 mb-2">Monthly Limit</h4>
            <p className="text-2xl font-bold text-green-900">
              {user?.plan === 'starter' ? '500' : user?.plan === 'growth' ? 'Unlimited' : 'Unlimited'}
            </p>
            <p className="text-sm text-green-700">transactions/month</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Staff Limit</h4>
            <p className="text-2xl font-bold text-blue-900">
              {user?.plan === 'starter' ? '3' : user?.plan === 'growth' ? '10' : 'Unlimited'}
            </p>
            <p className="text-sm text-blue-700">team members</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Actions</h3>
        
        <div className="space-y-4">
          <button
            onClick={() => navigate('/billing')}
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <CreditCardIcon className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Manage Subscription</p>
                <p className="text-sm text-gray-600">View billing history and update plan</p>
              </div>
            </div>
            <span className="text-primary-600 font-medium">Manage →</span>
          </button>
          
          <button
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <KeyIcon className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Download Invoice</p>
                <p className="text-sm text-gray-600">Get PDF receipts for your records</p>
              </div>
            </div>
            <span className="text-primary-600 font-medium">Download →</span>
          </button>
          
          <button
            className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <InformationCircleIcon className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Billing Support</p>
                <p className="text-sm text-gray-600">Contact us for billing questions</p>
              </div>
            </div>
            <span className="text-primary-600 font-medium">Contact →</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600">Manage your account and business preferences.</p>
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

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Success Message */}
              {success && (
                <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errors.submit && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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

              {/* Tab Content */}
              {activeTab === 'profile' && renderProfileTab()}
              {activeTab === 'security' && renderSecurityTab()}
              {activeTab === 'business' && renderBusinessTab()}
              {activeTab === 'billing' && renderBillingTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings