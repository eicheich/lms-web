<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { z } from 'zod'
import { AlertCircle, Eye, EyeOff, HelpCircle } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const tenantStore = useTenantStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')
const showForgotHelp = ref(false)

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

async function submitLogin() {
  errorMessage.value = ''
  const parsed = loginSchema.safeParse({ email: email.value.trim(), password: password.value })
  if (!parsed.success) {
    errorMessage.value = parsed.error.issues[0]?.message || 'Periksa kembali isian Anda.'
    return
  }

  try {
    await authStore.login({ ...parsed.data, tenantSlug: tenantStore.activeSlug })
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (err) {
    errorMessage.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Email atau password tidak sesuai. Silakan coba lagi.'
  }
}
</script>

<template>
  <main class="relative flex min-h-screen overflow-hidden bg-slate-50 px-5 py-10 sm:px-8">
    <div class="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />

    <section class="relative mx-auto flex w-full max-w-md flex-col justify-center">
      <div class="mb-8 flex flex-col items-center text-center">
        <div
          v-if="tenantStore.branding.logoUrl"
          class="mb-4 h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <img :src="tenantStore.branding.logoUrl" alt="Logo sekolah" class="h-full w-full object-contain p-1" />
        </div>
        <div
          v-else
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white shadow-sm"
          aria-hidden="true"
        >
          {{ tenantStore.branding.appName.slice(0, 2).toUpperCase() }}
        </div>
        <p class="text-sm font-semibold text-slate-900">{{ tenantStore.branding.schoolName }}</p>
        <p class="mt-1 text-sm text-slate-500">Learning Management System</p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div class="mb-7">
          <h1 class="text-2xl font-bold tracking-tight text-slate-950">Selamat datang kembali</h1>
          <p class="mt-2 text-sm leading-6 text-slate-600">Masukkan akun sekolah Anda untuk melanjutkan.</p>
        </div>

        <div
          v-if="errorMessage"
          id="login-error"
          role="alert"
          class="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
        >
          <AlertCircle class="mt-0.5 h-4 w-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <form class="space-y-5" novalidate @submit.prevent="submitLogin">
          <div>
            <label for="login-email" class="mb-2 block text-sm font-semibold text-slate-800">Email</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              inputmode="email"
              placeholder="nama@sekolah.sch.id"
              :aria-invalid="Boolean(errorMessage)"
              :aria-describedby="errorMessage ? 'login-error' : undefined"
              class="h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <div class="mb-2 flex items-center justify-between gap-4">
              <label for="login-password" class="block text-sm font-semibold text-slate-800">Password</label>
              <button
                type="button"
                class="cursor-pointer text-xs font-semibold text-primary transition-colors hover:text-primary-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                :aria-expanded="showForgotHelp"
                aria-controls="forgot-password-help"
                @click="showForgotHelp = !showForgotHelp"
              >
                Lupa password?
              </button>
            </div>
            <div class="login-password-control">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Masukkan password"
                :aria-invalid="Boolean(errorMessage)"
                :aria-describedby="errorMessage ? 'login-error' : undefined"
                class="login-password-input"
              />
              <button
                type="button"
                class="login-password-toggle"
                :aria-label="showPassword ? 'Sembunyikan password' : 'Lihat password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="h-[18px] w-[18px]" />
                <Eye v-else class="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          <div
            v-if="showForgotHelp"
            id="forgot-password-help"
            class="flex gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-5 text-slate-700"
          >
            <HelpCircle class="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p>Hubungi Tata Usaha atau Admin IT sekolah untuk mengatur ulang password akun Anda.</p>
          </div>

          <button
            type="submit"
            :disabled="authStore.loading"
            class="login-submit"
          >
            <span
              v-if="authStore.loading"
              class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
              aria-hidden="true"
            />
            {{ authStore.loading ? 'Memverifikasi...' : 'Masuk' }}
          </button>
        </form>
      </div>

      <p class="mt-7 text-center text-xs leading-5 text-slate-500">
        © {{ new Date().getFullYear() }} {{ tenantStore.branding.schoolName }}<br class="sm:hidden" />
        <span class="hidden sm:inline"> · </span>Portal akademik resmi
      </p>
    </section>
  </main>
</template>

<style scoped>
.login-password-control {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 44px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: #fff;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.login-password-control:hover {
  border-color: #94a3b8;
}

.login-password-control:focus-within {
  border-color: var(--color-primary, #059669);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #059669) 20%, transparent);
}

.login-password-input {
  min-width: 0;
  flex: 1 1 auto;
  border: 0;
  background: transparent;
  padding: 0.625rem 0.875rem;
  color: #0f172a;
  font-size: 0.875rem;
  line-height: 1.25rem;
  outline: none;
}

.login-password-input:focus-visible,
.login-password-toggle:focus-visible {
  outline: none;
}

.login-password-input::-ms-reveal,
.login-password-input::-ms-clear {
  display: none;
}

.login-password-toggle {
  display: inline-flex;
  width: 44px;
  min-width: 44px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-left: 1px solid transparent;
  background: transparent;
  color: #64748b;
  transition: background-color 160ms ease, color 160ms ease;
}

.login-password-toggle:hover {
  background: #f1f5f9;
  color: #334155;
}

.login-submit {
  display: inline-flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 0;
  border-radius: 0.5rem;
  background: var(--color-primary, #059669);
  padding: 0.6875rem 1.25rem;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
  transition: filter 160ms ease, opacity 160ms ease;
}

.login-submit:hover:not(:disabled) {
  filter: brightness(0.92);
}

.login-submit:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
