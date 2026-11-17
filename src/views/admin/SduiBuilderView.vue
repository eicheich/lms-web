<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Blocks, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useToast } from '@/composables/useToast'
import SduiRenderer from '@/components/sdui/SduiRenderer.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type {
  ContentBlock,
  GlobalProgram,
  HeroBlockContent,
  IconGridBlockContent,
  RichTextBlockContent,
  SduiBlockType,
  StatsBlockContent,
} from '@/types/api'

const route = useRoute()
const toast = useToast()

const programs = ref<GlobalProgram[]>([])
const selectedProgramId = ref('')
const blocks = ref<ContentBlock[]>([])
const loading = ref(true)
const saving = ref(false)
const editingBlockId = ref<string | null>(null)
const deleteBlockTarget = ref<ContentBlock | null>(null)
const deletingBlock = ref(false)

// Block Form State
const blockType = ref<SduiBlockType>('RICH_TEXT_BLOCK')

// HERO_BLOCK fields
const heroBadgeText = ref('')
const heroHeadline = ref('')
const heroSubheadline = ref('')
const heroCtaText = ref('')
const heroCtaUrl = ref('')

// STATS_BLOCK fields (dynamic items)
const statsTitle = ref('')
const statsItems = ref<Array<{ value: string; label: string; description: string }>>([
  { value: '', label: '', description: '' },
])

// ICON_GRID_BLOCK fields (dynamic items)
const iconGridTitle = ref('')
const iconGridItems = ref<Array<{ icon: string; title: string; description: string }>>([
  { icon: 'Globe', title: '', description: '' },
])
const iconOptions = [
  'Globe',
  'GraduationCap',
  'Award',
  'BookOpen',
  'Compass',
  'ShieldCheck',
  'Sparkles',
]

// RICH_TEXT_BLOCK fields
const richTextBody = ref('')
const richTextAlign = ref<'left' | 'center' | 'right'>('left')

const blockTypeLabels: Record<SduiBlockType, string> = {
  HERO_BLOCK: 'Banner Utama (Hero)',
  STATS_BLOCK: 'Statistik Program',
  ICON_GRID_BLOCK: 'Daftar Keunggulan (Ikon)',
  RICH_TEXT_BLOCK: 'Paragraf Teks',
}

function resetFormFields() {
  heroBadgeText.value = ''
  heroHeadline.value = ''
  heroSubheadline.value = ''
  heroCtaText.value = ''
  heroCtaUrl.value = ''

  statsTitle.value = ''
  statsItems.value = [{ value: '', label: '', description: '' }]

  iconGridTitle.value = ''
  iconGridItems.value = [{ icon: 'Globe', title: '', description: '' }]

  richTextBody.value = ''
  richTextAlign.value = 'left'
}

async function loadBlocks(programId: string) {
  if (!programId) return
  blocks.value = await apiRequest<ContentBlock[]>({
    method: 'GET',
    url: `/global/programs/${programId}/blocks`,
  })
}

onMounted(async () => {
  try {
    const res = await apiRequest<{ items: GlobalProgram[] } | GlobalProgram[]>({
      method: 'GET',
      url: '/global/programs',
    })
    programs.value = Array.isArray(res) ? res : res.items ?? []
    const queryProgramId = typeof route.query.programId === 'string' ? route.query.programId : ''
    if (programs.value.length > 0) {
      const matched = programs.value.find((p) => p.id === queryProgramId)
      selectedProgramId.value = matched ? matched.id : programs.value[0].id
      await loadBlocks(selectedProgramId.value)
    }
  } finally {
    loading.value = false
  }
})

watch(selectedProgramId, (id) => {
  editingBlockId.value = null
  resetFormFields()
  loadBlocks(id)
})

function addStatItem() {
  statsItems.value.push({ value: '', label: '', description: '' })
}

function removeStatItem(idx: number) {
  if (statsItems.value.length <= 1) return
  statsItems.value.splice(idx, 1)
}

