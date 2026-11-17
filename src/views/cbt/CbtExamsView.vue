<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ClipboardCheck, Clock, Eye, Play, Plus, Shuffle, X } from 'lucide-vue-next'
import { apiRequest, isModuleLockedError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import type { CbtExam, Course, Question, QuestionBank } from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

const exams = ref<CbtExam[]>([])
const courses = ref<Course[]>([])
const banks = ref<QuestionBank[]>([])
const selectedBankId = ref('')
const availableQuestions = ref<Question[]>([])
const moduleLocked = ref(false)
const showCreateModal = ref(false)
const previewExam = ref<CbtExam | null>(null)
const loadingPreview = ref(false)

const form = reactive({
  courseId: '',
  title: '',
  durationMinutes: 60,
  passingScore: 75,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  isRandomized: true,
  questionIds: [] as string[],
})

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
    exams.value = await apiRequest<CbtExam[]>({ method: 'GET', url: '/cbt/exams' })
    if (authStore.isTeacher) {
      const [bankRes, courseRes] = await Promise.all([
        apiRequest<QuestionBank[]>({ method: 'GET', url: '/cbt/question-banks' }),
        apiRequest<Course[]>({ method: 'GET', url: '/lms/courses' }).catch(() => []),
      ])
      banks.value = bankRes
      courses.value = courseRes
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

async function createExam() {
  if (form.questionIds.length === 0) {
    toast.error('Pilih minimal 1 butir soal untuk ujian ini')
    return
  }
  try {
    await apiRequest<CbtExam>({
      method: 'POST',
      url: '/cbt/exams',
      data: {
        courseId: form.courseId || undefined,
        title: form.title,
        durationMinutes: Number(form.durationMinutes),
        startTime: `${form.startDate}T00:00:00Z`,
        endTime: `${form.endDate}T23:59:59Z`,
        passingScore: Number(form.passingScore),
        isRandomized: form.isRandomized,
        questionIds: form.questionIds,
      },
    })
    showCreateModal.value = false
    form.title = ''
    toast.success('Jadwal ujian CBT berhasil dibuat!')
    await loadExams()
  } catch {
    toast.error('Gagal menjadwalkan ujian CBT')
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
        <p class="text-xs text-slate-500">
          Daftar jadwal ujian berbasis komputer yang aktif dan tersedia.
        </p>
      </div>
      <button
        v-if="authStore.isTeacher"
        type="button"
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        <Plus class="h-4 w-4" />
        Jadwalkan Ujian CBT
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div
        v-for="exam in exams"
        :key="exam.id"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between gap-4"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <ClipboardCheck class="h-3.5 w-3.5" />
              {{ exam.status || 'ACTIVE' }}
            </span>
            <span v-if="exam.isRandomized" class="inline-flex items-center gap-1 text-xs text-slate-500">
              <Shuffle class="h-3.5 w-3.5" />
              Soal Diacak
            </span>
          </div>
          <h3 class="text-base font-bold text-slate-900 mb-2">{{ exam.title }}</h3>
          <div class="flex flex-wrap gap-4 text-xs text-slate-600">
            <span class="inline-flex items-center gap-1.5">
              <Clock class="h-4 w-4 text-primary" />
              Durasi: {{ exam.durationMinutes }} Menit
            </span>
            <span>KKM / Passing Score: {{ exam.passingScore }}</span>
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
            class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
          >
            <Play class="h-3.5 w-3.5" />
            Mulai Kerjakan Ujian
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

    <!-- Modal Jadwalkan Ujian -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">Jadwalkan Ujian CBT</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="createExam" class="space-y-3">
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
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
              <input v-model="form.startDate" type="date" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
              <input v-model="form.endDate" type="date" required class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Sumber Bank Soal</label>
            <select v-model="selectedBankId" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option v-for="b in banks" :key="b.id" :value="b.id">{{ b.title }} ({{ b.subject }})</option>
            </select>
          </div>

          <div v-if="availableQuestions.length > 0" class="space-y-1.5">
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
    >
      <div class="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
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
