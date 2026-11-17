<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import {
  Award,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  Globe,
  MessageCircle,
  Search,
} from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  ConsultationRecord,
  GlobalCountry,
  GlobalProgram,
  GlobalScholarship,
  GlobalUniversity,
  PaginatedResponse,
} from '@/types/api'

const authStore = useAuthStore()

const activeTab = ref<'programs' | 'universities' | 'scholarships' | 'countries'>('programs')
const searchQuery = ref('')

const countries = ref<GlobalCountry[]>([])
const universities = ref<GlobalUniversity[]>([])
const scholarships = ref<GlobalScholarship[]>([])
const programs = ref<GlobalProgram[]>([])
const myConsultations = ref<ConsultationRecord[]>([])

const submittingConsult = ref(false)
const consultSuccessMsg = ref('')

const consultForm = reactive({
  name: authStore.user?.fullName || '',
  phone: '6281234567890',
  email: authStore.user?.email || '',
  destinationCountry: 'United Kingdom',
  intendedMajor: 'Computer Science',
  notes: '',
})

async function fetchCatalog() {
  const params = searchQuery.value ? { search: searchQuery.value, page: 1, limit: 20 } : { page: 1, limit: 20 }
  const [cRes, uRes, sRes, pRes] = await Promise.all([
    apiRequest<PaginatedResponse<GlobalCountry>>({ method: 'GET', url: '/global/countries', params }),
    apiRequest<PaginatedResponse<GlobalUniversity>>({ method: 'GET', url: '/global/universities', params }),
    apiRequest<PaginatedResponse<GlobalScholarship>>({ method: 'GET', url: '/global/scholarships', params }),
    apiRequest<PaginatedResponse<GlobalProgram>>({ method: 'GET', url: '/global/programs', params }),
  ])
  countries.value = cRes.items ?? []
  universities.value = uRes.items ?? []
  scholarships.value = sRes.items ?? []
  programs.value = pRes.items ?? []
}

async function fetchMyConsultations() {
  myConsultations.value = await apiRequest<ConsultationRecord[]>({
    method: 'GET',
    url: '/global/consultations/my',
  })
}

watch(searchQuery, () => {
  fetchCatalog()
})

async function submitConsultation() {
  submittingConsult.value = true
  consultSuccessMsg.value = ''
  try {
    const res = await apiRequest<ConsultationRecord>({
      method: 'POST',
      url: '/global/consultations',
      data: { ...consultForm },
    })
    consultSuccessMsg.value = 'Pendaftaran konsultasi tersimpan! Membuka WhatsApp konselor...'
    consultForm.notes = ''
    await fetchMyConsultations()
    const targetUrl = res.whatsappUrl || res.redirectUrl
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    }
  } finally {
    submittingConsult.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchCatalog(), fetchMyConsultations()])
})
</script>

<template>
  <div class="space-y-6">
    <!-- Top Search & Tabs -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Globe class="h-5 w-5 text-primary" />
            Global & Career Hub
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Eksplorasi negara tujuan studi, universitas Top QS, beasiswa internasional, & program immersion.
          </p>
        </div>

        <div class="relative w-full md:w-72">
          <Search class="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari negara, kampus, beasiswa..."
            class="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm focus:border-primary focus:outline-none"
          />
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

    <!-- Catalog Content -->
    <div v-if="activeTab === 'programs'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <router-link
        v-for="prog in programs"
        :key="prog.id"
        :to="`/global/programs/${prog.id}`"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-primary/50 transition space-y-3"
      >
        <div class="flex items-center justify-between">
          <span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">
            {{ prog.category }}
          </span>
          <span class="text-xs text-slate-500">{{ prog.batch }} • {{ prog.duration }}</span>
        </div>
        <h3 class="text-lg font-bold text-slate-900">{{ prog.title }}</h3>
        <p class="text-sm text-slate-600">{{ prog.summary }}</p>
        <p class="text-xs font-semibold text-primary pt-2">
          Lihat Detail Program →
        </p>
      </router-link>
    </div>

    <div v-else-if="activeTab === 'universities'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="uni in universities"
        :key="uni.id"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between gap-3"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
              QS World Rank #{{ uni.qsRanking }}
            </span>
            <span v-if="uni.isPartner" class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              Mitra Sekolah
            </span>
          </div>
          <h3 class="text-base font-bold text-slate-900">{{ uni.name }}</h3>
          <p class="text-xs text-slate-500">{{ uni.city }}, {{ uni.country }}</p>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <span
              v-for="maj in uni.popularMajors"
              :key="maj"
              class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
            >
              {{ maj }}
            </span>
          </div>
        </div>
        <a
          :href="uni.websiteUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline pt-2"
        >
          Kunjungi Website Resmi
          <ExternalLink class="h-3.5 w-3.5" />
        </a>
      </div>
    </div>

    <div v-else-if="activeTab === 'scholarships'" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="sch in scholarships"
        :key="sch.id"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2"
      >
        <div class="flex items-center justify-between">
          <span
            :class="[
              'rounded-full px-2.5 py-0.5 text-xs font-bold',
              sch.coverage === 'Full' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700',
            ]"
          >
            {{ sch.coverage }} Funded
          </span>
          <span class="text-xs text-slate-400">Deadline: {{ sch.deadline }}</span>
        </div>
        <h3 class="text-base font-bold text-slate-900">{{ sch.title }}</h3>
        <p class="text-xs font-semibold text-primary">{{ sch.provider }} • {{ sch.country }}</p>
        <p class="text-xs text-slate-600 leading-relaxed">{{ sch.description }}</p>
      </div>
    </div>

    <div v-else-if="activeTab === 'countries'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="cnt in countries"
        :key="cnt.id"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2"
      >
        <div class="text-3xl">{{ cnt.flagEmoji || '🌍' }}</div>
        <h3 class="text-base font-bold text-slate-900">{{ cnt.name }}</h3>
        <p class="text-xs text-slate-500">{{ cnt.region }}</p>
        <p class="text-xs text-slate-600 leading-relaxed">{{ cnt.description }}</p>
        <p class="text-[11px] font-semibold text-primary pt-1">
          {{ cnt.universityCount }} Kampus • {{ cnt.scholarshipCount }} Beasiswa
        </p>
      </div>
    </div>

    <!-- Konsultasi Studi Luar Negeri + Riwayat -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
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

        <div
          v-if="consultSuccessMsg"
          class="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"
        >
          <CheckCircle2 class="h-4 w-4" />
          {{ consultSuccessMsg }}
        </div>

        <form @submit.prevent="submitConsultation" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
              <input v-model="consultForm.name" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp</label>
              <input v-model="consultForm.phone" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Negara Tujuan</label>
              <input v-model="consultForm.destinationCountry" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Rencana Jurusan</label>
              <input v-model="consultForm.intendedMajor" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
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
        <div class="space-y-3">
          <div
            v-for="item in myConsultations"
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
  </div>
</template>
