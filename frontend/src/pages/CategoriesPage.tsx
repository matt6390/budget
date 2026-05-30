import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { BudgetSummary, Category, CategoryTheme } from '../types'
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

type ThemeFormState = {
  name: string
  monthly_budget: string
}

const defaultCategoryForm: CategoryFormState = {
  name: '',
  theme: '',
  color: '#6366f1',
  monthly_budget: '',
}

const defaultThemeForm: ThemeFormState = {
  name: '',
  monthly_budget: '',
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [themes, setThemes] = useState<CategoryTheme[]>([])
  const [spendingMap, setSpendingMap] = useState<Record<number, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Category modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState<CategoryFormState>(defaultCategoryForm)
  const [catFieldErrors, setCatFieldErrors] = useState<FieldErrors>({})
  const [catGeneralError, setCatGeneralError] = useState('')
  const [catSubmitting, setCatSubmitting] = useState(false)

  // Theme modal
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [editingTheme, setEditingTheme] = useState<CategoryTheme | null>(null)
  const [themeForm, setThemeForm] = useState<ThemeFormState>(defaultThemeForm)
  const [themeFieldErrors, setThemeFieldErrors] = useState<FieldErrors>({})
  const [themeGeneralError, setThemeGeneralError] = useState('')
  const [themeSubmitting, setThemeSubmitting] = useState(false)

  const currentMonth = getCurrentMonth()

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [catRes, themeRes, summaryRes] = await Promise.all([
        client.get<Category[]>('/budget/categories/'),
        client.get<CategoryTheme[]>('/budget/themes/'),
        client.get<BudgetSummary>(`/budget/summary/?month=${currentMonth}`),
      ])
      setCategories(catRes.data)
      setThemes(themeRes.data)
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

  // ── Category modal helpers ──────────────────────────────────────────────────
  const closeCatModal = () => {
    setIsCatModalOpen(false)
    setEditingCategory(null)
    setCatForm(defaultCategoryForm)
    setCatFieldErrors({})
    setCatGeneralError('')
    setCatSubmitting(false)
  }

  const openAddCatModal = () => {
    setEditingCategory(null)
    setCatForm(defaultCategoryForm)
    setCatFieldErrors({})
    setCatGeneralError('')
    setIsCatModalOpen(true)
  }

  const openEditCatModal = (category: Category) => {
    setEditingCategory(category)
    setCatForm({
      name: category.name,
      theme: category.theme ?? '',
      color: category.color,
      monthly_budget: category.monthly_budget ?? '',
    })
    setCatFieldErrors({})
    setCatGeneralError('')
    setIsCatModalOpen(true)
  }

  const handleCatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCatSubmitting(true)
    setCatFieldErrors({})
    setCatGeneralError('')
    try {
      const payload = {
        name: catForm.name,
        theme: catForm.theme.trim() !== '' ? catForm.theme.trim() : null,
        color: catForm.color,
        monthly_budget: catForm.monthly_budget !== '' ? catForm.monthly_budget : null,
      }
      if (editingCategory) {
        await client.patch(`/budget/categories/${editingCategory.id}/`, payload)
      } else {
        await client.post('/budget/categories/', payload)
      }
      await fetchData()
      closeCatModal()
    } catch (err) {
      const { fieldErrors: nextErrors, generalError: nextError } = extractFieldErrors(err)
      setCatFieldErrors(nextErrors)
      setCatGeneralError(nextError)
    } finally {
      setCatSubmitting(false)
    }
  }

  const handleDeleteCat = async (category: Category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return
    try {
      await client.delete(`/budget/categories/${category.id}/`)
      await fetchData()
    } catch {
      setError('Unable to delete that category right now.')
    }
  }

  // ── Theme modal helpers ─────────────────────────────────────────────────────
  const closeThemeModal = () => {
    setIsThemeModalOpen(false)
    setEditingTheme(null)
    setThemeForm(defaultThemeForm)
    setThemeFieldErrors({})
    setThemeGeneralError('')
    setThemeSubmitting(false)
  }

  const openAddThemeModal = () => {
    setEditingTheme(null)
    setThemeForm(defaultThemeForm)
    setThemeFieldErrors({})
    setThemeGeneralError('')
    setIsThemeModalOpen(true)
  }

  const openEditThemeModal = (theme: CategoryTheme) => {
    setEditingTheme(theme)
    setThemeForm({ name: theme.name, monthly_budget: theme.monthly_budget ?? '' })
    setThemeFieldErrors({})
    setThemeGeneralError('')
    setIsThemeModalOpen(true)
  }

  const handleThemeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setThemeSubmitting(true)
    setThemeFieldErrors({})
    setThemeGeneralError('')
    try {
      const payload = {
        name: themeForm.name.trim(),
        monthly_budget: themeForm.monthly_budget !== '' ? themeForm.monthly_budget : null,
      }
      if (editingTheme) {
        await client.patch(`/budget/themes/${editingTheme.id}/`, payload)
      } else {
        await client.post('/budget/themes/', payload)
      }
      await fetchData()
      closeThemeModal()
    } catch (err) {
      const { fieldErrors: nextErrors, generalError: nextError } = extractFieldErrors(err)
      setThemeFieldErrors(nextErrors)
      setThemeGeneralError(nextError)
    } finally {
      setThemeSubmitting(false)
    }
  }

  const handleDeleteTheme = async (theme: CategoryTheme) => {
    if (!window.confirm(`Delete theme "${theme.name}"? Categories in this theme will become ungrouped.`)) return
    try {
      await client.delete(`/budget/themes/${theme.id}/`)
      await fetchData()
    } catch {
      setError('Unable to delete that theme right now.')
    }
  }

  // ── Build grouped view ──────────────────────────────────────────────────────
  const themeMap = Object.fromEntries(themes.map((t) => [t.name, t]))

  const groupedCategories = categories.reduce<Record<string, Category[]>>((groups, category) => {
    const key = category.theme?.trim() ? category.theme.trim() : 'Ungrouped'
    if (!groups[key]) groups[key] = []
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
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={openAddThemeModal} style={btnGhostStyle} type="button">
            + Add Theme
          </button>
          <button onClick={openAddCatModal} style={btnPrimaryStyle} type="button">
            Add Category
          </button>
        </div>
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
          {themeNames.map((themeName) => {
            const themeRecord = themeName !== 'Ungrouped' ? themeMap[themeName] : null
            const themeBudget = themeRecord?.monthly_budget ? parseFloat(themeRecord.monthly_budget) : null
            const themeActiveAmount = themeRecord ? parseFloat(themeRecord.active_amount) : null

            return (
              <section key={themeName}>
                <div style={themeHeaderStyle}>
                  <div>
                    <h2 style={themeHeadingStyle}>{themeName}</h2>
                    {themeRecord && (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: COLORS.muted }}>
                        {themeBudget !== null
                          ? <>Theme budget: <strong>{formatCurrency(themeBudget)}</strong> &nbsp;·&nbsp; Active: <strong>{formatCurrency(themeActiveAmount ?? 0)}</strong></>
                          : <>Active: <strong>{formatCurrency(themeActiveAmount ?? 0)}</strong> — no theme budget set</>
                        }
                      </p>
                    )}
                  </div>
                  {themeRecord ? (
                    <div style={actionsRowStyle}>
                      <button onClick={() => openEditThemeModal(themeRecord)} style={btnGhostStyle} type="button" title="Edit theme">✏️</button>
                      <button onClick={() => void handleDeleteTheme(themeRecord)} style={btnDangerStyle} type="button" title="Delete theme">🗑️</button>
                    </div>
                  ) : null}
                </div>

                {themeBudget !== null && themeActiveAmount !== null && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: COLORS.muted, marginBottom: '0.3rem' }}>
                      <span>Category budgets allocated</span>
                      <span>{Math.round(Math.min((themeActiveAmount / themeBudget) * 100, 100))}% of {formatCurrency(themeBudget)}</span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((themeActiveAmount / themeBudget) * 100, 100)}%`,
                        background: themeActiveAmount > themeBudget ? 'var(--error)' : 'var(--primary)',
                        borderRadius: '999px',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                )}

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
                            <button onClick={() => openEditCatModal(category)} style={btnGhostStyle} type="button">✏️</button>
                            <button onClick={() => void handleDeleteCat(category)} style={btnDangerStyle} type="button">🗑️</button>
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
            )
          })}
        </div>
      )}

      {/* Category modal */}
      <Modal isOpen={isCatModalOpen} onClose={closeCatModal} title={editingCategory ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={(e) => void handleCatSubmit(e)}>
          <div style={formGridStyle}>
            <label style={labelStyle}>
              Name
              <input
                required
                value={catForm.name}
                onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))}
                style={inputStyle}
                type="text"
              />
              {catFieldErrors.name ? <span style={fieldErrorStyle}>{catFieldErrors.name}</span> : null}
            </label>

            <label style={labelStyle}>
              Theme (optional)
              <input
                list="theme-options"
                placeholder="e.g. Food, Housing, Transportation"
                value={catForm.theme}
                onChange={(e) => setCatForm((s) => ({ ...s, theme: e.target.value }))}
                style={inputStyle}
                type="text"
              />
              <datalist id="theme-options">
                {themes.map((t) => <option key={t.id} value={t.name} />)}
              </datalist>
              {catFieldErrors.theme ? <span style={fieldErrorStyle}>{catFieldErrors.theme}</span> : null}
            </label>

            <label style={labelStyle}>
              Color
              <div style={colorRowStyle}>
                <input
                  value={catForm.color}
                  onChange={(e) => setCatForm((s) => ({ ...s, color: e.target.value }))}
                  style={colorInputStyle}
                  type="color"
                />
                <input
                  value={catForm.color}
                  onChange={(e) => setCatForm((s) => ({ ...s, color: e.target.value }))}
                  style={inputStyle}
                  type="text"
                />
              </div>
              {catFieldErrors.color ? <span style={fieldErrorStyle}>{catFieldErrors.color}</span> : null}
            </label>

            <label style={labelStyle}>
              Monthly Budget (optional)
              <input
                placeholder="e.g. 500.00"
                value={catForm.monthly_budget}
                onChange={(e) => setCatForm((s) => ({ ...s, monthly_budget: e.target.value }))}
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
              />
              {catFieldErrors.monthly_budget ? <span style={fieldErrorStyle}>{catFieldErrors.monthly_budget}</span> : null}
            </label>
          </div>

          {catGeneralError ? <p style={{ ...errorTextStyle, marginTop: '1rem' }}>{catGeneralError}</p> : null}

          <div style={formActionsStyle}>
            <button onClick={closeCatModal} style={secondaryButtonStyle} type="button">Cancel</button>
            <button disabled={catSubmitting} style={btnPrimaryStyle} type="submit">
              {catSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Theme modal */}
      <Modal isOpen={isThemeModalOpen} onClose={closeThemeModal} title={editingTheme ? 'Edit Theme' : 'Add Theme'}>
        <form onSubmit={(e) => void handleThemeSubmit(e)}>
          <div style={formGridStyle}>
            <label style={labelStyle}>
              Theme Name
              <input
                required
                value={themeForm.name}
                onChange={(e) => setThemeForm((s) => ({ ...s, name: e.target.value }))}
                style={inputStyle}
                type="text"
                placeholder="e.g. Housing, Food, Transportation"
              />
              {themeFieldErrors.name ? <span style={fieldErrorStyle}>{themeFieldErrors.name}</span> : null}
            </label>

            <label style={labelStyle}>
              Monthly Budget (optional)
              <input
                placeholder="e.g. 2000.00"
                value={themeForm.monthly_budget}
                onChange={(e) => setThemeForm((s) => ({ ...s, monthly_budget: e.target.value }))}
                style={inputStyle}
                type="number"
                min="0"
                step="0.01"
              />
              <span style={mutedTextStyle}>The active amount is automatically computed as the sum of all category budgets in this theme.</span>
              {themeFieldErrors.monthly_budget ? <span style={fieldErrorStyle}>{themeFieldErrors.monthly_budget}</span> : null}
            </label>
          </div>

          {themeGeneralError ? <p style={{ ...errorTextStyle, marginTop: '1rem' }}>{themeGeneralError}</p> : null}

          <div style={formActionsStyle}>
            <button onClick={closeThemeModal} style={secondaryButtonStyle} type="button">Cancel</button>
            <button disabled={themeSubmitting} style={btnPrimaryStyle} type="submit">
              {themeSubmitting ? 'Saving...' : 'Save'}
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
  gap: '1.5rem',
}

const themeHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '0.5rem',
}

const themeHeadingStyle: CSSProperties = {
  margin: '0 0 0.2rem',
  color: 'var(--text)',
  fontSize: '1rem',
  fontWeight: 700,
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
