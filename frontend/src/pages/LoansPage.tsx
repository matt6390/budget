import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { Loan, LoanAnalysis } from '../types'
import {
  cardStyle,
  emptyStateStyle,
  errorTextStyle,
  fieldStyle,
  formatCurrency,
  inputStyle,
  labelStyle,
  mutedTextStyle,
  pageTitleStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../ui'

const LOAN_TYPES = [
  { value: 'mortgage', label: '🏠 Mortgage' },
  { value: 'auto', label: '🚗 Auto Loan' },
  { value: 'personal', label: '💳 Personal Loan' },
  { value: 'student', label: '🎓 Student Loan' },
  { value: 'other', label: '📄 Other' },
]

type LoanForm = {
  name: string
  loan_type: string
  original_amount: string
  current_balance: string
  interest_rate: string
  monthly_payment: string
  start_date: string
  term_months: string
  extra_payment: string
  notes: string
}

const emptyForm = (): LoanForm => ({
  name: '',
  loan_type: 'mortgage',
  original_amount: '',
  current_balance: '',
  interest_rate: '',
  monthly_payment: '',
  start_date: new Date().toISOString().split('T')[0],
  term_months: '',
  extra_payment: '0',
  notes: '',
})

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [form, setForm] = useState<LoanForm>(emptyForm())
  const [formErrors, setFormErrors] = useState<Partial<LoanForm>>({})
  const [saving, setSaving] = useState(false)

  const [analysisMap, setAnalysisMap] = useState<Record<number, LoanAnalysis>>({})
  const [loadingAnalysis, setLoadingAnalysis] = useState<Record<number, boolean>>({})
  const [expandedLoan, setExpandedLoan] = useState<number | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await client.get<Loan[]>('/budget/loans/')
      setLoans(res.data)
    } catch {
      setError('Failed to load loans.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const loadAnalysis = async (loan: Loan) => {
    if (analysisMap[loan.id]) {
      setExpandedLoan(expandedLoan === loan.id ? null : loan.id)
      return
    }
    setLoadingAnalysis((p) => ({ ...p, [loan.id]: true }))
    setExpandedLoan(loan.id)
    try {
      const res = await client.get<LoanAnalysis>(`/budget/loans/${loan.id}/analysis/`)
      setAnalysisMap((p) => ({ ...p, [loan.id]: res.data }))
    } catch {
      setExpandedLoan(null)
    } finally {
      setLoadingAnalysis((p) => ({ ...p, [loan.id]: false }))
    }
  }

  const openAdd = () => {
    setEditingLoan(null)
    setForm(emptyForm())
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (loan: Loan) => {
    setEditingLoan(loan)
    setForm({
      name: loan.name,
      loan_type: loan.loan_type,
      original_amount: loan.original_amount,
      current_balance: loan.current_balance,
      interest_rate: loan.interest_rate,
      monthly_payment: loan.monthly_payment,
      start_date: loan.start_date,
      term_months: loan.term_months ? String(loan.term_months) : '',
      extra_payment: loan.extra_payment,
      notes: loan.notes,
    })
    setFormErrors({})
    setShowModal(true)
  }

  const validate = (): Partial<LoanForm> => {
    const errs: Partial<LoanForm> = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    const numFields: (keyof LoanForm)[] = ['original_amount', 'current_balance', 'interest_rate', 'monthly_payment']
    for (const f of numFields) {
      if (!form[f] || isNaN(Number(form[f])) || Number(form[f]) < 0)
        errs[f] = 'Enter a valid number.'
    }
    if (!form.start_date) errs.start_date = 'Start date is required.'
    return errs
  }

  const saveLoan = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        loan_type: form.loan_type,
        original_amount: form.original_amount,
        current_balance: form.current_balance,
        interest_rate: form.interest_rate,
        monthly_payment: form.monthly_payment,
        start_date: form.start_date,
        term_months: form.term_months ? parseInt(form.term_months) : null,
        extra_payment: form.extra_payment || '0',
        notes: form.notes,
      }
      if (editingLoan) {
        await client.patch(`/budget/loans/${editingLoan.id}/`, payload)
        // Clear cached analysis so it refreshes
        setAnalysisMap((p) => { const n = { ...p }; delete n[editingLoan.id]; return n })
      } else {
        await client.post('/budget/loans/', payload)
      }
      setShowModal(false)
      void load()
    } catch {
      setFormErrors({ name: 'Failed to save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const deleteLoan = async (loan: Loan) => {
    if (!confirm(`Delete "${loan.name}"?`)) return
    await client.delete(`/budget/loans/${loan.id}/`)
    setAnalysisMap((p) => { const n = { ...p }; delete n[loan.id]; return n })
    void load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={pageTitleStyle}>Loans & Mortgage</h1>
          <p style={mutedTextStyle}>Track your loans and see how extra payments could save you thousands.</p>
        </div>
        <button style={primaryButtonStyle} onClick={openAdd}>＋ Add Loan</button>
      </div>

      {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}>{error}</p> : null}

      {isLoading ? (
        <div style={cardStyle}><p style={emptyStateStyle}>Loading…</p></div>
      ) : loans.length === 0 ? (
        <div style={cardStyle}>
          <p style={emptyStateStyle}>No loans added yet. Click <strong>＋ Add Loan</strong> to track a mortgage, car loan, or other debt.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              analysis={analysisMap[loan.id]}
              isLoadingAnalysis={loadingAnalysis[loan.id] ?? false}
              isExpanded={expandedLoan === loan.id}
              onEdit={openEdit}
              onDelete={deleteLoan}
              onToggleAnalysis={() => void loadAnalysis(loan)}
            />
          ))}
        </div>
      )}

      {/* ── Loan Modal ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingLoan ? 'Edit Loan' : 'Add Loan'}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Loan name *</label>
            <input style={inputStyle} placeholder="e.g. Home Mortgage, Honda Civic" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {formErrors.name && <p style={errorTextStyle}>{formErrors.name}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Type</label>
            <select style={inputStyle} value={form.loan_type} onChange={(e) => setForm({ ...form, loan_type: e.target.value })}>
              {LOAN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Start date *</label>
            <input style={inputStyle} type="date" value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            {formErrors.start_date && <p style={errorTextStyle}>{formErrors.start_date}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Original loan amount ($) *</label>
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="250000.00" value={form.original_amount}
              onChange={(e) => setForm({ ...form, original_amount: e.target.value })} />
            {formErrors.original_amount && <p style={errorTextStyle}>{formErrors.original_amount}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Current balance ($) *</label>
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="235000.00" value={form.current_balance}
              onChange={(e) => setForm({ ...form, current_balance: e.target.value })} />
            {formErrors.current_balance && <p style={errorTextStyle}>{formErrors.current_balance}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Annual interest rate (%) *</label>
            <input style={inputStyle} type="number" min="0" step="0.001" placeholder="6.500" value={form.interest_rate}
              onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
            {formErrors.interest_rate && <p style={errorTextStyle}>{formErrors.interest_rate}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Monthly payment ($) *</label>
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="1580.17" value={form.monthly_payment}
              onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })} />
            {formErrors.monthly_payment && <p style={errorTextStyle}>{formErrors.monthly_payment}</p>}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Extra monthly payment ($)</label>
            <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0.00" value={form.extra_payment}
              onChange={(e) => setForm({ ...form, extra_payment: e.target.value })} />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Loan term (months, optional)</label>
            <input style={inputStyle} type="number" min="1" step="1" placeholder="360 for 30 years" value={form.term_months}
              onChange={(e) => setForm({ ...form, term_months: e.target.value })} />
          </div>

          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button style={secondaryButtonStyle} onClick={() => setShowModal(false)}>Cancel</button>
          <button style={primaryButtonStyle} onClick={() => void saveLoan()} disabled={saving}>
            {saving ? 'Saving…' : editingLoan ? 'Save Changes' : 'Add Loan'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Loan Card ───────────────────────────────────────────────────────────────────

type LoanCardProps = {
  loan: Loan
  analysis: LoanAnalysis | undefined
  isLoadingAnalysis: boolean
  isExpanded: boolean
  onEdit: (l: Loan) => void
  onDelete: (l: Loan) => void
  onToggleAnalysis: () => void
}

function LoanCard({ loan, analysis, isLoadingAnalysis, isExpanded, onEdit, onDelete, onToggleAnalysis }: LoanCardProps) {
  const typeIcon = LOAN_TYPES.find((t) => t.value === loan.loan_type)?.label.split(' ')[0] ?? '📄'
  const pctPaid = Math.min(
    ((parseFloat(loan.original_amount) - parseFloat(loan.current_balance)) / parseFloat(loan.original_amount)) * 100,
    100,
  )

  return (
    <div style={cardStyle}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
            {typeIcon} {loan.name}
          </h3>
          <p style={{ ...mutedTextStyle, fontSize: '0.8rem', margin: '2px 0 0' }}>{loan.loan_type_display}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={miniButtonStyle} onClick={() => onEdit(loan)}>✏️ Edit</button>
          <button style={{ ...miniButtonStyle, color: 'var(--danger)' }} onClick={() => onDelete(loan)}>🗑 Delete</button>
        </div>
      </div>

      {/* Key numbers */}
      <div style={statsRowStyle}>
        <StatBox label="Current Balance" value={formatCurrency(loan.current_balance)} accent />
        <StatBox label="Original Amount" value={formatCurrency(loan.original_amount)} />
        <StatBox label="Interest Rate" value={`${parseFloat(loan.interest_rate).toFixed(3)}%`} />
        <StatBox label="Monthly Payment" value={formatCurrency(loan.monthly_payment)} />
        {parseFloat(loan.extra_payment) > 0 && (
          <StatBox label="Extra / Month" value={`+${formatCurrency(loan.extra_payment)}`} accent />
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.8rem' }}>
          <span style={mutedTextStyle}>Paid off</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{pctPaid.toFixed(1)}%</span>
        </div>
        <div style={progressTrackStyle}>
          <div style={{ ...progressFillStyle, width: `${pctPaid}%`, background: '#4ade80' }} />
        </div>
      </div>

      {loan.notes && <p style={{ ...mutedTextStyle, fontSize: '0.8rem', marginTop: '0.5rem' }}>{loan.notes}</p>}

      {/* Analysis toggle */}
      <button style={{ ...miniButtonStyle, marginTop: '1rem', width: '100%', textAlign: 'center' }} onClick={onToggleAnalysis}>
        {isLoadingAnalysis ? 'Loading analysis…' : isExpanded ? '▲ Hide payoff analysis' : '📊 View payoff analysis & extra payment impact'}
      </button>

      {/* Analysis panel */}
      {isExpanded && analysis && <AnalysisPanel analysis={analysis} />}
    </div>
  )
}

// ── Analysis Panel ──────────────────────────────────────────────────────────────

function AnalysisPanel({ analysis }: { analysis: LoanAnalysis }) {
  const hasBudget = parseFloat(analysis.net_budget_this_month) > 0
  const suggestedIsPositive = parseFloat(analysis.suggested_extra_payment) > 0
  const currentExtraIsPositive = parseFloat(analysis.current_extra_payment) > 0

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      {/* Budget context */}
      <div style={analysisBannerStyle(hasBudget)}>
        <strong>Your net budget this month:</strong> {formatCurrency(analysis.net_budget_this_month)}
        {hasBudget && suggestedIsPositive && (
          <> — putting <strong>{formatCurrency(analysis.suggested_extra_payment)}</strong> extra toward this loan (20% of surplus) could save you a lot.</>
        )}
        {!hasBudget && <> — your budget is tight this month, so no extra payment is suggested right now.</>}
      </div>

      {/* Comparison table */}
      <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Scenario</th>
              <th style={thStyle}>Extra / Month</th>
              <th style={thStyle}>Payoff Date</th>
              <th style={thStyle}>Total Interest</th>
              <th style={thStyle}>Interest Saved</th>
              <th style={thStyle}>Months Saved</th>
            </tr>
          </thead>
          <tbody>
            <ScenarioRow
              label="Standard (no extra)"
              extra="$0"
              payoffDate={analysis.standard.payoff_date}
              totalInterest={analysis.standard.total_interest}
              interestSaved={null}
              monthsSaved={null}
              highlight={false}
            />
            {currentExtraIsPositive && (
              <ScenarioRow
                label="With current extra"
                extra={formatCurrency(analysis.with_current_extra.extra_payment)}
                payoffDate={analysis.with_current_extra.payoff_date}
                totalInterest={analysis.with_current_extra.total_interest}
                interestSaved={analysis.with_current_extra.interest_saved}
                monthsSaved={analysis.with_current_extra.months_saved}
                highlight={false}
              />
            )}
            {suggestedIsPositive && (
              <ScenarioRow
                label="💡 Suggested extra"
                extra={formatCurrency(analysis.with_suggested_extra.extra_payment)}
                payoffDate={analysis.with_suggested_extra.payoff_date}
                totalInterest={analysis.with_suggested_extra.total_interest}
                interestSaved={analysis.with_suggested_extra.interest_saved}
                monthsSaved={analysis.with_suggested_extra.months_saved}
                highlight
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScenarioRow({ label, extra, payoffDate, totalInterest, interestSaved, monthsSaved, highlight }: {
  label: string; extra: string; payoffDate: string | null; totalInterest: string | null
  interestSaved: string | null; monthsSaved: number | null; highlight: boolean
}) {
  const bg = highlight ? 'var(--surface)' : 'transparent'
  return (
    <tr style={{ background: bg }}>
      <td style={{ ...tdStyle, fontWeight: highlight ? 700 : 400, color: highlight ? 'var(--primary)' : 'var(--text)' }}>{label}</td>
      <td style={tdStyle}>{extra}</td>
      <td style={tdStyle}>{payoffDate ? formatPayoffDate(payoffDate) : '—'}</td>
      <td style={tdStyle}>{totalInterest ? formatCurrency(totalInterest) : '—'}</td>
      <td style={{ ...tdStyle, color: interestSaved ? '#4ade80' : 'var(--muted)', fontWeight: interestSaved ? 700 : 400 }}>
        {interestSaved ? `−${formatCurrency(interestSaved)}` : '—'}
      </td>
      <td style={{ ...tdStyle, color: monthsSaved ? '#4ade80' : 'var(--muted)', fontWeight: monthsSaved ? 700 : 400 }}>
        {monthsSaved ? `${monthsSaved} mo` : '—'}
      </td>
    </tr>
  )
}

function formatPayoffDate(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ ...statBoxStyle, borderColor: accent ? 'var(--primary)' : 'var(--border)' }}>
      <span style={mutedTextStyle}>{label}</span>
      <span style={{ color: accent ? 'var(--primary)' : 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>{value}</span>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const statsRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }

const statBoxStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 2,
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.8rem',
}

const miniButtonStyle: CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem', padding: '0.3rem 0.65rem',
}

const progressTrackStyle: CSSProperties = {
  height: 8, borderRadius: 6, background: 'var(--border)', overflow: 'hidden',
}

const progressFillStyle: CSSProperties = {
  height: '100%', borderRadius: 6, transition: 'width 0.4s ease',
}

const analysisBannerStyle = (positive: boolean): CSSProperties => ({
  background: positive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 146, 60, 0.1)',
  border: `1px solid ${positive ? 'rgba(74,222,128,0.3)' : 'rgba(251,146,60,0.3)'}`,
  borderRadius: 8, padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text)',
})

const tableStyle: CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem',
}

const thStyle: CSSProperties = {
  textAlign: 'left', padding: '0.4rem 0.6rem',
  color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}

const tdStyle: CSSProperties = {
  padding: '0.45rem 0.6rem', color: 'var(--text)',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}
