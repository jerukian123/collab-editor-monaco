<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import TopBar from './TopBar.vue'
import FileExplorer from './FileExplorer.vue'
import MonacoEditor from './MonacoEditor.vue'

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

const editorRef = ref<InstanceType<typeof MonacoEditor> | null>(null)

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
</script>

<template>
  <div class="flex h-screen flex-col">
    <TopBar
      :active-file-name="activeFileName"
      :users="users"
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

      <div class="flex-1">
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
    </div>
  </div>
</template>
