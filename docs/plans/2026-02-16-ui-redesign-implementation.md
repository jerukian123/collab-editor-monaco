# UI/UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform collaborative Monaco editor into a polished, modern code playground with shadcn-vue components and dark/light mode.

**Architecture:** Component refresh approach - new UI layer with shadcn-vue/Tailwind while preserving existing Socket.IO and Monaco editor logic. State flows from App.vue down via props, events bubble up via emits.

**Tech Stack:** Vue 3 + TypeScript, shadcn-vue, Tailwind CSS, Monaco Editor, Socket.IO, @vueuse/core

---

## Task 1: Setup shadcn-vue and Tailwind CSS

**Files:**
- Modify: `client_/package.json`
- Create: `client_/components.json`
- Create: `client_/tailwind.config.js`
- Create: `client_/postcss.config.js`
- Modify: `client_/src/assets/index.css`
- Create: `client_/src/lib/utils.ts`

**Step 1: Install dependencies**

Run:
```bash
cd client_
npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install @vueuse/core
npm install radix-vue
```

Expected: Dependencies installed successfully

**Step 2: Initialize Tailwind CSS**

Run:
```bash
cd client_
npx tailwindcss init -p
```

Expected: Creates `tailwind.config.js` and `postcss.config.js`

**Step 3: Configure Tailwind for shadcn-vue**

Edit `client_/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Step 4: Create shadcn-vue components.json config**

Create `client_/components.json`:
```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "default",
  "typescript": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/assets/index.css",
    "baseColor": "zinc"
  },
  "framework": "vue",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Step 5: Create utils helper**

Create `client_/src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 6: Setup CSS with Tailwind and theme variables**

Replace contents of `client_/src/assets/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 240 4.8% 95.9%;
    --card: 240 10% 9.8%;
    --card-foreground: 240 4.8% 95.9%;
    --popover: 240 10% 9.8%;
    --popover-foreground: 240 4.8% 95.9%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 210 40% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 240 4.8% 95.9%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 240 4.8% 95.9%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 7: Update vite.config to support path aliases**

Edit `client_/vite.config.ts` to add path alias:
```typescript
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin({})
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

**Step 8: Test dev server runs**

Run:
```bash
cd client_
npm run dev
```

Expected: Vite dev server starts without errors (Ctrl+C to stop)

**Step 9: Commit setup**

Run:
```bash
git add client_/package.json client_/package-lock.json client_/components.json client_/tailwind.config.js client_/postcss.config.js client_/src/assets/index.css client_/src/lib/utils.ts client_/vite.config.ts
git commit -m "$(cat <<'EOF'
feat: setup shadcn-vue and Tailwind CSS

- Install shadcn-vue dependencies and Tailwind CSS
- Configure Tailwind with dark mode support
- Add CSS variables for theming
- Create utils helper for className merging
- Configure path aliases in vite config

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Install shadcn-vue core components

**Files:**
- Create: `client_/src/components/ui/button.vue`
- Create: `client_/src/components/ui/card.vue`
- Create: `client_/src/components/ui/avatar.vue`
- Create: `client_/src/components/ui/badge.vue`
- Create: `client_/src/components/ui/separator.vue`
- Create: `client_/src/components/ui/scroll-area.vue`

**Step 1: Install Button component**

Run:
```bash
cd client_
npx shadcn-vue@latest add button
```

Expected: Creates `src/components/ui/button.vue`

**Step 2: Install Card component**

Run:
```bash
cd client_
npx shadcn-vue@latest add card
```

Expected: Creates `src/components/ui/card.vue`

**Step 3: Install Avatar component**

Run:
```bash
cd client_
npx shadcn-vue@latest add avatar
```

Expected: Creates `src/components/ui/avatar.vue`

**Step 4: Install Badge component**

Run:
```bash
cd client_
npx shadcn-vue@latest add badge
```

Expected: Creates `src/components/ui/badge.vue`

**Step 5: Install Separator component**

Run:
```bash
cd client_
npx shadcn-vue@latest add separator
```

Expected: Creates `src/components/ui/separator.vue`

