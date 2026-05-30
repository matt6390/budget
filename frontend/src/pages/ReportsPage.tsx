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
  monthNavButtonStyle,
  mutedTextStyle,
  pageTitleStyle,
  shiftMonth,
} from '../ui'

type ChartType = 'donut' | 'pie' | 'bar'

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
  const [endMonth, setEndMonth] = useState(getCurrentMonth())
  const [rangeMonths, setRangeMonths] = useState<3 | 6 | 12>(6)
  const [categoryMonth, setCategoryMonth] = useState(getCurrentMonth())
  const [categoryChartType, setCategoryChartType] = useState<ChartType>('donut')
  const [summaries, setSummaries] = useState<BudgetSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const months = useMemo(() => buildMonthRange(endMonth, rangeMonths), [endMonth, rangeMonths])
  const isCurrentEndMonth = endMonth === getCurrentMonth()

  const handleSetEndMonth = (newEnd: string) => {
    setEndMonth(newEnd)
    setCategoryMonth(newEnd)
  }

  const handleSetRangeMonths = (n: 3 | 6 | 12) => {
    setRangeMonths(n)
    if (!buildMonthRange(endMonth, n).includes(categoryMonth)) {
      setCategoryMonth(endMonth)
    }
  }

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

  const trendData = useMemo(
    () =>
      summaries.map((s) => ({
        month: formatMonthLabel(s.month).replace(/\s\d{4}$/, ''),
        Income: parseFloat(s.monthly_income),
        Expenses: parseFloat(s.monthly_expenses),
        Spending: parseFloat(s.spending_this_month),
        Net: parseFloat(s.net_budget),
      })),
    [summaries],
  )

  const categoryData = useMemo(() => {
    const s = summaries.find((s) => s.month === categoryMonth)
    return (s?.spending_by_category ?? [])
      .filter((item) => parseFloat(item.total) > 0)
      .map((item) => ({ name: item.category_name, value: parseFloat(item.total), color: item.color }))
  }, [summaries, categoryMonth])

  const netData = useMemo(
    () =>
      summaries.map((s) => ({
        month: formatMonthLabel(s.month).replace(/\s\d{4}$/, ''),
        Net: parseFloat(s.net_budget),
      })),
    [summaries],
  )

  const hasAnyData = trendData.some((d) => d.Income > 0 || d.Expenses > 0 || d.Spending > 0)

  const categoryMonthIndex = months.indexOf(categoryMonth)
  const canCategoryPrev = categoryMonthIndex > 0
  const canCategoryNext = categoryMonthIndex < months.length - 1

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={pageTitleStyle}>Reports</h1>
        <p style={mutedTextStyle}>Visual breakdown of your finances.</p>
      </div>

      {/* ── Range controls ── */}
      <div style={controlsRowStyle}>
        <div style={rangeNavStyle}>
          <button
            onClick={() => handleSetEndMonth(shiftMonth(endMonth, -1))}
            style={monthNavButtonStyle}
            type="button"
          >
            ←
          </button>
          <span style={{ fontWeight: 600 }}>{formatMonthLabel(endMonth)}</span>
          <button
            disabled={isCurrentEndMonth}
            onClick={() => handleSetEndMonth(shiftMonth(endMonth, 1))}
            style={{ ...monthNavButtonStyle, opacity: isCurrentEndMonth ? 0.5 : 1 }}
            type="button"
          >
            →
          </button>
        </div>
        <div style={toggleGroupStyle}>
          {([3, 6, 12] as const).map((n) => (
            <button
              key={n}
              onClick={() => handleSetRangeMonths(n)}
              style={rangeMonths === n ? activeToggleBtnStyle : toggleBtnStyle}
              type="button"
            >
              {n} mo
            </button>
          ))}
        </div>
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
            <h2 style={chartTitleStyle}>{rangeMonths}-Month Trend — Income vs Expenses vs Spending</h2>
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

          {/* ── Category breakdown chart with month picker + type toggle ── */}
          <section style={cardStyle}>
            <div style={chartCardHeaderStyle}>
              <div style={categoryNavRowStyle}>
                <button
                  disabled={!canCategoryPrev}
                  onClick={() => setCategoryMonth(months[categoryMonthIndex - 1])}
                  style={{ ...monthNavButtonStyle, opacity: canCategoryPrev ? 1 : 0.4 }}
                  type="button"
                >
                  ←
                </button>
                <h2 style={{ ...chartTitleStyle, margin: 0 }}>{formatMonthLabel(categoryMonth)} — Spending</h2>
                <button
                  disabled={!canCategoryNext}
                  onClick={() => setCategoryMonth(months[categoryMonthIndex + 1])}
                  style={{ ...monthNavButtonStyle, opacity: canCategoryNext ? 1 : 0.4 }}
                  type="button"
                >
                  →
                </button>
              </div>
              <div style={toggleGroupStyle}>
                {(['donut', 'pie', 'bar'] as ChartType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCategoryChartType(t)}
                    style={categoryChartType === t ? activeToggleBtnStyle : toggleBtnStyle}
                    type="button"
                  >
                    {t === 'donut' ? '◎' : t === 'pie' ? '●' : '▬'}
                  </button>
                ))}
              </div>
            </div>

            {categoryData.length === 0 ? (
              <p style={emptyStateStyle}>No purchases recorded this month.</p>
            ) : categoryChartType === 'bar' ? (
              <div style={{ ...chartWrapStyle, height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 8, right: 8, bottom: 64, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: 'var(--muted)', fontSize: 11 }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                    <Tooltip formatter={(v: number | string) => formatCurrency(v)} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {categoryData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color && entry.color !== '#808080' ? entry.color : CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={chartWrapStyle}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="65%"
                      innerRadius={categoryChartType === 'donut' ? '35%' : 0}
                    >
                      {categoryData.map((entry, i) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color && entry.color !== '#808080' ? entry.color : CHART_COLORS[i % CHART_COLORS.length]}
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

const controlsRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.75rem',
  marginBottom: '1.5rem',
}

const rangeNavStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
}

const toggleGroupStyle: CSSProperties = {
  display: 'flex',
  gap: '0.35rem',
}

const toggleBtnStyle: CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: '0.8rem',
  padding: '0.3rem 0.65rem',
}

const activeToggleBtnStyle: CSSProperties = {
  ...toggleBtnStyle,
  background: 'var(--primary)',
  borderColor: 'var(--primary)',
  color: 'var(--invert)',
  fontWeight: 700,
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1.5rem',
}

const chartCardHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginBottom: '1rem',
}

const categoryNavRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
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
