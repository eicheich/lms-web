<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Blocks, Calendar, Compass, Users } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import SduiRenderer from '@/components/sdui/SduiRenderer.vue'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { ContentBlock, GlobalProgram } from '@/types/api'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
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
  } catch {
    toast.error('Gagal memuat detail program')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <router-link
        to="/global"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary"
      >
        <ArrowLeft class="h-4 w-4" />
        Kembali ke Global & Career Hub
      </router-link>

      <router-link
        v-if="authStore.canManageGlobalHub && program"
        :to="`/admin/sdui-builder?programId=${program.id}`"
        class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
      >
        <Blocks class="h-4 w-4" />
        Kelola Blok Konten Program
      </router-link>
    </div>

    <SkeletonCard v-if="loading" :count="2" />

    <template v-else-if="program">
      <!-- Metadata Header Card (selalu tampil meski blok konten masih kosong) -->
      <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div
          v-if="program.bannerUrl || program.coverImageUrl"
          class="h-48 w-full bg-slate-100 overflow-hidden"
        >
          <img
            :src="(program.bannerUrl || program.coverImageUrl)!"
            :alt="program.title"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="p-6 md:p-8 space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">
              {{ program.category || program.targetAudience || 'Program Sekolah' }}
            </span>
            <span
              v-if="program.destination"
              class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {{ program.destination }}
            </span>
          </div>

          <h2 class="text-2xl font-bold text-slate-900">{{ program.title }}</h2>

          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {{ program.description || program.summary || 'Belum ada deskripsi program.' }}
          </p>

          <div class="flex flex-wrap gap-5 pt-2 text-xs text-slate-500 border-t border-slate-100">
            <span v-if="program.targetAudience" class="inline-flex items-center gap-1.5">
              <Compass class="h-4 w-4 text-primary" />
              Target: {{ program.targetAudience }}
            </span>
            <span v-if="program.quota" class="inline-flex items-center gap-1.5">
              <Users class="h-4 w-4 text-primary" />
              Kuota: {{ program.quota }} Siswa
            </span>
            <span v-if="program.startDate" class="inline-flex items-center gap-1.5">
              <Calendar class="h-4 w-4 text-primary" />
              Mulai: {{ new Date(program.startDate).toLocaleDateString('id-ID') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Blok Konten Tambahan -->
      <SduiRenderer v-if="blocks.length > 0" :blocks="blocks" />

      <EmptyState
        v-else
        title="Belum Ada Blok Konten Tambahan"
        :description="
          authStore.canManageGlobalHub
            ? 'Anda dapat menambahkan banner hero, statistik, keunggulan, dan artikel tambahan melalui Desainer Halaman Program.'
            : 'Informasi detail tambahan untuk program ini akan segera diperbarui oleh pihak sekolah.'
        "
        :icon="Blocks"
      >
        <template v-if="authStore.canManageGlobalHub" #action>
          <router-link
            :to="`/admin/sdui-builder?programId=${program.id}`"
            class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <Blocks class="h-4 w-4" />
            Tambah Blok Konten Sekarang
          </router-link>
        </template>
      </EmptyState>
    </template>
  </div>
</template>