**Step 6: Install ScrollArea component**

Run:
```bash
cd client_
npx shadcn-vue@latest add scroll-area
```

Expected: Creates `src/components/ui/scroll-area.vue`

**Step 7: Commit UI components**

Run:
```bash
git add client_/src/components/ui/
git commit -m "$(cat <<'EOF'
feat: add shadcn-vue UI components

- Install Button, Card, Avatar, Badge, Separator, ScrollArea
- Components provide accessible, styled building blocks

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create ThemeToggle component

**Files:**
- Create: `client_/src/components/ThemeToggle.vue`

**Step 1: Create ThemeToggle component**

Create `client_/src/components/ThemeToggle.vue`:
```vue
<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { Moon, Sun } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <Button
    variant="ghost"
    size="icon"
    @click="toggleDark()"
    aria-label="Toggle theme"
  >
    <Sun v-if="!isDark" class="h-5 w-5" />
    <Moon v-else class="h-5 w-5" />
  </Button>
</template>
```

**Step 2: Install lucide-vue-next icons**

Run:
```bash
cd client_
npm install lucide-vue-next
```

Expected: lucide-vue-next installed successfully

**Step 3: Test component imports**

Verify no TypeScript errors:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 4: Commit ThemeToggle**

Run:
```bash
git add client_/src/components/ThemeToggle.vue client_/package.json client_/package-lock.json
git commit -m "$(cat <<'EOF'
feat: add ThemeToggle component

- Uses @vueuse/core for dark mode management
- Toggles dark class on html element
- Persists to localStorage
- Uses lucide-vue-next icons

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create UserAvatar component

**Files:**
- Create: `client_/src/components/UserAvatar.vue`

**Step 1: Create UserAvatar component**

Create `client_/src/components/UserAvatar.vue`:
```vue
<script setup lang="ts">
import { computed } from 'vue'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  socketId: string
  color: string
}

const props = defineProps<Props>()

// Generate fallback text from socket ID (first 2 chars)
const fallbackText = computed(() => {
  return props.socketId.substring(0, 2).toUpperCase()
})
</script>

<template>
  <Avatar
    class="h-8 w-8 border-2"
    :style="{
      backgroundColor: color,
      borderColor: 'hsl(var(--border))'
    }"
    :title="socketId"
  >
    <AvatarFallback
      class="text-xs font-semibold text-white"
      :style="{ backgroundColor: color }"
    >
      {{ fallbackText }}
    </AvatarFallback>
  </Avatar>
</template>
```

**Step 2: Test component imports**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 3: Commit UserAvatar**

Run:
```bash
git add client_/src/components/UserAvatar.vue
git commit -m "$(cat <<'EOF'
feat: add UserAvatar component

- Displays circular avatar with user color
- Shows first 2 chars of socket ID as fallback
- Tooltip shows full socket ID on hover

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create WelcomeScreen component

**Files:**
- Create: `client_/src/components/WelcomeScreen.vue`

**Step 1: Create WelcomeScreen component**

Create `client_/src/components/WelcomeScreen.vue`:
```vue
<script setup lang="ts">
import { Code2, Users, Zap } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from './ThemeToggle.vue'

const emit = defineEmits<{
  startSession: []
}>()

