<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ClipboardCheck, Clock, Eye, Pencil, Play, Plus, Search, Shuffle, Trash2, X } from 'lucide-vue-next'
import { apiRequest, isModuleLockedError, normalizePaginated } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import type { CbtExam, Course, PaginatedResponse, Question, QuestionBank } from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

const exams = ref<CbtExam[]>([])
const courses = ref<Course[]>([])
const banks = ref<QuestionBank[]>([])
const selectedBankId = ref('')
const availableQuestions = ref<Question[]>([])
const moduleLocked = ref(false)
const showCreateModal = ref(false)
const editingExamId = ref<string | null>(null)
const previewExam = ref<CbtExam | null>(null)
const loadingPreview = ref(false)

// Search, filter, sort, pagination
const search = ref('')
const statusFilter = ref('')
const courseFilter = ref('')
const sortBy = ref('startTime')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)

function toLocalDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const form = reactive({
  courseId: '',
  title: '',
  durationMinutes: 60,
  passingScore: 75,
  startDate: toLocalDateTime(new Date()),
  endDate: toLocalDateTime(new Date(Date.now() + 14 * 86400000)),
  isRandomized: true,
  status: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED',
  questionIds: [] as string[],
})

function getExamStatus(exam: CbtExam) {
  const now = Date.now()
  if (now < new Date(exam.startTime).getTime()) return 'UPCOMING'
  if (now > new Date(exam.endTime).getTime()) return 'CLOSED'
  return 'ACTIVE'
}

function getExamStatusLabel(exam: CbtExam) {
  return { UPCOMING: 'Akan Datang', ACTIVE: 'Sedang Berlangsung', CLOSED: 'Selesai' }[
    getExamStatus(exam)
  ]
}

function getExamStatusClass(exam: CbtExam) {
  return {
    UPCOMING: 'bg-sky-50 text-sky-700',
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-600',
  }[getExamStatus(exam)]
}

async function loadBankQuestions(bankId: string) {
  if (!bankId) {
    availableQuestions.value = []
    form.questionIds = []
    return
  }
  availableQuestions.value = await apiRequest<Question[]>({
    method: 'GET',
    url: `/cbt/question-banks/${bankId}/questions`,
  })
  form.questionIds = availableQuestions.value.map((q) => q.id)
}

watch(selectedBankId, loadBankQuestions)

async function loadExams() {
  moduleLocked.value = false
  try {
    const raw = await apiRequest<PaginatedResponse<CbtExam> | CbtExam[]>({
      method: 'GET',
      url: '/cbt/exams',
      params: {
        search: search.value.trim() || undefined,
        status: statusFilter.value || undefined,
        courseId: courseFilter.value || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        page: page.value,
        limit: 10,
      },
    })
    const res = normalizePaginated(raw)
    exams.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages || 1
    if (authStore.isTeacherOrAdmin && banks.value.length === 0) {
      const [bankRes, courseRes] = await Promise.all([
        apiRequest<PaginatedResponse<QuestionBank> | QuestionBank[]>({ method: 'GET', url: '/cbt/question-banks' }),
        apiRequest<PaginatedResponse<Course> | Course[]>({ method: 'GET', url: '/lms/courses' }).catch(() => []),
      ])
      banks.value = normalizePaginated(bankRes).items
      courses.value = normalizePaginated(courseRes).items
      if (courses.value.length > 0 && !form.courseId) {
        form.courseId = courses.value[0].id
      }
      if (banks.value.length > 0 && !selectedBankId.value) {
        selectedBankId.value = banks.value[0].id
        await loadBankQuestions(selectedBankId.value)
      }
    }
  } catch (err) {
    if (isModuleLockedError(err)) {
      moduleLocked.value = true
    }
  }
}

watch([search, statusFilter, courseFilter, sortBy, sortOrder], () => {
  page.value = 1
  loadExams()
})
watch(page, loadExams)

async function openPreviewModal(examId: string) {
  loadingPreview.value = true
  try {
    const res = await apiRequest<CbtExam | { exam: CbtExam; questions?: Question[] }>({
      method: 'GET',
      url: `/cbt/exams/${examId}`,
    })
    previewExam.value = 'exam' in res ? { ...res.exam, questions: res.questions || [] } : res
  } finally {
    loadingPreview.value = false
  }
}

function openCreateExamModal() {
  editingExamId.value = null
  form.title = ''
  form.durationMinutes = 60
  form.passingScore = 75
  form.startDate = toLocalDateTime(new Date())
  form.endDate = toLocalDateTime(new Date(Date.now() + 14 * 86400000))
  form.isRandomized = true
  form.status = 'PUBLISHED'
  showCreateModal.value = true
}

