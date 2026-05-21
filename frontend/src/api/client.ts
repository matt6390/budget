import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean }

const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequest | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
        const refreshResponse = await axios.post(
          '/api/auth/token/refresh/',
          refresh ? { refresh } : {},
          { withCredentials: true },
        )

        const { access, refresh: rotatedRefresh } = refreshResponse.data as {
          access: string
          refresh?: string
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, access)
        if (rotatedRefresh) {
          localStorage.setItem(REFRESH_TOKEN_KEY, rotatedRefresh)
        }

        originalRequest.headers.set('Authorization', `Bearer ${access}`)
        return client(originalRequest)
      } catch (refreshError) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)

export const tokenStorage = {
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },
  clear: clearTokens,
  hasAccessToken() {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
  },
}

export default client
