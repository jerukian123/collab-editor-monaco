import { ref } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

// Module-level state — shared across all component instances (singleton)
const toasts = ref<Toast[]>([])

let _idCounter = 0

export function useToast() {
  const addToast = (options: { message: string; type: ToastType; duration?: number }) => {
    const id = String(++_idCounter)
    const toast: Toast = {
      id,
      message: options.message,
      type: options.type,
      duration: options.duration ?? 4000,
    }
    toasts.value.push(toast)
    setTimeout(() => removeToast(id), toast.duration)
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, addToast, removeToast }
}
