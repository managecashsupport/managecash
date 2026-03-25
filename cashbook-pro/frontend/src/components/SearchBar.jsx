import React from 'react'
import { 
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Search...",
  className = "",
  onClear = null
}) => {
  const handleClear = () => {
    onChange('')
    if (onClear) onClear()
  }

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field pl-10 pr-10 w-full"
        placeholder={placeholder}
      />
      
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export default SearchBar