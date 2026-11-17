<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Blocks, Plus, CheckCircle2 } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import SduiRenderer from '@/components/sdui/SduiRenderer.vue'
import type { ContentBlock, GlobalProgram, SduiBlockType } from '@/types/api'

const programs = ref<GlobalProgram[]>([])
const selectedProgramId = ref('')
const blocks = ref<ContentBlock[]>([])
const loading = ref(true)
const saving = ref(false)
const feedbackMsg = ref('')

// New Block Form
const blockType = ref<SduiBlockType>('RICH_TEXT_BLOCK')
const heroHeadline = ref('Program Unggulan Sekolah 2027')
const heroSubheadline = ref('Pengalaman belajar internasional bersama mentor terbaik.')
const heroCtaText = ref('Daftar Sekarang')
const heroCtaUrl = ref('https://wa.me/6281234567890')

const statsTitle = ref('Statistik Pencapaian')
const statValue1 = ref('14 Hari')
const statLabel1 = ref('Durasi Program')

const richTextBody = ref('Informasi detail mengenai kurikulum, akomodasi, dan syarat pendaftaran.')
const richTextAlign = ref<'left' | 'center' | 'right'>('left')

async function loadBlocks(programId: string) {
  if (!programId) return
  blocks.value = await apiRequest<ContentBlock[]>({
    method: 'GET',
    url: `/global/programs/${programId}/blocks`,
  })
}

onMounted(async () => {
  try {
    const res = await apiRequest<{ items: GlobalProgram[] }>({
      method: 'GET',
      url: '/global/programs',
    })
    programs.value = res.items ?? []
    if (programs.value.length > 0) {
      selectedProgramId.value = programs.value[0].id
      await loadBlocks(selectedProgramId.value)
    }
  } finally {
    loading.value = false
  }
})

watch(selectedProgramId, (id) => {
  loadBlocks(id)
})

async function addBlock() {
  if (!selectedProgramId.value) return
  saving.value = true
  feedbackMsg.value = ''

  let content: ContentBlock['content']
  if (blockType.value === 'HERO_BLOCK') {
    content = {
      schema_version: 1,
      badgeText: 'New Block',
      headline: heroHeadline.value,
      subheadline: heroSubheadline.value,
      ctaText: heroCtaText.value,
      ctaUrl: heroCtaUrl.value,
    }
  } else if (blockType.value === 'STATS_BLOCK') {
    content = {
      schema_version: 1,
      title: statsTitle.value,
      items: [
        { value: statValue1.value, label: statLabel1.value, description: 'Terverifikasi' },
        { value: '100%', label: 'Pendampingan', description: 'Konselor & Ustadz' },
        { value: 'Top 50', label: 'Mitra Kampus', description: 'QS World Ranking' },
      ],
    }
  } else if (blockType.value === 'ICON_GRID_BLOCK') {
    content = {
      schema_version: 1,
      title: 'Keunggulan Program',
      items: [
        { icon: 'Globe', title: 'Wawasan Global', description: 'Kunjungan akademik lintas negara.' },
        { icon: 'Award', title: 'Sertifikasi', description: 'Sertifikat resmi untuk portofolio.' },
        { icon: 'BookOpen', title: 'Mentoring Intensif', description: 'Bimbingan esai beasiswa.' },
      ],
    }
  } else {
    content = {
      schema_version: 1,
      body: richTextBody.value,
      alignment: richTextAlign.value,
    }
  }

  try {
    await apiRequest<ContentBlock>({
      method: 'POST',
      url: `/global/programs/${selectedProgramId.value}/blocks`,
      data: {
        blockType: blockType.value,
        sortOrder: blocks.value.length + 1,
        content,
      },
    })
    await loadBlocks(selectedProgramId.value)
    feedbackMsg.value = `Blok ${blockType.value} berhasil ditambahkan!`
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Blocks class="h-5 w-5 text-primary" />
            Desainer Halaman Program
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Susun blok konten informasi program studi dan kegiatan sekolah secara dinamis.
          </p>
        </div>

        <select
          v-model="selectedProgramId"
          class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 focus:border-primary focus:outline-none"
        >
          <option v-for="p in programs" :key="p.id" :value="p.id">
            {{ p.title }}
          </option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Form Tambah Blok -->
      <div class="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 h-fit">
        <h3 class="text-sm font-bold text-slate-900">Tambah Blok Konten</h3>

        <div
          v-if="feedbackMsg"
          class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"
        >
          <CheckCircle2 class="h-4 w-4 shrink-0" />
          {{ feedbackMsg }}
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Jenis Blok Konten</label>
          <select
            v-model="blockType"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="HERO_BLOCK">Banner Utama (Hero)</option>
            <option value="STATS_BLOCK">Statistik Program</option>
            <option value="ICON_GRID_BLOCK">Daftar Keunggulan (Ikon)</option>
            <option value="RICH_TEXT_BLOCK">Paragraf Teks</option>
          </select>
        </div>

        <template v-if="blockType === 'HERO_BLOCK'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Headline</label>
            <input v-model="heroHeadline" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Subheadline</label>
            <textarea v-model="heroSubheadline" rows="2" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">CTA Text</label>
            <input v-model="heroCtaText" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </template>

        <template v-else-if="blockType === 'STATS_BLOCK'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Judul Bagian</label>
            <input v-model="statsTitle" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Angka 1</label>
              <input v-model="statValue1" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Label 1</label>
              <input v-model="statLabel1" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
        </template>

        <template v-else-if="blockType === 'RICH_TEXT_BLOCK'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Isi Teks</label>
            <textarea v-model="richTextBody" rows="4" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Alignment</label>
            <select v-model="richTextAlign" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </template>

        <button
          type="button"
          :disabled="saving"
          @click="addBlock"
          class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Plus class="h-4 w-4" />
          {{ saving ? 'Menambahkan...' : 'Tambahkan Blok ke Halaman' }}
        </button>
      </div>

      <!-- Live Preview -->
      <div class="lg:col-span-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Pratinjau Halaman ({{ blocks.length }} Bagian)
        </p>
        <div v-if="loading" class="text-sm text-slate-500">Memuat blok...</div>
        <SduiRenderer v-else :blocks="blocks" />
      </div>
    </div>
  </div>
</template>
