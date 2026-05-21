import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { Category, RecurringExpense } from '../types'
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

type ExpenseFormState = {
  name: string
  amount: string
  category: string
  due_day: string
  is_active: boolean
}

const defaultFormState: ExpenseFormState = {
  name: '',
  amount: '',
  category: '',
  due_day: '',
  is_active: true,
}

type NewCategoryState = { name: string; color: string }
const defaultNewCategory: NewCategoryState = { name: '', color: '#6366f1' }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [formState, setFormState] = useState<ExpenseFormState>(defaultFormState)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState<NewCategoryState>(defaultNewCategory)
  const [newCategoryError, setNewCategoryError] = useState('')
  const [isSavingCategory, setIsSavingCategory] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const [expensesResponse, categoriesResponse] = await Promise.all([
        client.get<RecurringExpense[]>('/budget/expenses/'),
        client.get<Category[]>('/budget/categories/'),
      ])
      setExpenses(expensesResponse.data)
      setCategories(categoriesResponse.data)
    } catch {
      setError('Unable to load recurring expenses right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const totalMonthlyExpenses = useMemo(
    () => expenses.filter((expense) => expense.is_active).reduce((sum, expense) => sum + parseFloat(expense.amount), 0),
    [expenses],
  )

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExpense(null)
    setFormState(defaultFormState)
    setFieldErrors({})
    setGeneralError('')
    setIsSubmitting(false)
    setShowNewCategory(false)
    setNewCategory(defaultNewCategory)
    setNewCategoryError('')
  }

  const openAddModal = () => {
    setEditingExpense(null)
    setFormState(defaultFormState)
    setFieldErrors({})
    setGeneralError('')
    setIsModalOpen(true)
  }

  const openEditModal = (expense: RecurringExpense) => {
    setEditingExpense(expense)
    setFormState({
      name: expense.name,
      amount: expense.amount,
      category: expense.category ? String(expense.category) : '',
      due_day: expense.due_day ? String(expense.due_day) : '',
      is_active: expense.is_active,
    })
    setFieldErrors({})
    setGeneralError('')
    setIsModalOpen(true)
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      setNewCategoryError('Name is required.')
      return
    }
    setIsSavingCategory(true)
    setNewCategoryError('')
    try {
      const response = await client.post<Category>('/budget/categories/', newCategory)
      const created = response.data
      setCategories((prev) => [...prev, created])
      setFormState((current) => ({ ...current, category: String(created.id) }))
      setShowNewCategory(false)
      setNewCategory(defaultNewCategory)
    } catch {
      setNewCategoryError('Could not create category. Try again.')
    } finally {
      setIsSavingCategory(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFieldErrors({})
    setGeneralError('')

    const payload = {
      name: formState.name,
      amount: formState.amount,
      category: formState.category ? Number(formState.category) : null,
      due_day: formState.due_day ? Number(formState.due_day) : null,
      is_active: formState.is_active,
    }

    try {
      if (editingExpense) {
        await client.patch(`/budget/expenses/${editingExpense.id}/`, payload)
      } else {
        await client.post('/budget/expenses/', payload)
      }

      await fetchData()
      closeModal()
    } catch (err) {
      const { fieldErrors: nextErrors, generalError: nextError } = extractFieldErrors(err)
      setFieldErrors(nextErrors)
      setGeneralError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (expense: RecurringExpense) => {
    if (!window.confirm(`Delete recurring expense "${expense.name}"?`)) {
      return
    }

    try {
      await client.delete(`/budget/expenses/${expense.id}/`)
      await fetchData()
    } catch {
      setError('Unable to delete that expense right now.')
    }
  }

  return (
    <div>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Recurring Expenses</h1>
          <p style={mutedTextStyle}>Track monthly bills and expected fixed costs.</p>
        </div>
        <button onClick={openAddModal} style={btnPrimaryStyle} type="button">
          Add Expense
        </button>
      </div>

      <section style={cardStyle}>
        {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}>{error}</p> : null}
        {isLoading ? (
          <p style={emptyStateStyle}>Loading...</p>
        ) : expenses.length === 0 ? (
          <p style={emptyStateStyle}>No recurring expenses set up yet.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderCellStyle}>Name</th>
                  <th style={tableHeaderCellStyle}>Category</th>
                  <th style={tableHeaderCellStyle}>Amount</th>
                  <th style={tableHeaderCellStyle}>Due Day</th>
                  <th style={tableHeaderCellStyle}>Active</th>
                  <th style={tableHeaderCellStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td style={tableCellStyle}>{expense.name}</td>
                    <td style={tableCellStyle}>{expense.category_name ?? 'No category'}</td>
                    <td style={tableCellStyle}>{formatCurrency(expense.amount)}</td>
                    <td style={tableCellStyle}>{expense.due_day ?? '—'}</td>
                    <td style={tableCellStyle}>{expense.is_active ? 'Yes' : 'No'}</td>
                    <td style={tableCellStyle}>
                      <div style={actionsRowStyle}>
                        <button onClick={() => openEditModal(expense)} style={btnGhostStyle} type="button">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(expense)} style={btnDangerStyle} type="button">
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
                    Total monthly expenses: {formatCurrency(totalMonthlyExpenses)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingExpense ? 'Edit Expense' : 'Add Expense'}>
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

            <div>
              <div style={categoryRowStyle}>
                <label style={{ ...labelStyle, flex: 1 }}>
                  Category
                  <select
                    value={formState.category}
                    onChange={(event) => setFormState((current) => ({ ...current, category: event.target.value }))}
                    style={inputStyle}
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCategory((v) => !v)}
                  style={addCategoryBtnStyle}
                  title="Create new category"
                >
                  {showNewCategory ? '✕' : '＋'}
                </button>
              </div>
              {fieldErrors.category ? <span style={fieldErrorStyle}>{fieldErrors.category}</span> : null}

              {showNewCategory && (
                <div style={inlineCategoryStyle}>
                  <p style={inlineCategoryTitleStyle}>New category</p>
                  <div style={inlineCategoryFieldsStyle}>
                    <input
                      placeholder="Name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory((c) => ({ ...c, name: e.target.value }))}
                      style={inputStyle}
                      type="text"
                    />
                    <input
                      value={newCategory.color}
                      onChange={(e) => setNewCategory((c) => ({ ...c, color: e.target.value }))}
                      style={colorSwatchInputStyle}
                      type="color"
                      title="Pick color"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={isSavingCategory}
                      style={saveNewCategoryBtnStyle}
                    >
                      {isSavingCategory ? '...' : 'Add'}
                    </button>
                  </div>
                  {newCategoryError ? <span style={fieldErrorStyle}>{newCategoryError}</span> : null}
                </div>
              )}
            </div>

            <label style={labelStyle}>
              Due Day
              <input
                max="31"
                min="1"
                placeholder="e.g. 15"
                value={formState.due_day}
                onChange={(event) => setFormState((current) => ({ ...current, due_day: event.target.value }))}
                style={inputStyle}
                type="number"
              />
              {fieldErrors.due_day ? <span style={fieldErrorStyle}>{fieldErrors.due_day}</span> : null}
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

const categoryRowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'flex-end',
}

const addCategoryBtnStyle: CSSProperties = {
  background: 'var(--primary)',
  color: 'var(--invert)',
  border: 'none',
  borderRadius: '8px',
  width: '38px',
  height: '38px',
  fontSize: '1.1rem',
  cursor: 'pointer',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const inlineCategoryStyle: CSSProperties = {
  marginTop: '0.5rem',
  padding: '0.75rem',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'var(--bg)',
}

const inlineCategoryTitleStyle: CSSProperties = {
  margin: '0 0 0.5rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--muted)',
}

const inlineCategoryFieldsStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
}

const colorSwatchInputStyle: CSSProperties = {
  width: '44px',
  height: '38px',
  border: '1px solid var(--border-input)',
  borderRadius: '6px',
  padding: '0.1rem',
  background: 'var(--input-bg)',
  cursor: 'pointer',
  flexShrink: 0,
}

const saveNewCategoryBtnStyle: CSSProperties = {
  background: 'var(--primary)',
  color: 'var(--invert)',
  border: 'none',
  borderRadius: '8px',
  padding: '0 1rem',
  height: '38px',
  fontWeight: 700,
  cursor: 'pointer',
  flexShrink: 0,
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

