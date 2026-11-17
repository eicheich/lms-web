<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

defineProps<{
  page: number
  totalPages: number
  total: number
  limit: number
}>()

const emit = defineEmits<{
  (e: 'update:page', value: number): void
}>()
</script>

<template>
  <div
    v-if="total > 0"
    class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600"
  >
    <p>
      Halaman <span class="font-bold text-slate-900">{{ page }}</span> dari
      <span class="font-bold text-slate-900">{{ totalPages }}</span>
      <span class="text-slate-400"> ({{ total }} total data)</span>
    </p>
    <div class="flex items-center gap-2">
      <button
        type="button"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
        class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft class="h-3.5 w-3.5" />
        Sebelumnya
      </button>
      <button
        type="button"
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
        class="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Berikutnya
        <ChevronRight class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
