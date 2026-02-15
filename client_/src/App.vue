<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDark } from '@vueuse/core'
import { io, Socket } from 'socket.io-client'
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

// State
const isConnected = ref(false)
const clientId = ref('')
const users = ref(new Map<string, UserInfo>())
const files = ref<EditorFile[]>([])
const activeFileId = ref<number | null>(null)

// Theme management
const isDark = useDark()
const monacoTheme = computed(() => isDark.value ? 'vs-dark' : 'vs-light')

// Socket.IO instance
let socket: Socket | null = null

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
  socket = io('http://localhost:3000')

  socket.on('connect', () => {
    if (!socket?.id) return
    console.log('Connected to server:', socket.id)
    isConnected.value = true
    clientId.value = socket.id

    // Add self to users
    users.value.set(socket.id, {
      socketId: socket.id,
      color: generateColorFromSocketId(socket.id)
    })
  })

  socket.on('disconnect', () => {
    console.log('Disconnected from server')
    isConnected.value = false
  })

  // File management events
  socket.on('editors_list', (editorsList: EditorFile[]) => {
    console.log('Received editors list:', editorsList)
    files.value = editorsList
    if (editorsList.length > 0 && !activeFileId.value && editorsList[0]) {
      activeFileId.value = editorsList[0].id
    }
  })

  socket.on('editor_added', ({ editor }: { editor: EditorFile }) => {
    console.log('Editor added:', editor)
    files.value.push(editor)
  })

  socket.on('editor_removed', ({ editorId }: { editorId: number }) => {
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
  socket.on('user_joined', ({ socketId }: { socketId: string }) => {
    console.log('User joined:', socketId)
    if (!users.value.has(socketId)) {
      users.value.set(socketId, {
        socketId,
        color: generateColorFromSocketId(socketId)
      })
    }
  })

  socket.on('user_left', ({ socketId }: { socketId: string }) => {
    console.log('User left:', socketId)
    users.value.delete(socketId)
  })
}

// File operations
const handleFileSelect = (fileId: number) => {
  if (socket && activeFileId.value !== null) {
    socket.emit('leave_editor', activeFileId.value)
  }

  activeFileId.value = fileId

  if (socket) {
    socket.emit('join_editor', fileId)

    // Update current user's file
    const currentUser = users.value.get(clientId.value)
    if (currentUser) {
      currentUser.currentFileId = fileId
    }
  }
}

const handleFileAdd = (name: string, language: string) => {
  if (!socket) return

  socket.emit('add_editor', { name, language })
}

const handleFileDelete = (fileId: number) => {
  if (!socket || files.value.length <= 1) return

  // Confirm deletion if file has content
  const file = files.value.find(f => f.id === fileId)
  if (file?.content && file.content.trim().length > 0) {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) {
      return
    }
  }

  socket.emit('remove_editor', { editorId: fileId })
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
