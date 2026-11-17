<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Pencil,
  Plus,
  School,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'
import { apiRequest, normalizePaginated } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import type {
  AcademicUser,
  ClassStudentItem,
  ClassStudentsResponse,
  EnrollClassStudentsResponse,
  PaginatedResponse,
  SchoolClass,
} from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

async function copyStudentUuid(uuid: string, name: string) {
  try {
    await navigator.clipboard.writeText(uuid)
    toast.success('UUID Siswa Disalin', `${name} (${uuid.slice(0, 8)}...)`)
  } catch {
    toast.info('UUID Siswa', uuid)
  }
}

const classes = ref<SchoolClass[]>([])
const teachers = ref<AcademicUser[]>([])
const studentDirectory = ref<AcademicUser[]>([])
const selectedClassId = ref('')
const selectedClassInfo = ref<SchoolClass | null>(null)
const classStudents = ref<ClassStudentItem[]>([])
const loading = ref(true)
const feedbackMsg = ref('')
const errorMsg = ref('')

// Search, filter, sort, pagination
const search = ref('')
const gradeLevelFilter = ref('')
const mineOnly = ref(false)
const sortBy = ref('name')
const sortOrder = ref<'ASC' | 'DESC'>('ASC')
const page = ref(1)
const limit = ref(12)
const total = ref(0)
const totalPages = ref(1)

const showClassModal = ref(false)
const editingClassId = ref<string | null>(null)
const showEnrollModal = ref(false)
const enrollSearch = ref('')
const selectedStudentIds = ref<string[]>([])

const classForm = reactive({
  name: '',
  gradeLevel: '10',
  academicYear: '2026/2027',
  homeroomTeacherId: '',
})

