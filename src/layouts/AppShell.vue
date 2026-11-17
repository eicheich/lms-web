<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  ClipboardCheck,
  Award,
  Globe,
  Palette,
  LayoutGrid,
  Blocks,
  LogOut,
  Menu,
  X,
  School,
  CalendarCheck,
  KeyRound,
  ShieldAlert,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const tenantStore = useTenantStore()
const toast = useToast()

const mobileOpen = ref(false)
const showPasswordModal = ref(false)
const changingPassword = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const isFocusExamMode = computed(() => route.name === 'cbt-exam-runner')

const userInitials = computed(() => {
  const name = authStore.user?.fullName || 'U'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
})

interface NavItem {
  label: string
  to: string
  icon: unknown
  roles?: string[]
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const navGroups = computed<NavGroup[]>(() => {
  const isExecOrCounselor = ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'COUNSELOR'].includes(
    authStore.role || '',
  )
  const isExec = ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL'].includes(authStore.role || '')

  return [
    {
      group: 'Utama',
      items: [
        {
          label: 'Beranda Portal',
          to: '/',
          icon: LayoutDashboard,
        },
        {
          label: 'Global & Career Hub',
          to: '/global',
          icon: Globe,
        },
      ],
    },
    {
      group: 'Akademik & Kelas',
      items: [
        {
          label: 'Manajemen Kelas',
          to: '/academic/classes',
          icon: School,
          roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'COUNSELOR'],
        },
        {
          label: isExecOrCounselor
            ? 'Rekap Absensi'
            : authStore.isStudent
              ? 'Kehadiran Saya'
              : authStore.isParent
                ? 'Kehadiran Anak'
                : 'Absensi Siswa',
          to: '/attendance',
          icon: CalendarCheck,
        },
      ],
    },
    {
      group: 'Pembelajaran & Ujian',
      items: [
        {
          label: isExec ? 'Monitoring Mata Pelajaran' : 'Kursus & Materi (LMS)',
          to: '/lms/courses',
          icon: BookOpen,
          roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT'],
        },
        {
          label: isExec ? 'Monitoring Bank Soal' : 'Bank Soal CBT',
          to: '/cbt/question-banks',
          icon: FileQuestion,
          roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER'],
        },
        {
          label: isExec ? 'Monitoring Ujian CBT' : 'Ujian CBT',
          to: '/cbt/exams',
          icon: ClipboardCheck,
          roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT'],
        },
        {
          label: authStore.isParent
            ? 'Rapor Anak'
            : authStore.isStudent
              ? 'Nilai & Rapor Saya'
              : 'Nilai & Rapor',
          to: '/cbt/grades',
          icon: Award,
        },
      ],
    },
    {
      group: 'Administrasi Sekolah',
      items: [
        {
          label: 'Branding White-Label',
          to: '/admin/branding',
          icon: Palette,
          roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL'],
        },
        {
          label: 'Home Layout Editor',
          to: '/admin/home-layout',
          icon: LayoutGrid,
          roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL'],
        },
        {
          label: 'Desainer Halaman Program',
          to: '/admin/sdui-builder',
          icon: Blocks,
          roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'COUNSELOR'],
        },
      ],
    },
  ]
})

const visibleNavGroups = computed(() => {
  const userRole = authStore.role
  return navGroups.value
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (!item.roles) return true
        return userRole ? item.roles.includes(userRole) : false
      }),
    }))
    .filter((g) => g.items.length > 0)
})

