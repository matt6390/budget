import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import client, { tokenStorage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  authButtonStyle,
  authCardStyle,
  authErrorStyle,
  authFieldErrorStyle,
  authInputStyle,
  authLabelStyle,
  authPageStyle,
  extractFieldErrors,
  getFirstFieldError,
} from '../ui'

type LoginFieldErrors = {
  username: string
  password: string
}

const emptyFieldErrors: LoginFieldErrors = { username: '', password: '' }

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
      const { fieldErrors: apiErrors, generalError } = extractFieldErrors(
        submitError,
        'Unable to log in with those credentials.',
      )
      setFieldErrors({
        username: getFirstFieldError(apiErrors.username),
        password: getFirstFieldError(apiErrors.password),
      })
      setError(apiErrors.username || apiErrors.password ? '' : generalError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={authPageStyle}>
      <form onSubmit={handleSubmit} style={authCardStyle}>
        <h1>Log in</h1>
        <label style={authLabelStyle}>
          Username
          <input required value={username} onChange={(event) => setUsername(event.target.value)} style={authInputStyle} />
          {fieldErrors.username ? <span style={authFieldErrorStyle}>{fieldErrors.username}</span> : null}
        </label>
        <label style={authLabelStyle}>
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={authInputStyle}
          />
          {fieldErrors.password ? <span style={authFieldErrorStyle}>{fieldErrors.password}</span> : null}
        </label>
        {error ? <p style={authErrorStyle}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={authButtonStyle}>
          {isSubmitting ? 'Logging in...' : 'Log In'}
        </button>
        <p>
          Need an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
