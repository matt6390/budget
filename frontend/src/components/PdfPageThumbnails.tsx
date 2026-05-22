import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// pdfjs-dist v5 uses Map.prototype.getOrInsertComputed (TC39 stage 2 proposal).
// It isn't in Safari or older Chrome yet, so we polyfill it here before any
// pdfjsLib functions are called.
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof Map !== 'undefined' && !('getOrInsert' in Map.prototype)) {
  (Map.prototype as any).getOrInsert = function (key: unknown, value: unknown) {
    if (!this.has(key)) this.set(key, value)
    return this.get(key)
  }
}
if (typeof Map !== 'undefined' && !('getOrInsertComputed' in Map.prototype)) {
  (Map.prototype as any).getOrInsertComputed = function (
    key: unknown,
    callbackfn: (k: unknown) => unknown,
  ) {
    if (!this.has(key)) this.set(key, callbackfn(key))
    return this.get(key)
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// pdfjs-dist v5: worker must be loaded from the same package
// Using new URL() with Vite's static analysis for reliable resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

type Props = {
  file: File
  pageCount: number
  selectedPages: number[]
  onTogglePage: (page: number) => void
}

export default function PdfPageThumbnails({ file, pageCount, selectedPages, onTogglePage }: Props) {
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)
    setError('')
    setThumbnails([])

    const renderPages = async () => {
      try {
        const buffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
        const pdf = await loadingTask.promise
        const pages: string[] = []

        for (let i = 1; i <= pageCount; i++) {
          if (cancelledRef.current) return
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 0.35 })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          // pdfjs-dist v5: pass canvas directly; canvasContext is derived internally
          await page.render({ canvas, viewport }).promise
          if (cancelledRef.current) return
          pages.push(canvas.toDataURL('image/jpeg', 0.85))
          page.cleanup()
        }

        if (!cancelledRef.current) {
          setThumbnails(pages)
        }
      } catch (err) {
        if (!cancelledRef.current) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(`Could not render PDF previews: ${msg}`)
          console.error('[PdfPageThumbnails]', err)
        }
      } finally {
        if (!cancelledRef.current) setLoading(false)
      }
    }

    void renderPages()
    return () => {
      cancelledRef.current = true
    }
  }, [file, pageCount])

  if (error) return <p style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{error}</p>

  if (loading) {
    return (
      <div style={containerStyle}>
        {Array.from({ length: pageCount }).map((_, i) => (
          <div key={i} style={skeletonStyle}>
            <div style={skeletonThumbStyle} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Page {i + 1}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {thumbnails.map((src, idx) => {
        const pageNum = idx + 1
        const isSelected = selectedPages.includes(pageNum)
        return (
          <button
            key={pageNum}
            type="button"
            onClick={() => onTogglePage(pageNum)}
            style={{
              ...thumbButtonStyle,
              outline: isSelected ? '3px solid var(--primary)' : '2px solid var(--border)',
              opacity: isSelected ? 1 : 0.65,
            }}
            title={isSelected ? `Page ${pageNum} — selected` : `Page ${pageNum} — click to select`}
          >
            <img
              src={src}
              alt={`Page ${pageNum} preview`}
              style={thumbImgStyle}
            />
            <span style={{ ...thumbLabelStyle, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
              {isSelected ? '✓ ' : ''}Page {pageNum}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const containerStyle: CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  flexWrap: 'wrap',
  padding: '0.5rem 0',
}

const thumbButtonStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.4rem',
  background: 'var(--card-bg)',
  border: 'none',
  borderRadius: '8px',
  padding: '0.5rem',
  cursor: 'pointer',
  transition: 'outline 0.15s, opacity 0.15s',
}

const thumbImgStyle: CSSProperties = {
  width: '100px',
  height: 'auto',
  borderRadius: '4px',
  display: 'block',
  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
}

const thumbLabelStyle: CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
}

const skeletonStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.4rem',
}

const skeletonThumbStyle: CSSProperties = {
  width: '100px',
  height: '130px',
  background: 'var(--border)',
  borderRadius: '4px',
  animation: 'pulse 1.4s ease-in-out infinite',
}
