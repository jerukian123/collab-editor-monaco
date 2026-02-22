<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  userName: string
  color: string
  isHost?: boolean
  canKick?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ kick: [] }>()

const fallbackText = computed(() => {
  return props.userName.substring(0, 2).toUpperCase()
})
</script>

<template>
  <div class="relative group">
    <Avatar
      class="h-8 w-8 border-2"
      :style="{
        backgroundColor: color,
        borderColor: 'hsl(var(--border))'
      }"
      :title="userName"
    >
      <AvatarFallback
        class="text-xs font-semibold text-white"
        :style="{ backgroundColor: color }"
      >
        {{ fallbackText }}
      </AvatarFallback>
    </Avatar>

    <!-- Crown overlay for host -->
    <span
      v-if="isHost"
      class="absolute -top-1 -right-1 text-yellow-400 text-xs leading-none pointer-events-none"
    >★</span>

    <!-- Kick button overlay on hover -->
    <button
      v-if="canKick"
      class="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
      @click.stop="emit('kick')"
    >✕</button>
  </div>
</template>
