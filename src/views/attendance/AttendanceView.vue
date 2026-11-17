<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { CalendarCheck, CheckCircle2, Save, Users } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import type {
  AttendanceSessionType,
  AttendanceStatus,
  AttendanceSummary,
  ChildrenAttendanceResponse,
  ClassAttendanceResponse,
  Course,
  SchoolClass,
  StudentAttendanceResponse,
} from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

const statusOptions: Array<{ value: AttendanceStatus; label: string; color: string }> = [
  { value: 'PRESENT', label: 'Hadir', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'LATE', label: 'Terlambat', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'SICK', label: 'Sakit', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'PERMIT', label: 'Izin', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'ABSENT', label: 'Alfa', color: 'bg-red-50 text-red-700 border-red-200' },
]

// Staff (Teacher / Admin / Principal / Counselor) State
const classes = ref<SchoolClass[]>([])
const courses = ref<Course[]>([])
const selectedClassId = ref('')
const selectedCourseId = ref('')
const selectedDate = ref('2026-11-17')
const sessionType = ref<AttendanceSessionType>('DAILY')
const tenantSummary = ref<AttendanceSummary | null>(null)
const classSheet = ref<ClassAttendanceResponse | null>(null)
const draftStatus = ref<Record<string, AttendanceStatus>>({})
const draftNotes = ref<Record<string, string>>({})

// Student & Parent State
const myAttendance = ref<StudentAttendanceResponse | null>(null)
const childrenAttendance = ref<ChildrenAttendanceResponse | null>(null)

const loading = ref(true)
const saving = ref(false)
const feedbackMsg = ref('')

const canRecordAttendance = authStore.isTeacher
const isStaff = ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'COUNSELOR'].includes(
  authStore.role || '',
)

const draftSummary = computed(() => {
  const counts = { PRESENT: 0, LATE: 0, SICK: 0, PERMIT: 0, ABSENT: 0 }
  Object.values(draftStatus.value).forEach((st) => {
    counts[st] = (counts[st] || 0) + 1
  })
  return counts
})

async function loadStaffData() {
  loading.value = true
  try {
    const [clsRes, sumRes, crsRes] = await Promise.all([
      apiRequest<SchoolClass[]>({ method: 'GET', url: '/academic/classes' }),
      apiRequest<AttendanceSummary>({ method: 'GET', url: '/attendance/summary' }),
      apiRequest<Course[]>({ method: 'GET', url: '/lms/courses' }).catch(() => []),
    ])
    classes.value = clsRes
    tenantSummary.value = sumRes
    courses.value = crsRes
    if (crsRes.length > 0 && !selectedCourseId.value) {
      selectedCourseId.value = crsRes[0].id
    }
    if (clsRes.length > 0 && !selectedClassId.value) {
      selectedClassId.value = clsRes[0].id
    }
    if (selectedClassId.value) {
      await loadClassSheet()
    }
  } finally {
    loading.value = false
  }
}

async function loadClassSheet() {
  if (!selectedClassId.value) return
  const res = await apiRequest<ClassAttendanceResponse>({
    method: 'GET',
    url: `/attendance/class/${selectedClassId.value}`,
    params: { date: selectedDate.value, sessionType: sessionType.value },
  })
  classSheet.value = res
  const nextStatus: Record<string, AttendanceStatus> = {}
  const nextNotes: Record<string, string> = {}
  for (const stu of res.students) {
    nextStatus[stu.studentId] = stu.status || 'PRESENT'
    nextNotes[stu.studentId] = stu.notes || ''
  }
  draftStatus.value = nextStatus
  draftNotes.value = nextNotes
}

watch([selectedClassId, selectedDate, sessionType], () => {
  if (isStaff && selectedClassId.value) {
    loadClassSheet()
  }
})

function markAllPresent() {
  if (!classSheet.value) return
  const next = { ...draftStatus.value }
  for (const stu of classSheet.value.students) {
    next[stu.studentId] = 'PRESENT'
  }
  draftStatus.value = next
}

