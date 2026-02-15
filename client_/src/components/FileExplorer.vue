<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight, Plus, Trash2, FileCode } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EditorFile {
  id: number
  name: string
  language: string
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
  expanded: boolean
}

interface Emits {
  (e: 'file-select', fileId: number): void
  (e: 'file-add', name: string, language: string): void
  (e: 'file-delete', fileId: number): void
  (e: 'toggle-sidebar'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// New file dialog state
const showNewFileDialog = ref(false)
const newFileName = ref('')
const newFileLanguage = ref('javascript')

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
]

// Get users viewing each file
const getUsersForFile = (fileId: number) => {
  return Array.from(props.users.values())
    .filter(user => user.currentFileId === fileId)
}

const handleAddFile = () => {
  if (newFileName.value.trim()) {
    emit('file-add', newFileName.value.trim(), newFileLanguage.value)
    newFileName.value = ''
    newFileLanguage.value = 'javascript'
    showNewFileDialog.value = false
  }
}

const canDeleteFile = computed(() => props.files.length > 1)
</script>

<template>
  <div
    class="flex flex-col border-r bg-muted/10 transition-all duration-200"
    :class="expanded ? 'w-60' : 'w-12'"
  >
    <!-- Header -->
    <div class="flex h-12 items-center justify-between border-b px-3">
      <template v-if="expanded">
        <h2 class="text-sm font-semibold">Files</h2>
        <Button
          variant="ghost"
          size="sm"
          @click="emit('toggle-sidebar')"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
      </template>
      <template v-else>
        <Button
          variant="ghost"
          size="sm"
          @click="emit('toggle-sidebar')"
          aria-label="Expand sidebar"
          class="mx-auto"
        >
          <ChevronRight class="h-4 w-4" />
        </Button>
      </template>
    </div>

    <!-- File list -->
    <ScrollArea v-if="expanded" class="flex-1">
      <div class="space-y-1 p-2">
        <button
          v-for="file in files"
          :key="file.id"
          class="group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          :class="file.id === activeFileId ? 'bg-accent' : ''"
          @click="emit('file-select', file.id)"
        >
          <FileCode class="h-4 w-4 flex-shrink-0" />
          <span class="flex-1 truncate text-left">{{ file.name }}</span>

          <!-- User presence dots -->
          <div
            v-if="getUsersForFile(file.id).length > 0"
            class="flex -space-x-1"
          >
            <div
              v-for="user in getUsersForFile(file.id).slice(0, 3)"
              :key="user.socketId"
              class="h-2 w-2 rounded-full border border-background"
              :style="{ backgroundColor: user.color }"
              :title="user.socketId"
            />
          </div>

          <!-- Delete button -->
          <Button
            v-if="canDeleteFile"
            variant="ghost"
            size="sm"
            class="h-6 w-6 opacity-0 group-hover:opacity-100"
            @click.stop="emit('file-delete', file.id)"
            aria-label="Delete file"
          >
            <Trash2 class="h-3 w-3" />
          </Button>
        </button>
      </div>
    </ScrollArea>

    <!-- Footer: New file button -->
    <div v-if="expanded" class="border-t p-2">
      <Dialog v-model:open="showNewFileDialog">
        <DialogTrigger as-child>
          <Button variant="outline" size="sm" class="w-full">
            <Plus class="mr-2 h-4 w-4" />
            New File
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New File</DialogTitle>
            <DialogDescription>
              Add a new file to the collaborative session
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="filename">File name</Label>
              <Input
                id="filename"
                v-model="newFileName"
                placeholder="example.js"
                @keyup.enter="handleAddFile"
              />
            </div>
            <div class="space-y-2">
              <Label for="language">Language</Label>
              <Select v-model="newFileLanguage">
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="lang in languages"
                    :key="lang.value"
                    :value="lang.value"
                  >
                    {{ lang.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button @click="handleAddFile">Create File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Collapsed state: file count badge -->
    <div v-else class="flex-1 p-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-medium">
        {{ files.length }}
      </div>
    </div>
  </div>
</template>
