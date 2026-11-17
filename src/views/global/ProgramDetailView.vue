<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import SduiRenderer from '@/components/sdui/SduiRenderer.vue'
import type { ContentBlock, GlobalProgram } from '@/types/api'

const route = useRoute()
const programId = route.params.id as string

const program = ref<GlobalProgram | null>(null)
const blocks = ref<ContentBlock[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [progRes, blkRes] = await Promise.all([
      apiRequest<GlobalProgram>({ method: 'GET', url: `/global/programs/${programId}` }),
      apiRequest<ContentBlock[]>({ method: 'GET', url: `/global/programs/${programId}/blocks` }),
    ])
    program.value = progRes
    blocks.value = blkRes
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <router-link
        to="/global"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary"
      >
        <ArrowLeft class="h-4 w-4" />
        Kembali ke Global & Career Hub
      </router-link>
      <span v-if="program" class="text-xs font-semibold text-slate-500">
        {{ program.category }} • {{ program.destination }}
      </span>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-slate-500">
      Memuat detail program...
    </div>

    <SduiRenderer v-else :blocks="blocks" />
  </div>
</template>
