<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, GripVertical, LayoutGrid } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useToast } from '@/composables/useToast'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import type { HomeBlockKey, HomeLayoutConfig } from '@/types/api'

const toast = useToast()

const blockMeta: Record<HomeBlockKey, { title: string; desc: string }> = {
  HERO_BANNER: {
    title: 'Hero Banner Utama',
    desc: 'Banner sambutan gradien dengan tombol ajakan ke Global Hub.',
  },
  CAREER_STATS: {
    title: 'Ringkasan Katalog Global',
    desc: 'Jumlah program, destinasi, dan beasiswa dari data katalog yang tersedia.',
  },
  GLOBAL_PROGRAMS: {
    title: 'Program Immersion & Global',
    desc: 'Katalog program riset & camp luar negeri.',
  },
  TOP_SCHOLARSHIPS: {
    title: 'Beasiswa Internasional Unggulan',
    desc: 'Daftar beasiswa Full/Partial untuk siswa.',
  },
  CONSULTATION_CTA: {
    title: 'Ajakan Konsultasi Konselor',
    desc: 'Banner CTA pendaftaran konsultasi studi luar negeri.',
  },
}

const homeBlocks = ref<HomeBlockKey[]>([])
const bannerActive = ref(true)
const showConsultation = ref(true)
const showScholarships = ref(true)
const loading = ref(true)
const saving = ref(false)
const draggedIndex = ref<number | null>(null)

onMounted(async () => {
  try {
    const res = await apiRequest<HomeLayoutConfig>({ method: 'GET', url: '/app/home-layout' })
    homeBlocks.value = [...res.homeBlocks]
    bannerActive.value = res.bannerActive
    showConsultation.value = res.featuresToggle.showConsultation
    showScholarships.value = res.featuresToggle.showScholarships
  } catch {
    toast.error('Gagal memuat konfigurasi Home Layout')
  } finally {
    loading.value = false
  }
})

function onDragStart(index: number) {
  draggedIndex.value = index
}

function onDrop(targetIndex: number) {
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) return
  const arr = [...homeBlocks.value]
  const [moved] = arr.splice(draggedIndex.value, 1)
  arr.splice(targetIndex, 0, moved)
  homeBlocks.value = arr
  draggedIndex.value = null
}

function moveBlock(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= homeBlocks.value.length) return
  const arr = [...homeBlocks.value]
  const [item] = arr.splice(index, 1)
  arr.splice(target, 0, item)
  homeBlocks.value = arr
}

async function saveLayout() {
  saving.value = true
  try {
    await apiRequest<HomeLayoutConfig>({
      method: 'PUT',
      url: '/app/home-layout',
      data: {
        homeBlocks: homeBlocks.value,
        bannerActive: bannerActive.value,
        featuresToggle: {
          showConsultation: showConsultation.value,
          showScholarships: showScholarships.value,
        },
      },
    })
    toast.success('Urutan Beranda Dinamis berhasil disimpan!')
  } catch {
    toast.error('Gagal menyimpan konfigurasi Home Layout')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <div class="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
          <LayoutGrid class="h-5 w-5 text-primary" />
          Editor Tata Letak Beranda Dinamis
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Tarik kartu atau gunakan tombol panah untuk mengatur urutan tampilan di Beranda.
        </p>
      </div>

      <SkeletonCard v-if="loading" :count="1" />

      <template v-else>
        <div class="space-y-2.5">
          <div
            v-for="(key, idx) in homeBlocks"
            :key="key"
            draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover.prevent
            @drop="onDrop(idx)"
            :class="[
              'flex items-center justify-between gap-3 rounded-xl border p-3.5 cursor-grab active:cursor-grabbing transition',
              draggedIndex === idx
                ? 'border-primary bg-primary-50/60 opacity-75'
                : 'border-slate-200 bg-slate-50/60 hover:border-primary/40',
            ]"
          >
            <div class="flex items-center gap-3">
              <GripVertical class="h-4 w-4 text-slate-400" />
              <div>
                <p class="text-sm font-bold text-slate-900">
                  {{ idx + 1 }}. {{ blockMeta[key]?.title || key }}
                </p>
                <p class="text-xs text-slate-500">{{ blockMeta[key]?.desc }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                :disabled="idx === 0"
                @click="moveBlock(idx, -1)"
                class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ArrowUp class="h-4 w-4" />
              </button>
              <button
                type="button"
                :disabled="idx === homeBlocks.length - 1"
                @click="moveBlock(idx, 1)"
                class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ArrowDown class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 pt-4 space-y-3">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Pengaturan Tampilan</p>
          <label class="flex items-center justify-between rounded-xl border border-slate-200 p-3 cursor-pointer">
            <span class="text-sm font-medium text-slate-800">Tampilkan Banner Utama</span>
            <input v-model="bannerActive" type="checkbox" class="h-4 w-4 accent-primary" />
          </label>
          <label class="flex items-center justify-between rounded-xl border border-slate-200 p-3 cursor-pointer">
            <span class="text-sm font-medium text-slate-800">Tampilkan Informasi Beasiswa</span>
            <input v-model="showScholarships" type="checkbox" class="h-4 w-4 accent-primary" />
          </label>
          <label class="flex items-center justify-between rounded-xl border border-slate-200 p-3 cursor-pointer">
            <span class="text-sm font-medium text-slate-800">Tampilkan Ajakan Konsultasi</span>
            <input v-model="showConsultation" type="checkbox" class="h-4 w-4 accent-primary" />
          </label>
        </div>

        <button
          type="button"
          :disabled="saving"
          @click="saveLayout"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60 transition"
        >
          {{ saving ? 'Menyimpan...' : 'Simpan Home Layout' }}
        </button>
      </template>
    </div>

    <!-- Live Wireframe Preview -->
    <div class="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
      <h3 class="text-sm font-bold text-slate-900">Urutan Render Beranda Saat Ini</h3>
      <div class="space-y-2.5 rounded-xl bg-slate-100 p-4">
        <div
          v-for="key in homeBlocks"
          :key="key"
          :class="[
            'rounded-lg p-3 text-xs font-semibold border transition',
            (key === 'HERO_BANNER' && !bannerActive) ||
            (key === 'TOP_SCHOLARSHIPS' && !showScholarships) ||
            (key === 'CONSULTATION_CTA' && !showConsultation)
              ? 'bg-slate-200/70 text-slate-400 border-dashed border-slate-300 line-through'
              : 'bg-white text-slate-800 border-slate-200 shadow-xs',
          ]"
        >
          {{ blockMeta[key]?.title }}
        </div>
      </div>
    </div>
  </div>
</template>
