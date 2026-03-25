import React, { useRef } from 'react'
import { 
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

const ImageUpload = ({ 
  file, 
  preview, 
  onChange, 
  accept = "image/*", 
  maxSize = 5 * 1024 * 1024,
  className = ""
}) => {
  const fileInputRef = useRef(null)

  const handleFileSelect = (selectedFile) => {
    // Validation
    if (!selectedFile) {
      onChange(null)
      return
    }

    // Check file type
    if (!selectedFile.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP)')
      return
    }

    // Check file size
    if (selectedFile.size > maxSize) {
      alert(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
      return
    }

    onChange(selectedFile)
  }

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0]
    handleFileSelect(selectedFile)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const removeImage = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          file || preview
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload"
        />
        
        {file || preview ? (
          /* Preview Mode */
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <img
                src={preview || URL.createObjectURL(file)}
                alt="Preview"
                className="max-h-40 rounded-lg shadow-md"
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span>{file ? file.name : 'Image selected'}</span>
                {file && <span>• {formatFileSize(file.size)}</span>}
              </div>
              
              <button
                type="button"
                onClick={removeImage}
                className="text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        ) : (
          /* Upload Instructions */
          <div className="space-y-4">
            <div className="flex justify-center">
              <PhotoIcon className="h-12 w-12 text-gray-400" />
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-900">
                Drag and drop your image here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or click to browse files
              </p>
            </div>
            
            <div className="flex justify-center">
              <label
                htmlFor="file-upload"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 cursor-pointer text-sm font-medium transition-colors"
              >
                Choose Image
              </label>
            </div>
            
            <div className="text-xs text-gray-400">
              <p>Supported formats: JPEG, PNG, WebP</p>
              <p>Maximum size: {maxSize / (1024 * 1024)}MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {file && !preview && (
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
          <span>Processing image...</span>
        </div>
      )}

      {/* File Info */}
      {file && (
        <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
          <div className="flex items-center space-x-2">
            <span>File: {file.name}</span>
            <span>•</span>
            <span>Size: {formatFileSize(file.size)}</span>
            <span>•</span>
            <span>Type: {file.type}</span>
          </div>
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircleIcon className="h-3 w-3" />
            <span>Ready to upload</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUpload