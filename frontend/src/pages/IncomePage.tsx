import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { IncomeSource, IncomeSalaryChange } from '../types'
import {
  actionsRowStyle,
  btnDangerStyle,
  btnGhostStyle,
  btnPrimaryStyle,
  cardStyle,
  checkboxLabelStyle,
  emptyStateStyle,
  errorTextStyle,
  extractFieldErrors,
  formActionsStyle,
  formatCurrency,
  inputStyle,
  labelStyle,
  mutedTextStyle,
  pageHeaderStyle,
  pageTitleStyle,
  tableCellStyle,
  tableHeaderCellStyle,
  tableStyle,
} from '../ui'

type FieldErrors = Record<string, string>

type IncomeFormState = {
  name: string
  amount: string
  cadence: string
  is_active: boolean
}

type SalaryChangeFormState = {
  effective_date: string
  amount: string
  note: string
}

const defaultFormState: IncomeFormState = {
  name: '',
  amount: '',
  cadence: 'monthly',
  is_active: true,
}

const defaultSalaryForm: SalaryChangeFormState = {
  effective_date: new Date().toISOString().split('T')[0],
  amount: '',
  note: '',
}

const cadenceLabels: Record<string, string> = {
  monthly: 'Monthly',
  biweekly: 'Every 2 Weeks',
  weekly: 'Weekly',
  semimonthly: 'Twice a Month',
  annual: 'Annually',
}

