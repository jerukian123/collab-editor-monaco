<script setup lang="ts">
import { computed } from 'vue'
import { Code2, Terminal } from 'lucide-vue-next'
import ThemeToggle from './ThemeToggle.vue'
import UserAvatar from './UserAvatar.vue'

interface UserInfo {
  socketId: string
  color: string
}

interface Props {
  activeFileName: string
  users: Map<string, UserInfo>
  outputPaneVisible: boolean
}

interface Emits {
  (e: 'toggle-output'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userList = computed(() => Array.from(props.users.values()))
const visibleUsers = computed(() => userList.value.slice(0, 5))
const overflowCount = computed(() => Math.max(0, userList.value.length - 5))
</script>

<template>
  <div class="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
    <div class="flex h-12 items-center justify-between px-4">
      <!-- Left: Logo and active file -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Code2 class="h-5 w-5 text-primary" />
          <span class="font-semibold">Monaco Collab</span>
        </div>
        <span class="text-sm text-muted-foreground">
          {{ activeFileName }}
        </span>

        <button
          :class="[
            'flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors',
            outputPaneVisible
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          ]"
          title="Toggle output pane"
          @click="emit('toggle-output')"
        >
          <Terminal :size="14" />
          <span>Output</span>
        </button>
      </div>

      <!-- Right: User avatars and theme toggle -->
      <div class="flex items-center gap-3">
        <div v-if="userList.length > 0" class="flex items-center -space-x-2">
          <UserAvatar
            v-for="user in visibleUsers"
            :key="user.socketId"
            :socket-id="user.socketId"
            :color="user.color"
          />
          <div
            v-if="overflowCount > 0"
            class="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-muted text-xs font-medium"
          >
            +{{ overflowCount }}
          </div>
        </div>
        <ThemeToggle />
      </div>
    </div>
  </div>
</template>
