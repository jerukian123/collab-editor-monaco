<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { useStorage } from '@vueuse/core'
import TopBar from './TopBar.vue'
import FileExplorer from './FileExplorer.vue'
import MonacoEditor from './MonacoEditor.vue'
import OutputPane from './OutputPane.vue'
import { useCodeExecution } from '@/composables/useCodeExecution'

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

interface Props {
  files: EditorFile[]
  activeFileId: number | null
  users: Map<string, UserInfo>
  theme: 'vs-dark' | 'vs-light'
}

interface Emits {
  (e: 'file-select', fileId: number): void
  (e: 'file-add', name: string, language: string): void
  (e: 'file-delete', fileId: number): void
  (e: 'content-change', fileId: number, content: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Sidebar state (persisted to localStorage)
const sidebarExpanded = useStorage('monaco-collab-sidebar-expanded', true)

// Output pane state (persisted to localStorage)
const outputPaneVisible = useStorage('monaco-collab-output-visible', false)
const outputPaneWidth = useStorage('monaco-collab-output-width', 400)

const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
const outputPaneRef = ref<InstanceType<typeof OutputPane> | null>(null)

// Code execution
const {
  isExecuting,
  supportedLanguages,
  executeCode,
  fetchSupportedLanguages,
  onExecutionResult,
  onExecutionError
} = useCodeExecution()

// Get active file data
const activeFile = computed(() => {
  return props.files.find(f => f.id === props.activeFileId)
})

const activeFileName = computed(() => {
  return activeFile.value?.name ?? 'Untitled'
})

// Watch sidebar state and trigger editor resize
watch(sidebarExpanded, () => {
  nextTick(() => {
    editorRef.value?.layout()
  })
})

// Watch output pane visibility and trigger editor resize
watch(outputPaneVisible, () => {
  nextTick(() => {
    editorRef.value?.layout()
  })
})

// Watch file changes - clear output pane
watch(() => props.activeFileId, () => {
  outputPaneRef.value?.clearForFile()
})

// Fetch supported languages on mount
fetchSupportedLanguages()

// Handle execution
const handleExecute = () => {
  if (!activeFile.value || !editorRef.value) return

  const code = activeFile.value.content ?? ''
  if (!code.trim()) {
    console.warn('No code to execute')
    return
  }

  // Show output pane if hidden
  if (!outputPaneVisible.value) {
    outputPaneVisible.value = true
  }

  executeCode(activeFile.value.id, code, activeFile.value.language)
}

// Listen for execution results
onExecutionResult((result) => {
  outputPaneRef.value?.addResult(result)
})

onExecutionError((error) => {
  outputPaneRef.value?.addResult(error)
})

// Close output pane
const handleCloseOutput = () => {
  outputPaneVisible.value = false
}

// Handle OutputPane resize
const handleOutputResize = (newWidth: number) => {
  outputPaneWidth.value = newWidth
  nextTick(() => {
    editorRef.value?.layout()
  })
}

// Keyboard shortcut handler
const handleKeyDown = (event: KeyboardEvent) => {
  // Ctrl+Enter or Cmd+Enter to run code
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    handleExecute()
  }
}

// Add event listener on mount
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

// Remove event listener on unmount
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="flex h-screen flex-col">
    <TopBar
      :active-file-name="activeFileName"
      :users="users"
      :output-pane-visible="outputPaneVisible"
      @toggle-output="outputPaneVisible = !outputPaneVisible"
    />

    <div class="flex flex-1 overflow-hidden">
      <FileExplorer
        :files="files"
        :active-file-id="activeFileId"
        :users="users"
        :expanded="sidebarExpanded"
        @file-select="emit('file-select', $event)"
        @file-add="(name, language) => emit('file-add', name, language)"
        @file-delete="emit('file-delete', $event)"
        @toggle-sidebar="sidebarExpanded = !sidebarExpanded"
      />

      <div class="flex flex-1 min-w-0">
          <MonacoEditor
            v-if="activeFile"
            :key="activeFile.id"
            ref="editorRef"
            :file-id="activeFile.id"
            :initial-content="activeFile.content ?? ''"
            :language="activeFile.language"
            :theme="theme"
            @content-change="(fileId, content) => emit('content-change', fileId, content)"
          />
      </div>

      <OutputPane
        v-if="outputPaneVisible"
        ref="outputPaneRef"
        :file-id="activeFileId"
        :language="activeFile?.language ?? ''"
        :is-executing="isExecuting"
        :supported-languages="supportedLanguages"
        :users="users"
        :width="outputPaneWidth"
        @execute="handleExecute"
        @close="handleCloseOutput"
        @resize="handleOutputResize"
      />
    </div>
  </div>
</template>