async function saveBulkAttendance() {
  if (!classSheet.value || classSheet.value.students.length === 0) return
  saving.value = true
  feedbackMsg.value = ''
  try {
    await apiRequest({
      method: 'POST',
      url: '/attendance/bulk',
      data: {
        date: selectedDate.value,
        classId: selectedClassId.value,
        courseId: sessionType.value === 'SUBJECT' ? selectedCourseId.value : undefined,
        sessionType: sessionType.value,
        records: classSheet.value.students.map((s) => ({
          studentId: s.studentId,
          status: draftStatus.value[s.studentId] || 'PRESENT',
          notes: draftNotes.value[s.studentId] || undefined,
        })),
      },
    })
    toast.success(
      'Absensi Berhasil Disimpan',
      `${classSheet.value.students.length} siswa pada tanggal ${selectedDate.value}.`,
    )
    tenantSummary.value = await apiRequest<AttendanceSummary>({
      method: 'GET',
      url: '/attendance/summary',
    })
    await loadClassSheet()
  } catch {
    toast.error('Gagal menyimpan absensi bulk')
  } finally {
    saving.value = false
  }
}

async function loadStudentOrParentData() {
  loading.value = true
  try {
    if (authStore.isStudent) {
      myAttendance.value = await apiRequest<StudentAttendanceResponse>({
        method: 'GET',
        url: '/attendance/my',
      })
    } else if (authStore.isParent) {
      childrenAttendance.value = await apiRequest<ChildrenAttendanceResponse>({
        method: 'GET',
        url: '/attendance/children',
      })
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (isStaff) {
    loadStaffData()
  } else {
    loadStudentOrParentData()
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarCheck class="h-5 w-5 text-primary" />
          Absensi Siswa
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Catat dan pantau kehadiran harian maupun per mata pelajaran.
        </p>
      </div>
    </div>

    <div
      v-if="feedbackMsg"
      class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700"
    >
      <span class="flex items-center gap-2">
        <CheckCircle2 class="h-4 w-4" />
        {{ feedbackMsg }}
      </span>
      <button @click="feedbackMsg = ''" class="hover:underline">Tutup</button>
    </div>

    <SkeletonCard v-if="loading" :count="2" />

    <!-- VIEW 1: STAFF (TEACHER / ADMIN / PRINCIPAL / COUNSELOR) -->
    <template v-else-if="isStaff">
      <!-- Tenant Summary Cards -->
      <div v-if="tenantSummary" class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-slate-500">Tingkat Kehadiran</p>
          <p class="text-2xl font-extrabold text-primary mt-1">{{ tenantSummary.attendanceRate }}%</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-slate-500">Hadir (PRESENT)</p>
          <p class="text-2xl font-extrabold text-emerald-600 mt-1">{{ tenantSummary.present }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-slate-500">Terlambat (LATE)</p>
          <p class="text-2xl font-extrabold text-amber-600 mt-1">{{ tenantSummary.late }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-slate-500">Sakit / Izin</p>
          <p class="text-2xl font-extrabold text-sky-600 mt-1">
            {{ tenantSummary.sick + tenantSummary.permit }}
          </p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-xs text-slate-500">Alfa (ABSENT)</p>
          <p class="text-2xl font-extrabold text-red-600 mt-1">{{ tenantSummary.absent }}</p>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Pilih Kelas</label>
          <select v-model="selectedClassId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
            <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
          <input v-model="selectedDate" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Tipe Sesi</label>
          <select v-model="sessionType" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="DAILY">Absensi Harian</option>
            <option value="SUBJECT">Absensi Mata Pelajaran</option>
          </select>
        </div>
        <div v-if="sessionType === 'SUBJECT'">
          <label class="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
          <select v-model="selectedCourseId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option v-for="crs in courses" :key="crs.id" :value="crs.id">{{ crs.name }}</option>
          </select>
        </div>
      </div>

      <!-- Attendance Sheet -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <Users class="h-4 w-4 text-primary" />
              <h3 class="text-base font-bold text-slate-900">
                Lembar Absensi {{ classSheet?.class?.name }} ({{ selectedDate }})
              </h3>
              <span
                v-if="!canRecordAttendance"
                class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600"
              >
                Mode Monitoring
              </span>
            </div>
            <p v-if="classSheet?.students.length" class="text-xs text-slate-500 mt-1">
              {{ canRecordAttendance ? 'Rekap Draft:' : 'Rekap Kehadiran:' }}
              <span class="font-semibold text-emerald-600">{{ draftSummary.PRESENT }} Hadir</span> •
              <span class="font-semibold text-amber-600">{{ draftSummary.LATE }} Terlambat</span> •
              <span class="font-semibold text-sky-600">{{ draftSummary.SICK + draftSummary.PERMIT }} Sakit/Izin</span> •
              <span class="font-semibold text-red-600">{{ draftSummary.ABSENT }} Alfa</span>
            </p>
          </div>
          <div v-if="canRecordAttendance" class="flex gap-2">
            <button
              type="button"
              @click="markAllPresent"
              class="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tandai Hadir Semua
            </button>
            <button
              type="button"
              :disabled="saving || !classSheet?.students.length"
              @click="saveBulkAttendance"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Save class="h-4 w-4" />
              {{ saving ? 'Menyimpan...' : 'Simpan Daftar Hadir' }}
            </button>
          </div>
        </div>

        <div v-if="!classSheet || classSheet.students.length === 0" class="py-10 text-center text-sm text-slate-500">
          Tidak ada siswa terdaftar di kelas ini. Daftarkan siswa terlebih dahulu di menu Manajemen Kelas.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="stu in classSheet.students"
            :key="stu.studentId"
            class="rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div>
              <p class="text-sm font-bold text-slate-900">{{ stu.fullName }}</p>
              <p class="text-xs text-slate-500">{{ stu.email }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="opt in statusOptions"
                :key="opt.value"
                type="button"
                :disabled="!canRecordAttendance"
                @click="draftStatus[stu.studentId] = opt.value"
                :class="[
                  'rounded-lg px-3 py-1.5 text-xs font-bold border transition',
                  draftStatus[stu.studentId] === opt.value
                    ? opt.color + ' ring-1 ring-current'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50',
                ]"
              >
                {{ opt.label }}
              </button>
              <input
                v-model="draftNotes[stu.studentId]"
                :disabled="!canRecordAttendance"
                type="text"
                placeholder="Catatan..."
                class="w-full sm:w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- VIEW 2: STUDENT -->
    <template v-else-if="authStore.isStudent && myAttendance">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs text-slate-500">Persentase Kehadiran</p>
          <p class="text-3xl font-extrabold text-primary mt-1">{{ myAttendance.summary.attendanceRate }}%</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs text-slate-500">Total Hadir</p>
          <p class="text-3xl font-extrabold text-emerald-600 mt-1">{{ myAttendance.summary.present }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs text-slate-500">Terlambat</p>
          <p class="text-3xl font-extrabold text-amber-600 mt-1">{{ myAttendance.summary.late }}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-xs text-slate-500">Sakit / Izin / Alfa</p>
          <p class="text-3xl font-extrabold text-slate-700 mt-1">
            {{ myAttendance.summary.sick + myAttendance.summary.permit + myAttendance.summary.absent }}
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 class="text-base font-bold text-slate-900">Riwayat Kehadiran Saya</h3>
        <div class="divide-y divide-slate-100">
          <div
            v-for="rec in myAttendance.records"
            :key="rec.id"
            class="py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p class="text-sm font-bold text-slate-900">{{ rec.attendanceDate }} ({{ rec.sessionType }})</p>
              <p class="text-xs text-slate-500">{{ rec.notes || 'Tidak ada catatan' }}</p>
            </div>
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {{ rec.status }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- VIEW 3: PARENT -->
    <template v-else-if="authStore.isParent && childrenAttendance">
      <div
        v-for="child in childrenAttendance.children"
        :key="child.studentId"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">{{ child.fullName }}</h3>
            <p class="text-xs text-slate-500">{{ child.email }}</p>
          </div>
          <span class="rounded-xl bg-primary-50 px-4 py-2 text-sm font-bold text-primary">
            Tingkat Kehadiran: {{ child.summary.attendanceRate }}%
          </span>
        </div>

        <div class="divide-y divide-slate-100">
          <div
            v-for="rec in child.records"
            :key="rec.id"
            class="py-3 flex items-center justify-between gap-4"
          >
            <div>
              <p class="text-sm font-bold text-slate-900">{{ rec.attendanceDate }} ({{ rec.sessionType }})</p>
              <p class="text-xs text-slate-500">{{ rec.notes || 'Hadir di kelas' }}</p>
            </div>
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {{ rec.status }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
