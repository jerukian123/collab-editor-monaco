<script setup lang="ts">
import { computed } from 'vue'
import { Code2 } from 'lucide-vue-next'
import ThemeToggle from './ThemeToggle.vue'
import UserAvatar from './UserAvatar.vue'

interface UserInfo {
  socketId: string
  color: string
}

interface Props {
  activeFileName: string
  users: Map<string, UserInfo>
}

const props = defineProps<Props>()

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