function openEditExamModal(exam: CbtExam) {
  editingExamId.value = exam.id
  form.courseId = exam.courseId || ''
  form.title = exam.title
  form.durationMinutes = exam.durationMinutes
  form.passingScore = exam.passingScore
  form.startDate = toLocalDateTime(new Date(exam.startTime))
  form.endDate = toLocalDateTime(new Date(exam.endTime))
  form.isRandomized = Boolean(exam.isRandomized)
  form.status = (exam.status as 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED') || 'PUBLISHED'
  showCreateModal.value = true
}

async function createExam() {
  if (!editingExamId.value && form.questionIds.length === 0) {
    toast.error('Pilih minimal 1 butir soal untuk ujian ini')
    return
  }
  if (new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()) {
    toast.error('Waktu selesai harus setelah waktu mulai ujian')
    return
  }
  try {
    if (editingExamId.value) {
      await apiRequest<CbtExam>({
        method: 'PUT',
        url: `/cbt/exams/${editingExamId.value}`,
        data: {
          courseId: form.courseId || undefined,
          title: form.title,
          durationMinutes: Number(form.durationMinutes),
          startTime: new Date(form.startDate).toISOString(),
          endTime: new Date(form.endDate).toISOString(),
          passingScore: Number(form.passingScore),
          isRandomized: form.isRandomized,
          status: form.status,
        },
      })
      toast.success('Jadwal ujian CBT berhasil diperbarui!')
    } else {
      await apiRequest<CbtExam>({
        method: 'POST',
        url: '/cbt/exams',
        data: {
          courseId: form.courseId || undefined,
          title: form.title,
          durationMinutes: Number(form.durationMinutes),
          startTime: new Date(form.startDate).toISOString(),
          endTime: new Date(form.endDate).toISOString(),
          passingScore: Number(form.passingScore),
          isRandomized: form.isRandomized,
          questionIds: form.questionIds,
        },
      })
      toast.success('Jadwal ujian CBT berhasil dibuat!')
    }
    showCreateModal.value = false
    editingExamId.value = null
    form.title = ''
    await loadExams()
  } catch {
    toast.error('Gagal menyimpan jadwal ujian CBT')
  }
}

async function deleteExam(exam: CbtExam) {
  if (!confirm(`Hapus ujian "${exam.title}"?`)) return
  try {
    await apiRequest({ method: 'DELETE', url: `/cbt/exams/${exam.id}` })
    toast.success('Ujian Dihapus', exam.title)
    await loadExams()
  } catch {
    toast.error('Gagal menghapus ujian')
  }
}

onMounted(() => {
  loadExams()
})
</script>

<template>
  <LockedModuleBanner v-if="moduleLocked" module-key="CBT_GRADING" />

  <div v-else class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Jadwal Ujian CBT</h2>
        <p class="text-sm text-slate-600">
          Daftar jadwal ujian berbasis komputer yang aktif dan tersedia.
        </p>
      </div>
      <button
        v-if="authStore.isTeacherOrAdmin"
        type="button"
        @click="openCreateExamModal"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        <Plus class="h-4 w-4" />
        Jadwalkan Ujian CBT
      </button>
    </div>

    <!-- Filter & Sort Bar -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari judul ujian..."
          class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
        />
      </div>
      <select v-if="authStore.isTeacherOrAdmin" v-model="statusFilter" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="">Semua Status</option>
        <option value="DRAFT">DRAFT</option>
        <option value="PUBLISHED">PUBLISHED</option>
        <option value="ONGOING">ONGOING</option>
        <option value="COMPLETED">COMPLETED</option>
      </select>
      <select v-if="courses.length > 0" v-model="courseFilter" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="">Semua Mata Pelajaran</option>
        <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <select
        :value="`${sortBy}:${sortOrder}`"
        @change="(e) => {
          const [f, o] = (e.target as HTMLSelectElement).value.split(':')
          sortBy = f
          sortOrder = o as 'ASC' | 'DESC'
        }"
        class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="startTime:DESC">Terbaru</option>
        <option value="startTime:ASC">Terlama</option>
        <option value="title:ASC">Judul A-Z</option>
      </select>
    </div>

    <EmptyState
      v-if="exams.length === 0"
      title="Belum Ada Jadwal Ujian"
      description="Ujian yang tersedia untuk akun Anda akan tampil di halaman ini."
      :icon="ClipboardCheck"
    />

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div
          v-for="exam in exams"
          :key="exam.id"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4"
        >
          <div>
            <div class="flex items-center justify-between mb-3">
              <span :class="['inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', getExamStatusClass(exam)]">
                <ClipboardCheck class="h-3.5 w-3.5" />
                {{ getExamStatusLabel(exam) }}
              </span>
              <div class="flex items-center gap-2">
                <span v-if="exam.isRandomized" class="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Shuffle class="h-3.5 w-3.5" />
                  Soal Diacak
                </span>
                <button
                  v-if="authStore.isTeacherOrAdmin"
                  type="button"
                  @click="openEditExamModal(exam)"
                  class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-primary"
                  title="Edit Ujian"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  v-if="authStore.isTeacherOrAdmin"
                  type="button"
                  @click="deleteExam(exam)"
                  class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  title="Hapus Ujian"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <h3 class="text-base font-bold text-slate-900 mb-2">{{ exam.title }}</h3>
            <div class="flex flex-wrap gap-4 text-xs text-slate-600">
              <span class="inline-flex items-center gap-1.5">
                <Clock class="h-4 w-4 text-primary" />
                Durasi: {{ exam.durationMinutes }} Menit
              </span>
              <span>KKM / Passing Score: {{ exam.passingScore }}</span>
              <span v-if="exam.status" class="font-semibold text-slate-500">({{ exam.status }})</span>
            </div>
          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs text-slate-400">
              {{ new Date(exam.startTime).toLocaleDateString('id-ID') }} –
              {{ new Date(exam.endTime).toLocaleDateString('id-ID') }}
            </span>
            <router-link
              v-if="authStore.isStudent"
              :to="`/cbt/exams/${exam.id}/run`"
              :class="[
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition',
                getExamStatus(exam) === 'ACTIVE'
                  ? 'bg-primary text-white hover:opacity-90'
                  : 'pointer-events-none bg-slate-100 text-slate-400',
              ]"
              :aria-disabled="getExamStatus(exam) !== 'ACTIVE'"
            >
              <Play class="h-3.5 w-3.5" />
              {{ getExamStatus(exam) === 'ACTIVE' ? 'Buka Persiapan Ujian' : getExamStatus(exam) === 'UPCOMING' ? 'Belum Dimulai' : 'Ujian Selesai' }}
            </router-link>
            <button
              v-else
              type="button"
              :disabled="loadingPreview"
              @click="openPreviewModal(exam.id)"
              class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Eye class="h-3.5 w-3.5 text-primary" />
              Lihat Detail & Soal Ujian
            </button>
          </div>
        </div>
      </div>

      <PaginationBar
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :limit="10"
        @update:page="page = $event"
      />
    </div>

    <!-- Modal Jadwalkan Ujian -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      @keydown.esc="showCreateModal = false"
    >
      <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-label="Jadwalkan ujian CBT">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">
            {{ editingExamId ? 'Edit Jadwal Ujian CBT' : 'Jadwalkan Ujian CBT' }}
          </h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="createExam" class="space-y-3">
          <div v-if="editingExamId">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Status Ujian</label>
            <select v-model="form.status" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ONGOING">ONGOING</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran (Untuk Integrasi Rapor)</label>
            <select v-model="form.courseId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">-- Opsional / Ujian Umum --</option>
              <option v-for="c in courses" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.code }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Judul Ujian</label>
            <input
              v-model="form.title"
              required
              type="text"
              placeholder="Ujian Akhir Semester Ganjil 2026"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Durasi (Menit)</label>
              <input v-model.number="form.durationMinutes" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Passing Score</label>
              <input v-model.number="form.passingScore" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Mulai</label>
              <input v-model="form.startDate" type="datetime-local" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Selesai</label>
              <input v-model="form.endDate" type="datetime-local" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>

          <div v-if="!editingExamId">
            <label class="block text-xs font-semibold text-slate-700 mb-1">Sumber Bank Soal</label>
            <select v-model="selectedBankId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.title }} ({{ b.subject }})</option>
            </select>
          </div>

          <div v-if="!editingExamId && availableQuestions.length > 0" class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-700">
              Pilih Butir Soal ({{ form.questionIds.length }}/{{ availableQuestions.length }} dipilih)
            </label>
            <div class="max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2.5 space-y-1.5 bg-slate-50">
              <label
                v-for="(q, idx) in availableQuestions"
                :key="q.id"
                class="flex items-start gap-2 text-xs text-slate-700 cursor-pointer"
              >
                <input v-model="form.questionIds" :value="q.id" type="checkbox" class="mt-0.5 accent-primary" />
                <span class="line-clamp-1">{{ idx + 1 }}. {{ q.prompt }}</span>
              </label>
            </div>
          </div>

          <label class="flex items-center gap-2 text-xs font-medium text-slate-700 pt-1">
            <input v-model="form.isRandomized" type="checkbox" class="accent-primary" />
            Acak urutan soal untuk setiap siswa
          </label>
          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              @click="showCreateModal = false"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="submit"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Preview Detail & Soal Ujian (Monitoring Admin / Guru) -->
    <div
      v-if="previewExam"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      @keydown.esc="previewExam = null"
    >
      <div class="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-label="Pratinjau ujian CBT">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-base font-bold text-slate-900">{{ previewExam.title }}</h3>
            <p class="text-xs text-slate-500">
              Durasi {{ previewExam.durationMinutes }} Menit • Passing Score {{ previewExam.passingScore }}
            </p>
          </div>
          <button @click="previewExam = null" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="!previewExam.questions?.length" class="py-8 text-center text-sm text-slate-500">
          Belum ada butir soal yang terhubung ke ujian ini.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(q, idx) in previewExam.questions"
            :key="q.id"
            class="rounded-xl border border-slate-200 p-4 space-y-2"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-primary">Soal #{{ idx + 1 }} • Bobot {{ q.scoreWeight }}</span>
              <span v-if="q.answerKey" class="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                Kunci: {{ q.answerKey }}
              </span>
            </div>
            <p class="text-sm font-semibold text-slate-900">{{ q.prompt }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600">
              <div v-for="opt in q.options" :key="opt.key" class="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <span class="font-bold mr-1">{{ opt.key }}.</span>{{ opt.text }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
