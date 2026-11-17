import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  apiRequest,
  getStoredTokens,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
} from '@/services/api'
import type { AuthResponse, ChangePasswordDto, LoginDto, UserProfile, UserRole } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(getStoredUser())
  const accessToken = ref<string | null>(getStoredTokens()?.accessToken ?? null)
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value))
  const role = computed<UserRole | null>(() => user.value?.role ?? null)

  const isAdmin = computed(() =>
    ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(user.value?.role ?? ''),
  )
  const isTeacherOrAdmin = computed(() =>
    ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER'].includes(user.value?.role ?? ''),
  )
  const isStudent = computed(() => user.value?.role === 'STUDENT')
  const isParent = computed(() => user.value?.role === 'PARENT')

  async function login(dto: LoginDto) {
    loading.value = true
    try {
      const res = await apiRequest<AuthResponse>({
        method: 'POST',
        url: '/auth/login',
        data: dto,
      })
      setStoredTokens(res.tokens)
      setStoredUser(res.user)
      accessToken.value = res.tokens.accessToken
      user.value = res.user
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    const res = await apiRequest<{ user: UserProfile }>({
      method: 'GET',
      url: '/auth/me',
    })
    if (res.user) {
      user.value = { ...user.value, ...res.user }
      setStoredUser(user.value)
    }
    return user.value
  }

  async function changePassword(dto: ChangePasswordDto) {
    return apiRequest<{ success: boolean }>({
      method: 'POST',
      url: '/auth/change-password',
      data: dto,
    })
  }

  async function logout() {
    try {
      if (accessToken.value) {
        await apiRequest({
          method: 'POST',
          url: '/auth/logout',
        })
      }
    } catch {
      // ignore network error on logout
    } finally {
      setStoredTokens(null)
      setStoredUser(null)
      accessToken.value = null
      user.value = null
    }
  }

  return {
    user,
    accessToken,
    loading,
    isAuthenticated,
    role,
    isAdmin,
    isTeacherOrAdmin,
    isStudent,
    isParent,
    login,
    fetchMe,
    changePassword,
    logout,
  }
})
