<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { CheckCircle2, FileQuestion, Plus } from 'lucide-vue-next'
import { apiRequest, isModuleLockedError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import type { Question, QuestionBank } from '@/types/api'

const authStore = useAuthStore()

const banks = ref<QuestionBank[]>([])
const selectedBankId = ref('')
const questions = ref<Question[]>([])
const moduleLocked = ref(false)
const feedbackMsg = ref('')

const newBank = reactive({
  title: '',
  subject: 'Matematika',
  gradeLevel: 'Kelas 12',
})

const newQuestion = reactive({
  prompt: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  answerKey: 'A',
  scoreWeight: 25,
})

async function loadBanks() {
  moduleLocked.value = false
  try {
    banks.value = await apiRequest<QuestionBank[]>({ method: 'GET', url: '/cbt/question-banks' })
    if (banks.value.length > 0 && !selectedBankId.value) {
      selectedBankId.value = banks.value[0].id
      await loadQuestions(selectedBankId.value)
    }
  } catch (err) {
    if (isModuleLockedError(err)) {
      moduleLocked.value = true
    }
  }
}

async function loadQuestions(bankId: string) {
  if (!bankId) return
  questions.value = await apiRequest<Question[]>({
    method: 'GET',
    url: `/cbt/question-banks/${bankId}/questions`,
  })
}

watch(selectedBankId, (id) => {
  loadQuestions(id)
})

async function createBank() {
  const created = await apiRequest<QuestionBank>({
    method: 'POST',
    url: '/cbt/question-banks',
    data: { ...newBank },
  })
  newBank.title = ''
  feedbackMsg.value = 'Bank Soal baru berhasil dibuat!'
  await loadBanks()
  selectedBankId.value = created.id
}

async function createQuestion() {
  if (!selectedBankId.value) return
  await apiRequest<Question>({
    method: 'POST',
    url: `/cbt/question-banks/${selectedBankId.value}/questions`,
    data: {
      questionType: 'MULTIPLE_CHOICE',
      prompt: newQuestion.prompt,
      options: [
        { key: 'A', text: newQuestion.optionA },
        { key: 'B', text: newQuestion.optionB },
        { key: 'C', text: newQuestion.optionC },
        { key: 'D', text: newQuestion.optionD },
      ],
      answerKey: newQuestion.answerKey,
      scoreWeight: Number(newQuestion.scoreWeight),
    },
  })
  newQuestion.prompt = ''
  newQuestion.optionA = ''
  newQuestion.optionB = ''
  newQuestion.optionC = ''
  newQuestion.optionD = ''
  feedbackMsg.value = 'Butir soal berhasil ditambahkan ke Bank Soal!'
  await loadQuestions(selectedBankId.value)
  await loadBanks()
}

onMounted(() => {
  loadBanks()
})
</script>

<template>
  <LockedModuleBanner v-if="moduleLocked" module-key="CBT_GRADING" />

  <div v-else class="space-y-6">
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

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left: Bank List & Create Bank -->
      <div class="lg:col-span-4 space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileQuestion class="h-4 w-4 text-primary" />
            Daftar Bank Soal
          </h2>
          <div class="space-y-2">
            <button
              v-for="qb in banks"
              :key="qb.id"
              type="button"
              @click="selectedBankId = qb.id"
              :class="[
                'w-full text-left rounded-xl p-3 border transition',
                selectedBankId === qb.id
                  ? 'border-primary bg-primary-50'
                  : 'border-slate-100 hover:bg-slate-50',
              ]"
            >
              <p class="text-sm font-bold text-slate-900">{{ qb.title }}</p>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ qb.subject }} • {{ qb.gradeLevel }} • {{ qb.questionCount ?? 0 }} Soal
              </p>
            </button>
          </div>
        </div>

        <div v-if="authStore.isTeacher" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h3 class="text-sm font-bold text-slate-900">Buat Bank Soal Baru</h3>
          <form @submit.prevent="createBank" class="space-y-2.5">
            <input
              v-model="newBank.title"
              required
              type="text"
              placeholder="Judul Bank Soal"
              class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div class="grid grid-cols-2 gap-2">
              <input v-model="newBank.subject" required type="text" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input v-model="newBank.gradeLevel" required type="text" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <button
              type="submit"
              class="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              <Plus class="h-4 w-4" />
              Tambah Bank Soal
            </button>
          </form>
        </div>
      </div>

      <!-- Right: Questions & Add Question Form -->
      <div class="lg:col-span-8 space-y-6">
        <div v-if="authStore.isTeacher" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 class="text-sm font-bold text-slate-900">Tambah Butir Soal Pilihan Ganda</h3>
          <form @submit.prevent="createQuestion" class="space-y-3">
            <textarea
              v-model="newQuestion.prompt"
              required
              rows="2"
              placeholder="Tulis pertanyaan soal di sini..."
              class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
            />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input v-model="newQuestion.optionA" required placeholder="Opsi A" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input v-model="newQuestion.optionB" required placeholder="Opsi B" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input v-model="newQuestion.optionC" required placeholder="Opsi C" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input v-model="newQuestion.optionD" required placeholder="Opsi D" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <label class="text-xs font-semibold text-slate-600">Kunci Jawaban:</label>
                <select v-model="newQuestion.answerKey" class="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs font-semibold text-slate-600">Bobot:</label>
                <input v-model.number="newQuestion.scoreWeight" type="number" class="w-20 rounded-xl border border-slate-200 px-3 py-1.5 text-sm" />
              </div>
              <button
                type="submit"
                class="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                <Plus class="h-4 w-4" />
                Simpan Soal
              </button>
            </div>
          </form>
        </div>

        <div class="space-y-3">
          <div
            v-for="(q, idx) in questions"
            :key="q.id"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2.5"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-primary">Soal #{{ idx + 1 }} • Bobot {{ q.scoreWeight }}</span>
              <span class="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                Kunci: {{ q.answerKey }}
              </span>
            </div>
            <p class="text-sm font-semibold text-slate-900">{{ q.prompt }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <div
                v-for="opt in q.options"
                :key="opt.key"
                :class="[
                  'rounded-lg px-3 py-2 border',
                  opt.key === q.answerKey ? 'border-emerald-300 bg-emerald-50/70 font-semibold text-emerald-900' : 'border-slate-100 bg-slate-50',
                ]"
              >
                <span class="font-bold mr-1.5">{{ opt.key }}.</span>{{ opt.text }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
