import { useEffect, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { Category } from '../types'
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
  inputStyle,
  labelStyle,
  mutedTextStyle,
  pageHeaderStyle,
  pageTitleStyle,
} from '../ui'

type FieldErrors = Record<string, string>

type CategoryFormState = {
  name: string
  color: string
}

const defaultFormState: CategoryFormState = {
  name: '',
  color: '#6366f1',
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formState, setFormState] = useState<CategoryFormState>(defaultFormState)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [generalError, setGeneralError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCategories = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await client.get<Category[]>('/budget/categories/')
      setCategories(response.data)
    } catch {
      setError('Unable to load categories right now.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchCategories()
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
    setFormState({ name: category.name, color: category.color })
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
      if (editingCategory) {
        await client.patch(`/budget/categories/${editingCategory.id}/`, formState)
      } else {
        await client.post('/budget/categories/', formState)
      }

      await fetchCategories()
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
      await fetchCategories()
    } catch {
      setError('Unable to delete that category right now.')
    }
  }

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
        <section style={gridStyle}>
          {categories.map((category) => (
            <article key={category.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ ...dotStyle, background: category.color }} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{category.name}</h2>
                    <p style={{ color: COLORS.muted, margin: '0.35rem 0 0' }}>{category.color}</p>
                  </div>
                </div>
                <div style={actionsRowStyle}>
                  <button onClick={() => openEditModal(category)} style={btnGhostStyle} type="button">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(category)} style={btnDangerStyle} type="button">
                    🗑️
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
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
