import { Fragment, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
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

type ChartType = 'donut' | 'pie' | 'bar'

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
  const [prevSummary, setPrevSummary] = useState<BudgetSummary | null>(null)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartType, setChartType] = useState<ChartType>('donut')

  const prevMonth = useMemo(() => shiftMonth(currentMonth, -1), [currentMonth])

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [summaryRes, prevSummaryRes, incomeRes] = await Promise.all([
          client.get<BudgetSummary>(`/budget/summary/?month=${currentMonth}`),
          client.get<BudgetSummary>(`/budget/summary/?month=${prevMonth}`),
          client.get<IncomeSource[]>('/budget/income/'),
        ])
        setSummary(summaryRes.data)
        setPrevSummary(prevSummaryRes.data)
        setIncomeSources(incomeRes.data)
      } catch {
        setError('Unable to load your dashboard right now.')
      } finally {
        setIsLoading(false)
      }
    }
    void fetchData()
  }, [currentMonth, prevMonth])

  const spendingChartData = useMemo(
    () =>
      (summary?.spending_by_category ?? [])
        .map((item) => ({ ...item, total: parseFloat(item.total) }))
        .filter((item) => item.total > 0),
    [summary],
  )

  const categoryDeltas = useMemo(() => {
    if (!summary || !prevSummary) return []
    const currentMap = new Map(
      summary.spending_by_category.map((c) => [c.category_name, { total: parseFloat(c.total), color: c.color }]),
    )
    const prevMap = new Map(
      prevSummary.spending_by_category.map((c) => [c.category_name, { total: parseFloat(c.total), color: c.color }]),
    )
    return Array.from(new Set([...currentMap.keys(), ...prevMap.keys()]))
      .map((name) => {
        const curr = currentMap.get(name)
        const prev = prevMap.get(name)
        return {
          name,
          color: curr?.color ?? prev?.color ?? '#808080',
          current: curr?.total ?? 0,
          previous: prev?.total ?? 0,
          delta: (curr?.total ?? 0) - (prev?.total ?? 0),
        }
      })
      .filter((c) => c.current > 0 || c.previous > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  }, [summary, prevSummary])

  const activeIncomeSources = useMemo(() => incomeSources.filter((s) => s.is_active), [incomeSources])
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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={pageTitleStyle}>Dashboard</h1>
        <p style={mutedTextStyle}>See your budget snapshot and spending trends at a glance.</p>
      </div>

      <div style={monthNavWrapStyle}>
        <button onClick={() => setCurrentMonth((v) => shiftMonth(v, -1))} style={monthNavButtonStyle} type="button">
          ←
        </button>
        <h2 style={{ margin: 0 }}>{formatMonthLabel(currentMonth)}</h2>
        <button
          disabled={isCurrentMonth}
          onClick={() => setCurrentMonth((v) => shiftMonth(v, 1))}
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

      {/* ── Spending by Category ── */}
      <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <div style={sectionHeaderStyle}>
          <h2 style={{ margin: 0 }}>Spending by Category</h2>
          <div style={toggleGroupStyle}>
            {(['donut', 'pie', 'bar'] as ChartType[]).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                style={chartType === t ? activeToggleBtnStyle : toggleBtnStyle}
                type="button"
              >
                {t === 'donut' ? '◎ Donut' : t === 'pie' ? '● Pie' : '▬ Bar'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p style={emptyStateStyle}>Loading...</p>
        ) : spendingChartData.length === 0 ? (
          <p style={emptyStateStyle}>No spending recorded this month.</p>
        ) : chartType === 'bar' ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingChartData} margin={{ top: 8, right: 8, bottom: 64, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="category_name"
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tickFormatter={(v: number) => `$${v}`} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                <Tooltip formatter={(v: number | string) => formatCurrency(v)} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {spendingChartData.map((entry, i) => (
                    <Cell key={`${entry.category_name}-${i}`} fill={entry.color || '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendingChartData}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={chartType === 'donut' ? 52 : 0}
                >
                  {spendingChartData.map((entry, i) => (
                    <Cell key={`${entry.category_name}-${i}`} fill={entry.color || '#818cf8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | string) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Month-over-month category changes ── */}
      {!isLoading && categoryDeltas.length > 0 && (
        <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>
            Category Changes vs {formatMonthLabel(prevMonth)}
          </h2>
          <div style={deltaGridStyle}>
            <div style={deltaHeaderCellStyle}>Category</div>
            <div style={{ ...deltaHeaderCellStyle, textAlign: 'right' as const }}>
              {formatMonthLabel(prevMonth).split(' ')[0]}
            </div>
            <div style={{ ...deltaHeaderCellStyle, textAlign: 'right' as const }}>
              {formatMonthLabel(currentMonth).split(' ')[0]}
            </div>
            <div style={{ ...deltaHeaderCellStyle, textAlign: 'right' as const }}>Change</div>
            {categoryDeltas.map((c) => (
              <Fragment key={c.name}>
                <div style={deltaCellStyle}>
                  <span style={colorDotStyle(c.color)} />
                  {c.name}
                </div>
                <div style={{ ...deltaCellStyle, justifyContent: 'flex-end', color: 'var(--muted)' }}>
                  {formatCurrency(c.previous)}
                </div>
                <div style={{ ...deltaCellStyle, justifyContent: 'flex-end' }}>
                  {formatCurrency(c.current)}
                </div>
                <div
                  style={{
                    ...deltaCellStyle,
                    justifyContent: 'flex-end',
                    fontWeight: 700,
                    color: c.delta === 0 ? 'var(--muted)' : c.delta > 0 ? 'var(--error)' : 'var(--success)',
                  }}
                >
                  {c.delta > 0 ? '+' : ''}{formatCurrency(c.delta)}
                </div>
              </Fragment>
            ))}
          </div>
        </section>
      )}

      {/* ── Income sources ── */}
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

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginBottom: '1.5rem',
}

const sectionHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.75rem',
  marginBottom: '1rem',
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

const deltaGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto auto auto',
  gap: 0,
}

const deltaHeaderCellStyle: CSSProperties = {
  color: 'var(--muted)',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  padding: '0 0.75rem 0.5rem 0',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--border)',
}

const deltaCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.55rem 0.75rem 0.55rem 0',
  borderBottom: '1px solid var(--border)',
  fontSize: '0.9rem',
}

const colorDotStyle = (color: string): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color || '#808080',
  flexShrink: 0,
  display: 'inline-block',
})

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
