<script setup lang="ts">
import { AlertTriangle, X } from 'lucide-vue-next'

defineProps<{
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'danger' | 'success'
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4"
  >
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div
            :class="[
              'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
              variant === 'danger'
                ? 'bg-red-50 text-red-600'
                : variant === 'success'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600',
            ]"
          >
            <AlertTriangle class="h-5 w-5" />
          </div>
          <h3 class="text-base font-bold text-slate-900">{{ title }}</h3>
        </div>
        <button
          type="button"
          @click="emit('cancel')"
          class="text-slate-400 hover:text-slate-600"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <p class="text-sm text-slate-600 leading-relaxed">{{ description }}</p>

      <slot />

      <div class="pt-2 flex justify-end gap-2.5">
        <button
          type="button"
          :disabled="loading"
          @click="emit('cancel')"
          class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {{ cancelText || 'Batal' }}
        </button>
        <button
          type="button"
          :disabled="loading"
          @click="emit('confirm')"
          :class="[
            'rounded-xl px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60',
            variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : variant === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-primary hover:opacity-90',
          ]"
        >
          {{ loading ? 'Memproses...' : confirmText || 'Ya, Lanjutkan' }}
        </button>
      </div>
    </div>
  </div>
</template>