const features = [
  {
    icon: Code2,
    title: 'Monaco Editor',
    description: 'Powered by VS Code\'s editor'
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

    <Card class="w-full max-w-lg">
      <CardHeader class="text-center">
        <CardTitle class="text-3xl font-bold">
          Collaborative Code Editor
        </CardTitle>
        <CardDescription class="text-base">
          Real-time editing powered by Monaco & Socket.IO
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-6">
        <div class="grid gap-4">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="flex items-start gap-3"
          >
            <component
              :is="feature.icon"
              class="h-5 w-5 mt-0.5 text-primary"
            />
            <div>
              <h3 class="font-medium">{{ feature.title }}</h3>
              <p class="text-sm text-muted-foreground">
                {{ feature.description }}
              </p>
            </div>
          </div>
        </div>

        <Button
          class="w-full"
          size="lg"
          @click="emit('startSession')"
        >
          Start Session
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
```

**Step 2: Test component imports**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 3: Commit WelcomeScreen**

Run:
```bash
git add client_/src/components/WelcomeScreen.vue
git commit -m "$(cat <<'EOF'
feat: add WelcomeScreen component

- Landing page before session starts
- Feature highlights with icons
- Start Session CTA button
- Theme toggle in corner

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Create TopBar component

**Files:**
- Create: `client_/src/components/TopBar.vue`

**Step 1: Create TopBar component**

Create `client_/src/components/TopBar.vue`:
```vue
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
```

**Step 2: Test component imports**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 3: Commit TopBar**

Run:
```bash
git add client_/src/components/TopBar.vue
git commit -m "$(cat <<'EOF'
feat: add TopBar component

- Header with app branding and active file name
- Connected user avatars (max 5 visible + overflow)
- Theme toggle button
- Semi-transparent background with backdrop blur

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create FileExplorer component

**Files:**
- Create: `client_/src/components/FileExplorer.vue`

**Step 1: Install Dialog and Input components for file creation**

Run:
```bash
cd client_
npx shadcn-vue@latest add dialog
npx shadcn-vue@latest add input
npx shadcn-vue@latest add label
npx shadcn-vue@latest add select
```

Expected: Components installed successfully

**Step 2: Create FileExplorer component**

Create `client_/src/components/FileExplorer.vue`:
```vue
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
          size="icon-sm"
          @click="emit('toggle-sidebar')"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft class="h-4 w-4" />
        </Button>
      </template>
      <template v-else>
        <Button
          variant="ghost"
          size="icon-sm"
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
            size="icon-sm"
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
```

**Step 3: Test component imports**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 4: Commit FileExplorer**

Run:
```bash
git add client_/src/components/FileExplorer.vue client_/src/components/ui/
git commit -m "$(cat <<'EOF'
feat: add FileExplorer component

- Collapsible sidebar with file list
- File creation dialog with name and language
- File deletion (when >1 file exists)
- User presence indicators per file
- Smooth expand/collapse transition

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Refactor Playground.vue to MonacoEditor.vue

**Files:**
- Read: `client_/src/components/Playground.vue`
- Create: `client_/src/components/MonacoEditor.vue`

**Step 1: Create MonacoEditor.vue based on Playground.vue**

Create `client_/src/components/MonacoEditor.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { io, Socket } from 'socket.io-client'

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

interface UserInfo {
  socketId: string
  color: string
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'vs-dark'
})

const emit = defineEmits<{
  contentChange: [fileId: number, content: string]
  cursorMove: [position: CursorPosition]
}>()

// Socket.IO connection
let socket: Socket | null = null

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
      domNode.style.height = '18px'
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

      if (socket) {
        socket.emit('send_code', {
          editorId: props.fileId,
          code: content
        })
      }
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

      if (socket) {
        socket.emit('send_cursor_position', {
          editorId: props.fileId,
          position
        })
      }
    }, 100)
  })
}

// Initialize Socket.IO
const initSocket = () => {
  socket = io('http://localhost:3000')

  socket.on('connect', () => {
    console.log('Connected to server')
    socket!.emit('join_editor', props.fileId)
  })

  socket.on('receive_code', ({ code, socketId }) => {
    if (!editor || socketId === socket!.id) return

    isReceivingRemoteUpdate = true
    const position = editor.getPosition()
    editor.setValue(code)
    if (position) editor.setPosition(position)
    isReceivingRemoteUpdate = false
  })

  socket.on('receive_cursor_position', ({ position, socketId }) => {
    if (!editor || socketId === socket!.id) return

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

  socket.on('user_left', ({ socketId }) => {
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
  if (oldFileId !== undefined && socket) {
    socket.emit('leave_editor', oldFileId)
  }

  // Clear all cursor widgets
  if (editor) {
    cursorWidgets.forEach(widget => {
      editor!.removeContentWidget(widget)
    })
    cursorWidgets.clear()
  }

  if (socket) {
    socket.emit('join_editor', newFileId)
  }

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
  initSocket()
})

onBeforeUnmount(() => {
  if (socket) {
    socket.emit('leave_editor', props.fileId)
    socket.disconnect()
  }

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
```

**Step 2: Test component imports**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors (may have warnings about Socket.IO types, which is acceptable)

**Step 3: Commit MonacoEditor**

Run:
```bash
git add client_/src/components/MonacoEditor.vue
git commit -m "$(cat <<'EOF'
feat: create MonacoEditor component (refactored from Playground)

- Manages Monaco editor instance lifecycle
- Handles real-time code synchronization via Socket.IO
- Displays remote cursor widgets
- Throttles code changes (500ms) and cursor moves (100ms)
- Exposes layout() method for resize handling
- Theme and language switching support

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Create EditorShell component

**Files:**
- Create: `client_/src/components/EditorShell.vue`

**Step 1: Create EditorShell component**

Create `client_/src/components/EditorShell.vue`:
```vue
<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
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
        @file-add="emit('file-add', $event, arguments[1])"
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
          @content-change="emit('content-change', $event, arguments[1])"
        />
      </div>
    </div>
  </div>
</template>
```

**Step 2: Test component imports**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 3: Commit EditorShell**

Run:
```bash
git add client_/src/components/EditorShell.vue
git commit -m "$(cat <<'EOF'
feat: add EditorShell component

- Main layout orchestrator for editor view
- Manages sidebar toggle state (persisted to localStorage)
- Coordinates TopBar, FileExplorer, and MonacoEditor
- Handles editor resize on sidebar toggle

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Refactor App.vue to use new components

**Files:**
- Read: `client_/src/App.vue`
- Modify: `client_/src/App.vue`

**Step 1: Read current App.vue to understand existing state**

Run:
```bash
cd client_
cat src/App.vue
```

Expected: Shows current App.vue structure with Playground component

**Step 2: Replace App.vue with new component structure**

Replace `client_/src/App.vue`:
```vue
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
    console.log('Connected to server:', socket!.id)
    isConnected.value = true
    clientId.value = socket!.id

    // Add self to users
    users.value.set(socket!.id, {
      socketId: socket!.id,
      color: generateColorFromSocketId(socket!.id)
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
    if (editorsList.length > 0 && !activeFileId.value) {
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
      if (activeFileId.value === editorId && files.value.length > 0) {
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
```

**Step 3: Test app compiles**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 4: Commit App.vue refactor**

Run:
```bash
git add client_/src/App.vue
git commit -m "$(cat <<'EOF'
refactor: rebuild App.vue with new component architecture

- Route between WelcomeScreen and EditorShell based on connection
- Manage global state: Socket.IO connection, users, files
- Handle Socket.IO events: file CRUD, user join/leave
- Coordinate file selection and content changes
- Generate consistent user colors from socket IDs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Remove old Playground.vue component

**Files:**
- Delete: `client_/src/components/Playground.vue`

**Step 1: Remove Playground.vue**

Run:
```bash
cd client_
git rm src/components/Playground.vue
```

Expected: File staged for deletion

**Step 2: Commit removal**

Run:
```bash
git commit -m "$(cat <<'EOF'
refactor: remove old Playground.vue component

- Replaced by MonacoEditor.vue with cleaner API
- All functionality preserved in new component

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Fix missing computed import in EditorShell

**Files:**
- Modify: `client_/src/components/EditorShell.vue`

**Step 1: Add missing computed import**

Edit `client_/src/components/EditorShell.vue`, change line 2:
```typescript
import { ref, watch, nextTick, onMounted, computed } from 'vue'
```

**Step 2: Verify no TypeScript errors**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 3: Commit fix**

Run:
```bash
git add client_/src/components/EditorShell.vue
git commit -m "$(cat <<'EOF'
fix: add missing computed import to EditorShell

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Fix Button size variant and missing icon-sm size

**Files:**
- Modify: `client_/src/components/FileExplorer.vue`

**Step 1: Check Button component for available sizes**

Run:
```bash
cd client_
cat src/components/ui/button.vue | grep -A 20 "size:"
```

Expected: Shows available button sizes (likely won't have icon-sm)

**Step 2: Replace icon-sm with sm size**

Edit `client_/src/components/FileExplorer.vue`:

Find all instances of `size="icon-sm"` and replace with `size="sm"`:

Line ~41:
```vue
<Button
  variant="ghost"
  size="sm"
  @click="emit('toggle-sidebar')"
  aria-label="Collapse sidebar"
>
```

Line ~47:
```vue
<Button
  variant="ghost"
  size="sm"
  @click="emit('toggle-sidebar')"
  aria-label="Expand sidebar"
  class="mx-auto"
>
```

Line ~79:
```vue
<Button
  v-if="canDeleteFile"
  variant="ghost"
  size="sm"
  class="h-6 w-6 opacity-0 group-hover:opacity-100"
  @click.stop="emit('file-delete', file.id)"
  aria-label="Delete file"
>
```

**Step 3: Test for errors**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 4: Commit fix**

Run:
```bash
git add client_/src/components/FileExplorer.vue
git commit -m "$(cat <<'EOF'
fix: replace icon-sm with sm size for Button components

- icon-sm variant doesn't exist in shadcn-vue Button
- Use sm size instead for compact buttons

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Test application end-to-end

**Files:**
- None (testing only)

**Step 1: Start backend server**

Run in separate terminal:
```bash
npm start
```

Expected: Server starts on port 3000

**Step 2: Start frontend dev server**

Run:
```bash
cd client_
npm run dev
```

Expected: Vite dev server starts on port 5173

**Step 3: Manual testing checklist**

Open http://localhost:5173 and verify:

1. **WelcomeScreen displays:**
   - Card with "Collaborative Code Editor" title
   - Feature list with icons
   - "Start Session" button
   - Theme toggle in corner

2. **Theme toggle works:**
   - Click theme toggle → background switches dark/light
   - Preference persists on refresh

3. **Start session:**
   - Click "Start Session" → transitions to EditorShell
   - Default file loads in Monaco editor
   - TopBar shows app name and file name

4. **File explorer:**
   - Sidebar expanded by default
   - Shows file list
   - Click collapse button → sidebar collapses
   - Click expand button → sidebar expands

5. **File operations:**
   - Click "New File" → dialog opens
   - Enter name and select language → file created
   - File appears in list
   - Click file → switches active file
   - Hover file → delete button appears
   - Click delete → file removed

6. **Monaco editor:**
   - Type code → updates in real-time
   - Syntax highlighting works
   - Editor theme matches app theme

7. **Multi-user collaboration (open in two tabs):**
   - Second tab shows first user's avatar in TopBar
   - Code changes sync between tabs
   - Cursor positions visible as widgets
   - File presence dots show which users view which files

**Step 4: Document any issues found**

Expected: All features work as designed, or issues documented for fixes

**Step 5: Stop servers**

Press Ctrl+C in both terminals

---

## Task 15: Polish and accessibility improvements

**Files:**
- Modify: `client_/src/components/FileExplorer.vue`
- Modify: `client_/src/components/MonacoEditor.vue`

**Step 1: Add ARIA labels and keyboard navigation to FileExplorer**

Edit `client_/src/components/FileExplorer.vue`:

Update file button (around line 65) to improve accessibility:
```vue
<button
  v-for="file in files"
  :key="file.id"
  class="group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  :class="file.id === activeFileId ? 'bg-accent' : ''"
  :aria-label="`${file.name} - ${file.id === activeFileId ? 'active' : 'inactive'}`"
  :aria-current="file.id === activeFileId ? 'page' : undefined"
  @click="emit('file-select', file.id)"
  @keydown.enter="emit('file-select', file.id)"
  @keydown.space.prevent="emit('file-select', file.id)"
>
```

**Step 2: Improve screen reader announcements**

Add sr-only spans for better screen reader context in TopBar.vue:

Edit `client_/src/components/TopBar.vue`, add around line 35 before user avatars:
```vue
<div v-if="userList.length > 0" class="flex items-center -space-x-2">
  <span class="sr-only">{{ userList.length }} connected users</span>
  <UserAvatar
    v-for="user in visibleUsers"
    :key="user.socketId"
    :socket-id="user.socketId"
    :color="user.color"
  />
```

Add sr-only utility to index.css:

Edit `client_/src/assets/index.css`, add at the end:
```css
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
}
```

**Step 3: Verify accessibility improvements**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 4: Commit accessibility improvements**

Run:
```bash
git add client_/src/components/FileExplorer.vue client_/src/components/TopBar.vue client_/src/assets/index.css
git commit -m "$(cat <<'EOF'
feat: add accessibility improvements

- Add ARIA labels to file buttons
- Add keyboard navigation support (Enter/Space)
- Add focus visible ring indicators
- Add screen reader announcements for user count
- Add sr-only utility class

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Add connection status indicator

**Files:**
- Create: `client_/src/components/ConnectionStatus.vue`
- Modify: `client_/src/components/EditorShell.vue`
- Modify: `client_/src/App.vue`

**Step 1: Create ConnectionStatus component**

Create `client_/src/components/ConnectionStatus.vue`:
```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { Badge } from '@/components/ui/badge'

interface Props {
  status: 'connected' | 'reconnecting' | 'disconnected'
}

const props = defineProps<Props>()

const visible = ref(true)
let hideTimer: number | null = null

// Auto-hide after 3 seconds when connected
watch(() => props.status, (newStatus) => {
  visible.value = true

  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  if (newStatus === 'connected') {
    hideTimer = window.setTimeout(() => {
      visible.value = false
    }, 3000)
  }
})

const statusConfig = {
  connected: {
    variant: 'default' as const,
    label: 'Connected',
    dotColor: 'bg-green-500'
  },
  reconnecting: {
    variant: 'secondary' as const,
    label: 'Reconnecting...',
    dotColor: 'bg-yellow-500'
  },
  disconnected: {
    variant: 'destructive' as const,
    label: 'Disconnected',
    dotColor: 'bg-red-500'
  }
}

const currentConfig = computed(() => statusConfig[props.status])
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    leave-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed bottom-4 right-4 z-50"
    >
      <Badge :variant="currentConfig.variant" class="gap-2">
        <span
          class="h-2 w-2 rounded-full"
          :class="currentConfig.dotColor"
        />
        {{ currentConfig.label }}
      </Badge>
    </div>
  </Transition>
</template>
```

**Step 2: Add connection status tracking to App.vue**

Edit `client_/src/App.vue`:

Add connection status state after line 23:
```typescript
const connectionStatus = ref<'connected' | 'reconnecting' | 'disconnected'>('disconnected')
```

Update socket events in startSession():

After `socket.on('connect', ...)` (around line 42):
```typescript
socket.on('connect', () => {
  console.log('Connected to server:', socket!.id)
  isConnected.value = true
  clientId.value = socket!.id
  connectionStatus.value = 'connected'

  // Add self to users
  users.value.set(socket!.id, {
    socketId: socket!.id,
    color: generateColorFromSocketId(socket!.id)
  })
})
```

After `socket.on('disconnect', ...)`:
```typescript
socket.on('disconnect', () => {
  console.log('Disconnected from server')
  connectionStatus.value = 'disconnected'
})

socket.on('reconnect_attempt', () => {
  console.log('Attempting to reconnect...')
  connectionStatus.value = 'reconnecting'
})
```

Pass status to EditorShell:
```vue
<EditorShell
  v-else
  :files="files"
  :active-file-id="activeFileId"
  :users="users"
  :theme="monacoTheme"
  :connection-status="connectionStatus"
  @file-select="handleFileSelect"
  @file-add="handleFileAdd"
  @file-delete="handleFileDelete"
  @content-change="handleContentChange"
/>
```

**Step 3: Update EditorShell to accept and render ConnectionStatus**

Edit `client_/src/components/EditorShell.vue`:

Add to imports:
```typescript
import ConnectionStatus from './ConnectionStatus.vue'
```

Add to Props interface:
```typescript
interface Props {
  files: EditorFile[]
  activeFileId: number | null
  users: Map<string, UserInfo>
  theme: 'vs-dark' | 'vs-light'
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
}
```

Add to template after MonacoEditor:
```vue
<div class="flex-1">
  <MonacoEditor
    v-if="activeFile"
    :key="activeFile.id"
    ref="editorRef"
    :file-id="activeFile.id"
    :initial-content="activeFile.content ?? ''"
    :language="activeFile.language"
    :theme="theme"
    @content-change="emit('content-change', $event, arguments[1])"
  />
</div>

<ConnectionStatus :status="connectionStatus" />
```

**Step 4: Add missing computed import to ConnectionStatus**

Edit `client_/src/components/ConnectionStatus.vue`, add computed to imports:
```typescript
import { ref, watch, computed } from 'vue'
```

**Step 5: Test for errors**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No errors

**Step 6: Commit connection status**

Run:
```bash
git add client_/src/components/ConnectionStatus.vue client_/src/components/EditorShell.vue client_/src/App.vue
git commit -m "$(cat <<'EOF'
feat: add connection status indicator

- Shows connected/reconnecting/disconnected states
- Auto-hides after 3s when stable
- Bottom-right corner positioning
- Color-coded status badges

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Final testing and verification

**Files:**
- None (verification only)

**Step 1: Run type checking**

Run:
```bash
cd client_
npx vue-tsc --noEmit
```

Expected: No TypeScript errors

**Step 2: Run linter**

Run:
```bash
cd client_
npm run lint
```

Expected: No linting errors (or only minor warnings)

**Step 3: Build production bundle**

Run:
```bash
cd client_
npm run build
```

Expected: Build completes successfully with no errors

**Step 4: Test production build**

Run:
```bash
cd client_
npm run preview
```

Expected: Production preview server starts and app works correctly

**Step 5: Manual verification checklist**

Test all features in production build:

- [ ] WelcomeScreen loads correctly
- [ ] Theme toggle persists across refreshes
- [ ] Start Session connects successfully
- [ ] File explorer shows/hides correctly
- [ ] File creation dialog works
- [ ] File deletion with confirmation works
- [ ] Monaco editor loads and syntax highlights
- [ ] Multi-user cursors display correctly
- [ ] Code synchronization works in real-time
- [ ] Connection status shows and auto-hides
- [ ] Responsive layout works on mobile/tablet
- [ ] Keyboard navigation works
- [ ] Dark and light modes both look polished

**Step 6: Document completion**

Create summary of implementation in console output.

---

## Success Criteria

✅ **Setup Complete:**
- shadcn-vue and Tailwind CSS installed and configured
- All UI components installed (Button, Card, Avatar, Badge, etc.)
- Theme system with dark/light mode working
- Path aliases configured

✅ **Components Built:**
- ThemeToggle: Instant theme switching with persistence
- UserAvatar: Consistent color generation per socket ID
- WelcomeScreen: Polished landing page with CTA
- TopBar: Branding, file name, user avatars, theme toggle
- FileExplorer: Collapsible sidebar with CRUD operations
- MonacoEditor: Refactored with clean API, real-time sync
- EditorShell: Layout orchestration with resize handling
- ConnectionStatus: Auto-hiding status indicator

✅ **Functionality:**
- Socket.IO integration unchanged and working
- Multi-file support with file switching
- Real-time code synchronization
- Live cursor widgets with user colors
- User presence indicators
- Theme synchronized with Monaco editor
- Sidebar state persisted to localStorage

✅ **Code Quality:**
- TypeScript strict mode with no errors
- Clean component separation
- Accessible components with ARIA labels
- Responsive design
- Production build successful

✅ **Portfolio Ready:**
- Professional, modern aesthetic
- Dark and light modes polished
- Smooth, non-jarring interactions
- Clean codebase for review

---

## Execution Notes

- Follow TDD where applicable (component tests)
- Commit frequently after each completed step
- Test in browser after major component additions
- Verify TypeScript compilation before committing
- Keep existing Socket.IO server code unchanged
- Preserve all existing collaboration features

---

**Plan Status:** Ready for execution

**Estimated Time:** 16-20 hours

**Next Step:** Choose execution method (subagent-driven or parallel session)
