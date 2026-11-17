<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Flag, Send } from 'lucide-vue-next'
import { apiRequest } from '@/services/api'
import { useToast } from '@/composables/useToast'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SkeletonCard from '@/components/common/SkeletonCard.vue'
import type { Question, StartCbtAttemptResponse, SubmitCbtAttemptResponse } from '@/types/api'

const route = useRoute()
const toast = useToast()
const examId = route.params.id as string
const draftStorageKey = `aliman_cbt_draft_${examId}`

const attempt = ref<StartCbtAttemptResponse | null>(null)
const questions = ref<Question[]>([])
const currentIndex = ref(0)
const answers = ref<Record<string, string>>({})
const flagged = ref<Record<string, boolean>>({})
const remainingSeconds = ref(3600)
const result = ref<SubmitCbtAttemptResponse | null>(null)
const loading = ref(true)
const submitting = ref(false)
const showConfirmSubmit = ref(false)

let timerInterval: ReturnType<typeof setInterval> | null = null

const currentQuestion = computed(() => questions.value[currentIndex.value])
const answeredCount = computed(() => Object.keys(answers.value).length)
const flaggedCount = computed(() => Object.values(flagged.value).filter(Boolean).length)
const unansweredCount = computed(() => Math.max(0, questions.value.length - answeredCount.value))
const isCriticalTime = computed(() => remainingSeconds.value <= 300)
const computedResultScore = computed(() => result.value?.finalScore ?? result.value?.score ?? 0)
const isPassedResult = computed(() => result.value?.passed ?? computedResultScore.value >= 75)

const formattedTimer = computed(() => {
  const mins = Math.floor(remainingSeconds.value / 60)
  const secs = remainingSeconds.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

watch(
  answers,
  (val) => {
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify(val))
    } catch {
      // ignore storage quota errors
    }
  },
  { deep: true },
)

