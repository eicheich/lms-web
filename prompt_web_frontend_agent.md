# Prompt & Brief: Web Frontend Portal — Learning Hub & Global Center (Multi-Tenant SaaS)

> **Cara Pakai:** Berikan dokumen Markdown ini secara utuh kepada AI Agent Coding Web Frontend kamu. Dokumen ini sudah disinkronkan 100% dengan kontrak API, skema autentikasi JWT + Refresh Token Rotation, White-Label Branding, Server-Driven UI (SDUI), serta modul LMS & CBT pada **Backend Modular Monolith (`D:\01 Houselab\00LMS\lms_be`)** yang berjalan di `http://localhost:3000` (API prefix `/v1`, Swagger OpenAPI di `http://localhost:3000/docs`).

---

## 1. PERAN & OBJEKTIF

Kamu adalah **Senior Frontend / Full-Stack Web Engineer (Vue 3 / Nuxt 4 / TypeScript)** yang bertugas membangun atau menyempurnakan **Aplikasi Web Multi-Tenant Learning Hub & Global Center** (`aliman-lms-fe-v1`).

Berbeda dengan aplikasi Mobile yang berfokus pada penggunaan harian cepat di ponsel oleh Siswa/Orang Tua/Guru, **Aplikasi Web** ini adalah **Workspace Utama berlayar lebar (Desktop & Tablet Responsive)** untuk:
1. **Admin Sekolah (`SCHOOL_ADMIN` & `PRINCIPAL`)**: Mengelola konfigurasi White-Label sekolah, menyusun tata letak Beranda Dinamis (`home-layout`), merancang blok halaman Server-Driven UI (SDUI Builder) untuk program sekolah, mengelola kursus, menjadwalkan ujian CBT, serta memfinalisasi rapor semester siswa.
2. **Guru (`TEACHER` & `COUNSELOR`)**: Mengelola materi pembelajaran, membuat tugas, menilai pengumpulan tugas siswa secara *side-by-side*, membangun Bank Soal (`question-banks`), membuat butir soal pilihan ganda/esai, dan menjadwalkan ujian CBT.
3. **Siswa (`STUDENT`) & Orang Tua (`PARENT`)**: Mengakses kelas, membaca materi layar lebar, mengerjakan ujian CBT di komputer/laptop, mencetak/melihat rapor akademik, serta mengeksplorasi katalog Global & Career Hub (Negara, Universitas Top QS, Beasiswa, Program Immersion, & Pendaftaran Konsultasi).

> **Catatan Arsitektur Penting:**
> Panel khusus `SUPER_OWNER` (Control Plane lintas-tenant dengan 2FA TOTP, toggle lisensi modul tenant, & bulk import CSV) sudah di-render langsung dari sisi server (SSR Handlebars + HTMX) di `http://localhost:3000/superadmin`. Namun aplikasi web ini tetap harus mengizinkan role `SUPER_OWNER` untuk masuk dan menguji fitur di dalam portal sekolah.

---

## 2. PRINSIP ARSITEKTUR & KEAMANAN WAJIB

1. **Multi-Tenancy Berbasis JWT & PostgreSQL RLS (Bukan Header `X-School-Id`):**
   - Backend baru mengisolasi data setiap sekolah menggunakan **PostgreSQL Row-Level Security (`SET LOCAL app.tenant_id`)** yang diekstrak secara eksklusif dari **JWT Access Token** yang terverifikasi.
   - **JANGAN** pernah mengirim `tenantId` di body/query untuk memanipulasi data operasional. Saat login, kirimkan `tenantSlug` (contoh default: `"al-iman"`).
2. **White-Label Branding Dinamis per Sekolah (`tenantSlug`):**
   - Sebelum/saat berada di halaman Login (atau melalui subdomain/parameter `?school=al-iman`), panggil endpoint publik `GET /v1/tenant/:slug/branding`.
   - Terapkan `primaryColor`, `secondaryColor`, `appName`, `schoolName`, dan `logoUrl` secara reaktif menggunakan CSS Variables (`--color-primary`, `--color-secondary`) ke seluruh komponen UI.
