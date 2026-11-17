import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: 'Masuk Portal Sekolah' },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/DashboardHomeView.vue'),
    meta: { title: 'Beranda Portal' },
  },
  // Academic Classes & Attendance
  {
    path: '/academic/classes',
    name: 'academic-classes',
    component: () => import('@/views/academic/ClassesView.vue'),
    meta: {
      title: 'Manajemen Kelas Akademik',
      roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER', 'COUNSELOR'],
    },
  },
  {
    path: '/attendance',
    name: 'attendance',
    component: () => import('@/views/attendance/AttendanceView.vue'),
    meta: { title: 'Absensi Siswa' },
  },
  // Admin Modules
  {
    path: '/admin/branding',
    name: 'admin-branding',
    component: () => import('@/views/admin/BrandingSettingsView.vue'),
    meta: {
      title: 'Pengaturan White-Label Branding',
      roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL'],
    },
  },
  {
    path: '/admin/home-layout',
    name: 'admin-home-layout',
    component: () => import('@/views/admin/HomeLayoutCustomizerView.vue'),
    meta: {
      title: 'Home Layout Customizer',
      roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL'],
    },
  },
  {
    path: '/admin/sdui-builder',
    name: 'admin-sdui-builder',
    component: () => import('@/views/admin/SduiBuilderView.vue'),
    meta: {
      title: 'SDUI Block Builder',
      roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL'],
    },
  },
  // LMS Modules
  {
    path: '/lms/courses',
    name: 'lms-courses',
    component: () => import('@/views/lms/CoursesView.vue'),
    meta: { title: 'Daftar Kursus & Kelas (LMS)' },
  },
  {
    path: '/lms/courses/:id',
    name: 'lms-course-detail',
    component: () => import('@/views/lms/CourseDetailView.vue'),
    meta: { title: 'Workspace Kursus' },
  },
  // CBT & Grading Modules
  {
    path: '/cbt/question-banks',
    name: 'cbt-question-banks',
    component: () => import('@/views/cbt/QuestionBanksView.vue'),
    meta: {
      title: 'Bank Soal CBT',
      roles: ['SUPER_OWNER', 'SCHOOL_ADMIN', 'PRINCIPAL', 'TEACHER'],
    },
  },
  {
    path: '/cbt/exams',
    name: 'cbt-exams',
    component: () => import('@/views/cbt/CbtExamsView.vue'),
    meta: { title: 'Jadwal Ujian CBT' },
  },
  {
    path: '/cbt/exams/:id/run',
    name: 'cbt-exam-runner',
    component: () => import('@/views/cbt/CbtExamRunnerView.vue'),
    meta: { title: 'Sesi Ujian CBT' },
  },
  {
    path: '/cbt/grades',
    name: 'cbt-grades',
    component: () => import('@/views/cbt/GradesAndReportCardView.vue'),
    meta: { title: 'Nilai & Rapor Akademik' },
  },
  // Global & Career Hub
  {
    path: '/global',
    name: 'global-hub',
    component: () => import('@/views/global/GlobalHubView.vue'),
    meta: { title: 'Global & Career Hub' },
  },
  {
    path: '/global/programs/:id',
    name: 'global-program-detail',
    component: () => import('@/views/global/ProgramDetailView.vue'),
    meta: { title: 'Detail Program Immersion' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const tenantStore = useTenantStore()

  // Sync White-Label branding if ?school=<slug> is provided in URL
  const schoolParam = to.query.school
  if (typeof schoolParam === 'string' && schoolParam && schoolParam !== tenantStore.activeSlug) {
    await tenantStore.fetchPublicBranding(schoolParam)
  }

  if (to.meta.public) {
    if (to.name === 'login' && authStore.isAuthenticated) {
      return { name: 'home' }
    }
    return true
  }

  if (!authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && authStore.role && !allowedRoles.includes(authStore.role)) {
    return { name: 'home' }
  }

  return true
})

export default router
