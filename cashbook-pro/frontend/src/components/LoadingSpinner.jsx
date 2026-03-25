import React from 'react'
import { 
  ArrowPathIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...',
  variant = 'spinner',
  className = ""
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const spinnerSize = sizeClasses[size]

  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`animate-spin ${spinnerSize}`}>
          <ArrowPathIcon className="text-primary-600" />
        </div>
        {text && (
          <span className="ml-2 text-sm text-gray-600">{text}</span>
        )}
      </div>
    )
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 bg-primary-600 rounded-full animate-bounce ${size === 'sm' ? 'delay-0' : 'delay-75'}`}></div>
        <div className={`w-2 h-2 bg-primary-600 rounded-full animate-bounce ${size === 'sm' ? 'delay-75' : 'delay-150'}`}></div>
        <div className={`w-2 h-2 bg-primary-600 rounded-full animate-bounce ${size === 'sm' ? 'delay-150' : 'delay-225'}`}></div>
        {text && (
          <span className="ml-2 text-sm text-gray-600">{text}</span>
        )}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className={`animate-pulse ${spinnerSize}`}>
          <div className="w-full h-full bg-primary-600 rounded-full opacity-75"></div>
        </div>
        {text && (
          <span className="ml-2 text-sm text-gray-600">{text}</span>
        )}
      </div>
    )
  }

  return null
}

const LoadingOverlay = ({ 
  isVisible = false, 
  text = 'Loading...',
  className = ""
}) => {
  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="xl" text={text} />
      </div>
    </div>
  )
}

const StatusIndicator = ({ 
  status = 'loading', 
  size = 'md',
  className = ""
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-6 w-6'
  }

  const iconSize = sizeClasses[size]

  if (status === 'loading') {
    return (
      <div className={`animate-spin ${iconSize} ${className}`}>
        <ArrowPathIcon className="text-gray-400" />
      </div>
    )
  }

  if (status === 'success') {
    return (
      <CheckCircleIcon className={`text-green-500 ${iconSize} ${className}`} />
    )
  }

  if (status === 'error') {
    return (
      <ExclamationTriangleIcon className={`text-red-500 ${iconSize} ${className}`} />
    )
  }

  if (status === 'pending') {
    return (
      <ClockIcon className={`text-yellow-500 ${iconSize} ${className}`} />
    )
  }

  return null
}

export { LoadingSpinner, LoadingOverlay, StatusIndicator }