3. **Silent Refresh Token Rotation dengan Mutex Queue:**
   - Access token berumur pendek (`15m`) dan Refresh token berumur `7d`.
   - Backend menerapkan **Refresh Token Rotation with Reuse Detection**: setiap pemanggilan `POST /v1/auth/refresh` menghanguskan refresh token lama dan menerbitkan pasangan `{ accessToken, refreshToken }` baru.
   - **Wajib gunakan Mutex Queue** pada Axios Response Interceptor saat menangani `401 Unauthorized` agar request paralel tidak memanggil `/v1/auth/refresh` bersamaan dengan token lama (yang akan memicu *Reuse Detection* dan mencabut seluruh sesi user).
4. **Resiliensi Feature Flag (`403 Forbidden - Module Inactive`):**
   - Setiap modul di backend dilindungi oleh `@RequireModule(ModuleKey)`.
   - Jika suatu sekolah belum berlangganan modul `LMS` atau `CBT_GRADING`, backend mengembalikan `HTTP 403 Forbidden`.
   - Frontend **dilarang crash** atau me-redirect paksa ke login saat menerima `403`; tampilkan komponen **Locked Feature / Upgrade Banner** yang informatif.

---

## 3. TECH STACK (SELARAS DENGAN REPO WEB & MOBILE)

| Lapisan | Teknologi |
| :--- | :--- |
| **Framework** | **Nuxt 4 / Vue 3 (Composition API, `<script setup lang="ts">`)** |
| **Styling** | **Tailwind CSS** + CSS Variables dinamis untuk White-Label Theme |
| **State Management** | **Pinia** (`useAuthStore`, `useTenantStore`) |
| **Data Fetching** | **Axios** (dengan Mutex Refresh Interceptor) + **TanStack Vue Query** (opsional) |
| **Validasi Form** | **Vee-Validate** + **Zod** |
| **Icons** | `lucide-vue-next` |

---

## 4. SPESIFIKASI LENGKAP ENDPOINT & KONTRAK DTO (`/v1/*`)

Base URL Development: `http://localhost:3000/v1`

### 4.1 White-Label Tenant Branding (`/v1/tenant`)

1. **`GET /v1/tenant/:slug/branding`** *(Public — untuk Splash / Halaman Login)*
   - **Response (`200 OK`):**
     ```json
     {
       "tenantId": "11111111-1111-1111-1111-111111111111",
       "schoolName": "Al-Iman Islamic Boarding School",
       "slug": "al-iman",
       "appName": "Al-Iman SuperApp",
       "logoUrl": "https://...",
       "primaryColor": "#059669",
       "secondaryColor": "#0284c7"
     }
     ```
2. **`GET /v1/tenant/branding`** *(Auth: JWT)* — Ambil branding untuk tenant aktif dari JWT.
3. **`PUT /v1/tenant/branding`** *(Auth: `SCHOOL_ADMIN`, `SUPER_OWNER`)* — Update branding sekolah:
   - **Request Body (`UpdateBrandingDto`):**
     ```json
     {
       "appName": "Al-Iman Digital Portal",
       "logoUrl": "https://...",
       "primaryColor": "#059669",
       "secondaryColor": "#0284c7"
     }
     ```

---

### 4.2 Autentikasi & Profil (`/v1/auth`)

1. **`POST /v1/auth/login`** *(Public)*
   - **Request Body (`LoginDto`):**
     ```json
     {
       "email": "admin@aliman.sch.id",
       "password": "Password123!",
       "tenantSlug": "al-iman"
     }
     ```
   - **Response (`200 OK`):**
     ```json
     {
       "tokens": {
         "accessToken": "eyJhbG...",
         "refreshToken": "eyJhbG..."
       },
       "user": {
         "id": "uuid",
         "email": "admin@aliman.sch.id",
         "fullName": "Ustadz Abdullah Al-Mansur",
         "role": "SCHOOL_ADMIN",
         "tenantId": "uuid"
       }
     }
     ```
   - **Daftar Enum `UserRole` di Backend:**
     `'SUPER_OWNER' | 'SCHOOL_ADMIN' | 'PRINCIPAL' | 'TEACHER' | 'COUNSELOR' | 'STUDENT' | 'PARENT'`
