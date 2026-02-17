<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'
import { useSocket } from '@/composables/useSocket'

interface Props {
  fileId: number
  initialContent: string
  language: string
  theme?: 'vs-dark' | 'vs-light'
}

interface CursorPosition {
  lineNumber: number
  column: number
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'vs-dark'
})

const emit = defineEmits<{
  contentChange: [fileId: number, content: string]
  cursorMove: [position: CursorPosition]
}>()

// Socket.IO connection (using singleton)
const { socket, clientId, emit: socketEmit } = useSocket()

// Monaco editor instance
let editor: monaco.editor.IStandaloneCodeEditor | null = null
const editorContainer = ref<HTMLElement | null>(null)

// Remote cursor widgets
const cursorWidgets = new Map<string, monaco.editor.IContentWidget>()

// Anti-loop flag
let isReceivingRemoteUpdate = false

// Throttle timers
let codeChangeTimer: number | null = null
let cursorMoveTimer: number | null = null

// Generate consistent color from socket ID
const generateColorFromSocketId = (socketId: string): string => {
  let hash = 0
  for (let i = 0; i < socketId.length; i++) {
    hash = socketId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}

// Create cursor widget
const createCursorWidget = (
  socketId: string,
  position: CursorPosition,
  color: string
): monaco.editor.IContentWidget => {
  return {
    getId: () => `cursor-${socketId}`,
    getDomNode: () => {
      const domNode = document.createElement('div')
      domNode.style.position = 'absolute'
      domNode.style.width = '2px'
      domNode.style.height = '28px'
      domNode.style.backgroundColor = color
      domNode.style.zIndex = '10'

      const label = document.createElement('div')
      label.textContent = socketId.substring(0, 6)
      label.style.position = 'absolute'
      label.style.top = '-20px'
      label.style.left = '0'
      label.style.fontSize = '11px'
      label.style.backgroundColor = color
      label.style.color = 'white'
      label.style.padding = '2px 4px'
      label.style.borderRadius = '2px'
      label.style.whiteSpace = 'nowrap'

      domNode.appendChild(label)
      return domNode
    },
    getPosition: () => ({
      position: {
        lineNumber: position.lineNumber,
        column: position.column
      },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
    })
  }
}

// Initialize Monaco editor
const initEditor = () => {
  if (!editorContainer.value) return

  editor = monaco.editor.create(editorContainer.value, {
    value: props.initialContent,
    language: props.language,
    theme: props.theme,
    fontSize: 18,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
  })

  // Listen for content changes
  editor.onDidChangeModelContent(() => {
    if (isReceivingRemoteUpdate || !editor) return

    if (codeChangeTimer) clearTimeout(codeChangeTimer)
    codeChangeTimer = window.setTimeout(() => {
      const content = editor!.getValue()
      emit('contentChange', props.fileId, content)

      // Emit code changes via socket
      socketEmit('send_code', {
        editorId: props.fileId,
        code: content
      })
    }, 500)
  })

  // Listen for cursor position changes
  editor.onDidChangeCursorPosition((e) => {
    if (isReceivingRemoteUpdate) return

    if (cursorMoveTimer) clearTimeout(cursorMoveTimer)
    cursorMoveTimer = window.setTimeout(() => {
      const position = {
        lineNumber: e.position.lineNumber,
        column: e.position.column
      }
      emit('cursorMove', position)

      // Emit cursor position via socket
      socketEmit('send_cursor_position', {
        editorId: props.fileId,
        position
      })
    }, 100)
  })
}

// Setup Socket.IO event handlers
const setupSocketHandlers = () => {
  // If already connected, join room immediately (connect event already fired)
  if (socket?.connected) {
    socketEmit('join_editor', props.fileId)
  }

  // Handle reconnections
  socket?.on('connect', () => {
    socketEmit('join_editor', props.fileId)
  })

  socket?.on('receive_code', ({ code }) => { 
    if (!editor) return

    isReceivingRemoteUpdate = true
    const position = editor.getPosition()
    editor.setValue(code)
    if (position) editor.setPosition(position)
    isReceivingRemoteUpdate = false
  })

  socket?.on('receive_cursor_position', ({ position, socketId }) => {
    console.log('[MonacoEditor] "receive_cursor_position" event fired, from socketId:', socketId, 'my socket.id:', clientId.value)
    if (!editor) return
    console.log('Passed filter, rendering cursor for:', socketId, position)
    const color = generateColorFromSocketId(socketId)
    const widgetId = `cursor-${socketId}`

    // Remove old widget if exists
    if (cursorWidgets.has(widgetId)) {
      editor.removeContentWidget(cursorWidgets.get(widgetId)!)
    }

    // Create and add new widget
    const widget = createCursorWidget(socketId, position, color)
    editor.addContentWidget(widget)
    cursorWidgets.set(widgetId, widget)
  })

  socket?.on('user_left', ({ socketId }) => {
    const widgetId = `cursor-${socketId}`
    if (cursorWidgets.has(widgetId) && editor) {
      editor.removeContentWidget(cursorWidgets.get(widgetId)!)
      cursorWidgets.delete(widgetId)
    }
  })
}

// Update theme when prop changes
watch(() => props.theme, (newTheme) => {
  if (editor) {
    monaco.editor.setTheme(newTheme)
  }
})

// Update language when prop changes
watch(() => props.language, (newLanguage) => {
  if (editor) {
    monaco.editor.setModelLanguage(editor.getModel()!, newLanguage)
  }
})

// Handle file changes
watch(() => props.fileId, (newFileId, oldFileId) => {
  if (oldFileId !== undefined) {
    socketEmit('leave_editor', oldFileId)
  }

  // Clear all cursor widgets
  if (editor) {
    cursorWidgets.forEach(widget => {
      editor!.removeContentWidget(widget)
    })
    cursorWidgets.clear()
  }

  socketEmit('join_editor', newFileId)

  if (editor) {
    isReceivingRemoteUpdate = true
    editor.setValue(props.initialContent)
    isReceivingRemoteUpdate = false
  }
})

// Public method to resize editor
const layout = () => {
  if (editor) {
    editor.layout()
  }
}

defineExpose({
  layout
})

onMounted(() => {
  initEditor()
  setupSocketHandlers()
})

onBeforeUnmount(() => {
  // Leave the current editor room
  socketEmit('leave_editor', props.fileId)

  if (codeChangeTimer) clearTimeout(codeChangeTimer)
  if (cursorMoveTimer) clearTimeout(cursorMoveTimer)

  if (editor) {
    editor.dispose()
  }
})
</script>

<template>
  <div ref="editorContainer" class="h-full w-full" />
</template>
