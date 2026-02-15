<script setup lang="ts">
import { watch } from 'vue'
import { useDark, useToggle } from '@vueuse/core'
import { Moon, Sun } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
})
const toggleDark = useToggle(isDark)

// Debug: Watch theme changes
watch(isDark, (newValue) => {
  console.log('[ThemeToggle] isDark changed to:', newValue)
  console.log('[ThemeToggle] HTML classList:', document.documentElement.classList.toString())
  console.log('[ThemeToggle] Has .dark class:', document.documentElement.classList.contains('dark'))
})
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    @click="toggleDark()"
    aria-label="Toggle theme"
  >
    <Sun v-if="!isDark" class="h-5 w-5" />
    <Moon v-else class="h-5 w-5" />
  </Button>
</template>