2. **`POST /v1/auth/refresh`** *(Public)*
   - **Body:** `{ "refreshToken": "eyJhbG..." }`
   - **Response:** Pasangan `{ tokens: { accessToken, refreshToken } }` baru.
3. **`GET /v1/auth/me`** *(Auth: JWT)* — Mengembalikan `{ user: { userId, email, role, tenantId } }`.
4. **`POST /v1/auth/change-password`** *(Auth: JWT)*
   - **Body:** `{ "oldPassword": "Password123!", "newPassword": "NewPassword123!" }`
5. **`POST /v1/auth/logout`** *(Auth: JWT)* — Mencabut sesi refresh token di server.

---

### 4.3 Konfigurasi Beranda Dinamis (`/v1/app`)

1. **`GET /v1/app/home-layout`** *(Optional JWT / Query `?tenantId=...`)*
   - **Response:**
     ```json
     {
       "tenantId": "uuid",
       "schemaVersion": 1,
       "homeBlocks": [
         "HERO_BANNER",
         "GLOBAL_PROGRAMS",
         "TOP_SCHOLARSHIPS",
         "CAREER_STATS",
         "CONSULTATION_CTA"
       ],
       "bannerActive": true,
       "featuresToggle": {
         "showConsultation": true,
         "showScholarships": true
       }
     }
     ```
2. **`PUT /v1/app/home-layout`** *(Auth: `SCHOOL_ADMIN`, `SUPER_OWNER`)*
   - Sediakan UI Drag-and-Drop / Reorder bagi Admin Sekolah di Web untuk mengatur urutan `homeBlocks`, `bannerActive`, dan `featuresToggle`.
   - **Request Body (`UpdateHomeLayoutDto`):**
     ```json
     {
       "homeBlocks": ["HERO_BANNER", "CAREER_STATS", "GLOBAL_PROGRAMS", "TOP_SCHOLARSHIPS", "CONSULTATION_CTA"],
       "bannerActive": true,
       "featuresToggle": {
         "showConsultation": true,
         "showScholarships": true
       }
     }
     ```

---

### 4.4 Global & Career Hub + Server-Driven UI Builder (`/v1/global`)

1. **Katalog Global (Public — mendukung `?search=...&page=1&limit=10`):**
   - `GET /v1/global/countries` — Daftar negara tujuan studi luar negeri.
   - `GET /v1/global/universities` — Daftar universitas mitra & QS World Ranking.
   - `GET /v1/global/scholarships` — Daftar beasiswa internasional (`Full` / `Partial`).
2. **Program Immersion & Server-Driven UI (SDUI):**
   - `GET /v1/global/programs` — Daftar program global + program khusus tenant.
   - `GET /v1/global/programs/:id` — Detail metadata program.
   - `GET /v1/global/programs/:id/blocks` — Daftar blok SDUI terurut berdasarkan `sortOrder`.
   - **`POST /v1/global/programs/:id/blocks`** *(Auth: `SCHOOL_ADMIN`, `SUPER_OWNER` — Fitur Web SDUI Block Builder)*:
     - **Request Body (`CreateContentBlockDto`):**
       ```json
       {
         "blockType": "HERO_BLOCK",
         "sortOrder": 1,
         "content": {
           "schema_version": 1,
           "badgeText": "Batch 2027",
           "headline": "Oxford & London STEM Immersion",
           "subheadline": "Pengalaman riset 14 hari di Inggris",
           "ctaText": "Daftar Sekarang",
           "ctaUrl": "https://wa.me/6281234567890"
         }
       }
       ```
     - **4 Tipe `blockType` yang didukung (`schema_version: 1`):**
       - `HERO_BLOCK`: `{ schema_version: 1, headline, subheadline?, ctaText, ctaUrl, imageUrl?, badgeText? }`
       - `STATS_BLOCK`: `{ schema_version: 1, title?, items: [{ value, label, description? }] }`
       - `ICON_GRID_BLOCK`: `{ schema_version: 1, title?, items: [{ icon, title, description, actionUrl? }] }`
       - `RICH_TEXT_BLOCK`: `{ schema_version: 1, body, alignment?: 'left' | 'center' | 'right' }`