export default function IncomePage() {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Income source modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null)
  const [formState, setFormState] = useState<IncomeFormState>(defaultFormState)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Salary change modal
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false)
  const [salaryTargetIncome, setSalaryTargetIncome] = useState<IncomeSource | null>(null)
  const [salaryForm, setSalaryForm] = useState<SalaryChangeFormState>(defaultSalaryForm)
  const [salaryFieldErrors, setSalaryFieldErrors] = useState<FieldErrors>({})
  const [salaryGeneralError, setSalaryGeneralError] = useState('')
  const [salarySubmitting, setSalarySubmitting] = useState(false)

  // History panel
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null)

  const fetchIncomeSources = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await client.get<IncomeSource[]>('/budget/income/')
      setIncomeSources(response.data)
    } catch {
      setError('Unable to load income sources right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchIncomeSources()
  }, [])

  const totalMonthlyIncome = useMemo(
    () => incomeSources.filter((item) => item.is_active).reduce((sum, item) => sum + parseFloat(item.monthly_equivalent), 0),
    [incomeSources],
  )

  // ── Income source modal ─────────────────────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIncome(null)
    setFormState(defaultFormState)
    setFieldErrors({})
    setGeneralError('')
    setIsSubmitting(false)
  }

  const openAddModal = () => {
    setEditingIncome(null)
    setFormState(defaultFormState)
    setFieldErrors({})
    setGeneralError('')
    setIsModalOpen(true)
  }

  const openEditModal = (income: IncomeSource) => {
    setEditingIncome(income)
    setFormState({
      name: income.name,
      amount: income.amount,
      cadence: income.cadence,
      is_active: income.is_active,
    })
    setFieldErrors({})
    setGeneralError('')
    setIsModalOpen(true)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGeneralError('')
    try {
      if (editingIncome) {
        await client.patch(`/budget/income/${editingIncome.id}/`, formState)
      } else {
        await client.post('/budget/income/', formState)
      }
      await fetchIncomeSources()
      closeModal()
    } catch (err) {
      const { fieldErrors: nextErrors, generalError: nextError } = extractFieldErrors(err)
      setFieldErrors(nextErrors)
      setGeneralError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (income: IncomeSource) => {
    if (!window.confirm(`Delete income source "${income.name}"?`)) return
    try {
      await client.delete(`/budget/income/${income.id}/`)
      await fetchIncomeSources()
    } catch {
      setError('Unable to delete that income source right now.')
    }
  }

  // ── Salary change modal ─────────────────────────────────────────────────────
  const closeSalaryModal = () => {
    setIsSalaryModalOpen(false)
    setSalaryTargetIncome(null)
    setSalaryForm(defaultSalaryForm)
    setSalaryFieldErrors({})
    setSalaryGeneralError('')
    setSalarySubmitting(false)
  }

  const openSalaryModal = (income: IncomeSource) => {
    setSalaryTargetIncome(income)
    setSalaryForm({ ...defaultSalaryForm, amount: income.amount })
    setSalaryFieldErrors({})
    setSalaryGeneralError('')
    setIsSalaryModalOpen(true)
  }

  const handleSalarySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!salaryTargetIncome) return
    setSalarySubmitting(true)
    setSalaryFieldErrors({})
    setSalaryGeneralError('')
    try {
      await client.post(`/budget/income/${salaryTargetIncome.id}/salary-change/`, salaryForm)
      await fetchIncomeSources()
      closeSalaryModal()
    } catch (err) {
      const { fieldErrors: nextErrors, generalError: nextError } = extractFieldErrors(err)
      setSalaryFieldErrors(nextErrors)
      setSalaryGeneralError(nextError)
    } finally {
      setSalarySubmitting(false)
    }
  }

  return (
    <div>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Income Sources</h1>
          <p style={mutedTextStyle}>Manage recurring income and monthly equivalents.</p>
        </div>
        <button onClick={openAddModal} style={btnPrimaryStyle} type="button">
          Add Income
        </button>
      </div>

      <section style={cardStyle}>
        {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}>{error}</p> : null}
        {isLoading ? (
          <p style={emptyStateStyle}>Loading...</p>
        ) : incomeSources.length === 0 ? (
          <p style={emptyStateStyle}>No income sources set up yet.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderCellStyle}>Name</th>
                  <th style={tableHeaderCellStyle}>Cadence</th>
                  <th style={tableHeaderCellStyle}>Amount</th>
                  <th style={tableHeaderCellStyle}>Monthly Equiv</th>
                  <th style={tableHeaderCellStyle}>Active</th>
                  <th style={tableHeaderCellStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomeSources.map((income) => (
                  <>
                    <tr key={income.id}>
                      <td style={tableCellStyle}>{income.name}</td>
                      <td style={tableCellStyle}>{cadenceLabels[income.cadence] ?? income.cadence}</td>
                      <td style={tableCellStyle}>{formatCurrency(income.amount)}</td>
                      <td style={tableCellStyle}>{formatCurrency(income.monthly_equivalent)}</td>
                      <td style={tableCellStyle}>{income.is_active ? 'Yes' : 'No'}</td>
                      <td style={tableCellStyle}>
                        <div style={actionsRowStyle}>
                          <button onClick={() => openEditModal(income)} style={btnGhostStyle} type="button" title="Edit">✏️</button>
                          <button onClick={() => openSalaryModal(income)} style={btnGhostStyle} type="button" title="Log salary change">💰</button>
                          {income.salary_history.length > 0 && (
                            <button
                              onClick={() => setExpandedHistory(expandedHistory === income.id ? null : income.id)}
                              style={btnGhostStyle}
                              type="button"
                              title="View salary history"
                            >
                              📋
                            </button>
                          )}
                          <button onClick={() => void handleDelete(income)} style={btnDangerStyle} type="button" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                    {expandedHistory === income.id && income.salary_history.length > 0 && (
                      <tr key={`${income.id}-history`}>
                        <td colSpan={6} style={{ ...tableCellStyle, padding: '0 1rem 1rem' }}>
                          <SalaryHistoryPanel history={income.salary_history} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ ...tableCellStyle, fontWeight: 700 }}>
                    Total monthly income: {formatCurrency(totalMonthlyIncome)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Income source modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingIncome ? 'Edit Income Source' : 'Add Income Source'}>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={formGridStyle}>
            <label style={labelStyle}>
              Name
              <input
                required
                value={formState.name}
                onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                style={inputStyle}
                type="text"
              />
              {fieldErrors.name ? <span style={fieldErrorStyle}>{fieldErrors.name}</span> : null}
            </label>

            <label style={labelStyle}>
              Amount
              <input
                required
                min="0"
                step="0.01"
                value={formState.amount}
                onChange={(e) => setFormState((s) => ({ ...s, amount: e.target.value }))}
                style={inputStyle}
                type="number"
              />
              {fieldErrors.amount ? <span style={fieldErrorStyle}>{fieldErrors.amount}</span> : null}
            </label>

            <label style={labelStyle}>
              Cadence
              <select
                value={formState.cadence}
                onChange={(e) => setFormState((s) => ({ ...s, cadence: e.target.value }))}
                style={inputStyle}
              >
                {Object.entries(cadenceLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {fieldErrors.cadence ? <span style={fieldErrorStyle}>{fieldErrors.cadence}</span> : null}
            </label>

            <label style={checkboxLabelStyle}>
              <input
                checked={formState.is_active}
                onChange={(e) => setFormState((s) => ({ ...s, is_active: e.target.checked }))}
                type="checkbox"
              />
              Is Active
            </label>
            {fieldErrors.is_active ? <span style={fieldErrorStyle}>{fieldErrors.is_active}</span> : null}
          </div>

          {generalError ? <p style={{ ...errorTextStyle, marginTop: '1rem' }}>{generalError}</p> : null}

          <div style={formActionsStyle}>
            <button onClick={closeModal} style={secondaryButtonStyle} type="button">Cancel</button>
            <button disabled={isSubmitting} style={btnPrimaryStyle} type="submit">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Salary change modal */}
      <Modal isOpen={isSalaryModalOpen} onClose={closeSalaryModal} title={`Log Salary Change — ${salaryTargetIncome?.name ?? ''}`}>
        <p style={{ ...mutedTextStyle, marginBottom: '1rem' }}>
          Record a new salary amount. The new amount takes effect from the date you choose, and historical budget calculations will use the correct pay for each period.
        </p>
        <form onSubmit={(e) => void handleSalarySubmit(e)}>
          <div style={formGridStyle}>
            <label style={labelStyle}>
              New Amount ({cadenceLabels[salaryTargetIncome?.cadence ?? 'monthly'] ?? ''})
              <input
                required
                min="0"
                step="0.01"
                value={salaryForm.amount}
                onChange={(e) => setSalaryForm((s) => ({ ...s, amount: e.target.value }))}
                style={inputStyle}
                type="number"
              />
              {salaryFieldErrors.amount ? <span style={fieldErrorStyle}>{salaryFieldErrors.amount}</span> : null}
            </label>

            <label style={labelStyle}>
              Effective Date
              <input
                required
                value={salaryForm.effective_date}
                onChange={(e) => setSalaryForm((s) => ({ ...s, effective_date: e.target.value }))}
                style={inputStyle}
                type="date"
              />
              {salaryFieldErrors.effective_date ? <span style={fieldErrorStyle}>{salaryFieldErrors.effective_date}</span> : null}
            </label>

            <label style={labelStyle}>
              Note (optional)
              <input
                placeholder="e.g. Annual raise, promotion"
                value={salaryForm.note}
                onChange={(e) => setSalaryForm((s) => ({ ...s, note: e.target.value }))}
                style={inputStyle}
                type="text"
              />
              {salaryFieldErrors.note ? <span style={fieldErrorStyle}>{salaryFieldErrors.note}</span> : null}
            </label>
          </div>

          {salaryGeneralError ? <p style={{ ...errorTextStyle, marginTop: '1rem' }}>{salaryGeneralError}</p> : null}

          <div style={formActionsStyle}>
            <button onClick={closeSalaryModal} style={secondaryButtonStyle} type="button">Cancel</button>
            <button disabled={salarySubmitting} style={btnPrimaryStyle} type="submit">
              {salarySubmitting ? 'Saving...' : 'Log Change'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SalaryHistoryPanel({ history }: { history: IncomeSalaryChange[] }) {
  return (
    <div style={historyPanelStyle}>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Salary History</p>
      <table style={{ ...tableStyle, fontSize: '0.82rem' }}>
        <thead>
          <tr>
            <th style={tableHeaderCellStyle}>Effective Date</th>
            <th style={tableHeaderCellStyle}>Amount</th>
            <th style={tableHeaderCellStyle}>Note</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.id}>
              <td style={tableCellStyle}>{entry.effective_date}</td>
              <td style={tableCellStyle}>{formatCurrency(entry.amount)}</td>
              <td style={tableCellStyle}>{entry.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const tableWrapStyle: CSSProperties = { overflowX: 'auto' }

const formGridStyle: CSSProperties = { display: 'grid', gap: '1rem' }

const fieldErrorStyle: CSSProperties = {
  color: 'var(--error)',
  fontSize: '0.875rem',
  fontWeight: 400,
}

const secondaryButtonStyle: CSSProperties = {
  background: 'var(--btn-secondary-bg)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.65rem 1.25rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.95rem',
}

const historyPanelStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.75rem',
}
