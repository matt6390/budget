import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import client from '../api/client'
import type { BudgetSummary, IncomeSource } from '../types'
import {
  COLORS,
  cardStyle,
  emptyStateStyle,
  errorTextStyle,
  formatCurrency,
  formatMonthLabel,
  getCurrentMonth,
  monthNavButtonStyle,
  monthNavWrapStyle,
  mutedTextStyle,
  pageTitleStyle,
  shiftMonth,
} from '../ui'

const cadenceLabels: Record<string, string> = {
  monthly: 'Monthly',
  biweekly: 'Every 2 Weeks',
  weekly: 'Weekly',
  semimonthly: 'Twice a Month',
  annual: 'Annually',
}

export default function DashboardPage() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [summaryResponse, incomeResponse] = await Promise.all([
          client.get<BudgetSummary>(`/budget/summary/?month=${currentMonth}`),
          client.get<IncomeSource[]>('/budget/income/'),
        ])
        setSummary(summaryResponse.data)
        setIncomeSources(incomeResponse.data)
      } catch {
        setError('Unable to load your dashboard right now.')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchData()
  }, [currentMonth])

  const spendingChartData = useMemo(
    () => summary?.spending_by_category.map((item) => ({ ...item, total: parseFloat(item.total) })) ?? [],
    [summary],
  )

  const activeIncomeSources = useMemo(() => incomeSources.filter((source) => source.is_active), [incomeSources])
  const isCurrentMonth = currentMonth === getCurrentMonth()

  const summaryCards = [
    { label: 'Monthly Income', value: summary?.monthly_income ?? '0', accent: COLORS.success },
    { label: 'Monthly Expenses', value: summary?.monthly_expenses ?? '0', accent: COLORS.warning },
    { label: 'Spending This Month', value: summary?.spending_this_month ?? '0', accent: '#ca8a04' },
    {
      label: 'Net Budget',
      value: summary?.net_budget ?? '0',
      accent: Number(summary?.net_budget ?? 0) >= 0 ? COLORS.success : COLORS.error,
    },
  ]

  return (
    <div>
      <div style={headerStyle}>
        <div>
          <h1 style={pageTitleStyle}>Dashboard</h1>
          <p style={mutedTextStyle}>See your budget snapshot and spending trends at a glance.</p>
        </div>
      </div>

      <div style={monthNavWrapStyle}>
        <button onClick={() => setCurrentMonth((value) => shiftMonth(value, -1))} style={monthNavButtonStyle} type="button">
          ←
        </button>
        <h2 style={{ margin: 0 }}>{formatMonthLabel(currentMonth)}</h2>
        <button
          disabled={isCurrentMonth}
          onClick={() => setCurrentMonth((value) => shiftMonth(value, 1))}
          style={{ ...monthNavButtonStyle, opacity: isCurrentMonth ? 0.5 : 1 }}
          type="button"
        >
          →
        </button>
      </div>

      {error ? <p style={{ ...errorTextStyle, marginBottom: '1.5rem' }}>{error}</p> : null}

      <section style={summaryGridStyle}>
        {summaryCards.map((card) => (
          <article key={card.label} style={{ ...cardStyle, borderLeft: `6px solid ${card.accent}` }}>
            <p style={{ color: COLORS.muted, marginTop: 0, marginBottom: '0.75rem' }}>{card.label}</p>
            <strong style={{ color: COLORS.text, fontSize: '1.9rem' }}>
              {isLoading ? 'Loading...' : formatCurrency(card.value)}
            </strong>
          </article>
        ))}
      </section>

      <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>Spending by Category</h2>
        {isLoading ? (
          <p style={emptyStateStyle}>Loading...</p>
        ) : spendingChartData.length === 0 ? (
          <p style={emptyStateStyle}>No spending recorded this month.</p>
        ) : (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={spendingChartData} dataKey="total" nameKey="category_name" cx="50%" cy="50%" outerRadius={100}>
                  {spendingChartData.map((entry, index) => (
                    <Cell key={`${entry.category_name}-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | string) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Income Sources</h2>
        {isLoading ? (
          <p style={emptyStateStyle}>Loading...</p>
        ) : activeIncomeSources.length === 0 ? (
          <p style={emptyStateStyle}>No income sources set up yet.</p>
        ) : (
          <div style={incomeListStyle}>
            {activeIncomeSources.map((source) => (
              <div key={source.id} style={incomeRowStyle}>
                <div>
                  <strong>{source.name}</strong>
                  <p style={{ ...mutedTextStyle, marginTop: '0.35rem' }}>{cadenceLabels[source.cadence] ?? source.cadence}</p>
                </div>
                <strong>≈ {formatCurrency(source.monthly_equivalent)} / mo</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const headerStyle: CSSProperties = {
  marginBottom: '1.5rem',
}

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginBottom: '1.5rem',
}

const incomeListStyle: CSSProperties = {
  display: 'grid',
  gap: '0.85rem',
}

const incomeRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  paddingBottom: '0.85rem',
  borderBottom: '1px solid var(--border)',
}