3. **Konsultasi Studi Luar Negeri & WhatsApp Deep-Link:**
   - `POST /v1/global/consultations` *(Auth: JWT)*
     - **Body:** `{ "name": "...", "phone": "628...", "email": "...", "destinationCountry": "United Kingdom", "intendedMajor": "Computer Science", "notes": "..." }`
     - **Response:** Mengembalikan objek konsultasi beserta `whatsappUrl` / `redirectUrl`. Buka di tab baru (`window.open`).
   - `GET /v1/global/consultations/my` *(Auth: JWT)* — Riwayat konsultasi user aktif.

---

### 4.5 LMS & Pembelajaran (`/v1/lms`) — *Protected by Feature Flag `LMS`*

1. **Courses (Mata Pelajaran):**
   - `GET /v1/lms/courses` *(Auth: Semua Role)* — Daftar kursus aktif di tenant.
   - `GET /v1/lms/courses/:id` *(Auth: Semua Role)* — Detail kursus beserta materi dan tugas.
   - `POST /v1/lms/courses` *(Auth: `SCHOOL_ADMIN`, `TEACHER`, `SUPER_OWNER`)*:
     ```json
     {
       "name": "Matematika Peminatan XII",
       "code": "MTH-XII-01",
       "subject": "Matematika",
       "gradeLevel": "Kelas 12",
       "academicYear": "2026/2027",
       "teacherId": "uuid-opsional"
     }
     ```
2. **Materials (Materi Pembelajaran):**
   - `GET /v1/lms/courses/:courseId/materials` *(Auth: Semua Role)*
   - `POST /v1/lms/courses/:courseId/materials` *(Auth: `SCHOOL_ADMIN`, `TEACHER`, `SUPER_OWNER`)*:
     ```json
     {
       "title": "Pengantar Kalkulus Diferensial",
       "contentType": "TEXT",
       "contentBody": "Rangkuman konsep turunan fungsi aljabar...",
       "fileUrl": "https://youtube.com/watch?v=12345",
       "sortOrder": 1
     }
     ```
     *(Catatan: `contentType` menerima enum `'TEXT' | 'VIDEO' | 'PDF' | 'LINK'`)*
3. **Assignments & Submissions (Tugas & Penilaian):**
   - `GET /v1/lms/courses/:courseId/assignments` *(Auth: Semua Role)*
   - `GET /v1/lms/assignments/:id` *(Auth: Semua Role)*
   - `POST /v1/lms/courses/:courseId/assignments` *(Auth: `SCHOOL_ADMIN`, `TEACHER`, `SUPER_OWNER`)*:
     ```json
     {
       "title": "Latihan Soal Turunan 1",
       "description": "Kerjakan soal 1 sampai 10 di buku latihan.",
       "dueDate": "2026-11-25T23:59:59Z",
       "maxScore": 100,
       "submissionType": "TEXT"
     }
     ```
   - `POST /v1/lms/assignments/:id/submit` *(Auth: `STUDENT`)*:
     ```json
     {
       "content": "Jawaban teks esai siswa...",
       "fileUrl": "https://storage.aliman.sch.id/submissions/tugas1.pdf"
     }
     ```
   - `GET /v1/lms/assignments/:id/submissions` *(Auth: `TEACHER`, `SCHOOL_ADMIN`, `SUPER_OWNER`)* — Daftar seluruh pengumpulan siswa pada tugas tersebut.
   - `POST /v1/lms/submissions/:id/grade` *(Auth: `TEACHER`, `SCHOOL_ADMIN`, `SUPER_OWNER`)*:
     ```json
     {
       "score": 92,
       "feedback": "Langkah pengerjaan sangat sistematis!"
     }
     ```

