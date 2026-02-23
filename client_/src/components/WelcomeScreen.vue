<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Code2, Users, Zap, Plus, LogIn, AlertCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from './ThemeToggle.vue'

const props = defineProps<{ error?: string }>()

const emit = defineEmits<{
  'create-session': [{ mode: 'create' | 'join', username: string, roomCode?: string }]
}>()

const username = ref('')
const roomCode = ref('')
const activeTab = ref<'create' | 'join'>('create')
const localError = ref('')

const displayError = computed(() => localError.value || props.error || '')

onMounted(() => {
  // Restore saved username
  const saved = localStorage.getItem('collab_username')
  if (saved) username.value = saved

  // Pre-fill room code from URL query param
  const params = new URLSearchParams(window.location.search)
  const roomParam = params.get('room')
  if (roomParam) {
    roomCode.value = roomParam
    activeTab.value = 'join'
  }
})

const clearError = () => { localError.value = '' }
const handleUsernameInput = () => {
  clearError()
  if (username.value.trim()) localStorage.setItem('collab_username', username.value.trim())
}

const handleCreate = () => {
  if (!username.value.trim()) {
    localError.value = 'Please enter a username'
    return
  }
  localError.value = ''
  emit('create-session', { mode: 'create', username: username.value.trim() })
}

const handleJoin = () => {
  if (!username.value.trim()) {
    localError.value = 'Please enter a username'
    return
  }
  if (!roomCode.value.trim()) {
    localError.value = 'Please enter a room code'
    return
  }
  localError.value = ''
  emit('create-session', { mode: 'join', username: username.value.trim(), roomCode: roomCode.value.trim() })
}

const features = [
  {
    icon: Code2,
    title: 'Monaco Editor',
    description: "Powered by VS Code's editor"
  },
  {
    icon: Users,
    title: 'Real-time Collaboration',
    description: 'See changes instantly'
  },
  {
    icon: Zap,
    title: 'Live Cursors',
    description: 'Track collaborators in real-time'
  }
]
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <div class="absolute right-4 top-4">
      <ThemeToggle />
    </div>

    <Card class="w-full max-w-lg animate-enter">
      <CardHeader class="text-center pb-2">
        <CardTitle class="text-3xl font-bold">
          Collaborative Code Editor
        </CardTitle>
        <CardDescription class="text-base">
          Real-time editing powered by Monaco & Socket.IO
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-6">
        <!-- Feature list -->
        <div class="grid gap-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="flex items-start gap-3"
          >
            <component
              :is="feature.icon"
              class="h-5 w-5 mt-0.5 text-primary shrink-0"
            />
            <div>
              <h3 class="font-medium leading-none mb-1">{{ feature.title }}</h3>
              <p class="text-sm text-muted-foreground">{{ feature.description }}</p>
            </div>
          </div>
        </div>

        <div class="border-t border-border" />

        <!-- Shared username field -->
        <div class="space-y-2">
          <Label for="username">Username</Label>
          <Input
            id="username"
            v-model="username"
            placeholder="How others will see you"
            autocomplete="off"
            @input="handleUsernameInput"
            @keyup.enter="activeTab === 'create' ? handleCreate() : handleJoin()"
          />
        </div>

        <!-- VS Code-style tab panel -->
        <div class="rounded-md border border-border overflow-hidden">
          <!-- Tab strip -->
          <div class="flex border-b border-border bg-muted/40">
            <button
              @click="activeTab = 'create'; clearError()"
              :class="[
                'relative flex-1 px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                activeTab === 'create'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              ]"
            >
              <span class="flex items-center justify-center gap-2">
                <Plus class="h-3.5 w-3.5" />
                Create Room
              </span>
              <!-- Active top-edge indicator -->
              <span
                v-if="activeTab === 'create'"
                class="absolute inset-x-0 top-0 h-0.5 bg-primary"
              />
            </button>

            <div class="w-px bg-border self-stretch" />

            <button
              @click="activeTab = 'join'; clearError()"
              :class="[
                'relative flex-1 px-4 py-2.5 text-sm font-medium transition-colors duration-150',
                activeTab === 'join'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              ]"
            >
              <span class="flex items-center justify-center gap-2">
                <LogIn class="h-3.5 w-3.5" />
                Join Room
              </span>
              <!-- Active top-edge indicator -->
              <span
                v-if="activeTab === 'join'"
                class="absolute inset-x-0 top-0 h-0.5 bg-primary"
              />
            </button>
          </div>

          <!-- Tab content -->
          <div class="p-4">
            <!-- Create tab -->
            <div v-if="activeTab === 'create'" class="space-y-4">
              <p class="text-sm text-muted-foreground">
                Start a new session. Share the generated room code with collaborators to invite them.
              </p>
              <Button class="w-full" @click="handleCreate">
                <Plus class="mr-2 h-4 w-4" />
                Create Room
              </Button>
            </div>

            <!-- Join tab -->
            <div v-else class="space-y-4">
              <div class="space-y-2">
                <Label for="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  v-model="roomCode"
                  placeholder="Enter the room code"
                  class="font-mono tracking-wide"
                  autocomplete="off"
                  @input="clearError"
                  @keyup.enter="handleJoin"
                />
              </div>
              <Button class="w-full" @click="handleJoin">
                <LogIn class="mr-2 h-4 w-4" />
                Join Room
              </Button>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <p
          v-if="displayError"
          class="flex items-center justify-center gap-2 text-sm text-destructive"
        >
          <AlertCircle class="h-4 w-4 shrink-0" />
          {{ displayError }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-enter {
  animation: enter 0.35s ease-out both;
}
</style>
