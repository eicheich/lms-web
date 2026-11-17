<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { CheckCircle2, Palette, RotateCcw, Sparkles } from 'lucide-vue-next'
import { useTenantStore } from '@/stores/tenant'

const tenantStore = useTenantStore()

const form = reactive({
  appName: tenantStore.branding.appName,
  logoUrl: tenantStore.branding.logoUrl,
  primaryColor: tenantStore.branding.primaryColor,
  secondaryColor: tenantStore.branding.secondaryColor,
})

const saving = ref(false)
const savedMessage = ref('')

const hasUnsavedChanges = computed(
  () =>
    form.appName !== tenantStore.branding.appName ||
    form.logoUrl !== tenantStore.branding.logoUrl ||
    form.primaryColor !== tenantStore.branding.primaryColor ||
    form.secondaryColor !== tenantStore.branding.secondaryColor,
)

const presets = [
  { name: 'Al-Iman Emerald', primary: '#059669', secondary: '#0284c7' },
  { name: 'Royal Indigo', primary: '#4f46e5', secondary: '#0ea5e9' },
  { name: 'Amber Gold', primary: '#d97706', secondary: '#0f766e' },
  { name: 'Crimson Academy', primary: '#be123c', secondary: '#1d4ed8' },
]

function applyPreset(primary: string, secondary: string) {
  form.primaryColor = primary
  form.secondaryColor = secondary
  previewLive()
}

function previewLive() {
  tenantStore.applyThemeVariables({
    ...tenantStore.branding,
    ...form,
  })
}

function resetForm() {
  form.appName = tenantStore.branding.appName
  form.logoUrl = tenantStore.branding.logoUrl
  form.primaryColor = tenantStore.branding.primaryColor
  form.secondaryColor = tenantStore.branding.secondaryColor
  tenantStore.applyThemeVariables()
}

async function saveBranding() {
  saving.value = true
  savedMessage.value = ''
  try {
    await tenantStore.updateBranding({ ...form })
    savedMessage.value = 'Konfigurasi White-Label Branding berhasil disimpan dan diterapkan!'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Left Form -->
    <div class="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Palette class="h-5 w-5 text-primary" />
            Identitas Visual Sekolah
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Sesuaikan nama aplikasi portal, logo, dan warna identitas sekolah Anda.
          </p>
        </div>
      </div>

      <div v-if="hasUnsavedChanges" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
        Perubahan sedang dipratinjau dan belum disimpan.
      </div>

      <div
        v-if="savedMessage"
        class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700"
      >
        <CheckCircle2 class="h-4 w-4 shrink-0" />
        {{ savedMessage }}
      </div>

      <form @submit.prevent="saveBranding" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Nama Aplikasi Portal</label>
          <input
            v-model="form.appName"
            @input="previewLive"
            type="text"
            required
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">URL Logo Sekolah (Opsional)</label>
          <input
            v-model="form.logoUrl"
            @input="previewLive"
            type="url"
            placeholder="https://example.com/logo.png"
            class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Primary Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.primaryColor"
                @input="previewLive"
                type="color"
                class="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                v-model="form.primaryColor"
                @input="previewLive"
                type="text"
                class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Secondary Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="form.secondaryColor"
                @input="previewLive"
                type="color"
                class="h-10 w-14 rounded-lg border border-slate-200 cursor-pointer"
              />
              <input
                v-model="form.secondaryColor"
                @input="previewLive"
                type="text"
                class="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <p class="text-xs font-semibold text-slate-700 mb-2">Preset Tema Cepat</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="p in presets"
              :key="p.name"
              type="button"
              @click="applyPreset(p.primary, p.secondary)"
              class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: p.primary }" />
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: p.secondary }" />
              {{ p.name }}
            </button>
          </div>
        </div>

        <div class="pt-3 flex items-center gap-3">
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60 transition"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan Identitas Sekolah' }}
          </button>
          <button
            type="button"
            @click="resetForm"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw class="h-4 w-4" />
            Batalkan Perubahan
          </button>
        </div>
      </form>
    </div>

    <!-- Right Live Preview -->
    <div class="lg:col-span-5 space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          <Sparkles class="h-3.5 w-3.5 text-primary" />
          Pratinjau Langsung
        </span>

        <div class="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div
            class="p-5 text-white"
            :style="{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }"
          >
            <div class="flex items-center gap-3 mb-4">
              <div class="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold">
                {{ form.appName.slice(0, 2).toUpperCase() }}
              </div>
              <div>
                <p class="text-sm font-bold">{{ form.appName }}</p>
                <p class="text-[11px] text-white/80">{{ tenantStore.branding.schoolName }}</p>
              </div>
            </div>
            <p class="text-base font-bold">Selamat Datang di Portal Akademik</p>
            <p class="text-xs text-white/85 mt-1">
              Tampilan mobile & web akan mengikuti warna utama sekolah Anda.
            </p>
          </div>
          <div class="p-4 bg-white flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-600">Tombol Aksi Utama</span>
            <span
              class="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white"
              :style="{ backgroundColor: form.primaryColor }"
            >
              Mulai Belajar
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
