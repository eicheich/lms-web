<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Globe,
  MessageCircle,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import type {
  GlobalProgram,
  GlobalScholarship,
  HomeLayoutConfig,
} from '@/types/api'

const authStore = useAuthStore()
const tenantStore = useTenantStore()

const layout = ref<HomeLayoutConfig | null>(null)
const programs = ref<GlobalProgram[]>([])
const scholarships = ref<GlobalScholarship[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [layoutRes, progRes, schRes] = await Promise.all([
      apiRequest<HomeLayoutConfig>({ method: 'GET', url: '/app/home-layout' }),
      apiRequest<{ items: GlobalProgram[] }>({ method: 'GET', url: '/global/programs' }),
      apiRequest<{ items: GlobalScholarship[] }>({ method: 'GET', url: '/global/scholarships' }),
    ])
    layout.value = layoutRes
    programs.value = progRes.items ?? []
    scholarships.value = schRes.items ?? []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Quick Role Welcome Bar -->
    <div class="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary mb-2">
          <Sparkles class="h-3.5 w-3.5" />
          {{ authStore.role }} Workspace
        </span>
        <h2 class="text-xl font-bold text-slate-900">
          Ahlan wa Sahlan, {{ authStore.user?.fullName }}
        </h2>
        <p class="text-sm text-slate-500">
          Portal {{ tenantStore.branding.schoolName }} • Tahun Ajaran 2026/2027
        </p>
      </div>
      <div class="flex flex-wrap gap-2.5">
        <!-- Admin / Principal -->
        <template v-if="authStore.isSchoolExecutive">
          <router-link
            to="/academic/classes"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Kelola Kelas
          </router-link>
          <router-link
            to="/lms/courses"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <BookOpen class="h-4 w-4 text-primary" />
            Mata Pelajaran
          </router-link>
          <router-link
            to="/global"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Globe class="h-4 w-4 text-secondary" />
            Kelola Global Hub
          </router-link>
          <router-link
            to="/cbt/grades"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Award class="h-4 w-4 text-amber-500" />
            Finalisasi Rapor
          </router-link>
        </template>

        <!-- Teacher -->
        <template v-else-if="authStore.isTeacher">
          <router-link
            to="/attendance"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Isi Absensi Hari Ini
          </router-link>
          <router-link
            to="/lms/courses"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <BookOpen class="h-4 w-4 text-primary" />
            Materi & Koreksi Tugas
          </router-link>
          <router-link
            to="/cbt/exams"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ClipboardCheck class="h-4 w-4 text-secondary" />
            Bank Soal & CBT
          </router-link>
        </template>

        <!-- Counselor -->
        <template v-else-if="authStore.isCounselor">
          <router-link
            to="/global"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            <Globe class="h-4 w-4" />
            Kelola Konsultasi & Global Hub
          </router-link>
          <router-link
            to="/attendance"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Rekap Kehadiran Siswa
          </router-link>
        </template>

        <!-- Parent -->
        <template v-else-if="authStore.isParent">
          <router-link
            to="/attendance"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            Kehadiran Anak
          </router-link>
          <router-link
            to="/cbt/grades"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Award class="h-4 w-4 text-amber-500" />
            Rapor Anak
          </router-link>
          <router-link
            to="/global"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Globe class="h-4 w-4 text-secondary" />
            Konsultasi Studi Global
          </router-link>
        </template>

        <!-- Student -->
        <template v-else>
          <router-link
            to="/lms/courses"
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            <BookOpen class="h-4 w-4" />
            Ruang Belajar (LMS)
          </router-link>
          <router-link
            to="/cbt/exams"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ClipboardCheck class="h-4 w-4 text-secondary" />
            Ujian CBT
          </router-link>
          <router-link
            to="/cbt/grades"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Award class="h-4 w-4 text-amber-500" />
            Nilai & Rapor
          </router-link>
        </template>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-slate-500">
      Memuat tata letak beranda dinamis...
    </div>

    <!-- Dynamic Home Blocks ordered by /v1/app/home-layout -->
    <template v-else-if="layout" v-for="block in layout.homeBlocks" :key="block">
      <!-- HERO_BANNER -->
      <section
        v-if="block === 'HERO_BANNER' && layout.bannerActive"
        class="rounded-2xl bg-gradient-to-r from-primary to-secondary p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div class="max-w-2xl">
          <p class="text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
            {{ tenantStore.branding.schoolName }}
          </p>
          <h3 class="text-2xl md:text-3xl font-bold mb-2">
            Learning Hub Terpadu & Katalog Studi Global
          </h3>
          <p class="text-sm text-white/90 leading-relaxed">
            Akses materi pembelajaran interaktif, ujian berbasis komputer (CBT), rapor digital, serta
            eksplorasi universitas Top QS dunia dalam satu portal.
          </p>
        </div>
        <router-link
          to="/global"
          class="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-100 transition"
        >
          Eksplor Global Hub
          <ArrowRight class="h-4 w-4" />
        </router-link>
      </section>

      <!-- CAREER_STATS -->
      <section v-else-if="block === 'CAREER_STATS'" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
              <GraduationCap class="h-5 w-5" />
            </div>
            <div>
              <p class="text-2xl font-extrabold text-slate-900">94%</p>
              <p class="text-xs text-slate-500">Alumni Diterima PTN & Universitas Top Dunia</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-secondary-50 text-secondary flex items-center justify-center">
              <Globe class="h-5 w-5" />
            </div>
            <div>
              <p class="text-2xl font-extrabold text-slate-900">28+ Negara</p>
              <p class="text-xs text-slate-500">Jaringan Mitra Universitas & Beasiswa</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award class="h-5 w-5" />
            </div>
            <div>
              <p class="text-2xl font-extrabold text-slate-900">42 Siswa</p>
              <p class="text-xs text-slate-500">Penerima Beasiswa Penuh Tahun Ini</p>
            </div>
          </div>
        </div>
      </section>

      <!-- GLOBAL_PROGRAMS -->
      <section v-else-if="block === 'GLOBAL_PROGRAMS'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">Program Immersion & Global</h3>
          <router-link to="/global" class="text-xs font-semibold text-primary hover:underline">
            Lihat Semua Program →
          </router-link>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <router-link
            v-for="prog in programs"
            :key="prog.id"
            :to="`/global/programs/${prog.id}`"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary/50 transition block"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {{ prog.category }}
              </span>
              <span class="text-xs text-slate-500">{{ prog.duration }} • {{ prog.destination }}</span>
            </div>
            <h4 class="text-base font-bold text-slate-900 mb-1">{{ prog.title }}</h4>
            <p class="text-xs text-slate-600 leading-relaxed">{{ prog.summary }}</p>
          </router-link>
        </div>
      </section>

      <!-- TOP_SCHOLARSHIPS -->
      <section
        v-else-if="block === 'TOP_SCHOLARSHIPS' && layout.featuresToggle.showScholarships"
        class="space-y-3"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-900">Beasiswa Internasional Unggulan</h3>
          <router-link to="/global" class="text-xs font-semibold text-primary hover:underline">
            Eksplor Beasiswa →
          </router-link>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="sch in scholarships"
            :key="sch.id"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <span
                :class="[
                  'rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                  sch.coverage === 'Full'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-sky-50 text-sky-700',
                ]"
              >
                {{ sch.coverage }} Funded
              </span>
              <span class="text-[11px] text-slate-500">Deadline: {{ sch.deadline }}</span>
            </div>
            <h4 class="text-sm font-bold text-slate-900 mb-1">{{ sch.title }}</h4>
            <p class="text-xs text-slate-500 mb-2">{{ sch.provider }} • {{ sch.country }}</p>
            <p class="text-xs text-slate-600 line-clamp-2">{{ sch.description }}</p>
          </div>
        </div>
      </section>

      <!-- CONSULTATION_CTA -->
      <section
        v-else-if="block === 'CONSULTATION_CTA' && layout.featuresToggle.showConsultation"
        class="rounded-2xl border border-primary/20 bg-primary-50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <h3 class="text-base font-bold text-slate-900">
            Butuh Bimbingan Rencana Kuliah Luar Negeri & Beasiswa?
          </h3>
          <p class="text-xs text-slate-600 mt-1">
            Jadwalkan sesi konsultasi 1-on-1 bersama konselor sekolah dan terhubung langsung via WhatsApp.
          </p>
        </div>
        <router-link
          to="/global"
          class="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          <MessageCircle class="h-4 w-4" />
          Daftar Konsultasi
        </router-link>
      </section>
    </template>
  </div>
</template>