function addIconGridItem() {
  iconGridItems.value.push({ icon: 'Sparkles', title: '', description: '' })
}

function removeIconGridItem(idx: number) {
  if (iconGridItems.value.length <= 1) return
  iconGridItems.value.splice(idx, 1)
}

function startEditBlock(blk: ContentBlock) {
  editingBlockId.value = blk.id
  blockType.value = blk.blockType
  if (blk.blockType === 'HERO_BLOCK') {
    const c = blk.content as HeroBlockContent
    heroBadgeText.value = c.badgeText || ''
    heroHeadline.value = c.headline || ''
    heroSubheadline.value = c.subheadline || ''
    heroCtaText.value = c.ctaText || ''
    heroCtaUrl.value = c.ctaUrl || ''
  } else if (blk.blockType === 'STATS_BLOCK') {
    const c = blk.content as StatsBlockContent
    statsTitle.value = c.title || ''
    statsItems.value =
      c.items && c.items.length > 0
        ? c.items.map((item) => ({
            value: item.value || '',
            label: item.label || '',
            description: item.description || '',
          }))
        : [{ value: '', label: '', description: '' }]
  } else if (blk.blockType === 'ICON_GRID_BLOCK') {
    const c = blk.content as IconGridBlockContent
    iconGridTitle.value = c.title || ''
    iconGridItems.value =
      c.items && c.items.length > 0
        ? c.items.map((item) => ({
            icon: item.icon || 'Globe',
            title: item.title || '',
            description: item.description || '',
          }))
        : [{ icon: 'Globe', title: '', description: '' }]
  } else if (blk.blockType === 'RICH_TEXT_BLOCK') {
    const c = blk.content as RichTextBlockContent
    richTextBody.value = c.body || ''
    richTextAlign.value = c.alignment || 'left'
  }
}

function cancelEdit() {
  editingBlockId.value = null
  resetFormFields()
}

async function saveBlock() {
  if (!selectedProgramId.value) return
  saving.value = true

  let content: ContentBlock['content']
  if (blockType.value === 'HERO_BLOCK') {
    content = {
      schema_version: 1,
      badgeText: heroBadgeText.value.trim() || undefined,
      headline: heroHeadline.value.trim(),
      subheadline: heroSubheadline.value.trim() || undefined,
      ctaText: heroCtaText.value.trim(),
      ctaUrl: heroCtaUrl.value.trim() || '#',
    }
  } else if (blockType.value === 'STATS_BLOCK') {
    const validStats = statsItems.value
      .filter((i) => i.value.trim() || i.label.trim())
      .map((i) => ({
        value: i.value.trim(),
        label: i.label.trim(),
        ...(i.description.trim() ? { description: i.description.trim() } : {}),
      }))
    if (validStats.length === 0) {
      toast.error('Isi minimal 1 item statistik')
      saving.value = false
      return
    }
    content = {
      schema_version: 1,
      title: statsTitle.value.trim() || undefined,
      items: validStats,
    }
  } else if (blockType.value === 'ICON_GRID_BLOCK') {
    const validIcons = iconGridItems.value
      .filter((i) => i.title.trim() || i.description.trim())
      .map((i) => ({
        icon: i.icon || 'Globe',
        title: i.title.trim(),
        description: i.description.trim(),
      }))
    if (validIcons.length === 0) {
      toast.error('Isi minimal 1 item keunggulan')
      saving.value = false
      return
    }
    content = {
      schema_version: 1,
      title: iconGridTitle.value.trim() || undefined,
      items: validIcons,
    }
  } else {
    if (!richTextBody.value.trim()) {
      toast.error('Isi paragraf teks tidak boleh kosong')
      saving.value = false
      return
    }
    content = {
      schema_version: 1,
      body: richTextBody.value,
      alignment: richTextAlign.value,
    }
  }

  try {
    if (editingBlockId.value) {
      const existing = blocks.value.find((b) => b.id === editingBlockId.value)
      await apiRequest<ContentBlock>({
        method: 'PUT',
        url: `/global/programs/${selectedProgramId.value}/blocks/${editingBlockId.value}`,
        data: {
          blockType: blockType.value,
          sortOrder: existing?.sortOrder ?? 1,
          content,
        },
      })
      toast.success('Blok konten berhasil diperbarui!')
      editingBlockId.value = null
      resetFormFields()
    } else {
      await apiRequest<ContentBlock>({
        method: 'POST',
        url: `/global/programs/${selectedProgramId.value}/blocks`,
        data: {
          blockType: blockType.value,
          sortOrder: blocks.value.length + 1,
          content,
        },
      })
      toast.success('Blok konten baru berhasil ditambahkan!')
      resetFormFields()
    }
    await loadBlocks(selectedProgramId.value)
  } catch (err) {
    toast.error(
      'Gagal menyimpan blok konten',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Pastikan seluruh kolom wajib sudah diisi dengan benar.',
    )
  } finally {
    saving.value = false
  }
}

