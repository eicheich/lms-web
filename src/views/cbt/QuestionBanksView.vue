<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { CheckCircle2, FileQuestion, Pencil, Plus, Search, Trash2 } from 'lucide-vue-next'
import { apiRequest, isModuleLockedError, normalizePaginated } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import LockedModuleBanner from '@/components/common/LockedModuleBanner.vue'
import PaginationBar from '@/components/common/PaginationBar.vue'
import type { PaginatedResponse, Question, QuestionBank } from '@/types/api'

const authStore = useAuthStore()
const toast = useToast()

const banks = ref<QuestionBank[]>([])
const selectedBankId = ref('')
const questions = ref<Question[]>([])
const moduleLocked = ref(false)
const feedbackMsg = ref('')

// Bank search/filter/pagination
const bankSearch = ref('')
const bankPage = ref(1)
const bankTotal = ref(0)
const bankTotalPages = ref(1)
const editingBankId = ref<string | null>(null)

// Question search/pagination
const qSearch = ref('')
const qPage = ref(1)
const qTotal = ref(0)
const qTotalPages = ref(1)
const editingQuestionId = ref<string | null>(null)

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
    const raw = await apiRequest<PaginatedResponse<QuestionBank> | QuestionBank[]>({
      method: 'GET',
      url: '/cbt/question-banks',
      params: {
        search: bankSearch.value.trim() || undefined,
        page: bankPage.value,
        limit: 10,
      },
    })
    const res = normalizePaginated(raw)
    banks.value = res.items
    bankTotal.value = res.total
    bankTotalPages.value = res.totalPages || 1
    if (banks.value.length > 0 && !banks.value.some((b) => b.id === selectedBankId.value)) {
      selectedBankId.value = banks.value[0].id
      await loadQuestions(selectedBankId.value)
    } else if (banks.value.length === 0) {
      selectedBankId.value = ''
      questions.value = []
    }
  } catch (err) {
    if (isModuleLockedError(err)) {
      moduleLocked.value = true
    }
  }
}

async function loadQuestions(bankId: string) {
  if (!bankId) return
  const raw = await apiRequest<PaginatedResponse<Question> | Question[]>({
    method: 'GET',
    url: `/cbt/question-banks/${bankId}/questions`,
    params: {
      search: qSearch.value.trim() || undefined,
      page: qPage.value,
      limit: 15,
    },
  })
  const res = normalizePaginated(raw)
  questions.value = res.items
  qTotal.value = res.total
  qTotalPages.value = res.totalPages || 1
}

watch(bankSearch, () => {
  bankPage.value = 1
  loadBanks()
})
watch(bankPage, loadBanks)

watch(selectedBankId, (id) => {
  qPage.value = 1
  loadQuestions(id)
})

watch(qSearch, () => {
  qPage.value = 1
  loadQuestions(selectedBankId.value)
})
watch(qPage, () => loadQuestions(selectedBankId.value))

function startEditBank(qb: QuestionBank) {
  editingBankId.value = qb.id
  newBank.title = qb.title
  newBank.subject = qb.subject
  newBank.gradeLevel = qb.gradeLevel
}

function cancelEditBank() {
  editingBankId.value = null
  newBank.title = ''
}

