<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import {
  Award,
  Building2,
  Compass,
  ExternalLink,
  Globe,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type {
  ConsultationRecord,
  ConsultationRegisterResponse,
  GlobalCountry,
  GlobalProgram,
  GlobalScholarship,
  GlobalUniversity,
  PaginatedResponse,
} from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

const activeTab = ref<'programs' | 'universities' | 'scholarships' | 'countries'>('programs')
const searchQuery = ref('')
const loadingCatalog = ref(true)

const countries = ref<GlobalCountry[]>([])
const universities = ref<GlobalUniversity[]>([])
const scholarships = ref<GlobalScholarship[]>([])
const programs = ref<GlobalProgram[]>([])
const consultations = ref<ConsultationRecord[]>([])

const submittingConsult = ref(false)
const showCreateModal = ref<'program' | 'university' | 'scholarship' | null>(null)
const editingId = ref<string | null>(null)
const savingItem = ref(false)
const deleteTarget = ref<{ type: 'program' | 'university' | 'scholarship'; id: string; title: string } | null>(null)
const deletingItem = ref(false)

const consultForm = reactive({
  name: authStore.user?.fullName || '',
  phone: '',
  email: authStore.user?.email || '',
  destinationCountry: '',
  intendedMajor: '',
  notes: '',
})

const newProgram = reactive({
  title: '',
  slug: '',
  description: '',
  targetAudience: 'Siswa Kelas 10 - 12',
  quota: 30,
})

const newUniversity = reactive({
  name: '',
  city: '',
  countryId: '',
  qsRank: 50,
  website: '',
  overview: '',
})

const newScholarship = reactive({
  name: '',
  countryId: '',
  fundingType: 'FULL' as 'FULL' | 'PARTIAL',
  deadline: '2027-01-31',
  description: '',
  applicationUrl: '',
})

function getCountryName(c?: string | { name: string } | null): string {
  if (!c) return 'Internasional'
  return typeof c === 'string' ? c : c.name
}

async function fetchCatalog() {
  loadingCatalog.value = true
  const params = searchQuery.value ? { search: searchQuery.value, page: 1, limit: 20 } : { page: 1, limit: 20 }
  try {
    const [cRes, uRes, sRes, pRes] = await Promise.all([
      apiRequest<PaginatedResponse<GlobalCountry> | GlobalCountry[]>({
        method: 'GET',
        url: '/global/countries',
        params,
      }),
      apiRequest<PaginatedResponse<GlobalUniversity> | GlobalUniversity[]>({
        method: 'GET',
        url: '/global/universities',
        params,
      }),
      apiRequest<PaginatedResponse<GlobalScholarship> | GlobalScholarship[]>({
        method: 'GET',
        url: '/global/scholarships',
        params,
      }),
      apiRequest<PaginatedResponse<GlobalProgram> | GlobalProgram[]>({
        method: 'GET',
        url: '/global/programs',
        params,
      }),
    ])
    countries.value = Array.isArray(cRes) ? cRes : cRes.items ?? []
    universities.value = Array.isArray(uRes) ? uRes : uRes.items ?? []
    scholarships.value = Array.isArray(sRes) ? sRes : sRes.items ?? []
    programs.value = Array.isArray(pRes) ? pRes : pRes.items ?? []

    if (countries.value.length > 0 && !newUniversity.countryId) {
      newUniversity.countryId = countries.value[0].id
      newScholarship.countryId = countries.value[0].id
    }
  } catch {
    toast.error('Gagal memuat katalog Global & Career Hub')
  } finally {
    loadingCatalog.value = false
  }
}

async function fetchConsultations() {
  try {
    if (authStore.canManageGlobalHub) {
      consultations.value = await apiRequest<ConsultationRecord[]>({
        method: 'GET',
        url: '/global/consultations',
      })
    } else if (authStore.isStudent || authStore.isParent) {
      consultations.value = await apiRequest<ConsultationRecord[]>({
        method: 'GET',
        url: '/global/consultations/my',
      })
    }
  } catch {
    consultations.value = []
  }
}

watch(searchQuery, () => {
  fetchCatalog()
})

async function submitConsultation() {
  submittingConsult.value = true
  try {
    const res = await apiRequest<ConsultationRegisterResponse>({
      method: 'POST',
      url: '/global/consultations',
      data: { ...consultForm },
    })
    toast.success('Pendaftaran konsultasi tersimpan!', 'Membuka WhatsApp konselor...')
    consultForm.notes = ''
    await fetchConsultations()
    const targetUrl = res.whatsappUrl || res.redirectUrl
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    }
  } catch {
    toast.error('Gagal mengirim pendaftaran konsultasi')
  } finally {
    submittingConsult.value = false
  }
}

