import React from 'react'
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const Toast = ({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose, 
  duration = 5000 
}) => {
  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-500',
      textColor: 'text-green-600',
      iconColor: 'text-green-500'
    },
    error: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-red-500',
      textColor: 'text-red-600',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-600',
      iconColor: 'text-blue-500'
    }
  }

  const config = typeConfig[type]
  const IconComponent = config.icon

  if (!isVisible || !message) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`
        flex items-center space-x-3 w-full max-w-md p-4 rounded-lg shadow-lg
        ${config.bgColor} text-white animate-in slide-in-from-top-2 duration-300
      `}>
        <IconComponent className="h-6 w-6 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 inline-flex rounded-md text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-500"
        >
          <span className="sr-only">Close</span>
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default Toast