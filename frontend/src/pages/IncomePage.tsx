import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { IncomeSource } from '../types'
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

const defaultFormState: IncomeFormState = {
  name: '',
  amount: '',
  cadence: 'monthly',
  is_active: true,
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null)
  const [formState, setFormState] = useState<IncomeFormState>(defaultFormState)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    if (!window.confirm(`Delete income source “${income.name}”?`)) {
      return
    }

    try {
      await client.delete(`/budget/income/${income.id}/`)
      await fetchIncomeSources()
    } catch {
      setError('Unable to delete that income source right now.')
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
        {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}> {error}</p> : null}
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
                  <tr key={income.id}>
                    <td style={tableCellStyle}>{income.name}</td>
                    <td style={tableCellStyle}>{cadenceLabels[income.cadence] ?? income.cadence}</td>
                    <td style={tableCellStyle}>{formatCurrency(income.amount)}</td>
                    <td style={tableCellStyle}>{formatCurrency(income.monthly_equivalent)}</td>
                    <td style={tableCellStyle}>{income.is_active ? 'Yes' : 'No'}</td>
                    <td style={tableCellStyle}>
                      <div style={actionsRowStyle}>
                        <button onClick={() => openEditModal(income)} style={btnGhostStyle} type="button">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(income)} style={btnDangerStyle} type="button">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingIncome ? 'Edit Income Source' : 'Add Income Source'}>
        <form onSubmit={handleSubmit}>
          <div style={formGridStyle}>
            <label style={labelStyle}>
              Name
              <input
                required
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
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
                onChange={(event) => setFormState((current) => ({ ...current, amount: event.target.value }))}
                style={inputStyle}
                type="number"
              />
              {fieldErrors.amount ? <span style={fieldErrorStyle}>{fieldErrors.amount}</span> : null}
            </label>

            <label style={labelStyle}>
              Cadence
              <select
                value={formState.cadence}
                onChange={(event) => setFormState((current) => ({ ...current, cadence: event.target.value }))}
                style={inputStyle}
              >
                {Object.entries(cadenceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {fieldErrors.cadence ? <span style={fieldErrorStyle}>{fieldErrors.cadence}</span> : null}
            </label>

            <label style={checkboxLabelStyle}>
              <input
                checked={formState.is_active}
                onChange={(event) => setFormState((current) => ({ ...current, is_active: event.target.checked }))}
                type="checkbox"
              />
              Is Active
            </label>
            {fieldErrors.is_active ? <span style={fieldErrorStyle}>{fieldErrors.is_active}</span> : null}
          </div>

          {generalError ? <p style={{ ...errorTextStyle, marginTop: '1rem' }}>{generalError}</p> : null}

          <div style={formActionsStyle}>
            <button onClick={closeModal} style={secondaryButtonStyle} type="button">
              Cancel
            </button>
            <button disabled={isSubmitting} style={btnPrimaryStyle} type="submit">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
}

const formGridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
}

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
