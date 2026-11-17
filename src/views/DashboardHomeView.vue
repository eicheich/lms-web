<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Globe,
  MessageCircle,
  Sparkles,
  ArrowRight,
  GraduationCap,
  CalendarCheck,
  School,
  Users,
  AlertCircle,
} from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import type {
  AttendanceSummary,
  Assignment,
  CbtExam,
  Course,
  GlobalProgram,
  GlobalScholarship,
  HomeLayoutConfig,
  SchoolClass,
} from '@/types/api'

const authStore = useAuthStore()
const tenantStore = useTenantStore()

const layout = ref<HomeLayoutConfig | null>(null)
const programs = ref<GlobalProgram[]>([])
const scholarships = ref<GlobalScholarship[]>([])
const attendanceSummary = ref<AttendanceSummary | null>(null)
const schoolClasses = ref<SchoolClass[]>([])
const activeCourses = ref<Course[]>([])
const cbtExams = ref<CbtExam[]>([])
const loading = ref(true)
const assignments = ref<Array<Assignment & { courseName: string }>>([])

const roleLabel = computed(
  () =>
    ({
      SCHOOL_ADMIN: 'Administrator Sekolah',
      PRINCIPAL: 'Kepala Sekolah',
      TEACHER: 'Guru',
      COUNSELOR: 'Konselor BK',
      STUDENT: 'Siswa',
      PARENT: 'Orang Tua',
    } as Record<string, string>)[authStore.role || ''] || 'Portal Sekolah',
)