function openCreateModal(type: 'program' | 'university' | 'scholarship') {
  editingId.value = null
  if (type === 'program') {
    newProgram.title = ''
    newProgram.slug = ''
    newProgram.description = ''
    newProgram.targetAudience = 'Siswa Kelas 10 - 12'
    newProgram.quota = 30
  } else if (type === 'university') {
    newUniversity.name = ''
    newUniversity.city = ''
    newUniversity.qsRank = 50
    newUniversity.website = ''
    newUniversity.overview = ''
  } else if (type === 'scholarship') {
    newScholarship.name = ''
    newScholarship.fundingType = 'FULL'
    newScholarship.deadline = '2027-01-31'
    newScholarship.description = ''
    newScholarship.applicationUrl = ''
  }
  showCreateModal.value = type
}

function openEditProgram(prog: GlobalProgram) {
  editingId.value = prog.id
  newProgram.title = prog.title
  newProgram.slug = prog.slug
  newProgram.description = prog.description || prog.summary || ''
  newProgram.targetAudience = prog.targetAudience || ''
  newProgram.quota = prog.quota || 30
  showCreateModal.value = 'program'
}

function openEditUniversity(uni: GlobalUniversity) {
  editingId.value = uni.id
  newUniversity.name = uni.name
  newUniversity.city = uni.city || ''
  newUniversity.countryId =
    uni.countryId || (typeof uni.country === 'object' && uni.country ? uni.country.id : countries.value[0]?.id || '')
  newUniversity.qsRank = uni.qsRank || uni.qsRanking || 50
  newUniversity.website = uni.website || uni.websiteUrl || ''
  newUniversity.overview = uni.overview || ''
  showCreateModal.value = 'university'
}

function openEditScholarship(sch: GlobalScholarship) {
  editingId.value = sch.id
  newScholarship.name = sch.name || sch.title || ''
  newScholarship.countryId =
    typeof sch.country === 'object' && sch.country ? sch.country.id : countries.value[0]?.id || ''
  newScholarship.fundingType =
    (sch.fundingType || sch.coverage)?.toUpperCase() === 'PARTIAL' ? 'PARTIAL' : 'FULL'
  newScholarship.deadline = sch.deadline ? sch.deadline.slice(0, 10) : '2027-01-31'
  newScholarship.description = sch.description || sch.eligibility || ''
  newScholarship.applicationUrl = sch.applicationUrl || sch.applyUrl || ''
  showCreateModal.value = 'scholarship'
}

async function confirmDeleteItem() {
  if (!deleteTarget.value) return
  deletingItem.value = true
  try {
    const endpointMap = {
      program: `/global/programs/${deleteTarget.value.id}`,
      university: `/global/universities/${deleteTarget.value.id}`,
      scholarship: `/global/scholarships/${deleteTarget.value.id}`,
    }
    await apiRequest({
      method: 'DELETE',
      url: endpointMap[deleteTarget.value.type],
    })
    toast.success(`${deleteTarget.value.title} berhasil dihapus!`)
    deleteTarget.value = null
    await fetchCatalog()
  } catch (err) {
    toast.error(
      'Gagal menghapus item',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Pastikan endpoint DELETE tersedia di backend.',
    )
  } finally {
    deletingItem.value = false
  }
}

