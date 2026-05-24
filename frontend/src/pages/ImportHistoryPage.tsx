import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { deleteImportSession, type PdfImportSession } from '../api/pdfImport'
import {
  COLORS,
  btnPrimaryStyle,
  cardStyle,
  emptyStateStyle,
  errorTextStyle,
  pageHeaderStyle,
  pageTitleStyle,
  tableStyle,
  tableHeaderCellStyle,
  tableCellStyle,
} from '../ui'

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: 'var(--border)', color: 'var(--text-muted)' },
  extracted: { label: 'Awaiting Review', bg: '#fef3c7', color: '#92400e' },
  confirmed: { label: 'Saved', bg: '#d1fae5', color: '#065f46' },
}

export default function ImportHistoryPage() {
  const [sessions, setSessions] = useState<PdfImportSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewingPdf, setViewingPdf] = useState<number | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true)
      try {
        const res = await client.get<PdfImportSession[]>('/purchases/import/')
        setSessions(res.data)
      } catch {
        setError('Unable to load import history.')
      } finally {
        setIsLoading(false)
      }
    }
    void fetch()
  }, [])

  const getFilename = (path: string) => path.split('/').pop() ?? path

  const handleViewPdf = async (sessionId: number) => {
    setViewingPdf(sessionId)
    try {
      const res = await client.get(`/purchases/import/${sessionId}/pdf/`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }))
      window.open(url, '_blank')
    } catch {
      setError('Could not open PDF. The file may no longer be available.')
    } finally {
      setViewingPdf(null)
    }
  }

  const handleDeleteImport = async (sessionId: number) => {
    if (!window.confirm('Delete this import and its uploaded PDF?')) return
    setDeletingSessionId(sessionId)
    setError('')
    try {
      await deleteImportSession(sessionId)
      setSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch {
      setError('Could not delete this import.')
    } finally {
      setDeletingSessionId(null)
    }
  }

  return (
    <div>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Import History</h1>
          <p style={{ color: COLORS.muted, margin: 0 }}>Previously uploaded PDFs and their import status.</p>
        </div>
        <Link to="/import-pdf" style={{ ...btnPrimaryStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          + New Import
        </Link>
      </div>

      {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}>{error}</p> : null}

      {isLoading ? (
        <section style={cardStyle}><p style={emptyStateStyle}>Loading…</p></section>
      ) : sessions.length === 0 ? (
        <section style={cardStyle}>
          <p style={emptyStateStyle}>No imports yet. <Link to="/import-pdf" style={{ color: 'var(--primary)' }}>Upload your first PDF</Link>.</p>
        </section>
      ) : (
        <section style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHeaderCellStyle}>File</th>
                  <th style={tableHeaderCellStyle}>Date</th>
                  <th style={tableHeaderCellStyle}>Status</th>
                  <th style={tableHeaderCellStyle}>Purchases</th>
                  <th style={tableHeaderCellStyle}></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const badge = STATUS_LABELS[session.status] ?? STATUS_LABELS.pending
                  const count = session.extracted_data?.length ?? 0
                  const isLoadingPdf = viewingPdf === session.id
                  const isDeleting = deletingSessionId === session.id
                  return (
                    <tr key={session.id}>
                      <td style={{ ...tableCellStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📄 {getFilename(session.pdf_file)}
                      </td>
                      <td style={tableCellStyle}>
                        {new Date(session.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{ ...badgeStyle, background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                        {session.extracted_data ? `${count}` : '—'}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {session.pdf_file && (
                            <button
                              onClick={() => handleViewPdf(session.id)}
                              disabled={isLoadingPdf}
                              style={viewPdfBtnStyle}
                            >
                              {isLoadingPdf ? 'Opening…' : '👁 View PDF'}
                            </button>
                          )}
                          {session.status === 'extracted' && (
                            <Link
                              to={`/import-pdf?session=${session.id}`}
                              style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}
                            >
                              Review →
                            </Link>
                          )}
                          <button
                            onClick={() => void handleDeleteImport(session.id)}
                            disabled={isDeleting}
                            style={deleteBtnStyle}
                          >
                            {isDeleting ? 'Deleting…' : '🗑 Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

const badgeStyle: CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.6rem',
  borderRadius: '999px',
  fontSize: '0.78rem',
  fontWeight: 600,
}

const viewPdfBtnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '0.25rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  color: 'var(--text)',
  whiteSpace: 'nowrap',
}

const deleteBtnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--error)',
  borderRadius: '6px',
  padding: '0.25rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  color: 'var(--error)',
  whiteSpace: 'nowrap',
}
