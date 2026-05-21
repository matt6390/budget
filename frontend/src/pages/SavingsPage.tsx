import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import client from '../api/client'
import Modal from '../components/Modal'
import type { SavingsGoal } from '../types'
import {
  cardStyle,
  emptyStateStyle,
  errorTextStyle,
  fieldStyle,
  formatCurrency,
  inputStyle,
  labelStyle,
  mutedTextStyle,
  pageTitleStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../ui'

const today = new Date().toISOString().split('T')[0]

type GoalForm = {
  name: string
  target_amount: string
  target_date: string
  notes: string
}

type ContributionForm = {
  amount: string
  date: string
  note: string
}

const emptyGoalForm = (): GoalForm => ({ name: '', target_amount: '', target_date: '', notes: '' })
const emptyContribForm = (): ContributionForm => ({ amount: '', date: today, note: '' })

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Goal modal state
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [goalForm, setGoalForm] = useState<GoalForm>(emptyGoalForm())
  const [goalErrors, setGoalErrors] = useState<Partial<GoalForm>>({})
  const [goalSaving, setGoalSaving] = useState(false)

  // Contribution modal state
  const [contributingTo, setContributingTo] = useState<SavingsGoal | null>(null)
  const [contribForm, setContribForm] = useState<ContributionForm>(emptyContribForm())
  const [contribErrors, setContribErrors] = useState<Partial<ContributionForm>>({})
  const [contribSaving, setContribSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await client.get<SavingsGoal[]>('/budget/savings/')
      setGoals(res.data)
    } catch {
      setError('Failed to load savings goals.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // ── Goal CRUD ────────────────────────────────────────────────────────────────

  const openAddGoal = () => {
    setEditingGoal(null)
    setGoalForm(emptyGoalForm())
    setGoalErrors({})
    setShowGoalModal(true)
  }

  const openEditGoal = (g: SavingsGoal) => {
    setEditingGoal(g)
    setGoalForm({
      name: g.name,
      target_amount: g.target_amount,
      target_date: g.target_date ?? '',
      notes: g.notes,
    })
    setGoalErrors({})
    setShowGoalModal(true)
  }

  const validateGoalForm = () => {
    const errs: Partial<GoalForm> = {}
    if (!goalForm.name.trim()) errs.name = 'Name is required.'
    if (!goalForm.target_amount || isNaN(Number(goalForm.target_amount)) || Number(goalForm.target_amount) <= 0)
      errs.target_amount = 'Enter a valid amount greater than 0.'
    return errs
  }

  const saveGoal = async () => {
    const errs = validateGoalForm()
    if (Object.keys(errs).length) { setGoalErrors(errs); return }
    setGoalSaving(true)
    try {
      const payload = {
        name: goalForm.name.trim(),
        target_amount: goalForm.target_amount,
        target_date: goalForm.target_date || null,
        notes: goalForm.notes,
      }
      if (editingGoal) {
        await client.patch(`/budget/savings/${editingGoal.id}/`, payload)
      } else {
        await client.post('/budget/savings/', payload)
      }
      setShowGoalModal(false)
      void load()
    } catch {
      setGoalErrors({ name: 'Failed to save. Please try again.' })
    } finally {
      setGoalSaving(false)
    }
  }

  const deleteGoal = async (g: SavingsGoal) => {
    if (!confirm(`Delete "${g.name}"? All contributions will be lost.`)) return
    await client.delete(`/budget/savings/${g.id}/`)
    void load()
  }

  const toggleComplete = async (g: SavingsGoal) => {
    await client.patch(`/budget/savings/${g.id}/`, { is_complete: !g.is_complete })
    void load()
  }

  // ── Contributions ────────────────────────────────────────────────────────────

  const openContribute = (g: SavingsGoal) => {
    setContributingTo(g)
    setContribForm(emptyContribForm())
    setContribErrors({})
  }

  const validateContrib = () => {
    const errs: Partial<ContributionForm> = {}
    if (!contribForm.amount || isNaN(Number(contribForm.amount)) || Number(contribForm.amount) <= 0)
      errs.amount = 'Enter a valid amount greater than 0.'
    if (!contribForm.date) errs.date = 'Date is required.'
    return errs
  }

  const saveContribution = async () => {
    if (!contributingTo) return
    const errs = validateContrib()
    if (Object.keys(errs).length) { setContribErrors(errs); return }
    setContribSaving(true)
    try {
      await client.post(`/budget/savings/${contributingTo.id}/contribute/`, {
        amount: contribForm.amount,
        date: contribForm.date,
        note: contribForm.note,
      })
      setContributingTo(null)
      void load()
    } catch {
      setContribErrors({ amount: 'Failed to save. Please try again.' })
    } finally {
      setContribSaving(false)
    }
  }

  const deleteContribution = async (goal: SavingsGoal, contribId: number) => {
    await client.delete(`/budget/savings/${goal.id}/contributions/${contribId}/`)
    void load()
  }

  // ── Render helpers ────────────────────────────────────────────────────────────

  const activeGoals = goals.filter((g) => !g.is_complete)
  const completedGoals = goals.filter((g) => g.is_complete)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={pageTitleStyle}>Savings Goals</h1>
          <p style={mutedTextStyle}>Set aside money toward things you want to buy.</p>
        </div>
        <button style={primaryButtonStyle} onClick={openAddGoal}>＋ New Goal</button>
      </div>

      {error ? <p style={{ ...errorTextStyle, marginBottom: '1rem' }}>{error}</p> : null}

      {isLoading ? (
        <div style={cardStyle}><p style={emptyStateStyle}>Loading…</p></div>
      ) : goals.length === 0 ? (
        <div style={cardStyle}>
          <p style={emptyStateStyle}>No savings goals yet. Click <strong>＋ New Goal</strong> to start saving for something!</p>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={sectionHeadStyle}>Active Goals</h2>
              <div style={goalGridStyle}>
                {activeGoals.map((g) => <GoalCard key={g.id} goal={g} onEdit={openEditGoal} onDelete={deleteGoal} onContribute={openContribute} onToggleComplete={toggleComplete} onDeleteContrib={deleteContribution} />)}
              </div>
            </section>
          )}
          {completedGoals.length > 0 && (
            <section>
              <h2 style={sectionHeadStyle}>Completed 🎉</h2>
              <div style={goalGridStyle}>
                {completedGoals.map((g) => <GoalCard key={g.id} goal={g} onEdit={openEditGoal} onDelete={deleteGoal} onContribute={openContribute} onToggleComplete={toggleComplete} onDeleteContrib={deleteContribution} />)}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Goal Modal ── */}
      <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title={editingGoal ? 'Edit Goal' : 'New Savings Goal'}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Goal name *</label>
          <input style={inputStyle} placeholder="e.g. New laptop, Vacation, Emergency fund" value={goalForm.name}
            onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} />
          {goalErrors.name && <p style={errorTextStyle}>{goalErrors.name}</p>}
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Target amount ($) *</label>
          <input style={inputStyle} type="number" min="0.01" step="0.01" placeholder="0.00" value={goalForm.target_amount}
            onChange={(e) => setGoalForm({ ...goalForm, target_amount: e.target.value })} />
          {goalErrors.target_amount && <p style={errorTextStyle}>{goalErrors.target_amount}</p>}
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Target date (optional)</label>
          <input style={inputStyle} type="date" value={goalForm.target_date}
            onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={goalForm.notes}
            onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button style={secondaryButtonStyle} onClick={() => setShowGoalModal(false)}>Cancel</button>
          <button style={primaryButtonStyle} onClick={() => void saveGoal()} disabled={goalSaving}>
            {goalSaving ? 'Saving…' : editingGoal ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </Modal>

      {/* ── Contribution Modal ── */}
      <Modal isOpen={!!contributingTo} onClose={() => setContributingTo(null)}
        title={contributingTo ? `Add Money → ${contributingTo.name}` : 'Add Contribution'}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Amount ($) *</label>
          <input style={inputStyle} type="number" min="0.01" step="0.01" placeholder="0.00"
            value={contribForm.amount} onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })} />
          {contribErrors.amount && <p style={errorTextStyle}>{contribErrors.amount}</p>}
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Date *</label>
          <input style={inputStyle} type="date" value={contribForm.date}
            onChange={(e) => setContribForm({ ...contribForm, date: e.target.value })} />
          {contribErrors.date && <p style={errorTextStyle}>{contribErrors.date}</p>}
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Note (optional)</label>
          <input style={inputStyle} placeholder="e.g. Birthday money" value={contribForm.note}
            onChange={(e) => setContribForm({ ...contribForm, note: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button style={secondaryButtonStyle} onClick={() => setContributingTo(null)}>Cancel</button>
          <button style={primaryButtonStyle} onClick={() => void saveContribution()} disabled={contribSaving}>
            {contribSaving ? 'Saving…' : 'Add Contribution'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Goal Card Component ─────────────────────────────────────────────────────────

type GoalCardProps = {
  goal: SavingsGoal
  onEdit: (g: SavingsGoal) => void
  onDelete: (g: SavingsGoal) => void
  onContribute: (g: SavingsGoal) => void
  onToggleComplete: (g: SavingsGoal) => void
  onDeleteContrib: (goal: SavingsGoal, contribId: number) => void
}

function GoalCard({ goal, onEdit, onDelete, onContribute, onToggleComplete, onDeleteContrib }: GoalCardProps) {
  const [showContribs, setShowContribs] = useState(false)
  const pct = Math.min(goal.percent_complete, 100)
  const remaining = Math.max(parseFloat(goal.target_amount) - parseFloat(goal.current_amount), 0)

  return (
    <div style={{ ...cardStyle, opacity: goal.is_complete ? 0.75 : 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={goalNameStyle}>{goal.is_complete ? '✅ ' : ''}{goal.name}</h3>
          {goal.notes ? <p style={{ ...mutedTextStyle, fontSize: '0.8rem', marginTop: 2 }}>{goal.notes}</p> : null}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {!goal.is_complete && (
            <button style={miniButtonStyle} onClick={() => onContribute(goal)} title="Add money">＋ Add</button>
          )}
          <button style={miniButtonStyle} onClick={() => onEdit(goal)} title="Edit">✏️</button>
          <button style={{ ...miniButtonStyle, color: 'var(--danger)' }} onClick={() => onDelete(goal)} title="Delete">🗑</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={progressTrackStyle}>
        <div style={{ ...progressFillStyle, width: `${pct}%`, background: goal.is_complete ? '#4ade80' : 'var(--primary)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.82rem' }}>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatCurrency(goal.current_amount)} saved</span>
        <span style={mutedTextStyle}>{pct.toFixed(0)}% of {formatCurrency(goal.target_amount)}</span>
      </div>

      {/* Stats row */}
      <div style={statsRowStyle}>
        {remaining > 0 && <StatPill label="Remaining" value={formatCurrency(String(remaining))} />}
        {goal.target_date && <StatPill label="Target date" value={new Date(goal.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} />}
        {goal.monthly_needed && remaining > 0 && <StatPill label="Monthly needed" value={formatCurrency(goal.monthly_needed)} />}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
        <button style={{ ...miniButtonStyle, fontSize: '0.75rem' }} onClick={() => setShowContribs(!showContribs)}>
          {showContribs ? '▲ Hide' : `▼ History (${goal.contributions.length})`}
        </button>
        <button style={{ ...miniButtonStyle, fontSize: '0.75rem', color: goal.is_complete ? 'var(--muted)' : '#4ade80' }}
          onClick={() => onToggleComplete(goal)}>
          {goal.is_complete ? 'Mark active' : 'Mark complete ✓'}
        </button>
      </div>

      {/* Contributions list */}
      {showContribs && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          {goal.contributions.length === 0
            ? <p style={{ ...mutedTextStyle, fontSize: '0.8rem' }}>No contributions yet.</p>
            : goal.contributions.map((c) => (
              <div key={c.id} style={contribRowStyle}>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatCurrency(c.amount)}</span>
                <span style={mutedTextStyle}>{c.date}{c.note ? ` — ${c.note}` : ''}</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.8rem', padding: '0 0.25rem' }}
                  onClick={() => onDeleteContrib(goal, c.id)} title="Remove">×</button>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={statPillStyle}>
      <span style={mutedTextStyle}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────────

const sectionHeadStyle: CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 700,
  color: 'var(--muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.75rem',
}

const goalGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '1rem',
}

const goalNameStyle: CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text)',
}

const progressTrackStyle: CSSProperties = {
  height: 10,
  borderRadius: 6,
  background: 'var(--border)',
  overflow: 'hidden',
  marginTop: '0.5rem',
}

const progressFillStyle: CSSProperties = {
  height: '100%',
  borderRadius: 6,
  transition: 'width 0.4s ease',
}

const statsRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  marginTop: '0.75rem',
}

const statPillStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '0.3rem 0.65rem',
  fontSize: '0.8rem',
  gap: 2,
}

const miniButtonStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: '0.8rem',
  padding: '0.25rem 0.6rem',
}

const contribRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.82rem',
  padding: '0.2rem 0',
  borderBottom: '1px solid var(--border)',
}
