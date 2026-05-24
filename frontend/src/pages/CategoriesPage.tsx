import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { BudgetSummary, Category } from '../types'
import {
  COLORS,
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
  getCurrentMonth,
  inputStyle,
  labelStyle,
  mutedTextStyle,
  pageHeaderStyle,
  pageTitleStyle,
} from '../ui'

type FieldErrors = Record<string, string>

type CategoryFormState = {
  name: string
  theme: string
  color: string
  monthly_budget: string
}

const defaultFormState: CategoryFormState = {
  name: '',
  theme: '',
  color: '#6366f1',
  monthly_budget: '',
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [spendingMap, setSpendingMap] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formState, setFormState] = useState<CategoryFormState>(defaultFormState)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentMonth = getCurrentMonth()

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [catRes, summaryRes] = await Promise.all([
        client.get<Category[]>('/budget/categories/'),
        client.get<BudgetSummary>(`/budget/summary/?month=${currentMonth}`),
      ])
      setCategories(catRes.data)
      // Build a map of category_id → total spent this month
      const map: Record<number, number> = {}
      for (const entry of summaryRes.data.spending_by_category) {
        if (entry.category_id !== null) {
          map[entry.category_id] = parseFloat(entry.total)
        }
      }
      setSpendingMap(map)
    } catch {
      setError('Unable to load categories right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormState(defaultFormState)
    setFieldErrors({})
    setGeneralError('')
    setIsSubmitting(false)
  }

  const openAddModal = () => {
    setEditingCategory(null)
    setFormState(defaultFormState)
    setFieldErrors({})
    setGeneralError('')
    setIsModalOpen(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setFormState({
      name: category.name,
      theme: category.theme ?? '',
      color: category.color,
      monthly_budget: category.monthly_budget ?? '',
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
      const payload = {
        name: formState.name,
        theme: formState.theme.trim() !== '' ? formState.theme.trim() : null,
        color: formState.color,
        monthly_budget: formState.monthly_budget !== '' ? formState.monthly_budget : null,
      }
      if (editingCategory) {
        await client.patch(`/budget/categories/${editingCategory.id}/`, payload)
      } else {
        await client.post('/budget/categories/', payload)
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

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Delete category “${category.name}”?`)) {
      return
    }

    try {
      await client.delete(`/budget/categories/${category.id}/`)
      await fetchData()
    } catch {
      setError('Unable to delete that category right now.')
    }
  }

  const groupedCategories = categories.reduce<Record<string, Category[]>>((groups, category) => {
    const key = category.theme?.trim() ? category.theme.trim() : 'Ungrouped'
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(category)
    return groups
  }, {})
  const themeNames = Object.keys(groupedCategories).sort((a, b) => {
    if (a === 'Ungrouped') return 1
    if (b === 'Ungrouped') return -1
    return a.localeCompare(b)
  })

  return (
    <div>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Categories</h1>
          <p style={{ color: COLORS.muted, margin: 0 }}>Organize purchases and expenses with reusable labels.</p>
        </div>
        <button onClick={openAddModal} style={btnPrimaryStyle} type="button">
          Add Category
        </button>
      </div>

      {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}>{error}</p> : null}
      {isLoading ? (
        <section style={cardStyle}>
          <p style={emptyStateStyle}>Loading...</p>
        </section>
      ) : categories.length === 0 ? (
        <section style={cardStyle}>
          <p style={emptyStateStyle}>No categories created yet.</p>
        </section>
      ) : (
        <div style={themeSectionListStyle}>
          {themeNames.map((themeName) => (
            <section key={themeName}>
              <h2 style={themeHeadingStyle}>{themeName}</h2>
              <div style={gridStyle}>
                {groupedCategories[themeName].map((category) => {
                  const budget = category.monthly_budget ? parseFloat(category.monthly_budget) : null
                  const spent = spendingMap[category.id] ?? 0
                  const pct = budget && budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                  const overBudget = budget !== null && spent > budget
                  const nearBudget = budget !== null && !overBudget && pct >= 75
                  const barColor = overBudget ? 'var(--error)' : nearBudget ? '#f59e0b' : 'var(--primary)'
                  return (
                    <article key={category.id} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span style={{ ...dotStyle, background: category.color }} />
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{category.name}</h3>
                            {budget ? (
                              <p style={{ color: COLORS.muted, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                                Budget: {formatCurrency(budget)}
                                {overBudget && <span style={{ color: 'var(--error)', marginLeft: '0.4rem', fontWeight: 600 }}>⚠️ Over budget</span>}
                              </p>
                            ) : (
                              <p style={{ color: COLORS.muted, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>No budget set</p>
                            )}
                          </div>
                        </div>
                        <div style={actionsRowStyle}>
                          <button onClick={() => openEditModal(category)} style={btnGhostStyle} type="button">✏️</button>
                          <button onClick={() => handleDelete(category)} style={btnDangerStyle} type="button">🗑️</button>
                        </div>
                      </div>
                      {budget ? (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: COLORS.muted, marginBottom: '0.3rem' }}>
                            <span>{formatCurrency(spent)} spent</span>
                            <span>{Math.round(pct)}% of {formatCurrency(budget)}</span>
                          </div>
                          <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '999px', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Edit Category' : 'Add Category'}>
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
              Theme (optional)
              <input
                placeholder="e.g. Food, Housing, Transportation"
                value={formState.theme}
                onChange={(event) => setFormState((current) => ({ ...current, theme: event.target.value }))}
                style={inputStyle}
                type="text"
              />
              {fieldErrors.theme ? <span style={fieldErrorStyle}>{fieldErrors.theme}</span> : null}
            </label>

            <label style={labelStyle}>
              Color
              <div style={colorRowStyle}>
                <input
                  value={formState.color}
                  onChange={(event) => setFormState((current) => ({ ...current, color: event.target.value }))}
                  style={colorInputStyle}
                  type="color"
                />
                <input
                  value={formState.color}
                  onChange={(event) => setFormState((current) => ({ ...current, color: event.target.value }))}
                  style={inputStyle}
                  type="text"
                />
              </div>
              {fieldErrors.color ? <span style={fieldErrorStyle}>{fieldErrors.color}</span> : null}
            </label>

            <label style={labelStyle}>
              Monthly Budget (optional)
              <input
                placeholder="e.g. 500.00"
                value={formState.monthly_budget}
                onChange={(event) => setFormState((current) => ({ ...current, monthly_budget: event.target.value }))}
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
              />
              {fieldErrors.monthly_budget ? <span style={fieldErrorStyle}>{fieldErrors.monthly_budget}</span> : null}
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

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1rem',
}

const themeSectionListStyle: CSSProperties = {
  display: 'grid',
  gap: '1.25rem',
}

const themeHeadingStyle: CSSProperties = {
  margin: '0 0 0.75rem',
  color: 'var(--text)',
  fontSize: '1rem',
}

const dotStyle: CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '999px',
  display: 'inline-block',
  flexShrink: 0,
}

const formGridStyle: CSSProperties = {
  display: 'grid',
  gap: '1rem',
}

const colorRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '72px 1fr',
  gap: '0.75rem',
  alignItems: 'center',
}

const colorInputStyle: CSSProperties = {
  width: '72px',
  height: '44px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.25rem',
  background: 'var(--input-bg)',
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
