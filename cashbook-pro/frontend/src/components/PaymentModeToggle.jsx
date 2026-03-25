import React from 'react'
import { 
  BanknotesIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'

const PaymentModeToggle = ({ value, onChange }) => {
  return (
    <div className="flex space-x-2">
      <button
        type="button"
        onClick={() => onChange('cash')}
        className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border-2 transition-all ${
          value === 'cash'
            ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <BanknotesIcon className={`h-5 w-5 mr-2 ${value === 'cash' ? 'text-green-600' : 'text-gray-400'}`} />
        <span className="text-sm font-medium">Cash</span>
      </button>
      
      <button
        type="button"
        onClick={() => onChange('online')}
        className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg border-2 transition-all ${
          value === 'online'
            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <CreditCardIcon className={`h-5 w-5 mr-2 ${value === 'online' ? 'text-blue-600' : 'text-gray-400'}`} />
        <span className="text-sm font-medium">Online</span>
      </button>
    </div>
  )
}

export default PaymentModeToggle