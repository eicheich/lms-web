<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { CheckCircle2, Copy, Plus, School, UserPlus, Users, X, AlertCircle } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type {
  ClassStudentItem,
  ClassStudentsResponse,
  EnrollClassStudentsResponse,
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
const selectedClassId = ref('')
const selectedClassInfo = ref<SchoolClass | null>(null)
const classStudents = ref<ClassStudentItem[]>([])
const loading = ref(true)
const feedbackMsg = ref('')
const errorMsg = ref('')

const showCreateModal = ref(false)
const showEnrollModal = ref(false)
const studentIdsInput = ref('')

const newClassForm = reactive({
  name: '',
  gradeLevel: '10',
  academicYear: '2026/2027',
  homeroomTeacherId: '',
})

async function fetchClasses() {
  loading.value = true
  errorMsg.value = ''
  try {
    classes.value = await apiRequest<SchoolClass[]>({
      method: 'GET',
      url: '/academic/classes',
    })
    if (classes.value.length > 0 && !selectedClassId.value) {
      selectedClassId.value = classes.value[0].id
    }
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal memuat daftar kelas dari API.'
  } finally {
    loading.value = false
  }
}

async function fetchClassStudents(classId: string) {
  if (!classId) return
  try {
    const res = await apiRequest<ClassStudentsResponse>({
      method: 'GET',
      url: `/academic/classes/${classId}/students`,
    })
    selectedClassInfo.value = res.class
    classStudents.value = res.students ?? []
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal memuat daftar siswa kelas.'
  }
}

watch(selectedClassId, (id) => {
  fetchClassStudents(id)
})

async function createClass() {
  errorMsg.value = ''
  try {
    const created = await apiRequest<SchoolClass>({
      method: 'POST',
      url: '/academic/classes',
      data: {
        name: newClassForm.name,
        gradeLevel: newClassForm.gradeLevel,
        academicYear: newClassForm.academicYear,
        homeroomTeacherId: newClassForm.homeroomTeacherId.trim() || undefined,
      },
    })
    showCreateModal.value = false
    newClassForm.name = ''
    newClassForm.homeroomTeacherId = ''
    feedbackMsg.value = `Kelas ${created.name} berhasil dibuat!`
    await fetchClasses()
    selectedClassId.value = created.id
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal membuat kelas baru.'
  }
}

async function enrollStudents() {
  if (!selectedClassId.value) return
  const studentIds = studentIdsInput.value
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (studentIds.length === 0) return

  errorMsg.value = ''
  try {
    const res = await apiRequest<EnrollClassStudentsResponse>({
      method: 'POST',
      url: `/academic/classes/${selectedClassId.value}/students`,
      data: { studentIds },
    })
    showEnrollModal.value = false
    studentIdsInput.value = ''
    feedbackMsg.value = `${res.enrolledCount} siswa berhasil didaftarkan (${res.skippedCount} sudah terdaftar).`
    await fetchClasses()
    await fetchClassStudents(selectedClassId.value)
  } catch (err) {
    errorMsg.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal mendaftarkan siswa ke kelas.'
  }
}

onMounted(fetchClasses)
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
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
      >
        <Plus class="h-4 w-4" />
        Buat Kelas Baru
      </button>
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
        <button
          v-for="cls in classes"
          :key="cls.id"
          type="button"
          @click="selectedClassId = cls.id"
          :class="[
            'w-full text-left rounded-2xl border p-5 transition shadow-sm',
            selectedClassId === cls.id
              ? 'border-primary bg-primary-50/70'
              : 'border-slate-200 bg-white hover:border-primary/40',
          ]"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-base font-bold text-slate-900">{{ cls.name }}</span>
            <span class="rounded-lg bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Tingkat {{ cls.gradeLevel }}
            </span>
          </div>
          <p class="text-xs text-slate-500">
            Wali Kelas: {{ cls.homeroomTeacherName || cls.homeroomTeacherId || 'Belum ditentukan' }}
          </p>
          <div class="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{{ cls.academicYear }}</span>
            <span class="inline-flex items-center gap-1 font-semibold text-primary">
              <Users class="h-3.5 w-3.5" />
              {{ cls.studentCount ?? 0 }} Siswa
            </span>
          </div>
        </button>
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
              to="/attendance"
              class="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Isi Absensi Kelas →
            </router-link>
            <button
              v-if="authStore.isAdmin && selectedClassId"
              type="button"
              @click="showEnrollModal = true"
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
                <td class="py-3 pl-4 text-right">
                  <button
                    type="button"
                    @click="copyStudentUuid(stu.studentId, stu.fullName)"
                    class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    title="Salin UUID Siswa"
                  >
                    <Copy class="h-3 w-3" />
                    Salin ID
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Buat Kelas Baru -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">Buat Kelas Baru</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        <form @submit.prevent="createClass" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas</label>
            <input
              v-model="newClassForm.name"
              required
              type="text"
              placeholder="Contoh: X-IPA-1"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tingkat</label>
              <input v-model="newClassForm.gradeLevel" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran</label>
              <input v-model="newClassForm.academicYear" required type="text" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">ID Wali Kelas (Opsional)</label>
            <input
              v-model="newClassForm.homeroomTeacherId"
              type="text"
              placeholder="Masukkan ID Guru jika sudah ada"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div class="pt-2 flex justify-end gap-2">
            <button type="button" @click="showCreateModal = false" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
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
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">Daftarkan Siswa ke {{ selectedClassInfo?.name }}</h3>
          <button @click="showEnrollModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Daftar ID Siswa (pisahkan dengan baris baru atau koma)
          </label>
          <textarea
            v-model="studentIdsInput"
            rows="4"
            placeholder="11111111-1111-1111-1111-111111111111&#10;22222222-2222-2222-2222-222222222222"
            class="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
          />
        </div>
        <div class="pt-2 flex justify-end gap-2">
          <button type="button" @click="showEnrollModal = false" class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
            Batal
          </button>
          <button
            type="button"
            :disabled="!studentIdsInput.trim()"
            @click="enrollStudents"
            class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Daftarkan Siswa
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
