import type { CSSProperties, ReactNode } from 'react'

type ModalProps = { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{title}</h2>
          <button onClick={onClose} style={closeBtnStyle} type="button">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--overlay-bg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
}

const cardStyle: CSSProperties = {
  background: 'var(--card-bg)',
  borderRadius: '16px',
  boxShadow: 'var(--shadow-modal)',
  padding: '2rem',
  width: '100%',
  maxWidth: '480px',
  maxHeight: '90vh',
  overflowY: 'auto',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem',
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '1.25rem',
  color: 'var(--text)',
}

const closeBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.25rem',
  cursor: 'pointer',
  color: 'var(--muted)',
}
