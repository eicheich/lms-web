<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { BookOpen, Plus, Users, ArrowRight, X } from 'lucide-vue-next'
import { apiRequest, isModuleLockedError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import type { Course } from '@/types/api'

const authStore = useAuthStore()

const courses = ref<Course[]>([])
const loading = ref(true)
const moduleLocked = ref(false)
const lockedMsg = ref('')
const showCreateModal = ref(false)
const creating = ref(false)

const form = reactive({
  name: '',
  code: '',
  subject: 'Matematika',
  gradeLevel: 'Kelas 12',
  academicYear: '2026/2027',
})

async function fetchCourses() {
  loading.value = true
  moduleLocked.value = false
  try {
    courses.value = await apiRequest<Course[]>({ method: 'GET', url: '/lms/courses' })
  } catch (err) {
    if (isModuleLockedError(err)) {
      moduleLocked.value = true
      lockedMsg.value = err.message
    }
  } finally {
    loading.value = false
  }
}

async function createCourse() {
  creating.value = true
  try {
    await apiRequest<Course>({
      method: 'POST',
      url: '/lms/courses',
      data: { ...form },
    })
    showCreateModal.value = false
    form.name = ''
    form.code = ''
    await fetchCourses()
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  fetchCourses()
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
        <h2 class="text-xl font-bold text-slate-900">Kursus & Kelas Aktif</h2>
        <p class="text-xs text-slate-500">
          Akses materi pembelajaran, tugas, dan ruang kelas Anda.
        </p>
      </div>
      <button
        v-if="authStore.isTeacherOrAdmin"
        type="button"
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
      >
        <Plus class="h-4 w-4" />
        Buat Kursus Baru
      </button>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-slate-500">Memuat daftar kursus...</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <router-link
        v-for="course in courses"
        :key="course.id"
        :to="`/lms/courses/${course.id}`"
        class="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary">
              {{ course.code }}
            </span>
            <span class="text-xs font-medium text-slate-500">{{ course.gradeLevel }}</span>
          </div>
          <h3 class="text-base font-bold text-slate-900 group-hover:text-primary transition mb-1.5">
            {{ course.name }}
          </h3>
          <p class="text-xs text-slate-600 line-clamp-2 mb-4">
            {{ course.description || `${course.subject} • Tahun Ajaran ${course.academicYear}` }}
          </p>
        </div>

        <div class="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span class="flex items-center gap-1.5">
            <Users class="h-3.5 w-3.5" />
            {{ course.studentCount ?? 25 }} Siswa
          </span>
          <span class="inline-flex items-center gap-1 font-semibold text-primary">
            Masuk Kelas
            <ArrowRight class="h-3.5 w-3.5" />
          </span>
        </div>
      </router-link>
    </div>

    <!-- Modal Buat Kursus -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen class="h-4 w-4 text-primary" />
            Buat Kursus Baru
          </h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="createCourse" class="space-y-3.5">
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
              :disabled="creating"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              {{ creating ? 'Menyimpan...' : 'Simpan Kursus' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