const upcomingAssignments = computed(() =>
  [...assignments.value]
    .filter((item) => new Date(item.dueDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4),
)

const activeExams = computed(() =>
  cbtExams.value.filter(
    (exam) => Date.now() >= new Date(exam.startTime).getTime() && Date.now() <= new Date(exam.endTime).getTime(),
  ),
)

const destinationCount = computed(
  () => new Set(programs.value.map((program) => program.destination).filter(Boolean)).size,
)

function getCountryName(c?: string | { name: string } | null): string {
  if (!c) return 'Internasional'
  return typeof c === 'string' ? c : c.name
}

onMounted(async () => {
  try {
    const basePromises = Promise.all([
      apiRequest<HomeLayoutConfig>({ method: 'GET', url: '/app/home-layout' }),
      apiRequest<{ items: GlobalProgram[] } | GlobalProgram[]>({ method: 'GET', url: '/global/programs' }),
      apiRequest<{ items: GlobalScholarship[] } | GlobalScholarship[]>({ method: 'GET', url: '/global/scholarships' }),
    ])

    const shouldLoadLearningOverview =
      authStore.isSchoolExecutive || authStore.isTeacher || authStore.isStudent
    const execPromises = shouldLoadLearningOverview
      ? Promise.all([
          authStore.isSchoolExecutive
            ? apiRequest<AttendanceSummary>({ method: 'GET', url: '/attendance/summary' }).catch(() => null)
            : Promise.resolve(null),
          authStore.isSchoolExecutive
            ? apiRequest<SchoolClass[]>({ method: 'GET', url: '/academic/classes' }).catch(() => [])
            : Promise.resolve([] as SchoolClass[]),
          apiRequest<Course[]>({ method: 'GET', url: '/lms/courses' }).catch(() => []),
          apiRequest<CbtExam[]>({ method: 'GET', url: '/cbt/exams' }).catch(() => []),
        ])
      : Promise.resolve<[AttendanceSummary | null, SchoolClass[], Course[], CbtExam[]]>([
          null,
          [],
          [],
          [],
        ])

    const [[layoutRes, progRes, schRes], [attSum, clsList, crsList, exmList]] = await Promise.all([
      basePromises,
      execPromises,
    ])

    layout.value = layoutRes
    programs.value = Array.isArray(progRes) ? progRes : progRes.items ?? []
    scholarships.value = Array.isArray(schRes) ? schRes : schRes.items ?? []
    attendanceSummary.value = attSum
    schoolClasses.value = clsList
    activeCourses.value = crsList
    cbtExams.value = exmList
    if (authStore.isTeacher || authStore.isStudent) {
      const assignmentGroups = await Promise.all(
        crsList.map(async (course) => {
          const items = await apiRequest<Assignment[]>({
            method: 'GET',
            url: `/lms/courses/${course.id}/assignments`,
          }).catch(() => [])
          return items.map((item) => ({ ...item, courseName: course.name }))
        }),
      )
      assignments.value = assignmentGroups.flat()
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <SkeletonCard v-if="loading" :count="3" />
  <div v-else class="space-y-6">
    <!-- Quick Role Welcome Bar -->
    <div class="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary mb-2">
          <Sparkles class="h-3.5 w-3.5" />
          Ruang Kerja {{ roleLabel }}
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

    <section v-if="!loading && (authStore.isTeacher || authStore.isStudent)" class="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 class="font-bold text-slate-900">{{ authStore.isTeacher ? 'Tugas yang Perlu Dipantau' : 'Tenggat Terdekat' }}</h3>
            <p class="mt-1 text-sm text-slate-600">Prioritas dari mata pelajaran aktif Anda.</p>
          </div>
          <router-link to="/lms/courses" class="text-sm font-semibold text-primary hover:underline">Lihat semua</router-link>
        </div>
        <div v-if="upcomingAssignments.length" class="divide-y divide-slate-100">
          <router-link
            v-for="item in upcomingAssignments"
            :key="item.id"
            :to="`/lms/courses/${item.courseId}`"
            class="flex items-center justify-between gap-4 py-3 hover:text-primary"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">{{ item.title }}</p>
              <p class="mt-0.5 text-sm text-slate-500">{{ item.courseName }}</p>
            </div>
            <span class="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {{ new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) }}
            </span>
          </router-link>
        </div>
        <p v-else class="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Belum ada tugas dengan tenggat mendatang.</p>
      </div>

      <div class="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
        <h3 class="font-bold text-slate-900">Agenda Hari Ini</h3>
        <router-link
          v-if="authStore.isTeacher"
          to="/attendance"
          class="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-50 p-4 hover:border-primary"
        >
          <CalendarCheck class="h-5 w-5 text-primary" />
          <div><p class="text-sm font-semibold text-slate-900">Isi absensi hari ini</p><p class="text-sm text-slate-600">Buka daftar kelas dan catat kehadiran.</p></div>
        </router-link>
        <router-link to="/cbt/exams" class="flex items-center gap-3 rounded-xl border border-slate-200 p-4 hover:border-primary">
          <ClipboardCheck class="h-5 w-5 text-secondary" />
          <div><p class="text-sm font-semibold text-slate-900">{{ activeExams.length }} ujian sedang aktif</p><p class="text-sm text-slate-600">{{ authStore.isStudent ? 'Buka ujian yang tersedia.' : 'Pantau jadwal dan sesi ujian.' }}</p></div>
        </router-link>
        <div v-if="activeExams.length === 0" class="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <AlertCircle class="h-5 w-5 text-slate-400" /> Tidak ada ujian aktif saat ini.
        </div>
      </div>
    </section>

    <section v-if="!loading && authStore.isCounselor" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <router-link to="/global" class="rounded-2xl border border-primary/20 bg-primary-50 p-5 hover:border-primary">
        <h3 class="font-bold text-slate-900">Antrean Konsultasi</h3><p class="mt-1 text-sm text-slate-600">Tinjau pengajuan dan hubungi siswa atau orang tua.</p>
      </router-link>
      <router-link to="/attendance" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary">
        <h3 class="font-bold text-slate-900">Pantau Kehadiran</h3><p class="mt-1 text-sm text-slate-600">Temukan siswa yang membutuhkan tindak lanjut.</p>
      </router-link>
    </section>

    <section v-if="!loading && authStore.isParent" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <router-link to="/attendance" class="rounded-2xl border border-primary/20 bg-primary-50 p-5 hover:border-primary">
        <h3 class="font-bold text-slate-900">Kehadiran Anak</h3><p class="mt-1 text-sm text-slate-600">Lihat riwayat dan ringkasan kehadiran terbaru.</p>
      </router-link>
      <router-link to="/cbt/grades" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary">
        <h3 class="font-bold text-slate-900">Nilai & Rapor Anak</h3><p class="mt-1 text-sm text-slate-600">Pantau hasil belajar yang telah diterbitkan sekolah.</p>
      </router-link>
    </section>

    <!-- Executive Overview for PRINCIPAL / SCHOOL_ADMIN / SUPER_OWNER -->
    <section v-if="authStore.isSchoolExecutive" class="space-y-5">
      <!-- 4 KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500">Tingkat Kehadiran</span>
            <div class="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck class="h-4 w-4" />
            </div>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">
            {{ attendanceSummary ? `${attendanceSummary.attendanceRate}%` : '—' }}
          </p>
          <p class="text-[11px] text-slate-500 mt-1">
            {{ attendanceSummary ? `${attendanceSummary.present} Hadir • ${attendanceSummary.late} Terlambat` : 'Data presensi sekolah' }}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500">Rombongan Belajar</span>
            <div class="h-8 w-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center">
              <School class="h-4 w-4" />
            </div>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ schoolClasses.length }}</p>
          <p class="text-[11px] text-slate-500 mt-1">Kelas aktif terdaftar</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500">Kursus & Mapel (LMS)</span>
            <div class="h-8 w-8 rounded-lg bg-secondary-50 text-secondary flex items-center justify-center">
              <BookOpen class="h-4 w-4" />
            </div>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ activeCourses.length }}</p>
          <p class="text-[11px] text-slate-500 mt-1">Mata pelajaran aktif</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500">Jadwal Ujian CBT</span>
            <div class="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ClipboardCheck class="h-4 w-4" />
            </div>
          </div>
          <p class="text-2xl font-extrabold text-slate-900">{{ cbtExams.length }}</p>
          <p class="text-[11px] text-slate-500 mt-1">Ujian terjadwal & aktif</p>
        </div>
      </div>

      <!-- Attendance Pulse & Class Overview -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Attendance Breakdown -->
        <div class="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">Rekap Kehadiran Sekolah</h3>
            <router-link to="/attendance" class="text-xs font-semibold text-primary hover:underline">
              Detail →
            </router-link>
          </div>
          <div v-if="attendanceSummary && attendanceSummary.total > 0" class="space-y-3">
            <div class="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex">
              <div
                class="bg-emerald-500 h-full"
                :style="{ width: `${(attendanceSummary.present / attendanceSummary.total) * 100}%` }"
                title="Hadir"
              />
              <div
                class="bg-amber-400 h-full"
                :style="{ width: `${(attendanceSummary.late / attendanceSummary.total) * 100}%` }"
                title="Terlambat"
              />
              <div
                class="bg-sky-400 h-full"
                :style="{ width: `${((attendanceSummary.sick + attendanceSummary.permit) / attendanceSummary.total) * 100}%` }"
                title="Sakit / Izin"
              />
              <div
                class="bg-red-500 h-full"
                :style="{ width: `${(attendanceSummary.absent / attendanceSummary.total) * 100}%` }"
                title="Alfa"
              />
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                <span class="text-emerald-800 font-medium">Hadir</span>
                <span class="font-bold text-emerald-700">{{ attendanceSummary.present }}</span>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span class="text-amber-800 font-medium">Terlambat</span>
                <span class="font-bold text-amber-700">{{ attendanceSummary.late }}</span>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2">
                <span class="text-sky-800 font-medium">Sakit / Izin</span>
                <span class="font-bold text-sky-700">{{ attendanceSummary.sick + attendanceSummary.permit }}</span>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                <span class="text-red-800 font-medium">Alfa</span>
                <span class="font-bold text-red-700">{{ attendanceSummary.absent }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-slate-500 py-4">
            Belum ada catatan presensi siswa yang tercatat.
          </p>
        </div>

        <!-- Classes & CBT Summary -->
        <div class="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">Ringkasan Kelas & Rombongan Belajar</h3>
            <router-link to="/academic/classes" class="text-xs font-semibold text-primary hover:underline">
              Lihat Semua →
            </router-link>
          </div>
          <div v-if="schoolClasses.length > 0" class="divide-y divide-slate-100">
            <div
              v-for="cls in schoolClasses.slice(0, 4)"
              :key="cls.id"
              class="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <p class="font-bold text-slate-900">{{ cls.name }} <span class="font-normal text-slate-500">(Tingkat {{ cls.gradeLevel }})</span></p>
                <p class="text-slate-500">Wali Kelas: {{ cls.homeroomTeacherName || 'Belum ditentukan' }}</p>
              </div>
              <span class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 shrink-0">
                <Users class="h-3.5 w-3.5 text-primary" />
                {{ cls.studentCount ?? 0 }} Siswa
              </span>
            </div>
          </div>
          <p v-else class="text-xs text-slate-500 py-4">
            Belum ada kelas aktif yang terdaftar.
          </p>
        </div>
      </div>
    </section>

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
              <p class="text-2xl font-extrabold text-slate-900">{{ programs.length }}</p>
              <p class="text-sm text-slate-600">Program global tersedia</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-secondary-50 text-secondary flex items-center justify-center">
              <Globe class="h-5 w-5" />
            </div>
            <div>
              <p class="text-2xl font-extrabold text-slate-900">{{ destinationCount || '—' }}</p>
              <p class="text-sm text-slate-600">Destinasi program terdaftar</p>
            </div>
          </div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award class="h-5 w-5" />
            </div>
            <div>
              <p class="text-2xl font-extrabold text-slate-900">{{ scholarships.length }}</p>
              <p class="text-sm text-slate-600">Beasiswa dapat dieksplorasi</p>
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
                {{ prog.category || prog.targetAudience || 'Program Global' }}
              </span>
              <span class="text-xs text-slate-500">
                {{ prog.quota ? `Kuota ${prog.quota} Siswa` : [prog.duration, prog.destination].filter(Boolean).join(' • ') }}
              </span>
            </div>
            <h4 class="text-base font-bold text-slate-900 mb-1">{{ prog.title }}</h4>
            <p class="text-xs text-slate-600 leading-relaxed line-clamp-2">{{ prog.description || prog.summary }}</p>
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
                  (sch.fundingType || sch.coverage)?.toUpperCase() === 'FULL'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-sky-50 text-sky-700',
                ]"
              >
                {{ (sch.fundingType || sch.coverage)?.toUpperCase() === 'FULL' ? 'Beasiswa Penuh' : 'Beasiswa Parsial' }}
              </span>
              <span v-if="sch.deadline" class="text-[11px] text-slate-500">
                Batas: {{ new Date(sch.deadline).toLocaleDateString('id-ID') }}
              </span>
            </div>
            <h4 class="text-sm font-bold text-slate-900 mb-1">{{ sch.name || sch.title }}</h4>
            <p class="text-xs font-medium text-primary mb-2">
              {{ [sch.provider, getCountryName(sch.country)].filter(Boolean).join(' • ') }}
            </p>
            <p class="text-xs text-slate-600 line-clamp-2">{{ sch.description || sch.eligibility }}</p>
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
