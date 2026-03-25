import React from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserIcon,
  CalendarIcon,
  CreditCardIcon,
  BanknotesIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

const TransactionCard = ({ transaction }) => {
  const fmt = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const fmtTime = (d) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const isIn = transaction.type === 'in'

  return (
    <div className={`card-hover p-4 border-l-4 ${isIn ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Icon + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`flex-shrink-0 p-2 rounded-xl mt-0.5 ${
            isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {isIn
              ? <ArrowTrendingUpIcon className="h-4 w-4" />
              : <ArrowTrendingDownIcon className="h-4 w-4" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`chip text-[10px] ${isIn ? 'chip-green' : 'chip-red'}`}>
                {isIn ? 'Cash In' : 'Cash Out'}
              </span>
              {transaction.imageUrl && (
                <span className="chip chip-blue text-[10px]">
                  <PhotoIcon className="h-3 w-3" />
                  Bill
                </span>
              )}
            </div>

            <h3 className="mt-1.5 text-sm font-semibold text-slate-900 truncate">
              {transaction.customerName}
            </h3>

            {transaction.productDescription && (
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {transaction.productDescription}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                {transaction.payMode === 'cash'
                  ? <BanknotesIcon className="h-3.5 w-3.5" />
                  : <CreditCardIcon className="h-3.5 w-3.5" />
                }
                <span className="capitalize">{transaction.payMode}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <UserIcon className="h-3.5 w-3.5" />
                <span>{transaction.staffName}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{fmtDate(transaction.date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount + time */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-base font-bold ${isIn ? 'text-emerald-600' : 'text-red-500'}`}>
            {isIn ? '+' : '−'}{fmt(transaction.amount)}
          </span>
          <span className="text-[10px] text-slate-400">{fmtTime(transaction.createdAt)}</span>
        </div>
      </div>

      {transaction.notes && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 italic">"{transaction.notes}"</p>
        </div>
      )}
    </div>
  )
}

export default TransactionCard
