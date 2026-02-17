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
  username: string
  color: string
  currentFileId?: number
}

// Socket connection (singleton)
const { clientId, connect, emit, on, off, disconnect } = useSocket()

// State
const users = ref(new Map<string, UserInfo>())
const files = ref<EditorFile[]>([])
const activeFileId = ref<number | null>(null)
const username = ref('')
const roomCode = ref('')
const isHost = ref(false)
const hostId = ref('')
const sessionError = ref('')
const isInRoom = ref(false)

// Theme management
const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
})
const monacoTheme = computed(() => isDark.value ? 'vs-dark' : 'vs-light')

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

const loadEditors = (editorsList: EditorFile[]) => {
  files.value = editorsList
  if (editorsList.length > 0 && !activeFileId.value && editorsList[0]) {
    activeFileId.value = editorsList[0].id
    emit('join_editor', editorsList[0].id)
  }
}

const resetToWelcome = () => {
  isInRoom.value = false
  roomCode.value = ''
  isHost.value = false
  hostId.value = ''
  users.value = new Map()
  files.value = []
  activeFileId.value = null
  disconnect()
}

const handleCreateSession = ({ mode, username: name, roomCode: code }: { mode: 'create' | 'join', username: string, roomCode?: string }) => {
  username.value = name
  sessionError.value = ''

  const socketInstance = connect()
  if (!socketInstance) return

  // Remove any previously registered handlers to prevent duplicates on retry
  // Note: do NOT off('connected') — that would remove the internal useSocket handler that sets clientId
  off('room_created')
  off('room_joined')
  off('room_error')
  off('kicked')
  off('room_closed')
  off('host_transferred')
  off('editor_added')
  off('editor_removed')
  off('user_joined')
  off('user_left')

  const doJoin = (id: string) => {
    const color = generateColorFromSocketId(id)
    if (mode === 'create') {
      emit('create_room', { username: name, color })
    } else {
      emit('join_room', { username: name, color, roomCode: code })
    }
  }

  // If socket already connected (e.g. retry after room_error), emit immediately
  if (clientId.value) {
    doJoin(clientId.value)
  } else {
    on('connected', doJoin)
  }

  on('room_created', ({ roomCode: code, editors, users: userList, isHost: host }: { roomCode: string, editors: EditorFile[], users: { socketId: string, username: string, color: string }[], isHost: boolean }) => {
    console.log(code)
    roomCode.value = code
    isHost.value = host
    hostId.value = clientId.value
    isInRoom.value = true
    const map = new Map<string, UserInfo>()
    userList.forEach(u => map.set(u.socketId, u))
    users.value = map
    loadEditors(editors)
  })

  on('room_joined', ({ roomCode: code, editors, users: userList }: { roomCode: string, editors: EditorFile[], users: { socketId: string, username: string, color: string }[], isHost: boolean }) => {
    roomCode.value = code
    isHost.value = false
    const host = userList.find(u => u.socketId !== clientId.value)
    hostId.value = host?.socketId ?? ''
    isInRoom.value = true
    const map = new Map<string, UserInfo>()
    userList.forEach(u => map.set(u.socketId, u))
    users.value = map
    loadEditors(editors)
  })

  on('room_error', ({ message }: { message: string }) => {
    sessionError.value = message
  })

  on('kicked', () => {
    resetToWelcome()
  })

  on('room_closed', () => {
    resetToWelcome()
  })

  on('host_transferred', ({ newHostId }: { newHostId: string }) => {
    hostId.value = newHostId
    isHost.value = newHostId === clientId.value
  })

  on('editor_added', (editor: EditorFile) => {
    files.value.push(editor)
  })

  on('editor_removed', (editorId: number) => {
    const index = files.value.findIndex(f => f.id === editorId)
    if (index !== -1) {
      files.value.splice(index, 1)
      if (activeFileId.value === editorId && files.value.length > 0 && files.value[0]) {
        activeFileId.value = files.value[0].id
      }
    }
  })

  on('user_joined', ({ socketId, username: joinedName, color }: { socketId: string, username: string, color: string }) => {
    if (!users.value.has(socketId)) {
      users.value.set(socketId, { socketId, username: joinedName, color })
    }
  })

  on('user_left', ({ socketId }: { socketId: string }) => {
    users.value.delete(socketId)
  })

}

const handleKickUser = (socketId: string) => {
  emit('kick_user', { targetSocketId: socketId })
}

const handleCloseRoom = () => {
  emit('close_room', '')
}

// File operations
const handleFileSelect = (fileId: number) => {
  if (activeFileId.value !== null) {
    emit('leave_editor', activeFileId.value)
  }

  activeFileId.value = fileId
  emit('join_editor', fileId)

  const currentUser = users.value.get(clientId.value)
  if (currentUser) {
    currentUser.currentFileId = fileId
  }
}

const handleFileAdd = (name: string, language: string) => {
  emit('add_editor', { name, language })
}

const handleFileDelete = (fileId: number) => {
  if (files.value.length <= 1) return

  const file = files.value.find(f => f.id === fileId)
  if (file?.content && file.content.trim().length > 0) {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) {
      return
    }
  }

  emit('remove_editor', fileId)
}

const handleContentChange = (fileId: number, content: string) => {
  const file = files.value.find(f => f.id === fileId)
  if (file) {
    file.content = content
  }
}
</script>

<template>
  <div>
    <WelcomeScreen
      v-if="!isInRoom"
      :error="sessionError"
      @create-session="handleCreateSession"
    />

    <EditorShell
      v-else
      :files="files"
      :active-file-id="activeFileId"
      :users="users"
      :theme="monacoTheme"
      :room-code="roomCode"
      :is-host="isHost"
      :host-id="hostId"
      :current-socket-id="clientId"
      @file-select="handleFileSelect"
      @file-add="handleFileAdd"
      @file-delete="handleFileDelete"
      @content-change="handleContentChange"
      @kick-user="handleKickUser"
      @close-room="handleCloseRoom"
    />
  </div>
</template>