---

### 4.6 CBT (Computer-Based Test) & Rapor Akademik (`/v1/cbt`) — *Protected by Feature Flag `CBT_GRADING`*

1. **Question Banks (Bank Soal — Guru & Admin):**
   - `GET /v1/cbt/question-banks` — Daftar bank soal (termasuk template global).
   - `POST /v1/cbt/question-banks` *(Auth: `SCHOOL_ADMIN`, `TEACHER`, `SUPER_OWNER`)*:
     ```json
     {
       "title": "Bank Soal Kalkulus Kelas XII",
       "subject": "Matematika",
       "gradeLevel": "Kelas 12"
     }
     ```
   - `GET /v1/cbt/question-banks/:id/questions` *(Auth: `SCHOOL_ADMIN`, `TEACHER`, `SUPER_OWNER`)*
   - `POST /v1/cbt/question-banks/:id/questions` *(Auth: `SCHOOL_ADMIN`, `TEACHER`, `SUPER_OWNER`)*:
     ```json
     {
       "questionType": "MULTIPLE_CHOICE",
       "prompt": "Berapakah turunan pertama dari f(x) = 3x^2 + 4x - 5?",
       "options": [
         { "key": "A", "text": "6x + 4" },
         { "key": "B", "text": "6x - 4" },
         { "key": "C", "text": "3x + 4" },
         { "key": "D", "text": "6x" }
       ],
       "answerKey": "A",
       "scoreWeight": 10
     }
     ```
2. **CBT Exams (Jadwal & Pelaksanaan Ujian):**
   - `GET /v1/cbt/exams` — Daftar jadwal ujian CBT.
   - `GET /v1/cbt/exams/:id` — Detail ujian beserta daftar soal (untuk `STUDENT`, `answerKey` otomatis disembunyikan oleh backend).
   - `POST /v1/cbt/exams` *(Auth: `SCHOOL_ADMIN`, `TEACHER`, `SUPER_OWNER`)*:
     ```json
     {
       "courseId": "uuid-opsional",
       "title": "Ujian Tengah Semester Ganjil 2026",
       "durationMinutes": 90,
       "startTime": "2026-11-10T08:00:00Z",
       "endTime": "2026-11-30T12:00:00Z",
       "passingScore": 75,
       "isRandomized": true,
       "questionIds": ["uuid-soal-1", "uuid-soal-2"]
     }
     ```
3. **CBT Exam Attempt (Sesi Ujian Siswa di Web):**
   - `POST /v1/cbt/exams/:id/start` *(Auth: `STUDENT`)* — Memulai sesi ujian & mengembalikan `attemptId`.
   - `POST /v1/cbt/attempts/:id/submit` *(Auth: `STUDENT`)*:
     ```json
     {
       "answers": {
         "uuid-soal-1": "A",
         "uuid-soal-2": "C"
       }
     }
     ```
4. **Grades & Finalisasi Rapor Akademik:**
   - `GET /v1/cbt/students/:studentId/grades?courseId=...` — Kompilasi nilai tugas (LMS) dan ujian (CBT) siswa.
   - `POST /v1/cbt/report-cards/finalize` *(Auth: `SCHOOL_ADMIN`, `PRINCIPAL`, `SUPER_OWNER`)*:
     ```json
     {
       "studentId": "uuid-siswa",
       "academicYear": "2026/2027",
       "semester": 1,
       "summaryGpa": 3.85,
       "finalEvaluation": {
         "sikap": "Sangat Baik",
         "catatan": "Aktif berpartisipasi dalam diskusi dan ujian CBT."
       }
     }
     ```

