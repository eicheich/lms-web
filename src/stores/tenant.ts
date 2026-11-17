import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '@/services/api'
import type { TenantBranding, UpdateBrandingDto } from '@/types/api'

const DEFAULT_BRANDING: TenantBranding = {
  tenantId: '11111111-1111-1111-1111-111111111111',
  schoolName: 'Al-Iman Islamic Boarding School',
  slug: 'al-iman',
  appName: 'Al-Iman Digital Portal',
  logoUrl: '',
  primaryColor: '#059669',
  secondaryColor: '#0284c7',
}

export const useTenantStore = defineStore('tenant', () => {
  const branding = ref<TenantBranding>({ ...DEFAULT_BRANDING })
  const activeSlug = ref<string>(localStorage.getItem('aliman_tenant_slug') || 'al-iman')
  const loading = ref(false)

  function applyThemeVariables(b: TenantBranding = branding.value) {
    const root = document.documentElement
    root.style.setProperty('--color-primary', b.primaryColor || '#059669')
    root.style.setProperty('--color-secondary', b.secondaryColor || '#0284c7')
    document.title = `${b.appName} — ${b.schoolName}`
  }

  async function fetchPublicBranding(slug: string = activeSlug.value) {
    loading.value = true
    try {
      const cleanSlug = slug.trim() || 'al-iman'
      activeSlug.value = cleanSlug
      localStorage.setItem('aliman_tenant_slug', cleanSlug)
      const data = await apiRequest<TenantBranding>({
        method: 'GET',
        url: `/tenant/${encodeURIComponent(cleanSlug)}/branding`,
      })
      branding.value = data
      applyThemeVariables(data)
      return data
    } catch {
      applyThemeVariables(branding.value)
      return branding.value
    } finally {
      loading.value = false
    }
  }

  async function fetchActiveBranding() {
    loading.value = true
    try {
      const data = await apiRequest<TenantBranding>({
        method: 'GET',
        url: '/tenant/branding',
      })
      branding.value = data
      applyThemeVariables(data)
      return data
    } finally {
      loading.value = false
    }
  }

  async function updateBranding(dto: UpdateBrandingDto) {
    const data = await apiRequest<TenantBranding>({
      method: 'PUT',
      url: '/tenant/branding',
      data: dto,
    })
    branding.value = data
    applyThemeVariables(data)
    return data
  }

  // Initialize theme immediately on store creation
  applyThemeVariables(branding.value)

  return {
    branding,
    activeSlug,
    loading,
    applyThemeVariables,
    fetchPublicBranding,
    fetchActiveBranding,
    updateBranding,
  }
})
