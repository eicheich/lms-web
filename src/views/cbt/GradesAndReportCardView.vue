<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { Award, Printer, Search } from 'lucide-vue-next'
import { apiRequest, isModuleLockedError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useToast } from '@/composables/useToast'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type {
  ClassStudentItem,
  ClassStudentsResponse,
  ReportCardRecord,
  SchoolClass,
  StudentGradeSummary,
} from '@/types/api'

const authStore = useAuthStore()
const tenantStore = useTenantStore()
const toast = useToast()

const classes = ref<SchoolClass[]>([])
const selectedClassId = ref('')
const classStudents = ref<ClassStudentItem[]>([])

const selectedStudentId = ref(
  authStore.isStudent ? authStore.user?.id || authStore.user?.userId || '' : '',
)
const manualStudentId = ref('')

const gradeSummary = ref<StudentGradeSummary | null>(null)
const moduleLocked = ref(false)
const loading = ref(false)
const saving = ref(false)
const showConfirmFinalize = ref(false)

const finalizeForm = reactive({
  academicYear: '2026/2027',
  semester: 1,
  summaryGpa: 3.85,
  sikap: 'Sangat Baik',
  catatan: 'Aktif berpartisipasi dalam diskusi dan ujian CBT.',
})

async function loadClassesForPicker() {
  if (authStore.isStudent) return
  try {
    classes.value = await apiRequest<SchoolClass[]>({
      method: 'GET',
      url: '/academic/classes',
    })
    if (classes.value.length > 0 && !selectedClassId.value) {
      selectedClassId.value = classes.value[0].id
    }
  } catch {
    // ignore if user role cannot list classes
  }
}

async function loadStudentsInClass(classId: string) {
  if (!classId) return
  try {
    const res = await apiRequest<ClassStudentsResponse>({
      method: 'GET',
      url: `/academic/classes/${classId}/students`,
    })
    classStudents.value = res.students ?? []
    if (classStudents.value.length > 0 && !selectedStudentId.value) {
      selectedStudentId.value = classStudents.value[0].studentId
    }
  } catch {
    classStudents.value = []
  }
}

watch(selectedClassId, (id) => {
  loadStudentsInClass(id)
})

async function loadGrades() {
  if (!selectedStudentId.value) {
    gradeSummary.value = null
    return
  }
  loading.value = true
  moduleLocked.value = false
  try {
    gradeSummary.value = await apiRequest<StudentGradeSummary>({
      method: 'GET',
      url: `/cbt/students/${selectedStudentId.value}/grades`,
    })
  } catch (err) {
    if (isModuleLockedError(err)) {
      moduleLocked.value = true
    } else {
      gradeSummary.value = null
    }
  } finally {
    loading.value = false
  }
}

watch(selectedStudentId, loadGrades)

function applyManualStudentId() {
  if (manualStudentId.value.trim()) {
    selectedStudentId.value = manualStudentId.value.trim()
  }
}

async function finalizeReportCard() {
  if (!selectedStudentId.value) return
  saving.value = true
  try {
    await apiRequest<ReportCardRecord>({
      method: 'POST',
      url: '/cbt/report-cards/finalize',
      data: {
        studentId: selectedStudentId.value,
        academicYear: finalizeForm.academicYear,
        semester: Number(finalizeForm.semester),
        summaryGpa: Number(finalizeForm.summaryGpa),
        finalEvaluation: {
          sikap: finalizeForm.sikap,
          catatan: finalizeForm.catatan,
        },
      },
    })
    showConfirmFinalize.value = false
    toast.success('Rapor akademik semester berhasil difinalisasi!')
    await loadGrades()
  } catch {
    toast.error('Gagal memfinalisasi rapor akademik')
  } finally {
    saving.value = false
  }
}

function printReport() {
  window.print()
}

onMounted(async () => {
  await loadClassesForPicker()
  if (selectedStudentId.value) {
    await loadGrades()
  }
})
</script>

