<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    aria-live="polite"
    class="fixed top-4 right-4 z-[60] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0 no-print"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-4 opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-4 opacity-0"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="[
          'pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lg bg-white',
          t.type === 'success'
            ? 'border-emerald-200'
            : t.type === 'error'
              ? 'border-red-200'
              : 'border-sky-200',
        ]"
      >
        <CheckCircle2
          v-if="t.type === 'success'"
          class="h-5 w-5 text-emerald-600 shrink-0 mt-0.5"
        />
        <AlertCircle
          v-else-if="t.type === 'error'"
          class="h-5 w-5 text-red-600 shrink-0 mt-0.5"
        />
        <Info v-else class="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />

        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-slate-900">{{ t.title }}</p>
          <p v-if="t.message" class="text-xs text-slate-600 mt-0.5 leading-relaxed">
            {{ t.message }}
          </p>
        </div>

        <button
          type="button"
          @click="dismiss(t.id)"
          class="text-slate-400 hover:text-slate-600 shrink-0"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
