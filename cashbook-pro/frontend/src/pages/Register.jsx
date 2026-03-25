import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  BuildingStorefrontIcon, 
  UserIcon, 
  EnvelopeIcon, 
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'
import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain at least one number')

const Register = () => {
  const [formData, setFormData] = useState({
    shopName: '',
    shopId: '',
    ownerName: '',
    ownerEmail: '',
    password: '',
    confirmPassword: '',
    plan: 'starter'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [verificationSent, setVerificationSent] = useState(null) // { email, shopId, username }
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [shopIdAvailable, setShopIdAvailable] = useState(null)
  const [shopIdChecking, setShopIdChecking] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  // Debounced shop ID availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.shopId.length >= 4 && /^[a-zA-Z0-9_]+$/.test(formData.shopId)) {
        checkShopIdAvailability(formData.shopId)
      } else {
        setShopIdAvailable(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.shopId])

  // Password strength calculation
  useEffect(() => {
    let strength = 0
    if (formData.password.length >= 8) strength++
    if (/(?=.*[A-Z])/.test(formData.password)) strength++
    if (/(?=.*\d)/.test(formData.password)) strength++
    if (/(?=.*[!@#$%^&*])/.test(formData.password)) strength++
    if (formData.password.length >= 12) strength++
    setPasswordStrength(strength)
  }, [formData.password])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Auto-suggest shop ID from shop name
    if (name === 'shopName' && !formData.shopId) {
      const suggestedId = value
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 30)
      setFormData(prev => ({
        ...prev,
        shopId: suggestedId
      }))
    }
  }

  const checkShopIdAvailability = async (shopId) => {
    setShopIdChecking(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/check-shopid/${shopId}`)
      const data = await response.json()
      setShopIdAvailable(data.available)
    } catch (err) {
      setShopIdAvailable(null)
    } finally {
      setShopIdChecking(false)
    }
  }

  const validateForm = () => {
    // Validate shop name
    if (!formData.shopName.trim()) {
      setError('Shop name is required')
      return false
    }

    // Validate shop ID
    if (formData.shopId.length < 4 || formData.shopId.length > 30) {
      setError('Shop ID must be 4-30 characters long')
      return false
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.shopId)) {
      setError('Shop ID can only contain letters, numbers, and underscores')
      return false
    }

    if (shopIdAvailable === false) {
      setError('This Shop ID is already taken. Please choose another.')
      return false
    }

    // Validate owner name
    if (!formData.ownerName.trim()) {
      setError('Owner name is required')
      return false
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
      setError('Please enter a valid email address')
      return false
    }

    // Validate password
    try {
      passwordSchema.parse(formData.password)
    } catch (err) {
      setError(err.errors[0].message)
      return false
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    const result = await register(
      formData.shopId,
      formData.shopName,
      formData.ownerName,
      formData.ownerEmail,
      formData.password,
      formData.confirmPassword
    )
    
    if (result.success && result.requiresVerification) {
      setVerificationSent({ email: result.email, shopId: result.shopId, username: result.username })
    } else if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error)
    }
    
    setIsLoading(false)
  }

  const getPlanDetails = (plan) => {
    const plans = {
      starter: { name: 'Starter', price: 499, features: ['3 staff members', '500 transactions/month', 'Basic analytics'] },
      growth: { name: 'Growth', price: 999, features: ['10 staff members', 'Unlimited transactions', 'Advanced analytics'] },
      pro: { name: 'Pro', price: 1499, features: ['Unlimited staff', 'Unlimited transactions', 'Priority support'] }
    }
    return plans[plan]
  }

  const planDetails = getPlanDetails(formData.plan)

  const handleResend = async () => {
    if (!verificationSent?.email) return
    setResending(true)
    setResendSuccess(false)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationSent.email }),
      })
      setResendSuccess(true)
    } finally {
      setResending(false)
    }
  }

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
            <p className="mt-2 text-slate-500 text-sm">
              We sent a verification link to
            </p>
            <p className="font-semibold text-slate-800 text-sm mt-0.5">{verificationSent.email}</p>
            <p className="mt-3 text-slate-500 text-sm">
              Click the link in the email to verify your account and start your free trial.
            </p>

            <div className="mt-6 bg-slate-50 rounded-xl p-4 text-left border border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your login details</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Business ID</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{verificationSent.shopId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Username</span>
                <span className="text-sm font-bold text-blue-600 font-mono">{verificationSent.username}</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-400">The link expires in 24 hours.</p>

            {resendSuccess && (
              <p className="mt-3 text-xs text-emerald-600 font-medium">Verification email resent!</p>
            )}
            <button
              onClick={handleResend}
              disabled={resending}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {resending ? 'Sending…' : "Didn't receive it? Resend"}
            </button>

            <button
              onClick={() => navigate('/login')}
              className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="text-center">
          <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Create your Managecash account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Start your 14-day free trial. No credit card required.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-lg border border-gray-200 sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Shop Information */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">
                  Shop Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="shopName"
                    name="shopName"
                    type="text"
                    required
                    className="input-field pl-10"
                    placeholder="Your shop or business name"
                    value={formData.shopName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="shopId" className="block text-sm font-medium text-gray-700">
                  Shop ID
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="shopId"
                    name="shopId"
                    type="text"
                    required
                    className="input-field pl-10 pr-10"
                    placeholder="your-shop-id"
                    value={formData.shopId}
                    onChange={handleChange}
                  />
                  {shopIdChecking && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    </div>
                  )}
                  {shopIdAvailable !== null && !shopIdChecking && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {shopIdAvailable ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This will be your unique identifier. Can contain letters, numbers, and underscores only.
                </p>
              </div>
            </div>

            {/* Owner Information */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700">
                  Owner Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    required
                    className="input-field pl-10"
                    placeholder="Your full name"
                    value={formData.ownerName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="ownerEmail"
                    name="ownerEmail"
                    type="email"
                    required
                    className="input-field pl-10"
                    placeholder="your@email.com"
                    value={formData.ownerEmail}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="input-field pl-10 pr-10"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex space-x-2">
                    {[...Array(5)].map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 flex-1 rounded-full ${
                          index < passwordStrength ? 
                            (passwordStrength >= 4 ? 'bg-green-500' : 'bg-yellow-500') : 
                            'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Password strength: {passwordStrength >= 4 ? 'Strong' : passwordStrength >= 2 ? 'Medium' : 'Weak'}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="input-field pl-10 pr-10"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    By creating an account, you agree to our{' '}
                    <a href="#" className="font-medium text-yellow-700 hover:text-yellow-600">
                      Terms of Service
                    </a>{' '}
                    and will receive our newsletter and account updates.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || shopIdAvailable === false}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  <>
                    <CreditCardIcon className="h-4 w-4 mr-2" />
                    Start Free Trial
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                Sign in to your account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register