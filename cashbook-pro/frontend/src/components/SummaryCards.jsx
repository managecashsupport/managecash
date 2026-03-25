import React from 'react'
import {
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline'

const SummaryCards = ({ summary }) => {
  const fmt = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)

  const cards = [
    {
      title: 'Total Income',
      value: fmt(summary?.totalIn),
      sub: `${summary?.transactionCount || 0} transactions`,
      icon: ArrowTrendingUpIcon,
      iconClass: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      accent: 'border-t-emerald-500',
      badge: 'chip-green',
      badgeText: 'Income',
    },
    {
      title: 'Total Expenses',
      value: fmt(summary?.totalOut),
      sub: 'Cash out this period',
      icon: ArrowTrendingDownIcon,
      iconClass: 'text-red-500',
      iconBg: 'bg-red-50',
      accent: 'border-t-red-500',
      badge: 'chip-red',
      badgeText: 'Expense',
    },
    {
      title: 'Net Balance',
      value: fmt(summary?.net),
      sub: summary?.net >= 0 ? 'Profitable period' : 'In deficit',
      icon: CurrencyRupeeIcon,
      iconClass: summary?.net >= 0 ? 'text-blue-600' : 'text-red-500',
      iconBg: summary?.net >= 0 ? 'bg-blue-50' : 'bg-red-50',
      accent: summary?.net >= 0 ? 'border-t-blue-500' : 'border-t-red-500',
      badge: summary?.net >= 0 ? 'chip-blue' : 'chip-red',
      badgeText: 'Balance',
    },
    {
      title: 'Cash / Digital',
      value: `${summary?.cashIn || 0} / ${summary?.cashOut || 0}`,
      sub: 'Transaction mode split',
      icon: CreditCardIcon,
      iconClass: 'text-violet-600',
      iconBg: 'bg-violet-50',
      accent: 'border-t-violet-500',
      badge: 'chip-purple',
      badgeText: 'Payments',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`card p-6 border-t-4 ${card.accent} hover:shadow-md transition-all duration-200 group`}
        >
          <div className="flex items-start justify-between mb-5">
            <div className={`p-2.5 rounded-xl ${card.iconBg} transition-transform duration-200 group-hover:scale-110`}>
              <card.icon className={`h-5 w-5 ${card.iconClass}`} />
            </div>
            <span className={`chip ${card.badge} text-[10px]`}>{card.badgeText}</span>
          </div>

          <p className="text-sm font-medium text-slate-500">{card.title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
          <p className="mt-2 text-xs text-slate-400">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}

export default SummaryCards