async function createBank() {
  if (editingBankId.value) {
    await apiRequest<QuestionBank>({
      method: 'PUT',
      url: `/cbt/question-banks/${editingBankId.value}`,
      data: { ...newBank },
    })
    editingBankId.value = null
    newBank.title = ''
    feedbackMsg.value = 'Bank Soal berhasil diperbarui!'
    await loadBanks()
    return
  }
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

async function deleteBank(qb: QuestionBank) {
  if (!confirm(`Hapus Bank Soal "${qb.title}"?`)) return
  try {
    await apiRequest({ method: 'DELETE', url: `/cbt/question-banks/${qb.id}` })
    toast.success('Bank Soal Dihapus', qb.title)
    await loadBanks()
  } catch {
    toast.error('Gagal menghapus bank soal')
  }
}

function startEditQuestion(q: Question) {
  editingQuestionId.value = q.id
  newQuestion.prompt = q.prompt
  newQuestion.optionA = q.options.find((o) => o.key === 'A')?.text || ''
  newQuestion.optionB = q.options.find((o) => o.key === 'B')?.text || ''
  newQuestion.optionC = q.options.find((o) => o.key === 'C')?.text || ''
  newQuestion.optionD = q.options.find((o) => o.key === 'D')?.text || ''
  newQuestion.answerKey = q.answerKey || 'A'
  newQuestion.scoreWeight = q.scoreWeight
}

function cancelEditQuestion() {
  editingQuestionId.value = null
  newQuestion.prompt = ''
  newQuestion.optionA = ''
  newQuestion.optionB = ''
  newQuestion.optionC = ''
  newQuestion.optionD = ''
}

async function createQuestion() {
  if (!selectedBankId.value) return
  const payload = {
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
  }
  if (editingQuestionId.value) {
    await apiRequest<Question>({
      method: 'PUT',
      url: `/cbt/questions/${editingQuestionId.value}`,
      data: payload,
    })
    editingQuestionId.value = null
    feedbackMsg.value = 'Butir soal berhasil diperbarui!'
  } else {
    await apiRequest<Question>({
      method: 'POST',
      url: `/cbt/question-banks/${selectedBankId.value}/questions`,
      data: payload,
    })
    feedbackMsg.value = 'Butir soal berhasil ditambahkan ke Bank Soal!'
  }
  cancelEditQuestion()
  await loadQuestions(selectedBankId.value)
  await loadBanks()
}

async function deleteQuestion(q: Question) {
  if (!confirm('Hapus butir soal ini?')) return
  try {
    await apiRequest({ method: 'DELETE', url: `/cbt/questions/${q.id}` })
    toast.success('Soal Dihapus')
    await loadQuestions(selectedBankId.value)
    await loadBanks()
  } catch {
    toast.error('Gagal menghapus soal')
  }
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
          <div class="relative">
            <Search class="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="bankSearch"
              type="search"
              placeholder="Cari bank soal..."
              class="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-1.5 text-xs"
            />
          </div>
          <div class="space-y-2">
            <div
              v-for="qb in banks"
              :key="qb.id"
              @click="selectedBankId = qb.id"
              :class="[
                'w-full text-left rounded-xl p-3 border transition cursor-pointer',
                selectedBankId === qb.id
                  ? 'border-primary bg-primary-50'
                  : 'border-slate-100 hover:bg-slate-50',
              ]"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-bold text-slate-900">{{ qb.title }}</p>
                <div v-if="authStore.isTeacherOrAdmin" class="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    @click.stop="startEditBank(qb)"
                    class="rounded p-1 text-slate-400 hover:bg-white hover:text-primary"
                    title="Edit Bank Soal"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    @click.stop="deleteBank(qb)"
                    class="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600"
                    title="Hapus Bank Soal"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ qb.subject }} • {{ qb.gradeLevel }} • {{ qb.questionCount ?? 0 }} Soal
              </p>
            </div>
          </div>
          <PaginationBar
            :page="bankPage"
            :total-pages="bankTotalPages"
            :total="bankTotal"
            :limit="10"
            @update:page="bankPage = $event"
          />
        </div>

        <div v-if="authStore.isTeacherOrAdmin" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">
              {{ editingBankId ? 'Edit Bank Soal' : 'Buat Bank Soal Baru' }}
            </h3>
            <button
              v-if="editingBankId"
              type="button"
              @click="cancelEditBank"
              class="text-xs font-semibold text-slate-500 hover:underline"
            >
              Batal
            </button>
          </div>
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
              {{ editingBankId ? 'Simpan Perubahan' : 'Tambah Bank Soal' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Right: Questions & Add Question Form -->
      <div class="lg:col-span-8 space-y-6">
        <div v-if="authStore.isTeacherOrAdmin" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-900">
              {{ editingQuestionId ? 'Edit Butir Soal' : 'Tambah Butir Soal Pilihan Ganda' }}
            </h3>
            <button
              v-if="editingQuestionId"
              type="button"
              @click="cancelEditQuestion"
              class="text-xs font-semibold text-slate-500 hover:underline"
            >
              Batal
            </button>
          </div>
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
          <div class="relative">
            <Search class="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="qSearch"
              type="search"
              placeholder="Cari teks soal..."
              class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <div
            v-for="(q, idx) in questions"
            :key="q.id"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2.5"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-primary">Soal #{{ (qPage - 1) * 15 + idx + 1 }} • Bobot {{ q.scoreWeight }}</span>
              <div class="flex items-center gap-1.5">
                <span class="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                  Kunci: {{ q.answerKey }}
                </span>
                <button
                  v-if="authStore.isTeacherOrAdmin"
                  type="button"
                  @click="startEditQuestion(q)"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary"
                  title="Edit Soal"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </button>
                <button
                  v-if="authStore.isTeacherOrAdmin"
                  type="button"
                  @click="deleteQuestion(q)"
                  class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  title="Hapus Soal"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
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
          <PaginationBar
            :page="qPage"
            :total-pages="qTotalPages"
            :total="qTotal"
            :limit="15"
            @update:page="qPage = $event"
          />
        </div>
      </div>
    </div>
  </div>
</template>