---

## 5. AKUN SEED SIAP PAKAI (UNTUK PENGUJIAN & DEMO MODE)

Sediakan tombol **1-Click Demo Login** di halaman `/login` dengan kredensial hasil seed resmi dari backend `lms_be` berikut:

- **Default Tenant Slug:** `al-iman`
- **Password Semua Akun Sekolah:** `Password123!`

| Role (`UserRole`) | Email | Nama Lengkap | Fokus Menu di Web Portal |
| :--- | :--- | :--- | :--- |
| `SCHOOL_ADMIN` | `admin@aliman.sch.id` | Ustadz Abdullah Al-Mansur | Branding White-Label, Editor Home Layout, SDUI Block Builder, Manajemen Kursus/CBT, Finalisasi Rapor |
| `TEACHER` | `ustadz.mansur@aliman.sch.id` | Ustadz Mansur Hidayat, M.Pd. | Buat Kursus/Materi/Tugas, Koreksi Tugas Siswa, Bank Soal, Jadwal CBT |
| `TEACHER` | `ustadzah.maryam@aliman.sch.id` | Ustadzah Maryam Zulaikha, S.Si. | Pengujian multi-guru |
| `STUDENT` | `rayhan@aliman.sch.id` | Muhammad Rayhan Pratama | Workspace Belajar, Submit Tugas, CBT Exam Layar Lebar, Rapor, Global & Career Hub |
| `STUDENT` | `salma@aliman.sch.id` | Salma Nur Azizah | Pengujian isolasi data antar-siswa |
| `PARENT` | `bapak.rayhan@gmail.com` | Drs. H. Pratama Wibowo | Dashboard Pantau Nilai & Rapor Anak (Rayhan), Eksplorasi Program Global & Konsultasi |

*(Tips: Buat fallback data seed di sisi frontend jika server lokal `http://localhost:3000` sedang tidak menyala agar UI tetap bisa didemokan kapan saja tanpa error jaringan).*

---

## 6. INSTRUKSI TAHAP PENGERJAAN UNTUK AGENT WEB

1. **Tahap 1 — Refactor API Client, Auth & White-Label Store:**
   - Arahkan base URL ke `http://localhost:3000/v1`.
   - Ganti mekanisme auth lama (Laravel Sanctum / `X-School-Id`) menjadi **JWT Bearer + Silent Refresh Token Rotation dengan Mutex Queue** dan **White-Label Branding (`GET /v1/tenant/:slug/branding`)**.
2. **Tahap 2 — Role-Based Web Dashboard Layout:**
   - Sesuaikan Sidebar dan Route Guard dengan role backend baru (`SCHOOL_ADMIN`, `PRINCIPAL`, `TEACHER`, `COUNSELOR`, `STUDENT`, `PARENT`).
   - Buat komponen `<LockedModuleBanner />` untuk menangani response `403 Forbidden` pada modul berlisensi.
3. **Tahap 3 — Modul Admin Sekolah (White-Label, Home Layout & SDUI Builder):**
   - Buat halaman pengaturan **White-Label Branding** (`PUT /v1/tenant/branding`) dengan live preview.
   - Buat halaman **Home Layout Customizer** (`PUT /v1/app/home-layout`) & **Program SDUI Block Builder** (`POST /v1/global/programs/:id/blocks` + live `<SduiRenderer />`).
4. **Tahap 4 — Modul Guru & Siswa (LMS, Bank Soal, CBT Exam & Rapor):**
   - Sambungkan seluruh halaman Kursus, Materi, Tugas, Grading Submissions, Bank Soal, Sesi Ujian CBT, Global Hub (Beserta WhatsApp Deep-Link), dan Finalisasi Rapor ke endpoint `/v1/lms/*`, `/v1/cbt/*`, dan `/v1/global/*`.
   - Pastikan pemeriksaan TypeScript (`npm run build` / `nuxi typecheck`) bersih dengan **0 error**.
