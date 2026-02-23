<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import Toast from './Toast.vue'

const { toasts, removeToast } = useToast()
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    <TransitionGroup name="toast" tag="div" class="flex flex-col gap-2">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto"
      >
        <Toast :toast="toast" @close="removeToast(toast.id)" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.25s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(2rem);
}
</style>
