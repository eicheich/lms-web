<script setup lang="ts">
defineProps<{
  count?: number
  columns?: 1 | 2 | 3
}>()
</script>

<template>
  <div
    :class="[
      'grid gap-4',
      columns === 3
        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        : columns === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : 'grid-cols-1',
    ]"
  >
    <div
      v-for="i in count || 3"
      :key="i"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="h-5 w-20 rounded-lg bg-slate-200" />
        <div class="h-4 w-16 rounded-lg bg-slate-100" />
      </div>
      <div class="h-5 w-3/4 rounded-lg bg-slate-200" />
      <div class="space-y-2">
        <div class="h-3 w-full rounded bg-slate-100" />
        <div class="h-3 w-5/6 rounded bg-slate-100" />
      </div>
    </div>
  </div>
</template>
