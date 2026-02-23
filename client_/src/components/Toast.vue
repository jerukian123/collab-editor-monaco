<script setup lang="ts">
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-vue-next'
import type { Toast, ToastType } from '@/composables/useToast'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ close: [] }>()

const config: Record<ToastType, { icon: typeof Info; border: string; iconClass: string }> = {
  info:    { icon: Info,          border: 'border-l-blue-500',   iconClass: 'text-blue-500' },
  success: { icon: CheckCircle,   border: 'border-l-green-500',  iconClass: 'text-green-500' },
  warning: { icon: AlertTriangle, border: 'border-l-yellow-500', iconClass: 'text-yellow-500' },
  error:   { icon: XCircle,       border: 'border-l-red-500',    iconClass: 'text-red-500' },
}
</script>

<template>
  <div
    :class="[
      'flex items-start gap-3 rounded-lg border border-border border-l-4 bg-background px-4 py-3 shadow-lg w-80',
      config[toast.type].border
    ]"
  >
    <component
      :is="config[toast.type].icon"
      :class="['mt-0.5 h-4 w-4 shrink-0', config[toast.type].iconClass]"
    />
    <p class="flex-1 text-sm leading-snug">{{ toast.message }}</p>
    <button
      class="ml-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      @click="emit('close')"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
