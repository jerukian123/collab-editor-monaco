<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDark } from '@vueuse/core'
import { useSocket } from './composables/useSocket'
import WelcomeScreen from './components/WelcomeScreen.vue'
import EditorShell from './components/EditorShell.vue'

interface EditorFile {
  id: number
  name: string
  language: string
  content?: string
}

interface UserInfo {
  socketId: string
  color: string
  currentFileId?: number
}

// Socket connection (singleton)
const { clientId, isConnected, connect, emit, on } = useSocket()

// State
const users = ref(new Map<string, UserInfo>())
const files = ref<EditorFile[]>([])
const activeFileId = ref<number | null>(null)

// Theme management
const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
})
const monacoTheme = computed(() => isDark.value ? 'vs-dark' : 'vs-light')

// Debug: Log initial theme state
console.log('[App.vue] Initial isDark:', isDark.value)
console.log('[App.vue] HTML element class:', document.documentElement.className)

// Generate color from socket ID
const generateColorFromSocketId = (socketId: string): string => {
  let hash = 0
  for (let i = 0; i < socketId.length; i++) {
    hash = socketId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  const lightness = isDark.value ? 60 : 40
  return `hsl(${hue}, 70%, ${lightness}%)`
}

// Start session (connect to Socket.IO)
const startSession = () => {
  console.log('[App.vue] startSession() called')

  // Connect using singleton pattern
  const socketInstance = connect()
  console.log('[App.vue] connect() returned:', socketInstance ? 'socket instance' : 'null')
  if (!socketInstance) return

  // Handle initial connection - add self to users when we receive our ID
  on('connected', (id: string) => {
    console.log('Connected to server:', id)

    // Add self to users
    users.value.set(id, {
      socketId: id,
      color: generateColorFromSocketId(id)
    })
  })

  // File management events
  on('editors_list', (editorsList: EditorFile[]) => {
    console.log('Received editors list:', editorsList)
    files.value = editorsList
    if (editorsList.length > 0 && !activeFileId.value && editorsList[0]) {
      activeFileId.value = editorsList[0].id
      // Join the initial file's editor room so we receive execution results
      emit('join_editor', editorsList[0].id)
    }
  })

  on('editor_added', (editor: EditorFile) => {
    console.log('Editor added:', editor)
    files.value.push(editor)
  })

  on('editor_removed', (editorId: number) => {
    console.log('Editor removed:', editorId)
    const index = files.value.findIndex(f => f.id === editorId)
    if (index !== -1) {
      files.value.splice(index, 1)

      // Switch to first file if deleted file was active
      if (activeFileId.value === editorId && files.value.length > 0 && files.value[0]) {
        activeFileId.value = files.value[0].id
      }
    }
  })

  // User presence events
  on('user_joined', (socketId: string) => {
    console.log('[DEBUG] user_joined event received with socketId:', socketId)
    console.log('[DEBUG] My clientId is:', clientId.value)
    console.log('[DEBUG] Current users:', Array.from(users.value.keys()))
    if (!users.value.has(socketId)) {
      users.value.set(socketId, {
        socketId,
        color: generateColorFromSocketId(socketId)
      })
      console.log('[DEBUG] Added new user:', socketId)
    }
  })

  on('user_left', ({ socketId }: { socketId: string }) => {
    console.log('User left:', socketId)
    users.value.delete(socketId)
  })

  on('room_users', (clients : string[]) => {
    // Sync users map with current room users
    const newUsersMap = new Map<string, UserInfo>()
    clients.forEach(clientId => {
      newUsersMap.set(clientId, {
        socketId: clientId,
        color: generateColorFromSocketId(clientId)
      })
    })
    users.value = newUsersMap
  })
}

// File operations
const handleFileSelect = (fileId: number) => {
  if (activeFileId.value !== null) {
    emit('leave_editor', activeFileId.value)
  }

  activeFileId.value = fileId
  emit('join_editor', fileId)

  // Update current user's file
  const currentUser = users.value.get(clientId.value)
  if (currentUser) {
    currentUser.currentFileId = fileId
  }
}

const handleFileAdd = (name: string, language: string) => {
  emit('add_editor', { name, language })
}

const handleFileDelete = (fileId: number) => {
  console.log('Attempting to delete file with ID:', fileId)
  if (files.value.length <= 1) return

  // Confirm deletion if file has content
  const file = files.value.find(f => f.id === fileId)
  if (file?.content && file.content.trim().length > 0) {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) {
      return
    }
  }

  emit('remove_editor', fileId)
}

const handleContentChange = (fileId: number, content: string) => {
  // Update local cache
  const file = files.value.find(f => f.id === fileId)
  if (file) {
    file.content = content
  }
}
</script>

<template>
  <div>
    <WelcomeScreen
      v-if="!isConnected"
      @start-session="startSession"
    />

    <EditorShell
      v-else
      :files="files"
      :active-file-id="activeFileId"
      :users="users"
      :theme="monacoTheme"
      @file-select="handleFileSelect"
      @file-add="handleFileAdd"
      @file-delete="handleFileDelete"
      @content-change="handleContentChange"
    />
  </div>
</template>
