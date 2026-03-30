import { useEffect, useState } from 'react'
import { XMarkIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline'

/**
 * UndoToast — fixed bottom-center toast shown while a delete is pending.
 * Renders nothing when undoPending is null.
 */
export default function UndoToast({ undoPending, undoCountdown, onUndo }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (undoPending) {
      // Small delay so the animation triggers after mount
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    } else {
      setVisible(false)
    }
  }, [undoPending])

  if (!undoPending) return null

  // Progress width: shrinks from 100% → 0% over the countdown
  const pct = (undoCountdown / 10) * 100

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 -translate-x-1/2 translate-y-0' : 'opacity-0 -translate-x-1/2 translate-y-4'
      }`}
    >
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-2xl shadow-2xl min-w-72 max-w-sm">
        {/* Countdown progress bar */}
        <div
          className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />

        <div className="flex items-center gap-3 px-5 py-3.5">
          <p className="flex-1 text-sm font-medium">{undoPending.label}</p>

          {/* Countdown badge */}
          <span className="text-xs text-slate-400 tabular-nums w-5 text-center">
            {undoCountdown}s
          </span>

          {/* Undo button */}
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
            Undo
          </button>

          {/* Dismiss (commit delete now) */}
          <button
            onClick={() => setVisible(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            title="Dismiss"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
