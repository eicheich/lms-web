<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ArrowRight, BookOpen, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-vue-next'
import { apiRequest, isModuleLockedError, normalizePaginated } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import type { AcademicUser, Course, PaginatedResponse } from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

const courses = ref<Course[]>([])
const teachers = ref<AcademicUser[]>([])
const loading = ref(true)
const moduleLocked = ref(false)
const lockedMsg = ref('')
const showCourseModal = ref(false)
const editingCourseId = ref<string | null>(null)
const saving = ref(false)
const loadError = ref('')

// Search, Filter, Sort, Pagination
const search = ref('')
const subjectFilter = ref('')
const gradeLevelFilter = ref('')
const mineOnly = ref(false)
const sortBy = ref('name')
const sortOrder = ref<'ASC' | 'DESC'>('ASC')
const page = ref(1)
const limit = ref(12)
const total = ref(0)
const totalPages = ref(1)

const form = reactive({
  name: '',
  code: '',
  subject: 'Matematika',
  gradeLevel: 'Kelas 12',
  academicYear: '2026/2027',
  teacherId: '',
})

async function fetchTeachers() {
  if (!authStore.isTeacherOrAdmin) return
  try {
    const raw = await apiRequest<PaginatedResponse<AcademicUser> | AcademicUser[]>({
      method: 'GET',
      url: '/academic/users',
      params: { role: 'TEACHER', status: 'ACTIVE', limit: 100 },
    })
    teachers.value = normalizePaginated(raw).items
  } catch {
    // ignore if unavailable
  }
}

async function fetchCourses() {
  loading.value = true
  moduleLocked.value = false
  loadError.value = ''
  try {
    const raw = await apiRequest<PaginatedResponse<Course> | Course[]>({
      method: 'GET',
      url: '/lms/courses',
      params: {
        search: search.value.trim() || undefined,
        subject: subjectFilter.value.trim() || undefined,
        gradeLevel: gradeLevelFilter.value.trim() || undefined,
        mine: authStore.isTeacher && mineOnly.value ? true : undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        page: page.value,
        limit: limit.value,
      },
    })
    const res = normalizePaginated(raw)
    courses.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages || 1
  } catch (err) {
    if (isModuleLockedError(err)) {
      moduleLocked.value = true
      lockedMsg.value = err.message
    } else {
      loadError.value = 'Daftar mata pelajaran belum dapat dimuat. Periksa koneksi lalu coba lagi.'
    }
  } finally {
    loading.value = false
  }
}

watch([search, subjectFilter, gradeLevelFilter, mineOnly, sortBy, sortOrder], () => {
  page.value = 1
  fetchCourses()
})

watch(page, fetchCourses)

function openCreateModal() {
  editingCourseId.value = null
  form.name = ''
  form.code = ''
  form.subject = 'Matematika'
  form.gradeLevel = 'Kelas 12'
  form.academicYear = '2026/2027'
  form.teacherId = ''
  showCourseModal.value = true
}

function openEditModal(course: Course) {
  editingCourseId.value = course.id
  form.name = course.name
  form.code = course.code
  form.subject = course.subject
  form.gradeLevel = course.gradeLevel
  form.academicYear = course.academicYear
  form.teacherId = course.teacherId || ''
  showCourseModal.value = true
}

async function saveCourse() {
  saving.value = true
  const payload = {
    name: form.name.trim(),
    code: form.code.trim(),
    subject: form.subject.trim(),
    gradeLevel: form.gradeLevel.trim(),
    academicYear: form.academicYear.trim(),
    teacherId: form.teacherId || undefined,
  }
  try {
    if (editingCourseId.value) {
      await apiRequest<Course>({
        method: 'PUT',
        url: `/lms/courses/${editingCourseId.value}`,
        data: payload,
      })
      toast.success('Mata Pelajaran Diperbarui', payload.name)
    } else {
      await apiRequest<Course>({
        method: 'POST',
        url: '/lms/courses',
        data: payload,
      })
      toast.success('Mata Pelajaran Dibuat', payload.name)
    }
    showCourseModal.value = false
    await fetchCourses()
  } catch (err) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal menyimpan mata pelajaran.'
    toast.error('Gagal', msg)
  } finally {
    saving.value = false
  }
}

async function deleteCourse(course: Course) {
  if (!confirm(`Hapus mata pelajaran "${course.name}"?`)) return
  try {
    await apiRequest({ method: 'DELETE', url: `/lms/courses/${course.id}` })
    toast.success('Mata Pelajaran Dihapus', course.name)
    await fetchCourses()
  } catch (err) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal menghapus mata pelajaran.'
    toast.error('Gagal', msg)
  }
}

onMounted(() => {
  fetchCourses()
  fetchTeachers()
})
</script>

