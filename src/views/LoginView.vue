<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { z } from 'zod'
import { LogIn, Building2, AlertCircle, Eye, EyeOff } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const tenantStore = useTenantStore()

const tenantSlug = ref(tenantStore.activeSlug || 'al-iman')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')

const loginSchema = z.object({
  tenantSlug: z.string().min(2, 'Slug sekolah minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

async function handleBrandingReload() {
  errorMessage.value = ''
  try {
    await tenantStore.fetchPublicBranding(tenantSlug.value)
  } catch {
    errorMessage.value = 'Gagal memuat branding sekolah dari server API.'
  }
}

async function submitLogin() {
  errorMessage.value = ''
  const parsed = loginSchema.safeParse({
    tenantSlug: tenantSlug.value,
    email: email.value,
    password: password.value,
  })
  if (!parsed.success) {
    errorMessage.value = parsed.error.issues[0]?.message || 'Input tidak valid'
    return
  }

  try {
    await tenantStore.fetchPublicBranding(tenantSlug.value)
    await authStore.login(parsed.data)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (err) {
    errorMessage.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal masuk. Pastikan server API menyala serta email, password, dan slug sekolah benar.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
    <div class="w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-200 p-8 md:p-10">
      <div class="flex items-center gap-3 mb-8">
        <div
          v-if="tenantStore.branding.logoUrl"
          class="h-11 w-11 rounded-2xl overflow-hidden border border-slate-200 shrink-0"
        >
          <img :src="tenantStore.branding.logoUrl" alt="Logo" class="h-full w-full object-cover" />
        </div>
        <div
          v-else
          class="h-11 w-11 rounded-2xl bg-primary text-white font-bold flex items-center justify-center shadow-sm text-lg"
        >
          {{ tenantStore.branding.appName.slice(0, 2).toUpperCase() }}
        </div>
        <div>
          <h1 class="text-lg font-bold text-slate-900">{{ tenantStore.branding.appName }}</h1>
          <p class="text-xs text-slate-500">{{ tenantStore.branding.schoolName }}</p>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-slate-900 mb-1">Masuk Portal</h2>
      <p class="text-sm text-slate-500 mb-6">
        Gunakan akun sekolah Anda untuk mengakses Learning Hub, CBT, dan Global Center.
      </p>

      <div
        v-if="errorMessage"
        class="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700"
      >
        <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
        <span>{{ errorMessage }}</span>
      </div>

      <form @submit.prevent="submitLogin" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">
            Kode Sekolah
          </label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Building2 class="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                v-model="tenantSlug"
                type="text"
                placeholder="al-iman"
                class="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="button"
              @click="handleBrandingReload"
              class="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Muat Tema
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
          <input
            v-model="email"
            type="email"
            required
            placeholder="nama@sekolah.sch.id"
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="••••••••"
              class="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              :title="showPassword ? 'Sembunyikan password' : 'Lihat password'"
            >
              <EyeOff v-if="showPassword" class="h-4 w-4" />
              <Eye v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          :disabled="authStore.loading"
          class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60 transition"
        >
          <LogIn class="h-4 w-4" />
          {{ authStore.loading ? 'Memproses...' : 'Masuk ke Portal' }}
        </button>
      </form>

      <p class="mt-8 text-center text-[11px] text-slate-400">
        {{ tenantStore.branding.schoolName }} • Portal Akademik Resmi
      </p>
    </div>
  </div>
</template>
