import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  title: string
  message?: string
}

const toasts = ref<ToastItem[]>([])
let nextId = 1

export function useToast() {
  function show(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = nextId++
    toasts.value.push({ id, type, title, message })
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function success(title: string, message?: string) {
    show('success', title, message)
  }

  function error(title: string, message?: string) {
    show('error', title, message, 5500)
  }

  function info(title: string, message?: string) {
    show('info', title, message)
  }

  return {
    toasts,
    dismiss,
    success,
    error,
    info,
  }
}