<template>
  <LockedModuleBanner v-if="moduleLocked" module-key="CBT_GRADING" />

  <div v-else class="space-y-6">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Kompilasi Nilai & Rapor Akademik</h2>
        <p class="text-xs text-slate-500">
          Rekapitulasi nilai tugas, ujian, dan laporan hasil belajar siswa.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <template v-if="!authStore.isStudent">
          <select
            v-if="classes.length > 0"
            v-model="selectedClassId"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
          </select>

          <select
            v-if="classStudents.length > 0"
            v-model="selectedStudentId"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
          >
            <option v-for="stu in classStudents" :key="stu.studentId" :value="stu.studentId">
              {{ stu.fullName }}
            </option>
          </select>

          <div class="flex items-center gap-1.5">
            <input
              v-model="manualStudentId"
              type="text"
              placeholder="ID Siswa..."
              class="w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
            />
            <button
              type="button"
              @click="applyManualStudentId"
              class="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              title="Cari ID Siswa"
            >
              <Search class="h-4 w-4" />
            </button>
          </div>
        </template>

        <button
          type="button"
          :disabled="!gradeSummary"
          @click="printReport"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Printer class="h-4 w-4" />
          Cetak Rapor
        </button>
      </div>
    </div>

    <SkeletonCard v-if="loading" :count="2" />

    <EmptyState
      v-else-if="!gradeSummary"
      title="Belum Ada Data Nilai Dipilih"
      description="Pilih siswa dari daftar kelas atau masukkan ID siswa untuk menampilkan kompilasi nilai dan rapor akademik."
      :icon="Award"
    />

    <!-- Printable Report Card -->
    <div v-else class="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-primary">
            {{ tenantStore.branding.schoolName }}
          </p>
          <h3 class="text-xl font-bold text-slate-900 mt-0.5">Laporan Hasil Belajar Siswa</h3>
        </div>
        <div class="text-xs text-slate-600 sm:text-right">
          <p class="font-bold text-slate-900 text-sm">{{ gradeSummary.student.fullName }}</p>
          <p>{{ gradeSummary.student.gradeLevel }} • {{ gradeSummary.student.email }}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
              <th class="py-3 pr-4">Mata Pelajaran</th>
              <th class="py-3 px-4 text-center">Rata-Rata Tugas (LMS)</th>
              <th class="py-3 px-4 text-center">Rata-Rata Ujian (CBT)</th>
              <th class="py-3 px-4 text-center">Nilai Akhir</th>
              <th class="py-3 pl-4 text-center">Predikat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in gradeSummary.courses" :key="item.courseId">
              <td class="py-3.5 pr-4 font-semibold text-slate-900">{{ item.courseName }}</td>
              <td class="py-3.5 px-4 text-center text-slate-600">{{ item.assignmentAvg }}</td>
              <td class="py-3.5 px-4 text-center text-slate-600">{{ item.cbtAvg }}</td>
              <td class="py-3.5 px-4 text-center font-bold text-primary">{{ item.finalScore }}</td>
              <td class="py-3.5 pl-4 text-center">
                <span class="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary">
                  {{ item.letterGrade }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="gradeSummary.reportCard"
        class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="space-y-1">
          <span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Award class="h-4 w-4" />
            Rapor Resmi Difinalisasi • Semester {{ gradeSummary.reportCard.semester }} ({{ gradeSummary.reportCard.academicYear }})
          </span>
          <p class="text-sm font-semibold text-slate-900">
            Sikap: {{ gradeSummary.reportCard.finalEvaluation.sikap }}
          </p>
          <p class="text-xs text-slate-600">
            Catatan Wali Kelas: "{{ gradeSummary.reportCard.finalEvaluation.catatan }}"
          </p>
        </div>
        <div class="text-left md:text-right shrink-0">
          <p class="text-xs text-slate-500">IPK / Summary GPA</p>
          <p class="text-3xl font-extrabold text-primary">{{ gradeSummary.reportCard.summaryGpa }}</p>
        </div>
      </div>
    </div>

    <!-- Form Finalisasi Rapor (Admin / Principal) -->
    <div
      v-if="authStore.isAdmin && selectedStudentId"
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 no-print"
    >
      <h3 class="text-base font-bold text-slate-900">Finalisasi Rapor Semester</h3>
      <form @submit.prevent="showConfirmFinalize = true" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
          <input v-model="finalizeForm.academicYear" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
          <select v-model.number="finalizeForm.semester" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option :value="1">Semester 1 (Ganjil)</option>
            <option :value="2">Semester 2 (Genap)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Summary GPA</label>
          <input v-model.number="finalizeForm.summaryGpa" step="0.01" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Predikat Sikap</label>
          <input v-model="finalizeForm.sikap" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div class="md:col-span-3">
          <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan Evaluasi Akhir</label>
          <input v-model="finalizeForm.catatan" type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div class="flex items-end">
          <button
            type="submit"
            :disabled="saving"
            class="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {{ saving ? 'Memfinalisasi...' : 'Finalisasi Rapor' }}
          </button>
        </div>
      </form>
    </div>

    <ConfirmDialog
      :open="showConfirmFinalize"
      title="Finalisasi Rapor Semester?"
      description="Nilai rapor akan dikunci secara resmi dan dapat dilihat serta dicetak oleh siswa maupun orang tua."
      confirm-text="Ya, Finalisasi Rapor"
      variant="primary"
      :loading="saving"
      @cancel="showConfirmFinalize = false"
      @confirm="finalizeReportCard"
    />
  </div>
</template>