async function handleChangePassword() {
  if (passwordForm.newPassword.length < 6) {
    toast.error('Password baru minimal 6 karakter')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.error('Konfirmasi password baru tidak cocok')
    return
  }
  changingPassword.value = true
  try {
    await authStore.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    toast.success('Password berhasil diperbarui!')
    showPasswordModal.value = false
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (err) {
    toast.error(
      'Gagal mengubah password',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Periksa kembali password lama Anda.',
    )
  } finally {
    changingPassword.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="h-screen overflow-hidden flex bg-slate-50 print:h-auto print:overflow-visible">
    <!-- Mobile backdrop -->
    <div
      v-if="mobileOpen && !isFocusExamMode"
      class="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
      @click="mobileOpen = false"
    />

    <!-- Sidebar (hidden in CBT Focus Mode) -->
    <aside
      v-if="!isFocusExamMode"
      :class="[
        'fixed inset-y-0 left-0 z-40 h-full w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 no-print',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <!-- Brand Header -->
      <div class="h-16 shrink-0 px-5 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div
            v-if="tenantStore.branding.logoUrl"
            class="h-9 w-9 rounded-xl overflow-hidden border border-slate-200 shrink-0"
          >
            <img :src="tenantStore.branding.logoUrl" alt="Logo" class="h-full w-full object-cover" />
          </div>
          <div
            v-else
            class="h-9 w-9 rounded-xl bg-primary text-white font-bold flex items-center justify-center shrink-0 shadow-sm"
          >
            {{ tenantStore.branding.appName.slice(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-900 truncate">
              {{ tenantStore.branding.appName }}
            </p>
            <p class="text-[11px] text-slate-500 truncate">
              {{ tenantStore.branding.schoolName }}
            </p>
          </div>
        </div>
        <button class="lg:hidden text-slate-500" @click="mobileOpen = false">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Grouped Nav Links -->
      <nav class="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-5">
        <div v-for="group in visibleNavGroups" :key="group.group" class="space-y-1">
          <p class="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {{ group.group }}
          </p>
          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            @click="mobileOpen = false"
            :class="[
              'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition',
              route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to))
                ? 'bg-primary-50 text-primary font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            ]"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ item.label }}</span>
          </router-link>
        </div>
      </nav>

      <!-- User Profile, Change Password & Logout -->
      <div class="shrink-0 p-3 border-t border-slate-100 bg-slate-50/80 space-y-2">
        <div class="flex items-center gap-2.5 px-1">
          <div class="h-9 w-9 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0">
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-slate-900 truncate">{{ authStore.user?.fullName }}</p>
            <p class="text-[11px] font-medium text-primary truncate">{{ authStore.role }}</p>
          </div>
          <button
            type="button"
            @click="showPasswordModal = true"
            title="Ubah Password"
            class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition"
          >
            <KeyRound class="h-4 w-4" />
          </button>
          <button
            type="button"
            @click="handleLogout"
            title="Keluar"
            class="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 h-full flex flex-col min-w-0 overflow-hidden print:h-auto print:overflow-visible">
      <header class="h-16 shrink-0 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between no-print">
        <div class="flex items-center gap-3">
          <button
            v-if="!isFocusExamMode"
            type="button"
            class="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            @click="mobileOpen = true"
          >
            <Menu class="h-5 w-5" />
          </button>
          <span
            v-if="isFocusExamMode"
            class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800"
          >
            <ShieldAlert class="h-3.5 w-3.5" />
            Mode Fokus Ujian CBT
          </span>
          <h1 class="text-base md:text-lg font-bold text-slate-900">
            {{ route.meta.title || 'Learning Hub & Global Center' }}
          </h1>
        </div>

        <div class="flex items-center gap-3">
          <span class="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {{ tenantStore.branding.schoolName }}
          </span>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto overscroll-contain print:overflow-visible">
        <main class="p-4 md:p-8 max-w-7xl w-full mx-auto">
          <slot />
        </main>
      </div>
    </div>

    <!-- Modal Ubah Password -->
    <div
      v-if="showPasswordModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound class="h-4 w-4 text-primary" />
            Ubah Password Akun
          </h3>
          <button @click="showPasswordModal = false" class="text-slate-400 hover:text-slate-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="handleChangePassword" class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Password Lama</label>
            <input
              v-model="passwordForm.oldPassword"
              type="password"
              required
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Password Baru</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              required
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Password Baru</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              required
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              @click="showPasswordModal = false"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="changingPassword"
              class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {{ changingPassword ? 'Menyimpan...' : 'Simpan Password' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
