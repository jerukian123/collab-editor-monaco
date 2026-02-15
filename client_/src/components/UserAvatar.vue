<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  socketId: string
  color: string
}

const props = defineProps<Props>()

// Generate fallback text from socket ID (first 2 chars)
const fallbackText = computed(() => {
  return props.socketId.substring(0, 2).toUpperCase()
})
</script>

<template>
  <Avatar
    class="h-8 w-8 border-2"
    :style="{
      backgroundColor: color,
      borderColor: 'hsl(var(--border))'
    }"
    :title="socketId"
  >
    <AvatarFallback
      class="text-xs font-semibold text-white"
      :style="{ backgroundColor: color }"
    >
      {{ fallbackText }}
    </AvatarFallback>
  </Avatar>
</template>
