<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Plus, Search, ShieldCheck, UserCheck, UserX, Users, X } from 'lucide-vue-next'
import { apiRequest, normalizePaginated } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import type { AcademicUser, AcademicUserStatus, PaginatedResponse, UserRole } from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

const canManageUsers = computed(() =>
  ['SCHOOL_ADMIN', 'SUPER_OWNER'].includes(authStore.role || ''),
)

const users = ref<AcademicUser[]>([])
const loading = ref(true)
const saving = ref(false)
const showCreateModal = ref(false)

const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const totalPages = ref(1)

const roleOptions: Array<{ value: Exclude<UserRole, 'SUPER_OWNER'>; label: string }> = [
  { value: 'SCHOOL_ADMIN', label: 'Admin Sekolah' },
  { value: 'PRINCIPAL', label: 'Kepala Sekolah' },
  { value: 'TEACHER', label: 'Guru' },
  { value: 'COUNSELOR', label: 'Konselor / BK' },
  { value: 'STUDENT', label: 'Siswa' },
  { value: 'PARENT', label: 'Orang Tua' },
]

const createForm = reactive({
  fullName: '',
  email: '',
  password: '',
  role: 'STUDENT' as Exclude<UserRole, 'SUPER_OWNER'>,
})

async function fetchUsers() {
  loading.value = true
  try {
    const raw = await apiRequest<PaginatedResponse<AcademicUser> | AcademicUser[]>({
      method: 'GET',
      url: '/academic/users',
      params: {
        search: search.value.trim() || undefined,
        role: roleFilter.value || undefined,
        status: statusFilter.value || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        page: page.value,
        limit: limit.value,
      },
    })
    const res = normalizePaginated(raw)
    users.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages || 1
  } catch (err) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal memuat daftar pengguna.'
    toast.error('Gagal Memuat Pengguna', msg)
  } finally {
    loading.value = false
  }
}

watch([search, roleFilter, statusFilter, sortBy, sortOrder], () => {
  page.value = 1
  fetchUsers()
})

watch(page, fetchUsers)

async function createUser() {
  if (createForm.password.length < 8) {
    toast.error('Password Terlalu Pendek', 'Password minimal 8 karakter.')
    return
  }
  saving.value = true
  try {
    await apiRequest<AcademicUser>({
      method: 'POST',
      url: '/academic/users',
      data: {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      },
    })
    toast.success('Pengguna Dibuat', `${createForm.fullName} berhasil ditambahkan.`)
    showCreateModal.value = false
    createForm.fullName = ''
    createForm.email = ''
    createForm.password = ''
    createForm.role = 'STUDENT'
    await fetchUsers()
  } catch (err) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal membuat pengguna baru.'
    toast.error('Gagal Membuat Pengguna', msg)
  } finally {
    saving.value = false
  }
}

async function toggleUserStatus(user: AcademicUser) {
  const nextStatus: AcademicUserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  try {
    await apiRequest({
      method: 'PATCH',
      url: `/academic/users/${user.id}/status`,
      data: { status: nextStatus },
    })
    user.status = nextStatus
    toast.success(
      'Status Diperbarui',
      `${user.fullName} sekarang ${nextStatus === 'ACTIVE' ? 'Aktif' : 'Ditangguhkan'}.`,
    )
  } catch (err) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Gagal memperbarui status pengguna.'
    toast.error('Gagal', msg)
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Users class="h-5 w-5 text-primary" />
          Direktori & Manajemen Pengguna
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          Kelola akun guru, siswa, orang tua, dan staf sekolah pada tenant aktif.
        </p>
      </div>
      <button
        v-if="canManageUsers"
        type="button"
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90"
      >
        <Plus class="h-4 w-4" />
        Tambah Pengguna
      </button>
    </div>

    <!-- Filter & Sort Bar -->
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <div class="lg:col-span-2 relative">
        <Search class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="search"
          type="search"
          placeholder="Cari nama atau email..."
          class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
        />
      </div>
      <select v-model="roleFilter" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="">Semua Role</option>
        <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
      </select>
      <select v-model="statusFilter" class="rounded-xl border border-slate-200 px-3 py-2 text-sm">
        <option value="">Semua Status</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="SUSPENDED">SUSPENDED</option>
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
        <option value="createdAt:DESC">Terbaru</option>
        <option value="fullName:ASC">Nama A-Z</option>
        <option value="fullName:DESC">Nama Z-A</option>
        <option value="role:ASC">Role A-Z</option>
      </select>
    </div>

    <SkeletonCard v-if="loading" :count="3" />

    <EmptyState
      v-else-if="users.length === 0"
      title="Tidak ada pengguna ditemukan"
      description="Coba ubah filter pencarian atau tambahkan pengguna baru."
    />

    <div v-else class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th class="py-3 pr-4">Nama & Email</th>
              <th class="py-3 px-3">Role</th>
              <th class="py-3 px-3">Status</th>
              <th v-if="canManageUsers" class="py-3 pl-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-for="u in users" :key="u.id" class="hover:bg-slate-50/70">
              <td class="py-3 pr-4">
                <p class="font-bold text-slate-900">{{ u.fullName }}</p>
                <p class="text-xs text-slate-500">{{ u.email }}</p>
              </td>
              <td class="py-3 px-3">
                <span class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  <ShieldCheck class="h-3 w-3 text-primary" />
                  {{ u.role }}
                </span>
              </td>
              <td class="py-3 px-3">
                <span
                  :class="[
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold',
                    u.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700',
                  ]"
                >
                  {{ u.status }}
                </span>
              </td>
              <td v-if="canManageUsers" class="py-3 pl-3 text-right">
                <button
                  v-if="u.role !== 'SUPER_OWNER'"
                  type="button"
                  @click="toggleUserStatus(u)"
                  :class="[
                    'inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                    u.status === 'ACTIVE'
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                  ]"
                >
                  <UserX v-if="u.status === 'ACTIVE'" class="h-3.5 w-3.5" />
                  <UserCheck v-else class="h-3.5 w-3.5" />
                  {{ u.status === 'ACTIVE' ? 'Tangguhkan' : 'Aktifkan' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationBar
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :limit="limit"
        @update:page="page = $event"
      />
    </div>

    <!-- Create User Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900">Tambah Pengguna Sekolah</h3>
          <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="createUser" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              v-model="createForm.fullName"
              type="text"
              required
              placeholder="Contoh: Ustadz Ahmad"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              v-model="createForm.email"
              type="email"
              required
              placeholder="ahmad@aliman.sch.id"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Password (min. 8 karakter)</label>
            <input
              v-model="createForm.password"
              type="password"
              required
              minlength="8"
              placeholder="Minimal 8 karakter"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Role</label>
            <select
              v-model="createForm.role"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showCreateModal = false"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Pengguna' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
