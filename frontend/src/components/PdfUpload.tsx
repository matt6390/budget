import type { CSSProperties } from 'react'
import { useRef, useState } from 'react'
import { uploadPdf, getPdfPageCount } from '../api/pdfImport'
import { cardStyle, inputStyle, btnPrimaryStyle, secondaryButtonStyle, labelStyle, fieldStyle } from '../ui'
import PdfPageThumbnails from './PdfPageThumbnails'

interface PdfUploadProps {
  onUploadSuccess: (sessionId: number) => void
  onUploadError: (error: string) => void
}

export const PdfUpload: React.FC<PdfUploadProps> = ({ onUploadSuccess, onUploadError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [selectedPages, setSelectedPages] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [pageCountLoading, setPageCountLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const applyFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setUploadStatus(null)
    setPageCount(null)
    setSelectedPages([])
    setShowPreview(false)
    setPageCountLoading(true)
    try {
      const count = await getPdfPageCount(selectedFile)
      setPageCount(count)
    } catch {
      // non-fatal
    } finally {
      setPageCountLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      onUploadError('Please select a PDF file')
      return
    }
    applyFile(selectedFile)
  }

  const handleTogglePage = (page: number) => {
    setSelectedPages(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page].sort((a, b) => a - b)
    )
  }

  const handleUpload = async () => {
    if (!file) { onUploadError('No file selected'); return }
    setLoading(true)
    setUploadStatus('Uploading PDF…')
    try {
      setUploadStatus('Extracting purchase data…')
      const session = await uploadPdf(file, selectedPages.length > 0 ? selectedPages : undefined)
      setUploadStatus(null)
      onUploadSuccess(session.id)
    } catch (err) {
      setLoading(false)
      setUploadStatus(null)
      const msg = err instanceof Error ? err.message : 'Upload failed'
      onUploadError(msg)
    }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile) return
    if (!droppedFile.name.toLowerCase().endsWith('.pdf') && droppedFile.type !== 'application/pdf') {
      onUploadError('Please drop a PDF file'); return
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    applyFile(droppedFile)
  }

  const handleClear = () => {
    setFile(null); setSelectedPages([]); setUploadStatus(null); setPageCount(null); setShowPreview(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const pageLabel = selectedPages.length > 0
    ? `Pages selected: ${selectedPages.join(', ')}`
    : pageCount ? 'No pages selected — all pages will be scanned' : null

  return (
    <div style={{ ...cardStyle, maxWidth: 620, margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 0.35rem', color: 'var(--text)', fontSize: '1.15rem', fontWeight: 700 }}>
        Upload a PDF
      </h3>
      <p style={{ margin: '0 0 1.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
        Receipts, invoices, or bank statements — the system will extract dates, merchants, and amounts.
      </p>

      {/* File drop zone — uses <label> for Safari compatibility (no div+onClick) */}
      <label
        htmlFor="pdf-file-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={dropZoneStyle(dragOver, loading)}
      >
        {/* sr-only keeps visible to Safari label→input linking; display:none would break it */}
        <input
          id="pdf-file-input"
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={loading}
          className="sr-only"
        />

        {file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '2.5rem' }}>📄</span>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)', wordBreak: 'break-all', textAlign: 'center' }}>{file.name}</p>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            {pageCountLoading && (
              <p style={{ margin: '0.25rem 0 0', color: 'var(--primary)', fontSize: '0.8rem' }}>Detecting pages…</p>
            )}
            {pageCount !== null && !pageCountLoading && (
              <p style={{ margin: '0.25rem 0 0', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                📃 {pageCount} page{pageCount !== 1 ? 's' : ''} detected — click to change file
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>📂</span>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>Drop your PDF here, or click to browse</p>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>Supports receipts, invoices, and statements</p>
          </div>
        )}
      </label>

      {/* Page preview + selection */}
      {file && pageCount !== null && !pageCountLoading && (
        <div style={fieldStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={labelStyle}>
              Select pages <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              style={previewToggleStyle}
            >
              {showPreview ? 'Hide preview' : 'Show page preview'}
            </button>
          </div>

          {showPreview && (
            <div style={{ marginBottom: '0.75rem' }}>
              <PdfPageThumbnails
                file={file}
                pageCount={pageCount}
                selectedPages={selectedPages}
                onTogglePage={handleTogglePage}
              />
            </div>
          )}

          {!showPreview && (
            <input
              type="text"
              style={inputStyle}
              placeholder={`e.g. 3  or  1,3,5  —  ${pageCount} page${pageCount !== 1 ? 's' : ''} available`}
              value={selectedPages.join(', ')}
              onChange={e => {
                const nums = e.target.value
                  .split(',')
                  .map(s => parseInt(s.trim(), 10))
                  .filter(n => !isNaN(n) && n > 0)
                setSelectedPages([...new Set(nums)].sort((a, b) => a - b))
              }}
              disabled={loading}
            />
          )}

          {pageLabel && (
            <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.8rem' }}>{pageLabel}</p>
          )}
        </div>
      )}

      {/* Status message */}
      {uploadStatus && (
        <div style={statusBannerStyle}>
          <span style={miniSpinnerStyle} />
          {uploadStatus}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button onClick={handleClear} disabled={loading || !file} style={secondaryButtonStyle}>
          Clear
        </button>
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          style={{ ...btnPrimaryStyle, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {loading ? (
            <><span style={miniSpinnerStyle} /> Processing…</>
          ) : 'Upload & Extract'}
        </button>
      </div>
    </div>
  )
}

const dropZoneStyle = (dragOver: boolean, loading: boolean): CSSProperties => ({
  display: 'block',
  border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-input)'}`,
  borderRadius: 10,
  padding: '2rem 1.5rem',
  textAlign: 'center',
  cursor: loading ? 'not-allowed' : 'pointer',
  marginBottom: '1.25rem',
  background: dragOver ? 'var(--primary-light)' : 'var(--bg)',
  transition: 'border-color 0.15s, background 0.15s',
  opacity: loading ? 0.6 : 1,
  pointerEvents: loading ? 'none' : 'auto',
})

const previewToggleStyle: CSSProperties = {
  background: 'none',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '0.2rem 0.6rem',
  fontSize: '0.78rem',
  color: 'var(--primary)',
  cursor: 'pointer',
  fontWeight: 600,
}

const statusBannerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.75rem 1rem',
  background: 'var(--primary-light)',
  border: '1px solid var(--primary)',
  borderRadius: 8,
  color: 'var(--primary)',
  fontSize: '0.875rem',
  fontWeight: 600,
  marginBottom: '1rem',
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
