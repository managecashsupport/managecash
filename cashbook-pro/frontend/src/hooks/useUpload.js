import { useState } from 'react'
import api from '../services/api'

const useUpload = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const uploadFile = async (file) => {
    try {
      setLoading(true)
      setError(null)

      // Validate file
      if (!file) {
        throw new Error('No file provided')
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Only images are allowed.')
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('File size must be less than 5MB')
      }

      // Get presigned URL from backend
      const response = await api.post('/upload/presigned-url', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })

      const { uploadUrl, fileUrl, key } = response.data

      // Upload file directly to Cloudflare R2
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-amz-acl': 'public-read'
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage')
      }

      return {
        success: true,
        fileUrl,
        key,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }

    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Upload failed'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteFile = async (key) => {
    try {
      setLoading(true)
      setError(null)

      await api.delete(`/upload/file/${key}`)
      
      return {
        success: true,
        message: 'File deleted successfully'
      }

    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Delete failed'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    uploadFile,
    deleteFile,
    loading,
    error
  }
}

export { useUpload }
export default useUpload