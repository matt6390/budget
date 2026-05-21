import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import client from '../api/client'
import Modal from '../components/Modal'
import type { Category, Purchase } from '../types'
import {
  actionsRowStyle,
  btnDangerStyle,
  btnGhostStyle,
  btnPrimaryStyle,
  cardStyle,
  emptyStateStyle,
  errorTextStyle,
  extractFieldErrors,
  formActionsStyle,
  formatCurrency,
  formatMonthLabel,
  getCurrentMonth,
  getTodayDate,
  inputStyle,
  labelStyle,
  monthNavButtonStyle,
  monthNavWrapStyle,
  mutedTextStyle,
  pageHeaderStyle,
  pageTitleStyle,
  shiftMonth,
  tableCellStyle,
  tableHeaderCellStyle,
  tableStyle,
} from '../ui'

type FieldErrors = Record<string, string>

type PurchaseFormState = {
  description: string
  amount: string
  date: string
  category: string
  notes: string
}

const defaultFormState = (): PurchaseFormState => ({
  description: '',
  amount: '',
  date: getTodayDate(),
  category: '',
  notes: '',
})

type NewCategoryState = { name: string; color: string }
const defaultNewCategory: NewCategoryState = { name: '', color: '#6366f1' }

export default function PurchasesPage() {
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth())
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [formState, setFormState] = useState<PurchaseFormState>(defaultFormState)
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
      const [purchasesResponse, categoriesResponse] = await Promise.all([
        client.get<Purchase[]>(`/budget/purchases/?month=${currentMonth}`),
        client.get<Category[]>('/budget/categories/'),
      ])
      setPurchases(purchasesResponse.data)
      setCategories(categoriesResponse.data)
    } catch {
      setError('Unable to load purchases right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [currentMonth])

  const groupedData = useMemo(() => {
    const totals = new Map<string, number>()

    purchases.forEach((purchase) => {
      const key = purchase.category_name ?? 'Uncategorized'
      totals.set(key, (totals.get(key) ?? 0) + parseFloat(purchase.amount))
    })

    return Array.from(totals.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((left, right) => right.total - left.total)
  }, [purchases])

  const totalThisMonth = useMemo(
    () => purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount), 0),
    [purchases],
  )

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPurchase(null)
    setFormState(defaultFormState())
    setFieldErrors({})
    setGeneralError('')
    setIsSubmitting(false)
    setShowNewCategory(false)
    setNewCategory(defaultNewCategory)
    setNewCategoryError('')
  }

  const openAddModal = () => {
    setEditingPurchase(null)
    setFormState(defaultFormState())
    setFieldErrors({})
    setGeneralError('')
    setIsModalOpen(true)
  }

  const openEditModal = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setFormState({
      description: purchase.description,
      amount: purchase.amount,
      date: purchase.date,
      category: purchase.category ? String(purchase.category) : '',
      notes: purchase.notes,
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
      description: formState.description,
      amount: formState.amount,
      date: formState.date,
      category: formState.category ? Number(formState.category) : null,
      notes: formState.notes,
    }

    try {
      if (editingPurchase) {
        await client.patch(`/budget/purchases/${editingPurchase.id}/`, payload)
      } else {
        await client.post('/budget/purchases/', payload)
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

  const handleDelete = async (purchase: Purchase) => {
    if (!window.confirm(`Delete purchase "${purchase.description}"?`)) {
      return
    }

    try {
      await client.delete(`/budget/purchases/${purchase.id}/`)
      await fetchData()
    } catch {
      setError('Unable to delete that purchase right now.')
    }
  }

  const isCurrentMonth = currentMonth === getCurrentMonth()

  return (
    <div>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Purchases</h1>
          <p style={mutedTextStyle}>Capture day-to-day spending for {formatMonthLabel(currentMonth)}.</p>
        </div>
        <button onClick={openAddModal} style={btnPrimaryStyle} type="button">
          Add Purchase
        </button>
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

      <section style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}>{error}</p> : null}
        {isLoading ? (
          <p style={emptyStateStyle}>Loading...</p>
        ) : purchases.length === 0 ? (
          <p style={emptyStateStyle}>No purchases this month.</p>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderCellStyle}>Date</th>
                  <th style={tableHeaderCellStyle}>Description</th>
                  <th style={tableHeaderCellStyle}>Category</th>
                  <th style={tableHeaderCellStyle}>Amount</th>
                  <th style={tableHeaderCellStyle}>Notes</th>
                  <th style={tableHeaderCellStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td style={tableCellStyle}>{purchase.date}</td>
                    <td style={tableCellStyle}>{purchase.description}</td>
                    <td style={tableCellStyle}>{purchase.category_name ?? 'Uncategorized'}</td>
                    <td style={tableCellStyle}>{formatCurrency(purchase.amount)}</td>
                    <td style={tableCellStyle}>{purchase.notes || '—'}</td>
                    <td style={tableCellStyle}>
                      <div style={actionsRowStyle}>
                        <button onClick={() => openEditModal(purchase)} style={btnGhostStyle} type="button">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(purchase)} style={btnDangerStyle} type="button">
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
                    Total this month: {formatCurrency(totalThisMonth)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Spending by Category</h2>
        {isLoading ? (
          <p style={emptyStateStyle}>Loading...</p>
        ) : groupedData.length === 0 ? (
          <p style={emptyStateStyle}>No purchases this month.</p>
        ) : (
          <div style={{ width: '100%', height: Math.max(120, groupedData.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedData} layout="vertical" margin={{ top: 8, right: 40, bottom: 8, left: 8 }}>
                <XAxis tickFormatter={(value) => `$${value}`} type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value: number | string) => formatCurrency(value)} />
                <Bar dataKey="total" fill="var(--primary)">
                  <LabelList dataKey="total" position="right" formatter={(value: number | string) => formatCurrency(value)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPurchase ? 'Edit Purchase' : 'Add Purchase'}>
        <form onSubmit={handleSubmit}>
          <div style={formGridStyle}>
            <label style={labelStyle}>
              Description
              <input
                required
                value={formState.description}
                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                style={inputStyle}
                type="text"
              />
              {fieldErrors.description ? <span style={fieldErrorStyle}>{fieldErrors.description}</span> : null}
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
              Date
              <input
                required
                value={formState.date}
                onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))}
                style={inputStyle}
                type="date"
              />
              {fieldErrors.date ? <span style={fieldErrorStyle}>{fieldErrors.date}</span> : null}
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
              Notes
              <textarea
                rows={4}
                value={formState.notes}
                onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
                style={textareaStyle}
              />
              {fieldErrors.notes ? <span style={fieldErrorStyle}>{fieldErrors.notes}</span> : null}
            </label>
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

const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'inherit',
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

