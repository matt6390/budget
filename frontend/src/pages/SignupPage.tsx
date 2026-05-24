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

type SignupFieldErrors = {
  username: string
  email: string
  password: string
}

const emptyFieldErrors: SignupFieldErrors = { username: '', email: '', password: '' }

export default function SignupPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>(emptyFieldErrors)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setFieldErrors(emptyFieldErrors)
    setIsSubmitting(true)

    try {
      const response = await client.post('/auth/signup/', { username, email, password })
      tokenStorage.set(response.data.access, response.data.refresh)
      await refreshUser()
      navigate('/dashboard')
    } catch (submitError) {
      const { fieldErrors: apiErrors, generalError } = extractFieldErrors(
        submitError,
        'Unable to sign up right now. Please review your details and try again.',
      )
      setFieldErrors({
        username: getFirstFieldError(apiErrors.username),
        email: getFirstFieldError(apiErrors.email),
        password: getFirstFieldError(apiErrors.password),
      })
      setError(apiErrors.username || apiErrors.email || apiErrors.password ? '' : generalError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={authPageStyle}>
      <form onSubmit={handleSubmit} style={authCardStyle}>
        <h1>Create account</h1>
        <label style={authLabelStyle}>
          Username
          <input required value={username} onChange={(event) => setUsername(event.target.value)} style={authInputStyle} />
          {fieldErrors.username ? <span style={authFieldErrorStyle}>{fieldErrors.username}</span> : null}
        </label>
        <label style={authLabelStyle}>
          Email
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={authInputStyle} />
          {fieldErrors.email ? <span style={authFieldErrorStyle}>{fieldErrors.email}</span> : null}
        </label>
        <label style={authLabelStyle}>
          Password
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={authInputStyle}
          />
          {fieldErrors.password ? <span style={authFieldErrorStyle}>{fieldErrors.password}</span> : null}
        </label>
        {error ? <p style={authErrorStyle}>{error}</p> : null}
        <button type="submit" disabled={isSubmitting} style={authButtonStyle}>
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>
        <p>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
