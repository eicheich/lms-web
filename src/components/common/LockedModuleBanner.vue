<script setup lang="ts">
import { Lock, Sparkles, ArrowUpRight } from 'lucide-vue-next'
import type { ModuleKey } from '@/types/api'

const props = defineProps<{
  moduleKey: ModuleKey
  message?: string
}>()

const moduleLabels: Record<ModuleKey, { title: string; desc: string }> = {
  LMS: {
    title: 'Modul Learning Management System (LMS)',
    desc: 'Sekolah Anda saat ini belum mengaktifkan lisensi modul LMS (Kursus, Materi, Tugas, & Penilaian). Hubungi Admin Platform untuk mengaktifkan paket LMS.',
  },
  CBT_GRADING: {
    title: 'Modul CBT & Rapor Akademik',
    desc: 'Sekolah Anda saat ini belum mengaktifkan lisensi modul Computer-Based Test (Bank Soal, Ujian Online, & Finalisasi Rapor). Hubungi Admin Platform untuk upgrade paket.',
  },
}
</script>

<template>
  <div class="mx-auto max-w-2xl my-12 rounded-2xl border border-amber-200 bg-white p-8 shadow-sm text-center">
    <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
      <Lock class="h-8 w-8" />
    </div>

    <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 mb-3">
      <Sparkles class="h-3.5 w-3.5" />
      Fitur Belum Tersedia pada Paket Sekolah
    </span>

    <h2 class="text-xl font-bold text-slate-900 mb-2">
      {{ moduleLabels[props.moduleKey].title }} Belum Aktif
    </h2>

    <p class="text-sm text-slate-600 leading-relaxed mb-6">
      {{ props.message || moduleLabels[props.moduleKey].desc }}
    </p>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <router-link
        to="/"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
      >
        Kembali ke Beranda
      </router-link>
      <router-link
        to="/global"
        class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
      >
        Buka Global Hub
        <ArrowUpRight class="h-4 w-4" />
      </router-link>
    </div>
  </div>
</template>
