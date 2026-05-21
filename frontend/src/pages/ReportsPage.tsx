import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import client from '../api/client'
import type { BudgetSummary } from '../types'
import {
  cardStyle,
  emptyStateStyle,
  errorTextStyle,
  formatCurrency,
  formatMonthLabel,
  getCurrentMonth,
  mutedTextStyle,
  pageTitleStyle,
  shiftMonth,
} from '../ui'

const CHART_COLORS = [
  '#818cf8', '#34d399', '#fb923c', '#f472b6',
  '#60a5fa', '#a78bfa', '#4ade80', '#fbbf24',
]

function buildMonthRange(endMonth: string, count: number): string[] {
  const months: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    months.push(shiftMonth(endMonth, -i))
  }
  return months
}

export default function ReportsPage() {
  const [summaries, setSummaries] = useState<BudgetSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const currentMonth = getCurrentMonth()
  const months = useMemo(() => buildMonthRange(currentMonth, 6), [currentMonth])

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true)
      setError('')
      try {
        const responses = await Promise.all(
          months.map((m) => client.get<BudgetSummary>(`/budget/summary/?month=${m}`)),
        )
        setSummaries(responses.map((r) => r.data))
      } catch {
        setError('Unable to load report data right now.')
      } finally {
        setIsLoading(false)
      }
    }
    void fetchAll()
  }, [months])

  // --- Trend data: 6 months of income / expenses / spending ---
  const trendData = useMemo(
    () =>
      summaries.map((s) => ({
        month: formatMonthLabel(s.month).replace(/\s\d{4}$/, ''), // "January" not "January 2026"
        Income: parseFloat(s.monthly_income),
        Expenses: parseFloat(s.monthly_expenses),
        Spending: parseFloat(s.spending_this_month),
        Net: parseFloat(s.net_budget),
      })),
    [summaries],
  )

  // --- Pie: aggregate spending by category for the latest month ---
  const latestSummary = summaries[summaries.length - 1]
  const pieData = useMemo(
    () =>
      (latestSummary?.spending_by_category ?? [])
        .filter((item) => parseFloat(item.total) > 0)
        .map((item) => ({ name: item.category_name, value: parseFloat(item.total), color: item.color })),
    [latestSummary],
  )

  // --- Bar: net budget per month ---
  const netData = useMemo(
    () =>
      summaries.map((s) => ({
        month: formatMonthLabel(s.month).replace(/\s\d{4}$/, ''),
        Net: parseFloat(s.net_budget),
      })),
    [summaries],
  )

  const hasAnyData = trendData.some((d) => d.Income > 0 || d.Expenses > 0 || d.Spending > 0)
  const latestMonthLabel = latestSummary ? formatMonthLabel(latestSummary.month) : ''

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={pageTitleStyle}>Reports</h1>
        <p style={mutedTextStyle}>Visual breakdown of your finances over the last 6 months.</p>
      </div>

      {error ? <p style={{ ...errorTextStyle, marginBottom: '1.5rem' }}>{error}</p> : null}

      {isLoading ? (
        <div style={cardStyle}>
          <p style={emptyStateStyle}>Loading charts…</p>
        </div>
      ) : !hasAnyData ? (
        <div style={cardStyle}>
          <p style={emptyStateStyle}>
            No data yet — add income sources, recurring expenses, and purchases to see charts here.
          </p>
        </div>
      ) : (
        <div style={gridStyle}>

          {/* ── Area chart: income / expenses / spending trend ── */}
          <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <h2 style={chartTitleStyle}>6-Month Trend — Income vs Expenses vs Spending</h2>
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSpending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <Tooltip formatter={(v: number | string) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="Income" stroke="#4ade80" strokeWidth={2} fill="url(#gradIncome)" dot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Expenses" stroke="#fb923c" strokeWidth={2} fill="url(#gradExpenses)" dot={{ r: 4 }} />
                  <Area type="monotone" dataKey="Spending" stroke="#818cf8" strokeWidth={2} fill="url(#gradSpending)" dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Pie chart: category breakdown for current month ── */}
          <section style={cardStyle}>
            <h2 style={chartTitleStyle}>
              {latestMonthLabel} — Spending by Category
            </h2>
            {pieData.length === 0 ? (
              <p style={emptyStateStyle}>No purchases recorded this month.</p>
            ) : (
              <div style={chartWrapStyle}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius="65%"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={true}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color && entry.color !== '#808080' ? entry.color : CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number | string) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* ── Bar chart: net budget per month ── */}
          <section style={cardStyle}>
            <h2 style={chartTitleStyle}>Monthly Net Budget</h2>
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={netData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <Tooltip formatter={(v: number | string) => formatCurrency(v)} />
                  <Bar dataKey="Net" radius={[6, 6, 0, 0]}>
                    {netData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.Net >= 0 ? '#4ade80' : '#f87171'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Stacked bar: income vs expenses + spending side-by-side ── */}
          <section style={{ ...cardStyle, gridColumn: 'span 2' }}>
            <h2 style={chartTitleStyle}>Monthly Income vs Fixed Expenses vs Actual Spending</h2>
            <div style={chartWrapStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                  <Tooltip formatter={(v: number | string) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#fb923c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Spending" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

        </div>
      )}
    </div>
  )
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1.5rem',
}

const chartTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: '1rem',
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text)',
}

const chartWrapStyle: CSSProperties = {
  width: '100%',
  height: 280,
}