async function confirmDeleteBlock() {
  if (!deleteBlockTarget.value || !selectedProgramId.value) return
  deletingBlock.value = true
  try {
    await apiRequest({
      method: 'DELETE',
      url: `/global/programs/${selectedProgramId.value}/blocks/${deleteBlockTarget.value.id}`,
    })
    toast.success('Blok konten berhasil dihapus!')
    if (editingBlockId.value === deleteBlockTarget.value.id) {
      cancelEdit()
    }
    deleteBlockTarget.value = null
    await loadBlocks(selectedProgramId.value)
  } catch (err) {
    toast.error(
      'Gagal menghapus blok konten',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Pastikan endpoint DELETE blok tersedia di backend.',
    )
  } finally {
    deletingBlock.value = false
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
            Susun, ubah, dan hapus blok konten informasi program studi dan kegiatan sekolah secara dinamis.
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
      <!-- Form Tambah / Edit Blok -->
      <div class="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 h-fit">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900">
            {{ editingBlockId ? 'Edit Blok Konten' : 'Tambah Blok Konten' }}
          </h3>
          <button
            v-if="editingBlockId"
            type="button"
            @click="cancelEdit"
            class="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            <X class="h-3.5 w-3.5" />
            Batal
          </button>
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

        <!-- HERO_BLOCK FORM -->
        <template v-if="blockType === 'HERO_BLOCK'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Badge Teks (Opsional)</label>
            <input v-model="heroBadgeText" type="text" placeholder="Contoh: Batch 2027" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Headline</label>
            <input v-model="heroHeadline" type="text" placeholder="Judul Banner Utama" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Subheadline</label>
            <textarea v-model="heroSubheadline" rows="2" placeholder="Deskripsi singkat program" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Teks Tombol CTA</label>
              <input v-model="heroCtaText" type="text" placeholder="Daftar Sekarang" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">URL Tombol CTA</label>
              <input v-model="heroCtaUrl" type="url" placeholder="https://wa.me/62..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
        </template>

        <!-- STATS_BLOCK FORM (DYNAMIC) -->
        <template v-else-if="blockType === 'STATS_BLOCK'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Judul Bagian (Opsional)</label>
            <input v-model="statsTitle" type="text" placeholder="Highlight Program" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-slate-700">Daftar Kartu Statistik ({{ statsItems.length }})</label>
              <button
                type="button"
                @click="addStatItem"
                class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus class="h-3.5 w-3.5" />
                Tambah Kartu
              </button>
            </div>

            <div
              v-for="(item, idx) in statsItems"
              :key="idx"
              class="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-slate-500">Kartu #{{ idx + 1 }}</span>
                <button
                  v-if="statsItems.length > 1"
                  type="button"
                  @click="removeStatItem(idx)"
                  class="text-slate-400 hover:text-red-600"
                  title="Hapus kartu"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="item.value"
                  type="text"
                  placeholder="Nilai (misal: 14 Hari)"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
                <input
                  v-model="item.label"
                  type="text"
                  placeholder="Label (misal: Durasi)"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <input
                v-model="item.description"
                type="text"
                placeholder="Keterangan tambahan (opsional)"
                class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>
        </template>

        <!-- ICON_GRID_BLOCK FORM (DYNAMIC) -->
        <template v-else-if="blockType === 'ICON_GRID_BLOCK'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Judul Bagian (Opsional)</label>
            <input v-model="iconGridTitle" type="text" placeholder="Fasilitas & Keunggulan" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-slate-700">Daftar Keunggulan ({{ iconGridItems.length }})</label>
              <button
                type="button"
                @click="addIconGridItem"
                class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus class="h-3.5 w-3.5" />
                Tambah Item
              </button>
            </div>

            <div
              v-for="(item, idx) in iconGridItems"
              :key="idx"
              class="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold text-slate-500">Item #{{ idx + 1 }}</span>
                <button
                  v-if="iconGridItems.length > 1"
                  type="button"
                  @click="removeIconGridItem(idx)"
                  class="text-slate-400 hover:text-red-600"
                  title="Hapus item"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <select
                  v-model="item.icon"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <option v-for="ic in iconOptions" :key="ic" :value="ic">{{ ic }}</option>
                </select>
                <input
                  v-model="item.title"
                  type="text"
                  placeholder="Judul keunggulan"
                  class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                />
              </div>
              <textarea
                v-model="item.description"
                rows="2"
                placeholder="Deskripsi keunggulan..."
                class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>
        </template>

        <!-- RICH_TEXT_BLOCK FORM -->
        <template v-else-if="blockType === 'RICH_TEXT_BLOCK'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Isi Teks</label>
            <textarea v-model="richTextBody" rows="4" placeholder="Tulis deskripsi atau informasi lengkap..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Alignment</label>
            <select v-model="richTextAlign" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="left">Rata Kiri</option>
              <option value="center">Rata Tengah</option>
              <option value="right">Rata Kanan</option>
            </select>
          </div>
        </template>

        <button
          type="button"
          :disabled="saving"
          @click="saveBlock"
          class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Plus v-if="!editingBlockId" class="h-4 w-4" />
          <Pencil v-else class="h-4 w-4" />
          {{
            saving
              ? 'Menyimpan...'
              : editingBlockId
                ? 'Simpan Perubahan Blok'
                : 'Tambahkan Blok ke Halaman'
          }}
        </button>

        <!-- Daftar Blok Tersimpan dengan Tombol Edit & Hapus -->
        <div v-if="blocks.length > 0" class="pt-4 border-t border-slate-100 space-y-2">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
            Blok Tersimpan ({{ blocks.length }})
          </p>
          <div
            v-for="(blk, idx) in blocks"
            :key="blk.id"
            :class="[
              'flex items-center justify-between gap-2 rounded-xl border p-2.5 text-xs',
              editingBlockId === blk.id ? 'border-primary bg-primary-50/60' : 'border-slate-200 bg-slate-50',
            ]"
          >
            <span class="font-semibold text-slate-800 truncate">
              {{ idx + 1 }}. {{ blockTypeLabels[blk.blockType] || blk.blockType }}
            </span>
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                @click="startEditBlock(blk)"
                class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-primary"
                title="Edit Blok"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                @click="deleteBlockTarget = blk"
                class="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-600"
                title="Hapus Blok"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Preview -->
      <div class="lg:col-span-7 rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
        <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Pratinjau Halaman ({{ blocks.length }} Bagian)
        </p>
        <div v-if="loading" class="text-sm text-slate-500">Memuat blok...</div>
        <SduiRenderer v-else :blocks="blocks" />
      </div>
    </div>

    <ConfirmDialog
      :open="Boolean(deleteBlockTarget)"
      title="Hapus Blok Konten?"
      description="Blok ini akan dihapus dari halaman detail program."
      confirm-text="Ya, Hapus"
      variant="danger"
      :loading="deletingBlock"
      @cancel="deleteBlockTarget = null"
      @confirm="confirmDeleteBlock"
    />
  </div>
</template>
