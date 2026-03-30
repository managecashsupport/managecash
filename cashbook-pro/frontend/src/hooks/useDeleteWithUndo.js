import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * useDeleteWithUndo
 *
 * Schedules a delete with a visible undo window.
 * The API call is only made after the countdown expires.
 * Clicking "Undo" cancels the pending delete entirely.
 *
 * Usage:
 *   const { scheduleDelete, undoPending, undoCountdown, cancelUndo } = useDeleteWithUndo()
 *
 *   // On delete click — remove from UI optimistically, then schedule:
 *   scheduleDelete({
 *     label:     'Entry deleted',
 *     onConfirm: () => api.delete('/transactions/123'),
 *     onUndo:    () => setItems(prev => [item, ...prev]),  // restore UI
 *   })
 */
export default function useDeleteWithUndo(timeoutMs = 10000) {
  const [undoPending, setUndoPending]   = useState(null)   // { label, onUndo }
  const [undoCountdown, setCountdown]   = useState(10)

  const timerRef    = useRef(null)
  const intervalRef = useRef(null)

  const clearTimers = () => {
    clearTimeout(timerRef.current)
    clearInterval(intervalRef.current)
  }

  // Clean up on unmount
  useEffect(() => () => clearTimers(), [])

  const scheduleDelete = useCallback(({ label, onConfirm, onUndo }) => {
    // Cancel any currently pending delete first
    clearTimers()

    const seconds = Math.round(timeoutMs / 1000)
    setCountdown(seconds)
    setUndoPending({ label, onUndo })

    // Tick countdown every second
    let remaining = seconds
    intervalRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) clearInterval(intervalRef.current)
    }, 1000)

    // Execute the real delete after timeout
    timerRef.current = setTimeout(async () => {
      clearInterval(intervalRef.current)
      setUndoPending(null)
      try { await onConfirm() } catch { /* caller handles errors */ }
    }, timeoutMs)
  }, [timeoutMs])

  const cancelUndo = useCallback(() => {
    clearTimers()
    const restore = undoPending?.onUndo
    setUndoPending(null)
    setCountdown(10)
    if (restore) restore()
  }, [undoPending])

  return { scheduleDelete, undoPending, undoCountdown, cancelUndo }
}