async function createGlobalItem() {
  savingItem.value = true
  const isEdit = Boolean(editingId.value)
  try {
    if (showCreateModal.value === 'program') {
      const slug =
        newProgram.slug.trim() ||
        newProgram.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      await apiRequest({
        method: isEdit ? 'PUT' : 'POST',
        url: isEdit ? `/global/programs/${editingId.value}` : '/global/programs',
        data: {
          title: newProgram.title,
          slug,
          description: newProgram.description,
          targetAudience: newProgram.targetAudience,
          quota: Number(newProgram.quota),
        },
      })
      toast.success(isEdit ? 'Program berhasil diperbarui!' : 'Program baru berhasil ditambahkan!')
    } else if (showCreateModal.value === 'university') {
      await apiRequest({
        method: isEdit ? 'PUT' : 'POST',
        url: isEdit ? `/global/universities/${editingId.value}` : '/global/universities',
        data: {
          name: newUniversity.name,
          city: newUniversity.city,
          countryId: newUniversity.countryId,
          qsRank: Number(newUniversity.qsRank),
          website: newUniversity.website || undefined,
          overview: newUniversity.overview || undefined,
        },
      })
      toast.success(isEdit ? 'Data universitas berhasil diperbarui!' : 'Universitas mitra berhasil ditambahkan!')
    } else if (showCreateModal.value === 'scholarship') {
      await apiRequest({
        method: isEdit ? 'PUT' : 'POST',
        url: isEdit ? `/global/scholarships/${editingId.value}` : '/global/scholarships',
        data: {
          name: newScholarship.name,
          countryId: newScholarship.countryId || undefined,
          fundingType: newScholarship.fundingType,
          deadline: newScholarship.deadline,
          description: newScholarship.description,
          applicationUrl: newScholarship.applicationUrl || undefined,
        },
      })
      toast.success(isEdit ? 'Beasiswa berhasil diperbarui!' : 'Informasi beasiswa berhasil ditambahkan!')
    }
    showCreateModal.value = null
    editingId.value = null
    await fetchCatalog()
  } catch (err) {
    toast.error(
      'Gagal menyimpan data ke server',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Pastikan endpoint CRUD Global Hub sudah aktif di backend.',
    )
  } finally {
    savingItem.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchCatalog(), fetchConsultations()])
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Search, Tabs & Management Actions -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe class="h-5 w-5 text-primary" />
            Global & Career Hub
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            {{
              authStore.canManageGlobalHub
                ? 'Kelola program immersion, katalog universitas, beasiswa, dan tindak lanjuti pendaftaran konsultasi siswa.'
                : 'Eksplorasi negara tujuan studi, universitas Top QS, beasiswa internasional, & program immersion.'
            }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <div class="relative w-full sm:w-64">
            <Search class="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Cari negara, kampus, beasiswa..."
              class="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <template v-if="authStore.canManageGlobalHub">
            <router-link
              to="/admin/sdui-builder"
              class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Settings2 class="h-4 w-4 text-primary" />
              Desainer Halaman Program
            </router-link>
            <button
              v-if="activeTab === 'programs'"
              type="button"
              @click="openCreateModal('program')"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus class="h-4 w-4" />
              Tambah Program
            </button>
            <button
              v-else-if="activeTab === 'universities'"
              type="button"
              @click="openCreateModal('university')"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus class="h-4 w-4" />
              Tambah Kampus
            </button>
            <button
              v-else-if="activeTab === 'scholarships'"
              type="button"
              @click="openCreateModal('scholarship')"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus class="h-4 w-4" />
              Tambah Beasiswa
            </button>
          </template>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          @click="activeTab = 'programs'"
          :class="[
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition',
            activeTab === 'programs' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          ]"
        >
          <Compass class="h-4 w-4" />
          Program Immersion ({{ programs.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'universities'"
          :class="[
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition',
            activeTab === 'universities' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          ]"
        >
          <Building2 class="h-4 w-4" />
          Universitas Top QS ({{ universities.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'scholarships'"
          :class="[
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition',
            activeTab === 'scholarships' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          ]"
        >
          <Award class="h-4 w-4" />
          Beasiswa ({{ scholarships.length }})
        </button>
        <button
          type="button"
          @click="activeTab = 'countries'"
          :class="[
            'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition',
            activeTab === 'countries' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
          ]"
        >
          <Globe class="h-4 w-4" />
          Negara Tujuan ({{ countries.length }})
        </button>
      </div>
    </div>

    <SkeletonCard v-if="loadingCatalog" :count="3" :columns="2" />

    <!-- Catalog Content -->
    <template v-else>
      <div v-if="activeTab === 'programs'">
        <EmptyState
          v-if="programs.length === 0"
          title="Belum Ada Program Immersion"
          description="Program kunjungan kampus dan immersion luar negeri akan tampil di sini."
          :icon="Compass"
        />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div
            v-for="prog in programs"
            :key="prog.id"
            class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-primary/50 transition flex flex-col justify-between gap-3"
          >
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">
                  {{ prog.category || prog.targetAudience || 'Program Global' }}
                </span>
                <span class="text-xs text-slate-500">
                  {{ prog.quota ? `Kuota ${prog.quota} Siswa` : prog.duration || '' }}
                </span>
              </div>
              <h3 class="text-lg font-bold text-slate-900">{{ prog.title }}</h3>
              <p class="text-sm text-slate-600 line-clamp-2">{{ prog.description || prog.summary }}</p>
            </div>
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <router-link
                :to="`/global/programs/${prog.id}`"
                class="text-xs font-semibold text-primary hover:underline"
              >
                Lihat Detail Program →
              </router-link>
              <div v-if="authStore.canManageGlobalHub" class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="openEditProgram(prog)"
                  class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary"
                  title="Edit Program"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  @click="deleteTarget = { type: 'program', id: prog.id, title: prog.title }"
                  class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
                  title="Hapus Program"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'universities'">
        <EmptyState
          v-if="universities.length === 0"
          title="Belum Ada Data Universitas"
          description="Data universitas mitra dan peringkat QS dunia belum tersedia."
          :icon="Building2"
        />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="uni in universities"
            :key="uni.id"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between gap-3"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <span
                  v-if="uni.qsRank || uni.qsRanking"
                  class="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"
                >
                  QS World Rank #{{ uni.qsRank || uni.qsRanking }}
                </span>
                <span v-if="uni.isPartner" class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  Mitra Sekolah
                </span>
              </div>
              <h3 class="text-base font-bold text-slate-900">{{ uni.name }}</h3>
              <p class="text-xs text-slate-500">
                {{ [uni.city, getCountryName(uni.country)].filter(Boolean).join(', ') }}
              </p>
              <p v-if="uni.overview" class="text-xs text-slate-600 mt-2 line-clamp-2">
                {{ uni.overview }}
              </p>
            </div>
            <div class="pt-2 flex items-center justify-between gap-2">
              <a
                v-if="uni.website || uni.websiteUrl"
                :href="(uni.website || uni.websiteUrl)!"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Kunjungi Website Resmi
                <ExternalLink class="h-3.5 w-3.5" />
              </a>
              <span v-else />
              <div v-if="authStore.canManageGlobalHub" class="flex items-center gap-1.5">
                <button
                  type="button"
                  @click="openEditUniversity(uni)"
                  class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary"
                  title="Edit Universitas"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  @click="deleteTarget = { type: 'university', id: uni.id, title: uni.name }"
                  class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
                  title="Hapus Universitas"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'scholarships'">
        <EmptyState
          v-if="scholarships.length === 0"
          title="Belum Ada Data Beasiswa"
          description="Informasi beasiswa penuh maupun parsial akan tampil di sini."
          :icon="Award"
        />
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="sch in scholarships"
            :key="sch.id"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between gap-3"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span
                  :class="[
                    'rounded-full px-2.5 py-0.5 text-xs font-bold',
                    (sch.fundingType || sch.coverage)?.toUpperCase() === 'FULL'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-sky-50 text-sky-700',
                  ]"
                >
                  {{ (sch.fundingType || sch.coverage)?.toUpperCase() === 'FULL' ? 'Beasiswa Penuh' : 'Beasiswa Parsial' }}
                </span>
                <span v-if="sch.deadline" class="text-xs text-slate-400">
                  Batas: {{ new Date(sch.deadline).toLocaleDateString('id-ID') }}
                </span>
              </div>
              <h3 class="text-base font-bold text-slate-900">{{ sch.name || sch.title }}</h3>
              <p class="text-xs font-semibold text-primary">
                {{ getCountryName(sch.country) }}
              </p>
              <p class="text-xs text-slate-600 leading-relaxed">{{ sch.description || sch.eligibility }}</p>
            </div>
            <div v-if="authStore.canManageGlobalHub" class="pt-2 border-t border-slate-100 flex justify-end gap-1.5">
              <button
                type="button"
                @click="openEditScholarship(sch)"
                class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary"
                title="Edit Beasiswa"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                @click="deleteTarget = { type: 'scholarship', id: sch.id, title: sch.name || sch.title || 'Beasiswa' }"
                class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600"
                title="Hapus Beasiswa"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'countries'">
        <EmptyState
          v-if="countries.length === 0"
          title="Belum Ada Data Negara"
          description="Daftar negara tujuan studi luar negeri belum tersedia."
          :icon="Globe"
        />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="cnt in countries"
            :key="cnt.id"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2"
          >
            <div class="text-3xl">{{ cnt.flagEmoji || '🌍' }}</div>
            <h3 class="text-base font-bold text-slate-900">{{ cnt.name }}</h3>
            <p class="text-xs text-slate-500">{{ cnt.code }}</p>
            <p v-if="cnt.description" class="text-xs text-slate-600 leading-relaxed">{{ cnt.description }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- MANAGEMENT VIEW FOR ADMIN / PRINCIPAL / COUNSELOR -->
    <div
      v-if="authStore.canManageGlobalHub"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle class="h-5 w-5 text-primary" />
            Manajemen Pendaftaran Konsultasi Siswa ({{ consultations.length }})
          </h3>
          <p class="text-xs text-slate-500">
            Daftar pengajuan konsultasi studi luar negeri dari siswa dan orang tua di sekolah Anda.
          </p>
        </div>
      </div>

      <EmptyState
        v-if="consultations.length === 0"
        title="Belum Ada Pengajuan Konsultasi"
        description="Pengajuan konsultasi studi luar negeri dari siswa atau orang tua akan muncul di tabel ini."
        :icon="MessageCircle"
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
              <th class="py-3 pr-4">Pemohon</th>
              <th class="py-3 px-4">Negara & Jurusan</th>
              <th class="py-3 px-4">Catatan</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 pl-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in consultations" :key="item.id">
              <td class="py-3 pr-4">
                <p class="font-bold text-slate-900">{{ item.name }}</p>
                <p class="text-xs text-slate-500">{{ item.phone }} • {{ item.email || '-' }}</p>
              </td>
              <td class="py-3 px-4">
                <p class="font-semibold text-slate-800">{{ item.destinationCountry || '-' }}</p>
                <p class="text-xs text-slate-500">{{ item.intendedMajor || '-' }}</p>
              </td>
              <td class="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                {{ item.notes || '-' }}
              </td>
              <td class="py-3 px-4">
                <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  {{ item.status }}
                </span>
              </td>
              <td class="py-3 pl-4 text-right">
                <a
                  :href="`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-slate-50"
                >
                  Hubungi WA
                  <ExternalLink class="h-3 w-3" />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- STUDENT & PARENT VIEW: CONSULTATION REGISTRATION + MY HISTORY -->
    <div
      v-else-if="authStore.isStudent || authStore.isParent"
      class="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      <div class="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle class="h-5 w-5 text-primary" />
            Daftar Konsultasi Studi Luar Negeri
          </h3>
          <p class="text-xs text-slate-500">
            Isi formulir di bawah untuk terhubung langsung dengan konselor studi luar negeri.
          </p>
        </div>

        <form @submit.prevent="submitConsultation" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
              <input v-model="consultForm.name" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp</label>
              <input v-model="consultForm.phone" required type="text" placeholder="628..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Negara Tujuan</label>
              <input v-model="consultForm.destinationCountry" required type="text" placeholder="United Kingdom" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Rencana Jurusan</label>
              <input v-model="consultForm.intendedMajor" required type="text" placeholder="Computer Science" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea v-model="consultForm.notes" rows="2" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            :disabled="submittingConsult"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <MessageCircle class="h-4 w-4" />
            {{ submittingConsult ? 'Mengirim...' : 'Kirim & Hubungi via WhatsApp' }}
          </button>
        </form>
      </div>

      <div class="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 class="text-base font-bold text-slate-900">Riwayat Konsultasi Saya</h3>
        <EmptyState
          v-if="consultations.length === 0"
          title="Belum Ada Riwayat Konsultasi"
          description="Anda belum pernah mendaftar sesi konsultasi studi luar negeri."
          :icon="MessageCircle"
        />
        <div v-else class="space-y-3">
          <div
            v-for="item in consultations"
            :key="item.id"
            class="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-start justify-between gap-3"
          >
            <div>
              <p class="text-sm font-bold text-slate-900">
                {{ item.destinationCountry }} — {{ item.intendedMajor }}
              </p>
              <p class="text-xs text-slate-500 mt-0.5">{{ item.notes || 'Tidak ada catatan' }}</p>
              <a
                v-if="item.whatsappUrl"
                :href="item.whatsappUrl"
                target="_blank"
                class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-2"
              >
                Buka Chat WhatsApp
                <ExternalLink class="h-3 w-3" />
              </a>
            </div>
            <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              {{ item.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL TAMBAH PROGRAM / KAMPUS / BEASISWA (ADMIN / PRINCIPAL / COUNSELOR) -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">
            {{
              editingId
                ? showCreateModal === 'program'
                  ? 'Edit Program'
                  : showCreateModal === 'university'
                    ? 'Edit Universitas Mitra'
                    : 'Edit Informasi Beasiswa'
                : showCreateModal === 'program'
                  ? 'Tambah Program Global / Sekolah'
                  : showCreateModal === 'university'
                    ? 'Tambah Universitas Mitra'
                    : 'Tambah Informasi Beasiswa'
            }}
          </h3>
          <button @click="showCreateModal = null" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="createGlobalItem" class="space-y-3">
          <template v-if="showCreateModal === 'program'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Judul Program</label>
              <input v-model="newProgram.title" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Target Peserta</label>
                <input v-model="newProgram.targetAudience" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Kuota Siswa</label>
                <input v-model.number="newProgram.quota" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Program</label>
              <textarea v-model="newProgram.description" required rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </template>

          <template v-else-if="showCreateModal === 'university'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Universitas</label>
              <input v-model="newUniversity.name" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Kota</label>
                <input v-model="newUniversity.city" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">QS World Rank</label>
                <input v-model.number="newUniversity.qsRank" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Negara</label>
              <select v-model="newUniversity.countryId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Website Resmi</label>
              <input v-model="newUniversity.website" type="url" placeholder="https://..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </template>

          <template v-else-if="showCreateModal === 'scholarship'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Beasiswa</label>
              <input v-model="newScholarship.name" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Jenis Pendanaan</label>
                <select v-model="newScholarship.fundingType" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="FULL">Beasiswa Penuh (Full)</option>
                  <option value="PARTIAL">Beasiswa Parsial</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1">Batas Pendaftaran</label>
                <input v-model="newScholarship.deadline" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Deskripsi & Syarat</label>
              <textarea v-model="newScholarship.description" required rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </template>

          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              @click="showCreateModal = null"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingItem"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {{ savingItem ? 'Menyimpan...' : 'Simpan Data' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      :open="Boolean(deleteTarget)"
      :title="`Hapus ${deleteTarget?.title || 'Item'}?`"
      description="Item yang dihapus atau diarsipkan tidak akan tampil lagi di katalog siswa."
      confirm-text="Ya, Hapus"
      variant="danger"
      :loading="deletingItem"
      @cancel="deleteTarget = null"
      @confirm="confirmDeleteItem"
    />
  </div>
</template>