function handleKeydown(e: KeyboardEvent) {
  if (result.value || showConfirmSubmit.value) return
  if (e.key === 'ArrowRight' && currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
  } else if (e.key === 'ArrowLeft' && currentIndex.value > 0) {
    currentIndex.value--
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  try {
    const savedDraft = sessionStorage.getItem(draftStorageKey)
    if (savedDraft) {
      answers.value = JSON.parse(savedDraft) as Record<string, string>
    }
  } catch {
    // ignore
  }

  try {
    const startRes = await apiRequest<StartCbtAttemptResponse & { id?: string }>({
      method: 'POST',
      url: `/cbt/exams/${examId}/start`,
    })
    const attemptId = startRes.attemptId || startRes.id || ''
    let loadedQuestions = startRes.questions ?? []
    let durationMin = 60

    if (loadedQuestions.length === 0) {
      const detailRes = await apiRequest<{ exam?: { durationMinutes?: number }; questions?: Question[]; durationMinutes?: number }>({
        method: 'GET',
        url: `/cbt/exams/${examId}`,
      })
      loadedQuestions = detailRes.questions ?? []
      durationMin = detailRes.exam?.durationMinutes || detailRes.durationMinutes || 60
    }

    attempt.value = { ...startRes, attemptId, questions: loadedQuestions }
    questions.value = loadedQuestions

    const diffSec = startRes.expiresAt
      ? Math.max(60, Math.floor((new Date(startRes.expiresAt).getTime() - Date.now()) / 1000))
      : durationMin * 60
    remainingSeconds.value = diffSec

    timerInterval = setInterval(() => {
      if (remainingSeconds.value > 0) {
        remainingSeconds.value -= 1
      }
    }, 1000)
  } catch (err) {
    toast.error(
      'Gagal memulai sesi ujian',
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Pastikan jadwal ujian sedang aktif.',
    )
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (timerInterval) clearInterval(timerInterval)
})

function selectOption(qId: string, key: string) {
  answers.value = { ...answers.value, [qId]: key }
}

function toggleFlag(qId: string) {
  flagged.value = { ...flagged.value, [qId]: !flagged.value[qId] }
}

async function submitExam() {
  if (!attempt.value) return
  submitting.value = true
  try {
    result.value = await apiRequest<SubmitCbtAttemptResponse>({
      method: 'POST',
      url: `/cbt/attempts/${attempt.value.attemptId}/submit`,
      data: { answers: answers.value },
    })
    sessionStorage.removeItem(draftStorageKey)
    showConfirmSubmit.value = false
    if (timerInterval) clearInterval(timerInterval)
    toast.success('Ujian berhasil dikumpulkan!')
  } catch {
    toast.error('Gagal mengumpulkan jawaban ujian. Coba lagi.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <SkeletonCard v-if="loading" :count="2" />

  <!-- Result Summary -->
  <div
    v-else-if="result"
    class="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-5"
  >
    <div
      :class="[
        'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl',
        isPassedResult ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
      ]"
    >
      <CheckCircle2 class="h-8 w-8" />
    </div>
    <div>
      <h2 class="text-2xl font-bold text-slate-900">Ujian CBT Selesai!</h2>
      <p class="text-sm text-slate-500 mt-1">Jawaban Anda telah tersimpan dan dinilai otomatis.</p>
    </div>
    <div class="rounded-2xl bg-slate-50 border border-slate-200 p-6">
      <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Nilai Akhir Anda</p>
      <p class="text-5xl font-extrabold text-primary mt-1">{{ computedResultScore }}</p>
      <p class="text-xs font-semibold mt-2" :class="isPassedResult ? 'text-emerald-600' : 'text-amber-600'">
        {{ isPassedResult ? 'LULUS (Memenuhi Passing Score)' : 'Perlu Remedial' }}
      </p>
    </div>
    <div class="flex justify-center gap-3">
      <router-link
        to="/cbt/exams"
        class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Daftar Ujian
      </router-link>
      <router-link
        to="/cbt/grades"
        class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Lihat Rapor & Nilai
      </router-link>
    </div>
  </div>

  <!-- Active Exam Runner -->
  <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <!-- Question Area -->
    <div class="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
      <div v-if="currentQuestion" class="space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-3">
            <span class="text-sm font-bold text-primary">
              Soal {{ currentIndex + 1 }} dari {{ questions.length }}
            </span>
            <span class="hidden sm:inline text-[11px] text-slate-400">
              Gunakan tombol ← / → untuk berpindah soal
            </span>
          </div>
          <button
            type="button"
            @click="toggleFlag(currentQuestion.id)"
            :class="[
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition',
              flagged[currentQuestion.id]
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            ]"
          >
            <Flag class="h-3.5 w-3.5" />
            Ragu-ragu
          </button>
        </div>

        <p class="text-base md:text-lg font-semibold text-slate-900 leading-relaxed">
          {{ currentQuestion.prompt }}
        </p>

        <div class="space-y-2.5">
          <button
            v-for="opt in currentQuestion.options"
            :key="opt.key"
            type="button"
            @click="selectOption(currentQuestion.id, opt.key)"
            :class="[
              'w-full text-left rounded-xl p-4 border transition flex items-center gap-3',
              answers[currentQuestion.id] === opt.key
                ? 'border-primary bg-primary-50 text-slate-900 font-semibold ring-1 ring-primary'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700',
            ]"
          >
            <span
              :class="[
                'h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                answers[currentQuestion.id] === opt.key
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-700',
              ]"
            >
              {{ opt.key }}
            </span>
            <span class="text-sm">{{ opt.text }}</span>
          </button>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          :disabled="currentIndex === 0"
          @click="currentIndex--"
          class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
        >
          <ArrowLeft class="h-4 w-4" />
          Sebelumnya
        </button>

        <button
          v-if="currentIndex < questions.length - 1"
          type="button"
          @click="currentIndex++"
          class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          Selanjutnya
          <ArrowRight class="h-4 w-4" />
        </button>

        <button
          v-else
          type="button"
          @click="showConfirmSubmit = true"
          class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Send class="h-4 w-4" />
          Kumpulkan Ujian
        </button>
      </div>
    </div>

    <!-- Navigation & Timer Panel -->
    <div class="lg:col-span-4 space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div
          :class="[
            'flex items-center justify-between rounded-xl p-3 border',
            isCriticalTime
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-slate-50 border-slate-100',
          ]"
        >
          <span class="text-xs font-bold uppercase tracking-wider">Sisa Waktu</span>
          <span
            :class="[
              'inline-flex items-center gap-1.5 font-mono text-lg font-extrabold',
              isCriticalTime ? 'text-red-600 animate-pulse' : 'text-primary',
            ]"
          >
            <Clock class="h-4 w-4" />
            {{ formattedTimer }}
          </span>
        </div>

        <div class="pt-1">
          <p class="text-xs font-bold text-slate-700 mb-3">
            Navigasi Soal ({{ answeredCount }}/{{ questions.length }} Terjawab)
          </p>
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="(q, idx) in questions"
              :key="q.id"
              type="button"
              @click="currentIndex = idx"
              :class="[
                'h-10 rounded-xl text-xs font-bold border transition',
                currentIndex === idx ? 'ring-2 ring-primary border-primary' : '',
                flagged[q.id]
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : answers[q.id]
                    ? 'bg-primary text-white border-primary'
                    : 'bg-slate-50 border-slate-200 text-slate-600',
              ]"
            >
              {{ idx + 1 }}
            </button>
          </div>
        </div>

        <button
          type="button"
          @click="showConfirmSubmit = true"
          class="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
        >
          Selesai & Kumpulkan Sekarang
        </button>
      </div>
    </div>

    <ConfirmDialog
      :open="showConfirmSubmit"
      title="Kumpulkan Jawaban Ujian?"
      description="Pastikan seluruh jawaban telah diperiksa. Setelah dikumpulkan, Anda tidak dapat mengubah jawaban kembali."
      confirm-text="Ya, Kumpulkan Sekarang"
      variant="success"
      :loading="submitting"
      @cancel="showConfirmSubmit = false"
      @confirm="submitExam"
    >
      <div class="rounded-xl bg-slate-50 border border-slate-200 p-3.5 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p class="font-bold text-emerald-600 text-base">{{ answeredCount }}</p>
          <p class="text-slate-500">Terjawab</p>
        </div>
        <div>
          <p class="font-bold text-amber-600 text-base">{{ flaggedCount }}</p>
          <p class="text-slate-500">Ragu-ragu</p>
        </div>
        <div>
          <p class="font-bold text-slate-700 text-base">{{ unansweredCount }}</p>
          <p class="text-slate-500">Belum Diisi</p>
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>
