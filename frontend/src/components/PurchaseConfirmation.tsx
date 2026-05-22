import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { PdfImportSession, suggestCategoryBatch, ConfirmPurchaseData } from '../api/pdfImport'
import { Category } from '../types'
import client from '../api/client'
import {
  cardStyle,
  inputStyle,
  btnPrimaryStyle,
  btnDangerStyle,
  btnGhostStyle,
  secondaryButtonStyle,
  tableStyle,
  tableHeaderCellStyle,
  tableCellStyle,
  labelStyle,
  fieldStyle,
} from '../ui'

interface PurchaseConfirmationProps {
  session: PdfImportSession
  onConfirm: (purchases: ConfirmPurchaseData[]) => Promise<void>
  onCancel: () => void
  onDelete: () => void
}

export const PurchaseConfirmation: React.FC<PurchaseConfirmationProps> = ({
  session,
  onConfirm,
  onCancel,
  onDelete,
}) => {
  const [purchases, setPurchases] = useState<ConfirmPurchaseData[]>(
    session.extracted_data.map(p => ({ ...p }))
  )
  const [categories, setCategories] = useState<Category[]>([])
  const [autoSuggested, setAutoSuggested] = useState<Set<number>>(new Set())
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New category panel
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [newCatError, setNewCatError] = useState('')
  const [creatingCat, setCreatingCat] = useState(false)

  // Load categories + category suggestions
  useEffect(() => {
    client.get<Category[]>('/budget/categories/').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (purchases.length === 0) { setSuggestionsLoading(false); return }
    const loadSuggestions = async () => {
      try {
        const merchantNames = [...new Set(purchases.map(p => p.merchant).filter(Boolean))]
        const suggestions = await suggestCategoryBatch(merchantNames)
        const updated = purchases.map(p => ({ ...p }))
        const suggested = new Set<number>()
        for (let i = 0; i < updated.length; i++) {
          const hit = suggestions[updated[i].merchant]
          if (hit?.category_id) {
            updated[i] = { ...updated[i], category: hit.category_id }
            suggested.add(i)
          }
        }
        setPurchases(updated)
        setAutoSuggested(suggested)
      } catch { /* silently skip */ }
      finally { setSuggestionsLoading(false) }
    }
    void loadSuggestions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFieldChange = (index: number, field: keyof ConfirmPurchaseData, value: string | number | undefined) => {
    const updated = [...purchases]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'category') {
      setAutoSuggested(prev => { const next = new Set(prev); next.delete(index); return next })
    }
    setPurchases(updated)
  }

  const handleRemove = (index: number) => {
    setPurchases(prev => prev.filter((_, i) => i !== index))
    setAutoSuggested(prev => {
      const next = new Set<number>()
      prev.forEach(i => { if (i < index) next.add(i); else if (i > index) next.add(i - 1) })
      return next
    })
  }

  const handleConfirm = async () => {
    if (purchases.length === 0) return
    setLoading(true); setError(null)
    try {
      await onConfirm(purchases)
    } catch (err: unknown) {
      let msg = 'Failed to save purchases'
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        msg = err.response.data.error
      } else if (err instanceof Error) {
        msg = err.message
      }
      setError(msg)
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) { setNewCatError('Name is required.'); return }
    setCreatingCat(true); setNewCatError('')
    try {
      const response = await client.post<Category>('/budget/categories/', { name: newCatName.trim(), color: newCatColor })
      setCategories(prev => [...prev, response.data])
      setNewCatName('')
      setNewCatColor('#6366f1')
      setShowNewCat(false)
    } catch {
      setNewCatError('Could not create category. Try again.')
    } finally {
      setCreatingCat(false)
    }
  }

  if (session.extracted_data.length === 0) {
    return (
      <div style={{ ...cardStyle, textAlign: 'center', maxWidth: 480, margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔍</div>
        <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text)' }}>No purchases found</h2>
        <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          The system couldn't extract any purchases from the selected page(s).
        </p>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
          Try selecting a different page, or verify the PDF contains text (not a scanned image).
        </p>
        <button onClick={onCancel} style={btnPrimaryStyle}>Try Again</button>
      </div>
    )
  }

  const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.amount as string || '0'), 0)
  const categorizedCount = purchases.filter(p => p.category).length

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerRowStyle}>
        <div>
          <h3 style={{ margin: '0 0 0.25rem', color: 'var(--text)', fontSize: '1.15rem', fontWeight: 700 }}>
            Review Extracted Purchases
          </h3>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>
            <strong style={{ color: 'var(--text)' }}>{purchases.length}</strong> item{purchases.length !== 1 ? 's' : ''}
            {' · '}
            <strong style={{ color: 'var(--text)' }}>${totalAmount.toFixed(2)}</strong> total
            {' · '}
            <span style={{ color: categorizedCount === purchases.length ? 'var(--success)' : 'var(--muted)' }}>
              {categorizedCount}/{purchases.length} categorized
            </span>
            {suggestionsLoading && (
              <span style={{ color: 'var(--primary)', marginLeft: '0.5rem' }}>• Loading suggestions…</span>
            )}
          </p>
        </div>
        <button
          onClick={() => { setShowNewCat(v => !v); setNewCatError('') }}
          style={btnGhostStyle}
          disabled={loading}
        >
          {showNewCat ? '✕ Cancel' : '+ New Category'}
        </button>
      </div>

      {/* New category panel */}
      {showNewCat && (
        <div style={newCatPanelStyle}>
          <h4 style={{ margin: '0 0 0.75rem', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 700 }}>
            Create New Category
          </h4>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ ...fieldStyle, flex: 1, minWidth: 160, marginBottom: 0 }}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }}
                placeholder="e.g. Dining, Gas, Groceries"
                style={inputStyle}
                disabled={creatingCat}
                autoFocus
              />
            </div>
            <div style={{ ...fieldStyle, marginBottom: 0 }}>
              <label style={labelStyle}>Color</label>
              <input
                type="color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                disabled={creatingCat}
                style={{ width: 44, height: 38, border: '1px solid var(--border-input)', borderRadius: 8, cursor: 'pointer', padding: 3 }}
              />
            </div>
            <button
              onClick={handleCreateCategory}
              disabled={creatingCat || !newCatName.trim()}
              style={{ ...btnPrimaryStyle, whiteSpace: 'nowrap' }}
            >
              {creatingCat ? 'Creating…' : 'Create Category'}
            </button>
          </div>
          {newCatError && (
            <p style={{ margin: '0.5rem 0 0', color: 'var(--error)', fontSize: '0.85rem' }}>{newCatError}</p>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={errorBannerStyle}>
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={dismissBtnStyle}>×</button>
        </div>
      )}

      {/* Scrollable table */}
      {purchases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
          All items removed.
        </div>
      ) : (
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...tableHeaderCellStyle, width: 140 }}>Date</th>
                <th style={tableHeaderCellStyle}>Merchant</th>
                <th style={{ ...tableHeaderCellStyle, textAlign: 'right', width: 110 }}>Amount</th>
                <th style={{ ...tableHeaderCellStyle, width: 200 }}>Category</th>
                <th style={{ ...tableHeaderCellStyle, width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                  <td style={tableCellStyle}>
                    <input
                      type="date"
                      value={purchase.date}
                      onChange={e => handleFieldChange(idx, 'date', e.target.value)}
                      disabled={loading}
                      style={{ ...inputStyle, fontSize: '0.8rem', padding: '0.35rem 0.5rem', width: 130 }}
                    />
                  </td>
                  <td style={tableCellStyle}>
                    <input
                      type="text"
                      value={purchase.merchant}
                      onChange={e => handleFieldChange(idx, 'merchant', e.target.value)}
                      disabled={loading}
                      style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                    />
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>$</span>
                      <input
                        type="text"
                        value={purchase.amount}
                        onChange={e => handleFieldChange(idx, 'amount', e.target.value)}
                        disabled={loading}
                        style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.35rem 0.5rem', width: 80, textAlign: 'right' }}
                      />
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <select
                      value={purchase.category ?? ''}
                      onChange={e => handleFieldChange(idx, 'category', e.target.value ? Number(e.target.value) : undefined)}
                      disabled={loading}
                      style={{ ...inputStyle, fontSize: '0.85rem', padding: '0.35rem 0.5rem', background: 'var(--input-bg)' }}
                    >
                      <option value="">No category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {autoSuggested.has(idx) && (
                      <p style={{ margin: '0.2rem 0 0 0.25rem', fontSize: '0.75rem', color: 'var(--success)' }}>
                        ✓ Auto-suggested
                      </p>
                    )}
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', padding: '0.75rem 0.4rem' }}>
                    <button
                      onClick={() => handleRemove(idx)}
                      disabled={loading}
                      title="Remove row"
                      style={{ ...btnDangerStyle, padding: '0.2rem 0.5rem', fontSize: '1rem', border: 'none' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sticky action bar */}
      <div style={actionBarStyle}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onCancel} disabled={loading} style={secondaryButtonStyle}>
            ← Back
          </button>
          <button
            onClick={() => {
              if (window.confirm('Cancel this import? The uploaded PDF will be deleted.')) {
                onDelete()
              }
            }}
            disabled={loading}
            style={{ ...btnDangerStyle, fontSize: '0.875rem' }}
          >
            🗑️ Delete Import
          </button>
        </div>
        <button
          onClick={handleConfirm}
          disabled={loading || purchases.length === 0}
          style={{ ...btnPrimaryStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {loading ? (
            <><span style={miniSpinnerStyle} />Saving…</>
          ) : (
            `Save ${purchases.length} Purchase${purchases.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  )
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  marginBottom: '1.25rem',
  flexWrap: 'wrap',
}

const newCatPanelStyle: CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '1rem 1.25rem',
  marginBottom: '1.25rem',
}

const tableWrapperStyle: CSSProperties = {
  overflowX: 'auto',
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 380px)',
  minHeight: 200,
  border: '1px solid var(--border)',
  borderRadius: 8,
  marginBottom: '1rem',
}

const actionBarStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid var(--border)',
  position: 'sticky',
  bottom: '-2rem',
  background: 'var(--card-bg)',
  zIndex: 10,
  marginLeft: '-1.5rem',
  marginRight: '-1.5rem',
  paddingLeft: '1.5rem',
  paddingRight: '1.5rem',
}

const errorBannerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  background: 'var(--error-light)',
  border: '1px solid var(--error)',
  borderRadius: 8,
  color: 'var(--error)',
  fontSize: '0.875rem',
  marginBottom: '1rem',
}

const dismissBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--error)',
  fontSize: '1.25rem',
  lineHeight: 1,
  marginLeft: 'auto',
}

const miniSpinnerStyle: CSSProperties = {
  display: 'inline-block',
  width: 14,
  height: 14,
  border: '2px solid currentColor',
  borderTopColor: 'transparent',
  borderRadius: '50%',
  animation: 'spin 0.7s linear infinite',
  flexShrink: 0,
}