const filteredDirectoryStudents = computed(() => {
  const enrolledSet = new Set(classStudents.value.map((s) => s.studentId))
  const q = enrollSearch.value.trim().toLowerCase()
  return studentDirectory.value
    .filter((u) => !enrolledSet.has(u.id))
    .filter((u) => !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
})

async function fetchUserDirectories() {
  try {
    const [tRes, sRes] = await Promise.all([
      apiRequest<PaginatedResponse<AcademicUser> | AcademicUser[]>({
        method: 'GET',
        url: '/academic/users',
        params: { role: 'TEACHER', status: 'ACTIVE', limit: 100 },
      }),
      apiRequest<PaginatedResponse<AcademicUser> | AcademicUser[]>({
        method: 'GET',
        url: '/academic/users',
        params: { role: 'STUDENT', status: 'ACTIVE', limit: 100 },
      }),
    ])
    teachers.value = normalizePaginated(tRes).items
    studentDirectory.value = normalizePaginated(sRes).items
  } catch {
    // ignore if directory unavailable
  }
}

async function fetchClasses() {
  loading.value = true
  errorMsg.value = ''
  try {
    const raw = await apiRequest<PaginatedResponse<SchoolClass> | SchoolClass[]>({
      method: 'GET',
      url: '/academic/classes',
      params: {
        search: search.value.trim() || undefined,
        gradeLevel: gradeLevelFilter.value.trim() || undefined,
        mine: authStore.isTeacher && mineOnly.value ? true : undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        page: page.value,
        limit: limit.value,
      },
    })
    const res = normalizePaginated(raw)
    classes.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages || 1
    if (classes.value.length > 0 && !classes.value.some((c) => c.id === selectedClassId.value)) {
      selectedClassId.value = classes.value[0].id
    } else if (classes.value.length === 0) {
      selectedClassId.value = ''
      selectedClassInfo.value = null
      classStudents.value = []
    }
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal memuat daftar kelas dari API.'
  } finally {
    loading.value = false
  }
}

watch([search, gradeLevelFilter, mineOnly, sortBy, sortOrder], () => {
  page.value = 1
  fetchClasses()
})

watch(page, fetchClasses)

async function fetchClassStudents(classId: string) {
  if (!classId) return
  try {
    const res = await apiRequest<ClassStudentsResponse>({
      method: 'GET',
      url: `/academic/classes/${classId}/students`,
    })
    selectedClassInfo.value = res.class
    classStudents.value = res.students ?? []
    classes.value = classes.value.map((c) =>
      c.id === classId ? { ...c, studentCount: classStudents.value.length } : c,
    )
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal memuat daftar siswa kelas.'
  }
}

watch(selectedClassId, (id) => {
  if (id) fetchClassStudents(id)
})

function openCreateClassModal() {
  editingClassId.value = null
  classForm.name = ''
  classForm.gradeLevel = '10'
  classForm.academicYear = '2026/2027'
  classForm.homeroomTeacherId = ''
  showClassModal.value = true
}

function openEditClassModal(cls: SchoolClass) {
  editingClassId.value = cls.id
  classForm.name = cls.name
  classForm.gradeLevel = cls.gradeLevel
  classForm.academicYear = cls.academicYear
  classForm.homeroomTeacherId = cls.homeroomTeacherId || ''
  showClassModal.value = true
}

async function saveClass() {
  errorMsg.value = ''
  const payload = {
    name: classForm.name.trim(),
    gradeLevel: classForm.gradeLevel.trim(),
    academicYear: classForm.academicYear.trim(),
    homeroomTeacherId: classForm.homeroomTeacherId || undefined,
  }
  try {
    if (editingClassId.value) {
      await apiRequest<SchoolClass>({
        method: 'PUT',
        url: `/academic/classes/${editingClassId.value}`,
        data: payload,
      })
      feedbackMsg.value = `Kelas ${payload.name} berhasil diperbarui.`
    } else {
      const created = await apiRequest<SchoolClass>({
        method: 'POST',
        url: '/academic/classes',
        data: payload,
      })
      feedbackMsg.value = `Kelas ${created.name} berhasil dibuat!`
      selectedClassId.value = created.id
    }
    showClassModal.value = false
    await fetchClasses()
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal menyimpan data kelas.'
  }
}

async function deleteClass(cls: SchoolClass) {
  if (!confirm(`Arsipkan / nonaktifkan kelas "${cls.name}"?`)) return
  try {
    await apiRequest({ method: 'DELETE', url: `/academic/classes/${cls.id}` })
    toast.success('Kelas Diarsipkan', cls.name)
    await fetchClasses()
  } catch (err) {
    toast.error(
      'Gagal Menghapus Kelas',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Terjadi kesalahan.',
    )
  }
}

function openEnrollModal() {
  enrollSearch.value = ''
  selectedStudentIds.value = []
  showEnrollModal.value = true
}

async function enrollStudents() {
  if (!selectedClassId.value || selectedStudentIds.value.length === 0) return
  errorMsg.value = ''
  try {
    const res = await apiRequest<EnrollClassStudentsResponse>({
      method: 'POST',
      url: `/academic/classes/${selectedClassId.value}/students`,
      data: { studentIds: selectedStudentIds.value },
    })
    showEnrollModal.value = false
    selectedStudentIds.value = []
    feedbackMsg.value = `${res.enrolledCount} siswa berhasil didaftarkan (${res.skippedCount} sudah terdaftar).`
    await fetchClasses()
    await fetchClassStudents(selectedClassId.value)
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal mendaftarkan siswa ke kelas.'
  }
}

async function removeStudent(stu: ClassStudentItem) {
  if (!selectedClassId.value) return
  if (!confirm(`Keluarkan ${stu.fullName} dari kelas ini?`)) return
  try {
    await apiRequest({
      method: 'DELETE',
      url: `/academic/classes/${selectedClassId.value}/students/${stu.studentId}`,
    })
    toast.success('Siswa Dikeluarkan', `${stu.fullName} dikeluarkan dari kelas.`)
    await fetchClassStudents(selectedClassId.value)
  } catch (err) {
    toast.error(
      'Gagal Mengeluarkan Siswa',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Terjadi kesalahan.',
    )
  }
}

onMounted(() => {
  fetchClasses()
  fetchUserDirectories()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <School class="h-5 w-5 text-primary" />
          Manajemen Kelas Akademik
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Kelola rombongan belajar, wali kelas, dan daftar siswa per kelas.
        </p>
      </div>
      <button
        v-if="authStore.isAdmin"
        type="button"
        @click="openCreateClassModal"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
      >
        <Plus class="h-4 w-4" />
        Buat Kelas Baru
      </button>
    </div>

    <!-- Filter & Sort Bar -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <Search class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari nama kelas..."
          class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
        />
      </div>
      <input
        v-model="gradeLevelFilter"
        type="text"
        placeholder="Tingkat (mis. 10)"
        class="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
        <option value="gradeLevel:ASC">Tingkat Terendah</option>
      </select>
      <label v-if="authStore.isTeacher" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input v-model="mineOnly" type="checkbox" class="rounded border-slate-300 text-primary" />
        Kelas Saya Saja
      </label>
    </div>

    <div
      v-if="errorMsg"
      class="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700"
    >
      <span class="flex items-center gap-2">
        <AlertCircle class="h-4 w-4" />
        {{ errorMsg }}
      </span>
      <button @click="errorMsg = ''" class="hover:underline">Tutup</button>
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

    <SkeletonCard v-if="loading" :count="3" :columns="2" />

    <EmptyState
      v-else-if="classes.length === 0"
      title="Belum Ada Kelas Aktif"
      description="Buat kelas baru untuk mulai mengelola rombongan belajar dan absensi siswa."
      :icon="School"
    />

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Daftar Kelas -->
      <div class="lg:col-span-4 space-y-3">
        <div
          v-for="cls in classes"
          :key="cls.id"
          @click="selectedClassId = cls.id"
          :class="[
            'w-full text-left rounded-2xl border p-5 transition shadow-sm cursor-pointer',
            selectedClassId === cls.id
              ? 'border-primary bg-primary-50/70'
              : 'border-slate-200 bg-white hover:border-primary/40',
          ]"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-base font-bold text-slate-900">{{ cls.name }}</span>
            <div class="flex items-center gap-1.5">
              <span class="rounded-lg bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Tingkat {{ cls.gradeLevel }}
              </span>
              <button
                v-if="authStore.isAdmin"
                type="button"
                @click.stop="openEditClassModal(cls)"
                class="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-primary"
                title="Edit Kelas"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button
                v-if="authStore.isAdmin"
                type="button"
                @click.stop="deleteClass(cls)"
                class="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-red-600"
                title="Arsipkan Kelas"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p class="text-xs text-slate-500">
            Wali Kelas: {{ cls.homeroomTeacherName || (cls.homeroomTeacherId ? 'Sudah Ditentukan' : 'Belum ditentukan') }}
          </p>
          <div class="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{{ cls.academicYear }}</span>
            <span class="inline-flex items-center gap-1 font-semibold text-primary">
              <Users class="h-3.5 w-3.5" />
              {{ cls.id === selectedClassId ? classStudents.length : (cls.studentCount ?? 0) }} Siswa
            </span>
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

      <!-- Detail Siswa di Kelas -->
      <div class="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">
              Daftar Siswa — {{ selectedClassInfo?.name || 'Pilih Kelas' }}
            </h3>
            <p class="text-xs text-slate-500">
              Tahun Ajaran {{ selectedClassInfo?.academicYear }} • Total {{ classStudents.length }} siswa terdaftar
            </p>
          </div>
          <div class="flex gap-2">
            <router-link
              :to="{ path: '/attendance', query: { classId: selectedClassId } }"
              class="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {{ authStore.isTeacher ? 'Isi Absensi Kelas →' : 'Lihat Rekap Absensi →' }}
            </router-link>
            <button
              v-if="authStore.isAdmin && selectedClassId"
              type="button"
              @click="openEnrollModal"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <UserPlus class="h-4 w-4" />
              Daftarkan Siswa
            </button>
          </div>
        </div>

        <div v-if="classStudents.length === 0" class="py-10 text-center text-sm text-slate-500">
          Belum ada siswa yang terdaftar di kelas ini.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
                <th class="py-2.5 pr-4">Nama Lengkap</th>
                <th class="py-2.5 px-4">Email</th>
                <th class="py-2.5 px-4">Status</th>
                <th class="py-2.5 px-4">Terdaftar</th>
                <th class="py-2.5 pl-4 text-right">ID Siswa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="stu in classStudents" :key="stu.studentId">
                <td class="py-3 pr-4 font-semibold text-slate-900">{{ stu.fullName }}</td>
                <td class="py-3 px-4 text-slate-600">{{ stu.email }}</td>
                <td class="py-3 px-4">
                  <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    {{ stu.userStatus || 'ACTIVE' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-xs text-slate-500">
                  {{ new Date(stu.enrolledAt).toLocaleDateString('id-ID') }}
                </td>
                <td class="py-3 pl-4 text-right space-x-1">
                  <button
                    type="button"
                    @click="copyStudentUuid(stu.studentId, stu.fullName)"
                    class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    title="Salin UUID Siswa"
                  >
                    <Copy class="h-3 w-3" />
                    Salin ID
                  </button>
                  <button
                    v-if="authStore.isAdmin"
                    type="button"
                    @click="removeStudent(stu)"
                    class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                    title="Keluarkan dari kelas"
                  >
                    <UserMinus class="h-3 w-3" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Buat / Edit Kelas -->
    <div
      v-if="showClassModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      @keydown.esc="showClassModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-label="Form kelas">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">
            {{ editingClassId ? 'Edit Kelas' : 'Buat Kelas Baru' }}
          </h3>
          <button @click="showClassModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        <form @submit.prevent="saveClass" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas</label>
            <input
              v-model="classForm.name"
              required
              type="text"
              placeholder="Contoh: X-IPA-1"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tingkat</label>
              <input v-model="classForm.gradeLevel" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
              <input v-model="classForm.academicYear" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Wali Kelas (Opsional)</label>
            <select
              v-model="classForm.homeroomTeacherId"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— Belum ditentukan —</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                {{ t.fullName }} ({{ t.email }})
              </option>
            </select>
          </div>
          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="showClassModal = false" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
              Batal
            </button>
            <button type="submit" class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
              Simpan Kelas
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Bulk Enroll Siswa -->
    <div
      v-if="showEnrollModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      @keydown.esc="showEnrollModal = false"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4" role="dialog" aria-modal="true" aria-label="Daftarkan siswa ke kelas">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">Daftarkan Siswa ke {{ selectedClassInfo?.name }}</h3>
          <button @click="showEnrollModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        <div class="space-y-3">
          <div class="relative">
            <Search class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="enrollSearch"
              type="search"
              placeholder="Cari nama atau email siswa..."
              class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div class="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
            <label
              v-for="stu in filteredDirectoryStudents"
              :key="stu.id"
              class="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer"
            >
              <input
                v-model="selectedStudentIds"
                type="checkbox"
                :value="stu.id"
                class="rounded border-slate-300 text-primary"
              />
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-900 truncate">{{ stu.fullName }}</p>
                <p class="text-[11px] text-slate-500 truncate">{{ stu.email }}</p>
              </div>
            </label>
            <p v-if="filteredDirectoryStudents.length === 0" class="p-4 text-center text-xs text-slate-500">
              Tidak ada siswa tersedia untuk didaftarkan.
            </p>
          </div>
        </div>
        <div class="pt-2 flex justify-between items-center">
          <span class="text-xs text-slate-500">{{ selectedStudentIds.length }} siswa dipilih</span>
          <div class="flex gap-2">
            <button type="button" @click="showEnrollModal = false" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
              Batal
            </button>
            <button
              type="button"
              :disabled="selectedStudentIds.length === 0"
              @click="enrollStudents"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Daftarkan Siswa
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
