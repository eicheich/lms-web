import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { AuthTokens, ModuleKey, UserProfile } from '@/types/api'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/v1'

const TOKEN_STORAGE_KEY = 'aliman_tokens'
const USER_STORAGE_KEY = 'aliman_user'

export function getStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthTokens) : null
  } catch {
    return null
  }
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (tokens) {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_STORAGE_KEY)
  }
}

export interface ModuleLockedError extends Error {
  isModuleLocked: boolean
  lockedModule: ModuleKey
}

export function isModuleLockedError(err: unknown): err is ModuleLockedError {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'isModuleLocked' in err &&
      (err as ModuleLockedError).isModuleLocked === true,
  )
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Mutex Queue state for Silent Refresh Token Rotation
let isRefreshing = false
interface FailedQueueItem {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}
let failedQueue: FailedQueueItem[] = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = getStoredTokens()
  if (tokens?.accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }
  return config
})

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    // 1. Handle 403 Forbidden (only treat as ModuleLocked when backend throws ModuleInactiveException)
    if (error.response?.status === 403) {
      const serverMsg = (error.response.data as { message?: string })?.message || ''
      const isModuleInactive =
        serverMsg.toLowerCase().includes('not active') ||
        serverMsg.toLowerCase().includes('subscribed for this tenant')

      if (isModuleInactive) {
        const url = originalRequest?.url || ''
        const lockedModule: ModuleKey = url.includes('/cbt') ? 'CBT_GRADING' : 'LMS'
        const wrapped = new Error(
          serverMsg || `Modul ${lockedModule} belum diaktifkan untuk sekolah ini.`,
        ) as ModuleLockedError
        wrapped.isModuleLocked = true
        wrapped.lockedModule = lockedModule
        return Promise.reject(wrapped)
      }
      return Promise.reject(error)
    }

    // 2. Handle 401 Unauthorized via Mutex Queue Refresh Token Rotation
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const tokens = getStoredTokens()
      if (!tokens?.refreshToken) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((newAccessToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          }
          return apiClient(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post<{ tokens: AuthTokens }>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: tokens.refreshToken },
          { timeout: 15000 },
        )
        const newTokens = res.data.tokens
        setStoredTokens(newTokens)
        processQueue(null, newTokens.accessToken)
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessTokenOrFallback(newTokens.accessToken)}`
        }
        return apiClient(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        setStoredTokens(null)
        setStoredUser(null)
        window.dispatchEvent(new CustomEvent('aliman:session-expired'))
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

function newAccessTokenOrFallback(token: string) {
  return token
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config)
  return response.data
}

export default apiClient
