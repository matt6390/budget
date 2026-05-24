import axios from 'axios'
import type { CSSProperties } from 'react'

export const COLORS = {
  bg: 'var(--bg)',
  nav: 'var(--nav-bg)',
  primary: 'var(--primary)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  text: 'var(--text)',
  white: 'var(--invert)',
  error: 'var(--error)',
  success: 'var(--success)',
  warning: 'var(--warning)',
}

export const cardStyle: CSSProperties = {
  background: 'var(--card-bg)',
  borderRadius: '12px',
  boxShadow: 'var(--shadow-card)',
  padding: '1.5rem',
}

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
}

export const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--border-input)',
  borderRadius: '8px',
  fontSize: '1rem',
  padding: '0.6rem 0.75rem',
  boxSizing: 'border-box',
  background: 'var(--input-bg)',
  color: 'var(--text)',
}

export const btnPrimaryStyle: CSSProperties = {
  background: 'var(--primary)',
  color: 'var(--invert)',
  border: 'none',
  borderRadius: '8px',
  padding: '0.65rem 1.25rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.95rem',
}

export const btnDangerStyle: CSSProperties = {
  background: 'none',
  color: 'var(--error)',
  border: '1px solid var(--error-light)',
  borderRadius: '6px',
  padding: '0.35rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
}

export const btnGhostStyle: CSSProperties = {
  background: 'none',
  color: 'var(--primary)',
  border: '1px solid var(--primary-light)',
  borderRadius: '6px',
  padding: '0.35rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.875rem',
}

export const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  fontWeight: 600,
  color: 'var(--text)',
}

export const tableHeaderCellStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  color: 'var(--muted)',
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

export const tableCellStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  color: 'var(--text)',
  verticalAlign: 'top',
}

export const errorTextStyle: CSSProperties = {
  color: 'var(--error)',
  margin: 0,
}

export const mutedTextStyle: CSSProperties = {
  color: 'var(--muted)',
  margin: 0,
}

export const pageHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1.5rem',
  flexWrap: 'wrap',
}

export const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--text)',
}

export const actionsRowStyle: CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
}

export const checkboxLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontWeight: 600,
  color: 'var(--text)',
}

export const formActionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.75rem',
  marginTop: '1.5rem',
}

export const secondaryButtonStyle: CSSProperties = {
  background: 'var(--btn-secondary-bg)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '0.65rem 1.25rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.95rem',
}

export const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginBottom: '0.75rem',
}

export const monthNavWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginBottom: '1.5rem',
}

export const monthNavButtonStyle: CSSProperties = {
  ...btnGhostStyle,
  minWidth: '42px',
  textAlign: 'center',
}

export const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: '1rem',
  color: 'var(--text)',
}

export const emptyStateStyle: CSSProperties = {
  color: 'var(--muted)',
  margin: 0,
}

// ------------------------------------------------------------------
// Shared auth-form styles (Login + Signup pages)
// ------------------------------------------------------------------

export const authPageStyle: CSSProperties = {
  alignItems: 'center',
  background: 'var(--bg)',
  display: 'flex',
  justifyContent: 'center',
  minHeight: '100vh',
}

export const authCardStyle: CSSProperties = {
  background: 'var(--card-bg)',
  borderRadius: '12px',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  padding: '2rem',
  width: '100%',
  maxWidth: '420px',
}

export const authLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontWeight: 600,
  gap: '0.5rem',
  color: 'var(--text)',
}

export const authInputStyle: CSSProperties = {
  border: '1px solid var(--border-input)',
  borderRadius: '8px',
  fontSize: '1rem',
  padding: '0.75rem',
  background: 'var(--input-bg)',
  color: 'var(--text)',
}

export const authButtonStyle: CSSProperties = {
  background: 'var(--primary)',
  border: 'none',
  borderRadius: '8px',
  color: 'var(--invert)',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 700,
  padding: '0.75rem 1rem',
}

export const authErrorStyle: CSSProperties = {
  color: 'var(--error)',
  margin: 0,
}

export const authFieldErrorStyle: CSSProperties = {
  color: 'var(--error)',
  fontSize: '0.875rem',
  fontWeight: 400,
  margin: 0,
}

// ------------------------------------------------------------------
// Error helpers
// ------------------------------------------------------------------

/**
 * Extracts the first human-readable error string from an API response field value.
 * Handles both plain strings and DRF-style string arrays.
 */
export const getFirstFieldError = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return ''
}

export const formatCurrency = (value: string | number) =>
  Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const getTodayDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const shiftMonth = (month: string, offset: number) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const nextDate = new Date(year, monthNumber - 1 + offset, 1)
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
}

export const formatMonthLabel = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export const extractFieldErrors = (err: unknown, fallback = 'Something went wrong. Please try again.') => {
  const fieldErrors: Record<string, string> = {}
  let generalError = fallback

  if (axios.isAxiosError(err) && err.response?.data) {
    const data = err.response.data as Record<string, unknown>
    for (const [key, val] of Object.entries(data)) {
      fieldErrors[key] = Array.isArray(val) ? String(val[0] ?? '') : String(val)
    }

    generalError = fieldErrors.detail || fieldErrors.non_field_errors || ''
  } else if (axios.isAxiosError(err) && !err.response) {
    generalError = 'Unable to reach the server. Please try again.'
  }

  return { fieldErrors, generalError }
}
