<script setup lang="ts">
import type { Component } from 'vue'
import { Inbox } from 'lucide-vue-next'

defineProps<{
  title: string
  description?: string
  icon?: Component
}>()
</script>

<template>
  <div class="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center space-y-2.5">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <component :is="icon || Inbox" class="h-6 w-6" />
    </div>
    <h3 class="text-sm font-bold text-slate-900">{{ title }}</h3>
    <p v-if="description" class="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="pt-2">
      <slot name="action" />
    </div>
  </div>
</template>