<template>
  <LockedModuleBanner
    v-if="moduleLocked"
    module-key="LMS"
    :message="lockedMsg"
  />

  <div v-else class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Mata Pelajaran Aktif</h2>
        <p class="text-sm text-slate-600">
          Akses materi, tugas, dan aktivitas belajar pada setiap mata pelajaran.
        </p>
      </div>
      <button
        v-if="authStore.isTeacherOrAdmin"
        type="button"
        @click="openCreateModal"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
      >
        <Plus class="h-4 w-4" />
        Buat Mata Pelajaran
      </button>
    </div>

    <!-- Filter & Sort Bar -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari nama atau kode mapel..."
          class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
        />
      </div>
      <input
        v-model="subjectFilter"
        type="text"
        placeholder="Filter mapel..."
        class="w-36 rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />
      <input
        v-model="gradeLevelFilter"
        type="text"
        placeholder="Tingkat..."
        class="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />
      <select
        :value="`${sortBy}:${sortOrder}`"
        @change="(e) => {
          const [f, o] = (e.target as HTMLSelectElement).value.split(':')
          sortBy = f
          sortOrder = o as 'ASC' | 'DESC'
        }"
        class="rounded-xl border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="name:ASC">Nama A-Z</option>
        <option value="name:DESC">Nama Z-A</option>
        <option value="createdAt:DESC">Terbaru</option>
      </select>
      <label v-if="authStore.isTeacher" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input v-model="mineOnly" type="checkbox" class="rounded border-slate-300 text-primary" />
        Mapel Saya Saja
      </label>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-slate-500">Memuat daftar kursus...</div>

    <div v-else-if="loadError" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 flex items-center justify-between gap-4">
      <span>{{ loadError }}</span>
      <button type="button" class="font-semibold underline" @click="fetchCourses">Coba lagi</button>
    </div>

    <EmptyState
      v-else-if="courses.length === 0"
      title="Belum Ada Mata Pelajaran"
      description="Mata pelajaran yang tersedia untuk akun Anda akan muncul di halaman ini."
      :icon="BookOpen"
    />

    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="course in courses"
          :key="course.id"
          class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary">
                {{ course.code }}
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-medium text-slate-500">{{ course.gradeLevel }}</span>
                <button
                  v-if="authStore.isTeacherOrAdmin"
                  type="button"
                  @click="openEditModal(course)"
                  class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-primary"
                  title="Edit Mata Pelajaran"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  v-if="authStore.isTeacherOrAdmin"
                  type="button"
                  @click="deleteCourse(course)"
                  class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  title="Hapus Mata Pelajaran"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <router-link :to="`/lms/courses/${course.id}`">
              <h3 class="text-base font-bold text-slate-900 group-hover:text-primary transition mb-1.5">
                {{ course.name }}
              </h3>
            </router-link>
            <p class="text-xs text-slate-600 line-clamp-2 mb-4">
              {{ course.description || `${course.subject} • Tahun Ajaran ${course.academicYear}` }}
            </p>
          </div>

          <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span class="flex items-center gap-1.5">
              <Users class="h-3.5 w-3.5" />
              {{ course.studentCount == null ? 'Jumlah siswa belum tersedia' : `${course.studentCount} Siswa` }}
            </span>
            <router-link :to="`/lms/courses/${course.id}`" class="inline-flex items-center gap-1 font-semibold text-primary">
              Buka Mata Pelajaran
              <ArrowRight class="h-3.5 w-3.5" />
            </router-link>
          </div>
        </div>
      </div>

      <PaginationBar
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :limit="limit"
        @update:page="page = $event"
      />
    </div>

    <!-- Modal Buat / Edit Kursus -->
    <div
      v-if="showCourseModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      @keydown.esc="showCourseModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-label="Form mata pelajaran">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen class="h-4 w-4 text-primary" />
            {{ editingCourseId ? 'Edit Mata Pelajaran' : 'Buat Mata Pelajaran Baru' }}
          </h3>
          <button @click="showCourseModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="saveCourse" class="space-y-3.5">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Kursus</label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: Kimia Organik XII"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Kode</label>
              <input
                v-model="form.code"
                type="text"
                required
                placeholder="CHM-XII-01"
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
              <input
                v-model="form.subject"
                type="text"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tingkat</label>
              <input
                v-model="form.gradeLevel"
                type="text"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
              <input
                v-model="form.academicYear"
                type="text"
                required
                class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Guru Pengampu (Opsional)</label>
            <select
              v-model="form.teacherId"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— Belum ditentukan —</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                {{ t.fullName }} ({{ t.email }})
              </option>
            </select>
          </div>

          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              @click="showCourseModal = false"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Kursus' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
