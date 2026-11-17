<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Plus,
  Send,
  Video,
} from 'lucide-vue-next'
import { apiRequest, isModuleLockedError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import type { Assignment, Course, Material, MaterialContentType, Submission } from '@/types/api'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()
const courseId = route.params.id as string

function getYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

const activeTab = ref<'materials' | 'assignments' | 'grading'>('materials')
const course = ref<Course | null>(null)
const materials = ref<Material[]>([])
const assignments = ref<Assignment[]>([])
const selectedAssignmentId = ref('')
const submissions = ref<Submission[]>([])
const selectedSubmission = ref<Submission | null>(null)

const loading = ref(true)
const moduleLocked = ref(false)
const feedbackBanner = ref('')

// Forms
const newMaterial = reactive({
  title: '',
  contentType: 'TEXT' as MaterialContentType,
  contentBody: '',
  fileUrl: '',
})

const newAssignment = reactive({
  title: '',
  description: '',
  dueDate: '2026-11-30T23:59:59Z',
  maxScore: 100,
  submissionType: 'TEXT' as 'TEXT' | 'FILE' | 'BOTH',
})

const studentSubmission = reactive({
  assignmentId: '',
  content: '',
  fileUrl: '',
})

const gradeForm = reactive({
  score: 90,
  feedback: '',
})

async function loadCourseData() {
  loading.value = true
  moduleLocked.value = false
  try {
    const [crsRes, mats, asgs] = await Promise.all([
      apiRequest<Course | { course: Course }>({ method: 'GET', url: `/lms/courses/${courseId}` }),
      apiRequest<Material[]>({ method: 'GET', url: `/lms/courses/${courseId}/materials` }),
      apiRequest<Assignment[]>({ method: 'GET', url: `/lms/courses/${courseId}/assignments` }),
    ])
    course.value = 'course' in crsRes ? crsRes.course : crsRes
    materials.value = mats
    assignments.value = asgs
    if (asgs.length > 0 && !selectedAssignmentId.value) {
      selectedAssignmentId.value = asgs[0].id
      studentSubmission.assignmentId = asgs[0].id
    }
  } catch (err) {
    if (isModuleLockedError(err)) {
      moduleLocked.value = true
    }
  } finally {
    loading.value = false
  }
}

async function loadSubmissions(assignmentId: string) {
  if (!assignmentId || !authStore.isTeacher) return
  submissions.value = await apiRequest<Submission[]>({
    method: 'GET',
    url: `/lms/assignments/${assignmentId}/submissions`,
  })
  if (submissions.value.length > 0) {
    selectSubmission(submissions.value[0])
  } else {
    selectedSubmission.value = null
  }
}

function selectSubmission(sub: Submission) {
  selectedSubmission.value = sub
  gradeForm.score = sub.score ?? 85
  gradeForm.feedback = sub.feedback ?? ''
}

watch(selectedAssignmentId, (id) => {
  if (activeTab.value === 'grading') {
    loadSubmissions(id)
  }
})

watch(activeTab, (tab) => {
  if (tab === 'grading' && selectedAssignmentId.value) {
    loadSubmissions(selectedAssignmentId.value)
  }
})

async function addMaterial() {
  try {
    await apiRequest<Material>({
      method: 'POST',
      url: `/lms/courses/${courseId}/materials`,
      data: {
        ...newMaterial,
        sortOrder: materials.value.length + 1,
      },
    })
    newMaterial.title = ''
    newMaterial.contentBody = ''
    newMaterial.fileUrl = ''
    toast.success('Materi pembelajaran berhasil ditambahkan!')
    await loadCourseData()
  } catch {
    toast.error('Gagal menambahkan materi pembelajaran')
  }
}

async function addAssignment() {
  try {
    await apiRequest<Assignment>({
      method: 'POST',
      url: `/lms/courses/${courseId}/assignments`,
      data: { ...newAssignment },
    })
    newAssignment.title = ''
    newAssignment.description = ''
    toast.success('Tugas baru berhasil dibuat!')
    await loadCourseData()
  } catch {
    toast.error('Gagal membuat tugas baru')
  }
}

async function submitStudentAssignment(asgId: string) {
  try {
    await apiRequest<Submission>({
      method: 'POST',
      url: `/lms/assignments/${asgId}/submit`,
      data: {
        content: studentSubmission.content,
        fileUrl: studentSubmission.fileUrl || undefined,
      },
    })
    studentSubmission.content = ''
    studentSubmission.fileUrl = ''
    toast.success('Jawaban tugas Anda berhasil dikumpulkan!')
  } catch {
    toast.error('Gagal mengumpulkan jawaban tugas')
  }
}

async function submitGrade() {
  if (!selectedSubmission.value) return
  try {
    await apiRequest<Submission>({
      method: 'POST',
      url: `/lms/submissions/${selectedSubmission.value.id}/grade`,
      data: {
        score: Number(gradeForm.score),
        feedback: gradeForm.feedback,
      },
    })
    toast.success(`Nilai untuk ${selectedSubmission.value.studentName} berhasil disimpan!`)
    await loadSubmissions(selectedAssignmentId.value)
  } catch {
    toast.error('Gagal menyimpan nilai siswa')
  }
}

onMounted(loadCourseData)
</script>

<template>
  <LockedModuleBanner v-if="moduleLocked" module-key="LMS" />

  <div v-else class="space-y-6">
    <!-- Header -->
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <router-link
        to="/lms/courses"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary mb-3"
      >
        <ArrowLeft class="h-3.5 w-3.5" />
        Kembali ke Daftar Kursus
      </router-link>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary">
              {{ course?.code }}
            </span>
            <span class="text-xs text-slate-500">{{ course?.gradeLevel }} • {{ course?.academicYear }}</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900">{{ course?.name || 'Memuat Kursus...' }}</h2>
          <p class="text-xs text-slate-500 mt-0.5">Pengampu: {{ course?.teacherName }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            @click="activeTab = 'materials'"
            :class="[
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition',
              activeTab === 'materials'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ]"
          >
            <BookOpen class="h-4 w-4" />
            Materi ({{ materials.length }})
          </button>
          <button
            type="button"
            @click="activeTab = 'assignments'"
            :class="[
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition',
              activeTab === 'assignments'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ]"
          >
            <ClipboardList class="h-4 w-4" />
            Tugas ({{ assignments.length }})
          </button>
          <button
            v-if="authStore.isTeacher"
            type="button"
            @click="activeTab = 'grading'"
            :class="[
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition',
              activeTab === 'grading'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            ]"
          >
            <CheckCircle2 class="h-4 w-4" />
            Koreksi Side-by-Side
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="feedbackBanner"
      class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700"
    >
      <span class="flex items-center gap-2">
        <CheckCircle2 class="h-4 w-4" />
        {{ feedbackBanner }}
      </span>
      <button @click="feedbackBanner = ''" class="text-emerald-600 hover:underline">Tutup</button>
    </div>

    <!-- TAB 1: MATERIALS -->
    <SkeletonCard v-if="loading" :count="2" />
    <div v-else-if="activeTab === 'materials'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div :class="authStore.isTeacher ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'">
        <EmptyState
          v-if="materials.length === 0"
          title="Belum Ada Materi Pembelajaran"
          description="Guru pengampu belum menambahkan materi pada kursus ini."
          :icon="BookOpen"
        />
        <div
          v-for="mat in materials"
          :key="mat.id"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Video v-if="mat.contentType === 'VIDEO'" class="h-3.5 w-3.5 text-red-500" />
              <FileText v-else-if="mat.contentType === 'PDF'" class="h-3.5 w-3.5 text-amber-600" />
              <LinkIcon v-else-if="mat.contentType === 'LINK'" class="h-3.5 w-3.5 text-sky-600" />
              <BookOpen v-else class="h-3.5 w-3.5 text-primary" />
              {{ mat.contentType }}
            </span>
            <span class="text-xs text-slate-400">Urutan #{{ mat.sortOrder }}</span>
          </div>
          <h3 class="text-base font-bold text-slate-900">{{ mat.title }}</h3>
          <p v-if="mat.contentBody" class="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {{ mat.contentBody }}
          </p>
          <div
            v-if="mat.contentType === 'VIDEO' && getYoutubeEmbedUrl(mat.fileUrl)"
            class="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
          >
            <iframe
              :src="getYoutubeEmbedUrl(mat.fileUrl)!"
              class="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            />
          </div>
          <a
            v-if="mat.fileUrl"
            :href="mat.fileUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            Buka Lampiran / Tautan Materi
            <ExternalLink class="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <!-- Form Tambah Materi (Khusus Guru) -->
      <div
        v-if="authStore.isTeacher"
        class="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit space-y-4"
      >
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Plus class="h-4 w-4 text-primary" />
          Tambah Materi Baru
        </h3>
        <form @submit.prevent="addMaterial" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Judul Materi</label>
            <input v-model="newMaterial.title" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Tipe Konten</label>
            <select v-model="newMaterial.contentType" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="TEXT">TEXT</option>
              <option value="VIDEO">VIDEO</option>
              <option value="PDF">PDF</option>
              <option value="LINK">LINK</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Ringkasan / Isi Materi</label>
            <textarea v-model="newMaterial.contentBody" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">URL File / Video (Opsional)</label>
            <input v-model="newMaterial.fileUrl" type="url" placeholder="https://..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            class="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Publikasikan Materi
          </button>
        </form>
      </div>
    </div>

    <!-- TAB 2: ASSIGNMENTS -->
    <div v-else-if="activeTab === 'assignments'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div :class="authStore.isTeacher ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'">
        <EmptyState
          v-if="assignments.length === 0"
          title="Belum Ada Tugas"
          description="Belum ada tugas yang diberikan pada mata pelajaran ini."
          :icon="ClipboardList"
        />
        <div
          v-for="asg in assignments"
          :key="asg.id"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-base font-bold text-slate-900">{{ asg.title }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">
                Batas Waktu: {{ new Date(asg.dueDate).toLocaleDateString('id-ID') }} • Skor Maks: {{ asg.maxScore }}
              </p>
            </div>
            <span class="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {{ asg.submissionType }}
            </span>
          </div>
          <p class="text-sm text-slate-600">{{ asg.description }}</p>

          <!-- Form Submit Siswa -->
          <div v-if="authStore.isStudent" class="pt-4 border-t border-slate-100 space-y-3">
            <p class="text-xs font-bold text-slate-700">Kumpulkan Jawaban Anda</p>
            <textarea
              v-model="studentSubmission.content"
              rows="3"
              placeholder="Tuliskan jawaban esai atau ringkasan penyelesaian tugas..."
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
            <div class="flex flex-col sm:flex-row gap-2">
              <input
                v-model="studentSubmission.fileUrl"
                type="url"
                placeholder="Tautan PDF / Google Drive (Opsional)"
                class="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
              <button
                type="button"
                @click="submitStudentAssignment(asg.id)"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Send class="h-4 w-4" />
                Kirim Tugas
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Buat Tugas (Khusus Guru) -->
      <div
        v-if="authStore.isTeacher"
        class="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit space-y-4"
      >
        <h3 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Plus class="h-4 w-4 text-primary" />
          Buat Tugas Baru
        </h3>
        <form @submit.prevent="addAssignment" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Judul Tugas</label>
            <input v-model="newAssignment.title" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Instruksi</label>
            <textarea v-model="newAssignment.description" required rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Skor Maksimal</label>
            <input v-model.number="newAssignment.maxScore" type="number" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button
            type="submit"
            class="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Simpan Tugas
          </button>
        </form>
      </div>
    </div>

    <!-- TAB 3: SIDE-BY-SIDE GRADING WORKSPACE -->
    <div v-else-if="activeTab === 'grading'" class="space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
        <span class="text-xs font-bold text-slate-600">Pilih Tugas untuk Dinilai:</span>
        <select
          v-model="selectedAssignmentId"
          class="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-800"
        >
          <option v-for="asg in assignments" :key="asg.id" :value="asg.id">{{ asg.title }}</option>
        </select>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Daftar Siswa -->
        <div class="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Pengumpulan Siswa ({{ submissions.length }})
          </p>
          <button
            v-for="sub in submissions"
            :key="sub.id"
            type="button"
            @click="selectSubmission(sub)"
            :class="[
              'w-full text-left rounded-xl p-3 border transition',
              selectedSubmission?.id === sub.id
                ? 'border-primary bg-primary-50'
                : 'border-slate-100 hover:bg-slate-50',
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-slate-900">{{ sub.studentName }}</span>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  sub.status === 'GRADED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700',
                ]"
              >
                {{ sub.status === 'GRADED' ? `Nilai: ${sub.score}` : 'Menunggu' }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 mt-1">
              Dikumpulkan {{ new Date(sub.submittedAt).toLocaleString('id-ID') }}
            </p>
          </button>
        </div>

        <!-- Panel Jawaban & Form Nilai Side-by-Side -->
        <div
          v-if="selectedSubmission"
          class="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          <div class="md:col-span-7 space-y-3 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">
              Jawaban Siswa
            </span>
            <h4 class="text-base font-bold text-slate-900">{{ selectedSubmission.studentName }}</h4>
            <div class="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {{ selectedSubmission.content || 'Tidak ada jawaban teks.' }}
            </div>
            <a
              v-if="selectedSubmission.fileUrl"
              :href="selectedSubmission.fileUrl"
              target="_blank"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Lihat Lampiran File
              <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </div>

          <form @submit.prevent="submitGrade" class="md:col-span-5 space-y-4">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Penilaian Guru
            </span>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Skor (0 - 100)</label>
              <input
                v-model.number="gradeForm.score"
                type="number"
                min="0"
                max="100"
                required
                class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-lg font-bold text-primary"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Catatan / Feedback</label>
              <textarea
                v-model="gradeForm.feedback"
                rows="4"
                placeholder="Berikan apresiasi atau saran perbaikan..."
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              class="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Simpan Nilai
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
