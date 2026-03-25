import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { 
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyRupeeIcon,
  UserIcon
} from '@heroicons/react/24/outline'

const Billing = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState('subscription')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState('')

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 499,
      features: [
        '3 staff members',
        '500 transactions/month',
        'Basic analytics',
        'Email support'
      ],
      popular: false
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 999,
      features: [
        '10 staff members',
        'Unlimited transactions',
        'Advanced analytics',
        'Priority support'
      ],
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 1499,
      features: [
        'Unlimited staff',
        'Unlimited transactions',
        'Priority support',
        'Custom integrations'
      ],
      popular: false
    }
  ]

  const currentPlan = plans.find(p => p.id === user?.plan) || plans[0]
  const isTrial = user?.plan === 'trial'

  const handleUpgrade = async (planId) => {
    setLoading(true)
    setError(null)
    
    try {
      // In a real app, this would integrate with Razorpay
      setSuccess(`Successfully upgraded to ${planId.toUpperCase()} plan!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to upgrade plan')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // In a real app, this would call the billing API
      setSuccess('Subscription cancelled successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to cancel subscription')
    } finally {
      setLoading(false)
    }
  }

  const getBillingHistory = () => {
    // Mock billing history
    return [
      {
        id: 1,
        date: '2024-01-01',
        description: 'Starter Plan Monthly Subscription',
        amount: 499,
        status: 'paid'
      },
      {
        id: 2,
        date: '2023-12-01',
        description: 'Starter Plan Monthly Subscription',
        amount: 499,
        status: 'paid'
      },
      {
        id: 3,
        date: '2023-11-01',
        description: 'Starter Plan Monthly Subscription',
        amount: 499,
        status: 'paid'
      }
    ]
  }

  const billingHistory = getBillingHistory()

  const renderSubscriptionTab = () => (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
          {isTrial && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Trial
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold">{currentPlan.name}</h4>
                  <p className="text-primary-100 mt-1">
                    {isTrial ? '14-day free trial' : `₹${currentPlan.price}/month`}
                  </p>
                </div>
                <div className="text-right">
                  {isTrial ? (
                    <p className="text-sm text-primary-100">
                      Trial ends: {new Date(user.trialEndsAt).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-sm text-primary-100">
                      Next billing: {new Date().toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {!isTrial && (
              <button
                onClick={() => setActiveTab('plans')}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" />
                Upgrade Plan
              </button>
            )}
            
            {!isTrial && (
              <button
                onClick={handleCancelSubscription}
                className="w-full flex items-center justify-center px-4 py-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Plan Features */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Included Features</h4>
            <ul className="space-y-2">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-gray-600">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Usage Limits</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Staff Members</span>
                <span className="font-medium">
                  {user?.plan === 'starter' ? '3' : user?.plan === 'growth' ? '10' : 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transactions/Month</span>
                <span className="font-medium">
                  {user?.plan === 'starter' ? '500' : 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Support Level</span>
                <span className="font-medium">
                  {user?.plan === 'starter' ? 'Email' : 'Priority'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Comparison */}
      {!isTrial && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upgrade Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-lg p-6 ${
                  plan.id === currentPlan.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="text-center mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                    <span className="text-gray-600 ml-1">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.id !== currentPlan.id && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      plan.popular
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {loading ? 'Processing...' : `Upgrade to ${plan.name}`}
                  </button>
                )}
                
                {plan.id === currentPlan.id && (
                  <div className="text-center py-2 px-4 bg-green-100 text-green-800 rounded-lg font-medium">
                    Current Plan
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderPlansTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Plan</h3>
        <p className="text-gray-600 mb-6">
          Select the plan that best fits your business needs. You can upgrade or downgrade at any time.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-6 hover:shadow-lg transition-shadow ${
                plan.popular ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="text-center mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6">
                <h4 className="text-lg font-bold text-gray-900">{plan.name}</h4>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">₹{plan.price}</span>
                  <span className="text-gray-600 ml-1">/month</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading || plan.id === currentPlan.id}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                } ${
                  plan.id === currentPlan.id ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Processing...' : plan.id === currentPlan.id ? 'Current Plan' : `Get ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Comparison Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Comparison</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="text-center py-3 px-4 font-medium text-gray-900">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">Price</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-600">
                    ₹{plan.price}/month
                  </td>
                ))}
              </tr>
              
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">Staff Members</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-600">
                    {plan.id === 'starter' ? '3' : plan.id === 'growth' ? '10' : 'Unlimited'}
                  </td>
                ))}
              </tr>
              
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">Transactions/Month</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-600">
                    {plan.id === 'starter' ? '500' : 'Unlimited'}
                  </td>
                ))}
              </tr>
              
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">Analytics</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-600">
                    {plan.id === 'starter' ? 'Basic' : 'Advanced'}
                  </td>
                ))}
              </tr>
              
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-sm font-medium text-gray-900">Support</td>
                {plans.map((plan) => (
                  <td key={plan.id} className="py-3 px-4 text-center text-sm text-gray-600">
                    {plan.id === 'starter' ? 'Email' : 'Priority'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h3>
        
        <div className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingHistory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{item.amount}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button className="text-gray-600 hover:text-gray-900">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      <ArrowUpTrayIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Total Spent</h4>
          <p className="text-2xl font-bold text-gray-900">
            ₹{billingHistory.reduce((sum, item) => sum + item.amount, 0)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Average Monthly</h4>
          <p className="text-2xl font-bold text-gray-900">
            ₹{Math.round(billingHistory.reduce((sum, item) => sum + item.amount, 0) / billingHistory.length)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Next Billing</h4>
          <p className="text-2xl font-bold text-gray-900">
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  )

  const renderPaymentTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
        <p className="text-gray-600 mb-6">
          Manage your payment methods for automatic billing.
        </p>
        
        {/* Mock payment method */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-6 bg-gray-300 rounded"></div>
              <div>
                <p className="font-medium text-gray-900">**** **** **** 1234</p>
                <p className="text-sm text-gray-600">Expires 12/2025</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="text-gray-600 hover:text-gray-900">
                <PencilIcon className="h-5 w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-700">
            <PlusCircleIcon className="h-5 w-5" />
            <span>Add Payment Method</span>
          </button>
        </div>
      </div>

      {/* Auto-renewal */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Auto-renewal</h3>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Automatic renewal enabled</p>
            <p className="text-sm text-gray-600">
              Your subscription will automatically renew on {new Date().toLocaleDateString()}
            </p>
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Manage
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
                <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
                <p className="text-gray-600">Manage your plan, billing history, and payment methods.</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/settings')}
                  className="text-gray-600 hover:text-gray-900 text-sm"
                >
                  ← Back to Settings
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('subscription')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'subscription'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CreditCardIcon className="h-5 w-5" />
                  <span>Subscription</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('plans')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'plans'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <PlusCircleIcon className="h-5 w-5" />
                  <span>Plans</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CalendarIcon className="h-5 w-5" />
                  <span>History</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'payment'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <CurrencyRupeeIcon className="h-5 w-5" />
                  <span>Payment</span>
                </button>
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
              {activeTab === 'subscription' && renderSubscriptionTab()}
              {activeTab === 'plans' && renderPlansTab()}
              {activeTab === 'history' && renderHistoryTab()}
              {activeTab === 'payment' && renderPaymentTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Billing