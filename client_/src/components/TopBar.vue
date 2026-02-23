<script setup lang="ts">
import { computed, ref } from 'vue'
import { Code2, Terminal, X } from 'lucide-vue-next'
import ThemeToggle from './ThemeToggle.vue'
import UserAvatar from './UserAvatar.vue'

interface UserInfo {
  socketId: string
  username: string
  color: string
}

interface Props {
  activeFileName: string
  users: Map<string, UserInfo>
  outputPaneVisible: boolean
  roomCode: string
  isHost: boolean
  hostId: string
  currentSocketId: string
}

interface Emits {
  (e: 'toggle-output'): void
  (e: 'kick-user', socketId: string): void
  (e: 'close-room'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userList = computed(() => Array.from(props.users.values()))
const visibleUsers = computed(() => userList.value.slice(0, 5))
const overflowCount = computed(() => Math.max(0, userList.value.length - 5))

const copiedRoomCode = ref(false)
function copyRoomCode() {
  const inviteUrl = `${window.location.origin}?room=${props.roomCode}`
  navigator.clipboard.writeText(inviteUrl)
  copiedRoomCode.value = true
  setTimeout(() => {
    copiedRoomCode.value = false
  }, 1500)
}

function confirmKickUser(socketId: string) {
  if (confirm('Are you sure you want to kick this user?')) {
    emit('kick-user', socketId)
  }
}

function confirmCloseRoom() {
  if (confirm('Are you sure you want to close the room? This will disconnect all users.')) {
    emit('close-room')
  }
}
</script>

<template>
  <div class="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
    <div class="flex h-12 items-center justify-between px-4">
      <!-- Left: Logo, room code chip, active file, output toggle -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <Code2 class="h-5 w-5 text-primary" />
          <span class="font-semibold">Monaco Collab</span>
        </div>

        <!-- Room code chip -->
        <button
          :class="[
            'rounded px-2 py-1 text-sm font-mono tracking-wide transition-colors',
            copiedRoomCode
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          ]"
          :title="copiedRoomCode ? 'Copied!' : 'Click to copy invite link'"
          @click="copyRoomCode"
        >
          {{ copiedRoomCode ? 'Copied!' : roomCode }}
        </button>

        <span class="text-sm text-muted-foreground">
          {{ activeFileName }}
        </span>

        <button
          :class="[
            'flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors',
            outputPaneVisible
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          ]"
          title="Toggle output pane"
          @click="emit('toggle-output')"
        >
          <Terminal :size="14" />
          <span>Output</span>
        </button>
      </div>

      <!-- Right: User avatars, close room, theme toggle -->
      <div class="flex items-center gap-3">
        <div v-if="userList.length > 0" class="flex items-center -space-x-2">
          <UserAvatar
            v-for="user in visibleUsers"
            :key="user.socketId"
            :user-name="user.username"
            :color="user.color"
            :is-host="user.socketId === hostId"
            :can-kick="isHost && user.socketId !== currentSocketId"
            @kick="confirmKickUser(user.socketId)"
          />
          <div
            v-if="overflowCount > 0"
            class="flex h-8 w-8 items-center justify-center rounded-full border-2 bg-muted text-xs font-medium"
          >
            +{{ overflowCount }}
          </div>
        </div>

        <!-- Close Room button (host only) -->
        <button
          v-if="isHost"
          class="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
          title="Close room"
          @click="confirmCloseRoom"
        >
          <X :size="14" />
          <span>Close Room</span>
        </button>

        <ThemeToggle />
      </div>
    </div>
  </div>
</template>
