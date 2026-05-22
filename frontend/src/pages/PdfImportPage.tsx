import type { CSSProperties } from 'react'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PdfUpload } from '../components/PdfUpload'
import { PurchaseConfirmation } from '../components/PurchaseConfirmation'
import { getImportSession, confirmPurchases, deleteImportSession, ConfirmPurchaseData, PdfImportSession } from '../api/pdfImport'
import {
  cardStyle,
  pageHeaderStyle,
  pageTitleStyle,
  mutedTextStyle,
  btnPrimaryStyle,
  secondaryButtonStyle,
} from '../ui'

type Step = 'upload' | 'confirm' | 'success'

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'confirm', label: 'Review' },
  { key: 'success', label: 'Done' },
]
const STEP_ORDER: Step[] = ['upload', 'confirm', 'success']

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEP_ORDER.indexOf(current)
  return (
    <nav style={stepNavStyle}>
      {STEPS.map((step, i) => {
        const idx = STEP_ORDER.indexOf(step.key)
        const isDone = idx < currentIndex
        const isActive = idx === currentIndex
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem',
                background: isDone ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--border)',
                color: isDone || isActive ? 'var(--invert)' : 'var(--muted)',
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--muted)',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 64, height: 2, margin: '0 6px', marginBottom: 18,
                background: idx < currentIndex ? 'var(--success)' : 'var(--border)',
              }} />
            )}
          </div>
        )
      })}
    </nav>
  )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div style={errorBannerStyle}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
      <span style={{ flex: 1, fontSize: '0.9rem' }}>{message}</span>
      <button onClick={onDismiss} style={dismissBtnStyle}>×</button>
    </div>
  )
}

export const PdfImportPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('upload')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number>(0)
  const [session, setSession] = useState<PdfImportSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)

  // Support ?session=<id> for resuming from import history
  useEffect(() => {
    const resumeId = searchParams.get('session')
    if (resumeId) {
      const id = parseInt(resumeId, 10)
      if (!isNaN(id)) {
        setSessionId(id)
        setStep('confirm')
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (!sessionId || step !== 'confirm') return
    setSessionLoading(true)
    getImportSession(sessionId)
      .then(data => setSession(data))
      .catch(() => setError('Failed to load extraction results. Please try again.'))
      .finally(() => setSessionLoading(false))
  }, [sessionId, step])

  const handleUploadSuccess = (newSessionId: number) => {
    setError(null)
    setSessionId(newSessionId)
    setStep('confirm')
  }

  const handleConfirmPurchases = async (purchases: ConfirmPurchaseData[]) => {
    if (!sessionId) return
    const result = await confirmPurchases(sessionId, purchases)
    setSuccessCount(result.count)
    setStep('success')
  }

  const handleDeleteSession = async () => {
    if (sessionId) {
      try { await deleteImportSession(sessionId) } catch { /* silently ignore — already cleaned up or gone */ }
    }
    handleReset()
  }

  const handleReset = () => {
    setSessionId(null)
    setError(null)
    setSuccessCount(0)
    setSession(null)
    navigate('/import-pdf', { replace: true })
  }

  return (
    <div>
      <div style={pageHeaderStyle}>
        <h2 style={pageTitleStyle}>📄 Import from PDF</h2>
        <p style={{ ...mutedTextStyle, marginTop: 4 }}>Extract purchases from a bank statement, receipt, or invoice</p>
      </div>

      <StepIndicator current={step} />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {step === 'upload' && (
        <PdfUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={msg => setError(msg)}
        />
      )}

      {step === 'confirm' && sessionLoading && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
          <div style={spinnerStyle} />
          <p style={{ ...mutedTextStyle, marginTop: '1rem', fontWeight: 600 }}>Loading extracted data…</p>
        </div>
      )}

      {step === 'confirm' && !sessionLoading && session && (
        <PurchaseConfirmation
          session={session}
          onConfirm={handleConfirmPurchases}
          onCancel={handleReset}
          onDelete={handleDeleteSession}
        />
      )}

      {step === 'success' && (
        <div style={{ ...cardStyle, textAlign: 'center', maxWidth: 480, margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={successIconStyle}>✓</div>
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--success)', fontSize: '1.5rem' }}>
            {successCount} Purchase{successCount !== 1 ? 's' : ''} Saved!
          </h2>
          <p style={{ ...mutedTextStyle, marginBottom: '2rem' }}>
            They're now in your purchases list and reflected in your budget.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button onClick={handleReset} style={btnPrimaryStyle}>
              Import Another PDF
            </button>
            <button onClick={() => navigate('/purchases')} style={secondaryButtonStyle}>
              View Purchases
            </button>
            <button onClick={() => navigate('/import-history')} style={secondaryButtonStyle}>
              Import History
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const stepNavStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  marginBottom: '2rem',
  userSelect: 'none',
}

const errorBannerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '0.9rem 1rem',
  background: 'var(--error-light)',
  border: '1px solid var(--error)',
  borderRadius: '10px',
  color: 'var(--error)',
  marginBottom: '1.5rem',
}

const dismissBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--error)',
  fontSize: '1.25rem',
  lineHeight: 1,
  flexShrink: 0,
}

const spinnerStyle: CSSProperties = {
  width: 36,
  height: 36,
  border: '3px solid var(--border)',
  borderTop: '3px solid var(--primary)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto',
}

const successIconStyle: CSSProperties = {
  width: 72,
  height: 72,
  background: 'rgba(22, 163, 74, 0.12)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2rem',
  color: 'var(--success)',
  margin: '0 auto 1.25rem',
}

