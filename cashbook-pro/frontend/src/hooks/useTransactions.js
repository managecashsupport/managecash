import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const PAGE_LIMIT = 50

const useTransactions = () => {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchTransactions = useCallback(async (params = {}) => {
    try {
      setLoading(true)
      setError(null)
      setPage(1)
      const response = await api.get('/transactions', { params: { limit: PAGE_LIMIT, page: 1, ...params } })
      setTransactions(response.data.data || [])
      setTotal(response.data.total || 0)
      setSummary(response.data.summary || {})
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch transactions')
      console.error('Error fetching transactions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMoreTransactions = useCallback(async (params = {}, nextPage) => {
    try {
      setLoadingMore(true)
      const response = await api.get('/transactions', { params: { limit: PAGE_LIMIT, page: nextPage, ...params } })
      setTransactions(prev => [...prev, ...(response.data.data || [])])
      setTotal(response.data.total || 0)
      setPage(nextPage)
    } catch (err) {
      console.error('Error fetching more transactions:', err)
    } finally {
      setLoadingMore(false)
    }
  }, [])

  const createTransaction = async (transactionData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.post('/transactions', transactionData)
      const newTransaction = response.data
      
      // Update local state optimistically
      setTransactions(prev => [newTransaction, ...prev])
      
      // Recalculate summary
      await fetchTransactions()
      
      return { success: true, data: newTransaction }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create transaction')
      return { success: false, error: err.response?.data?.error }
    } finally {
      setLoading(false)
    }
  }

  const updateTransaction = async (id, transactionData) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.put(`/transactions/${id}`, transactionData)
      const updatedTransaction = response.data
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => t.id === id ? updatedTransaction : t)
      )
      
      return { success: true, data: updatedTransaction }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update transaction')
      return { success: false, error: err.response?.data?.error }
    } finally {
      setLoading(false)
    }
  }

  const deleteTransaction = async (id) => {
    try {
      setLoading(true)
      setError(null)
      
      await api.delete(`/transactions/${id}`)
      
      // Update local state
      setTransactions(prev => prev.filter(t => t.id !== id))
      
      // Recalculate summary
      await fetchTransactions()
      
      return { success: true }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete transaction')
      return { success: false, error: err.response?.data?.error }
    } finally {
      setLoading(false)
    }
  }

  const getSummary = async (params = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/transactions/summary', { params })
      setSummary(response.data)
      return response.data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch summary')
      return null
    } finally {
      setLoading(false)
    }
  }

  const exportTransactions = async (params = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/transactions/export', { 
        params,
        responseType: 'blob'
      })
      
      // Create download link for CSV
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `cashbook-transactions-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      return { success: true }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to export transactions')
      return { success: false, error: err.response?.data?.error }
    } finally {
      setLoading(false)
    }
  }

  // Fetch transactions on mount
  useEffect(() => {
    fetchTransactions()
  }, [])

  return {
    transactions,
    summary,
    loading,
    loadingMore,
    error,
    total,
    page,
    fetchTransactions,
    fetchMoreTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getSummary,
    exportTransactions
  }
}

export { useTransactions }
export default useTransactions