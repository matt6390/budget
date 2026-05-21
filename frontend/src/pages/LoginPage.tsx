import axios from 'axios'
import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import client, { tokenStorage } from '../api/client'
import { useAuth } from '../context/AuthContext'

type LoginFieldErrors = {
  username: string
  password: string
}

const emptyFieldErrors: LoginFieldErrors = {
  username: '',
  password: '',
}

const getFirstError = (value: unknown) => {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0]
  }

  return ''
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>(emptyFieldErrors)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setFieldErrors(emptyFieldErrors)
    setIsSubmitting(true)

    try {
      const response = await client.post('/auth/login/', { username, password })
      tokenStorage.set(response.data.access, response.data.refresh)
      await refreshUser()
      navigate('/dashboard')
    } catch (submitError) {
      console.error(submitError)

      let nextError = 'Unable to log in with those credentials.'
      const nextFieldErrors = { ...emptyFieldErrors }

      if (axios.isAxiosError(submitError)) {
        const data = submitError.response?.data

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const errorData = data as Record<string, unknown>
          nextFieldErrors.username = getFirstError(errorData.username)
          nextFieldErrors.password = getFirstError(errorData.password)

          const detailError = getFirstError(errorData.detail) || getFirstError(errorData.non_field_errors)
          if (detailError) {
            nextError = detailError
          } else if (nextFieldErrors.username || nextFieldErrors.password) {
            nextError = ''
          }
        } else if (!submitError.response) {
          nextError = 'Unable to reach the server. Please try again.'
        }
      }

      setFieldErrors(nextFieldErrors)
      setError(nextError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <h1>Log in</h1>
        <label style={labelStyle}>
          Username
          <input required value={username} onChange={(event) => setUsername(event.target.value)} style={inputStyle} />
          {fieldErrors.username ? <span style={fieldErrorStyle}>{fieldErrors.username}</span> : null}
        </label>
        <label style={labelStyle}>
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
          {fieldErrors.password ? <span style={fieldErrorStyle}>{fieldErrors.password}</span> : null}
        </label>
        {error ? <p style={errorStyle}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={buttonStyle}>
          {isSubmitting ? 'Logging in...' : 'Log In'}
        </button>
        <p>
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  )
}

const pageStyle = {
  alignItems: 'center',
  background: 'var(--bg)',
  display: 'flex',
  justifyContent: 'center',
  minHeight: '100vh',
}

const cardStyle = {
  background: 'var(--card-bg)',
  borderRadius: '12px',
  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1rem',
  padding: '2rem',
  width: '100%',
  maxWidth: '420px',
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  fontWeight: 600,
  gap: '0.5rem',
  color: 'var(--text)',
}

const inputStyle = {
  border: '1px solid var(--border-input)',
  borderRadius: '8px',
  fontSize: '1rem',
  padding: '0.75rem',
  background: 'var(--input-bg)',
  color: 'var(--text)',
}

const buttonStyle = {
  background: 'var(--primary)',
  border: 0,
  borderRadius: '8px',
  color: 'var(--invert)',
  cursor: 'pointer',
  fontSize: '1rem',
  fontWeight: 700,
  padding: '0.75rem 1rem',
}

const errorStyle = {
  color: 'var(--error)',
  margin: 0,
}

const fieldErrorStyle = {
  color: 'var(--error)',
  fontSize: '0.875rem',
  fontWeight: 400,
  margin: 0,
}
