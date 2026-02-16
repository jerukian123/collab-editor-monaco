# Code Execution Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add multi-language code execution with collaborative output pane showing user attribution

**Architecture:** Client triggers execution → Server calls Piston API → Results broadcast to all users in same file room. Output pane on right side of editor, resizable and collapsible.

**Tech Stack:** Vue 3, TypeScript, Socket.IO, Piston API, Tailwind CSS, Lucide icons

---

## Task 1: Server-side Piston Integration

**Files:**
- Create: `server/services/executionService.js`
- Modify: `server/package.json`

**Step 1: Install axios dependency**

Run: `cd server && npm install axios`
Expected: axios added to dependencies

**Step 2: Create executionService.js**

Create file at `server/services/executionService.js`:

```javascript
const axios = require('axios');

const PISTON_API_URL = 'https://emkc.org/api/v2/piston';

// Language mapping from Monaco to Piston
const LANGUAGE_MAP = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'cpp', version: '10.2.0' },
  c: { language: 'c', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
  ruby: { language: 'ruby', version: '3.0.1' },
  php: { language: 'php', version: '8.2.3' },
};

/**
 * Execute code using Piston API
 * @param {string} code - The code to execute
 * @param {string} language - Monaco language identifier
 * @returns {Promise<Object>} Execution result
 */
async function executeCode(code, language) {
  const startTime = Date.now();

  // Check if language is supported
  const pistonConfig = LANGUAGE_MAP[language];
  if (!pistonConfig) {
    throw new Error(`Language '${language}' is not supported for execution`);
  }

  try {
    const response = await axios.post(
      `${PISTON_API_URL}/execute`,
      {
        language: pistonConfig.language,
        version: pistonConfig.version,
        files: [
          {
            content: code
          }
        ]
      },
      {
        timeout: 10000 // 10 second timeout
      }
    );

    const executionTime = Date.now() - startTime;
    const result = response.data.run;

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      exitCode: result.code || 0,
      executionTime,
      language: pistonConfig.language,
      version: pistonConfig.version
    };
  } catch (error) {
    console.error('[ExecutionService] Error:', error.message);

    if (error.code === 'ECONNABORTED') {
      throw new Error('Execution timed out after 10 seconds');
    }

    if (error.response) {
      throw new Error(`Piston API error: ${error.response.status}`);
    }

    throw new Error('Code execution service unavailable');
  }
}

/**
 * Get list of supported languages
 * @returns {Array<string>} Array of supported Monaco language identifiers
 */
function getSupportedLanguages() {
  return Object.keys(LANGUAGE_MAP);
}

module.exports = {
  executeCode,
  getSupportedLanguages,
  LANGUAGE_MAP
};
```

**Step 3: Test service manually**

Create test file `server/test-execution.js`:

```javascript
const { executeCode, getSupportedLanguages } = require('./services/executionService');

async function test() {
  console.log('Supported languages:', getSupportedLanguages());

  // Test Python
  console.log('\n--- Testing Python ---');
  try {
    const result = await executeCode('print("Hello from Python")', 'python');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test JavaScript
  console.log('\n--- Testing JavaScript ---');
  try {
    const result = await executeCode('console.log("Hello from JavaScript")', 'javascript');
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
```

Run: `node server/test-execution.js`
Expected: See "Hello from Python" and "Hello from JavaScript" in stdout

**Step 4: Clean up test file**

Run: `rm server/test-execution.js`

**Step 5: Commit**

```bash
git add server/services/executionService.js server/package.json server/package-lock.json
git commit -m "feat(server): add Piston API execution service"
```

---

## Task 2: Server Socket.IO Events

**Files:**
- Modify: `server/index.js`

**Step 1: Add execute_code event handler**

In `server/index.js`, after the existing socket event handlers (around line 111), add:

```javascript
const { executeCode, getSupportedLanguages } = require('./services/executionService');

// ... existing code ...

io.on("connection", (socket) => {
    // ... existing handlers ...

    // Code execution
    socket.on("execute_code", async (data) => {
        const { fileId, code, language } = data;
        const executionId = `${socket.id}-${Date.now()}`;

        console.log(`[${new Date().toISOString()}] execute_code from ${socket.id}, language: ${language}`);

        try {
            const result = await executeCode(code, language);

            const room = `editor-${fileId}`;
            io.to(room).emit("execution_result", {
                fileId,
                executionId,
                output: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                executionTime: result.executionTime,
                language: result.language,
                user: {
                    socketId: socket.id
                },
                timestamp: new Date().toISOString()
            });

            console.log(`[${new Date().toISOString()}] execution_result sent to room ${room}`);
        } catch (error) {
            const room = `editor-${fileId}`;
            io.to(room).emit("execution_error", {
                fileId,
                executionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            console.error(`[${new Date().toISOString()}] execution_error:`, error.message);
        }
    });

    // Get supported languages
    socket.on("get_supported_languages", () => {
        socket.emit("supported_languages", getSupportedLanguages());
    });
});
```

**Step 2: Test server starts without errors**

Run: `cd server && node index.js`
Expected: Server starts on port 3000 without errors

Stop the server with Ctrl+C.

**Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(server): add execute_code socket event handler"
```

---

## Task 3: Client Composable for Execution

**Files:**
- Create: `client_/src/composables/useCodeExecution.ts`

**Step 1: Create useCodeExecution composable**

Create file at `client_/src/composables/useCodeExecution.ts`:

```typescript
import { ref } from 'vue'
import { useSocket } from './useSocket'

export interface ExecutionResult {
  executionId: string
  output: string
  stderr: string
  exitCode: number
  executionTime: number
  language: string
  user: {
    socketId: string
  }
  timestamp: string
}

export interface ExecutionError {
  executionId: string
  error: string
  timestamp: string
}

export function useCodeExecution() {
  const { emit, on } = useSocket()

  const isExecuting = ref(false)
  const supportedLanguages = ref<string[]>([])

  // Execute code
  const executeCode = (fileId: number, code: string, language: string) => {
    if (isExecuting.value) {
      console.warn('Execution already in progress')
      return
    }

    isExecuting.value = true
    emit('execute_code', { fileId, code, language })
  }

  // Get supported languages
  const fetchSupportedLanguages = () => {
    emit('get_supported_languages')
  }

  // Listen for supported languages
  on('supported_languages', (languages: string[]) => {
    supportedLanguages.value = languages
  })

  // Setup result listeners
  const onExecutionResult = (callback: (result: ExecutionResult) => void) => {
    on('execution_result', (result: ExecutionResult) => {
      isExecuting.value = false
      callback(result)
    })
  }

  const onExecutionError = (callback: (error: ExecutionError) => void) => {
    on('execution_error', (error: ExecutionError) => {
      isExecuting.value = false
      callback(error)
    })
  }

  return {
    isExecuting,
    supportedLanguages,
    executeCode,
    fetchSupportedLanguages,
    onExecutionResult,
    onExecutionError
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd client_ && npm run type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add client_/src/composables/useCodeExecution.ts
git commit -m "feat(client): add useCodeExecution composable"
```

---

## Task 4: OutputPane Component (Basic Structure)

**Files:**
- Create: `client_/src/components/OutputPane.vue`

**Step 1: Create OutputPane component**

Create file at `client_/src/components/OutputPane.vue`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Play, X, Trash2 } from 'lucide-vue-next'
import type { ExecutionResult, ExecutionError } from '@/composables/useCodeExecution'

interface Props {
  fileId: number | null
  language: string
  isExecuting: boolean
  supportedLanguages: string[]
}

interface Emits {
  (e: 'execute'): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Execution results for current file
const results = ref<(ExecutionResult | ExecutionError)[]>([])

// Check if current language is supported
const isLanguageSupported = computed(() => {
  return props.supportedLanguages.includes(props.language)
})

// Can execute code
const canExecute = computed(() => {
  return props.fileId !== null &&
         isLanguageSupported.value &&
         !props.isExecuting
})

// Add result
const addResult = (result: ExecutionResult | ExecutionError) => {
  results.value.push(result)
  // Keep only last 50 results to prevent memory issues
  if (results.value.length > 50) {
    results.value.shift()
  }
}

// Clear all results
const clearResults = () => {
  results.value = []
}

// Clear results when file changes
const clearForFile = () => {
  results.value = []
}

// Check if result is an error
const isError = (result: ExecutionResult | ExecutionError): result is ExecutionError => {
  return 'error' in result
}

// Expose methods for parent
defineExpose({
  addResult,
  clearForFile
})
</script>

<template>
  <div class="flex h-full flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
    <!-- Top Bar -->
    <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div class="flex items-center gap-2">
        <button
          :disabled="!canExecute"
          :class="[
            'flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors',
            canExecute
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-500'
          ]"
          @click="emit('execute')"
        >
          <Play :size="14" />
          <span v-if="isExecuting">Running...</span>
          <span v-else>Run</span>
        </button>

        <button
          v-if="results.length > 0"
          class="rounded p-1.5 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Clear output"
          @click="clearResults"
        >
          <Trash2 :size="14" />
        </button>
      </div>

      <button
        class="rounded p-1 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
        title="Close output pane"
        @click="emit('close')"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- Results Area -->
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="results.length === 0" class="text-center text-gray-500 dark:text-gray-400">
        <p v-if="!isLanguageSupported" class="text-sm">
          Execution not supported for {{ language }}
        </p>
        <p v-else class="text-sm">
          No output yet. Click Run to execute code.
        </p>
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="(result, index) in results"
          :key="index"
          class="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
        >
          <!-- Error Result -->
          <div v-if="isError(result)" class="text-red-600 dark:text-red-400">
            <div class="mb-2 flex items-center gap-2 text-sm font-medium">
              <span class="rounded bg-red-100 px-2 py-0.5 dark:bg-red-900">ERROR</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ new Date(result.timestamp).toLocaleTimeString() }}
              </span>
            </div>
            <pre class="text-sm">{{ result.error }}</pre>
          </div>

          <!-- Success Result -->
          <div v-else>
            <div class="mb-2 flex items-center gap-2 text-sm">
              <span
                :class="[
                  'rounded px-2 py-0.5 font-medium',
                  result.exitCode === 0
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                ]"
              >
                Exit: {{ result.exitCode }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ result.language }} • {{ result.executionTime }}ms •
                {{ new Date(result.timestamp).toLocaleTimeString() }}
              </span>
            </div>

            <!-- stdout -->
            <div v-if="result.output" class="mb-2">
              <div class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">Output:</div>
              <pre class="rounded bg-white p-2 text-sm text-gray-900 dark:bg-gray-950 dark:text-gray-100">{{ result.output }}</pre>
            </div>

            <!-- stderr -->
            <div v-if="result.stderr" class="mb-2">
              <div class="mb-1 text-xs font-medium text-red-600 dark:text-red-400">Error Output:</div>
              <pre class="rounded bg-red-50 p-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">{{ result.stderr }}</pre>
            </div>

            <!-- Empty output -->
            <div v-if="!result.output && !result.stderr" class="text-sm text-gray-500 dark:text-gray-400">
              Program completed with no output
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

**Step 2: Verify TypeScript compiles**

Run: `cd client_ && npm run type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add client_/src/components/OutputPane.vue
git commit -m "feat(client): add OutputPane component"
```

---

## Task 5: Integrate OutputPane into EditorShell

**Files:**
- Modify: `client_/src/components/EditorShell.vue`

**Step 1: Add OutputPane to EditorShell**

In `client_/src/components/EditorShell.vue`, update the script section:

```typescript
import { ref, watch, nextTick, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import TopBar from './TopBar.vue'
import FileExplorer from './FileExplorer.vue'
import MonacoEditor from './MonacoEditor.vue'
import OutputPane from './OutputPane.vue'
import { useCodeExecution } from '@/composables/useCodeExecution'

// ... existing interfaces ...

// ... existing props and emits ...

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
```

Update the template section:

```vue
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

      <div class="flex flex-1">
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

        <OutputPane
          v-if="outputPaneVisible"
          ref="outputPaneRef"
          :file-id="activeFileId"
          :language="activeFile?.language ?? ''"
          :is-executing="isExecuting"
          :supported-languages="supportedLanguages"
          :style="{ width: `${outputPaneWidth}px` }"
          @execute="handleExecute"
          @close="handleCloseOutput"
        />
      </div>
    </div>
  </div>
</template>
```

**Step 2: Verify TypeScript compiles**

Run: `cd client_ && npm run type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add client_/src/components/EditorShell.vue
git commit -m "feat(client): integrate OutputPane into EditorShell"
```

---

## Task 6: Add Toggle Button for Output Pane

**Files:**
- Modify: `client_/src/components/TopBar.vue`

**Step 1: Add output pane toggle to TopBar**

In `client_/src/components/TopBar.vue`, add import and props:

```typescript
import { Terminal } from 'lucide-vue-next'

interface Props {
  activeFileName: string
  users: Map<string, UserInfo>
  outputPaneVisible: boolean
}

interface Emits {
  (e: 'toggle-output'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
```

Update the template to add the toggle button (after the file name, before user avatars):

```vue
<template>
  <div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {{ activeFileName }}
      </h1>

      <button
        :class="[
          'flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors',
          outputPaneVisible
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
        ]"
        title="Toggle output pane"
        @click="emit('toggle-output')"
      >
        <Terminal :size="14" />
        <span>Output</span>
      </button>
    </div>

    <!-- existing user avatars code -->
  </div>
</template>
```

**Step 2: Update EditorShell to pass prop and handle event**

In `client_/src/components/EditorShell.vue`, update TopBar component:

```vue
<TopBar
  :active-file-name="activeFileName"
  :users="users"
  :output-pane-visible="outputPaneVisible"
  @toggle-output="outputPaneVisible = !outputPaneVisible"
/>
```

**Step 3: Verify TypeScript compiles**

Run: `cd client_ && npm run type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add client_/src/components/TopBar.vue client_/src/components/EditorShell.vue
git commit -m "feat(client): add output pane toggle button to TopBar"
```

---

## Task 7: Add Keyboard Shortcut for Execution

**Files:**
- Modify: `client_/src/components/EditorShell.vue`

**Step 1: Add keyboard event listener**

In `client_/src/components/EditorShell.vue`, add keyboard handler:

```typescript
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'

// ... existing code ...

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
```

**Step 2: Verify TypeScript compiles**

Run: `cd client_ && npm run type-check`
Expected: No type errors

**Step 3: Test manually**

Run: `cd client_ && npm run dev`
1. Open browser to localhost
2. Click "Start Session"
3. Type some code
4. Press Ctrl+Enter (or Cmd+Enter on Mac)
Expected: Output pane opens and code executes

**Step 4: Commit**

```bash
git add client_/src/components/EditorShell.vue
git commit -m "feat(client): add Ctrl+Enter keyboard shortcut for execution"
```

---

## Task 8: Add User Attribution to Results

**Files:**
- Modify: `client_/src/components/OutputPane.vue`
- Modify: `client_/src/components/EditorShell.vue`

**Step 1: Update OutputPane to accept users map**

In `client_/src/components/OutputPane.vue`, update Props interface:

```typescript
import type { ExecutionResult, ExecutionError } from '@/composables/useCodeExecution'

interface UserInfo {
  socketId: string
  color: string
  currentFileId?: number
}

interface Props {
  fileId: number | null
  language: string
  isExecuting: boolean
  supportedLanguages: string[]
  users: Map<string, UserInfo>
}
```

Add method to get user info:

```typescript
// Get user info by socket ID
const getUserInfo = (socketId: string) => {
  return props.users.get(socketId)
}

// Get short user ID for display
const getShortUserId = (socketId: string) => {
  return socketId.substring(0, 6)
}
```

Update the result display template to show user attribution:

```vue
<!-- Success Result -->
<div v-else>
  <div class="mb-2 flex items-center gap-2 text-sm">
    <!-- User attribution -->
    <div
      class="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
      :style="{
        backgroundColor: getUserInfo(result.user.socketId)?.color ?? '#gray',
        color: 'white'
      }"
    >
      <span>{{ getShortUserId(result.user.socketId) }}</span>
    </div>

    <span
      :class="[
        'rounded px-2 py-0.5 font-medium',
        result.exitCode === 0
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      ]"
    >
      Exit: {{ result.exitCode }}
    </span>
    <span class="text-xs text-gray-500 dark:text-gray-400">
      {{ result.language }} • {{ result.executionTime }}ms •
      {{ new Date(result.timestamp).toLocaleTimeString() }}
    </span>
  </div>

  <!-- ... rest of template ... -->
</div>
```

**Step 2: Update EditorShell to pass users prop**

In `client_/src/components/EditorShell.vue`:

```vue
<OutputPane
  v-if="outputPaneVisible"
  ref="outputPaneRef"
  :file-id="activeFileId"
  :language="activeFile?.language ?? ''"
  :is-executing="isExecuting"
  :supported-languages="supportedLanguages"
  :users="users"
  :style="{ width: `${outputPaneWidth}px` }"
  @execute="handleExecute"
  @close="handleCloseOutput"
/>
```

**Step 3: Verify TypeScript compiles**

Run: `cd client_ && npm run type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add client_/src/components/OutputPane.vue client_/src/components/EditorShell.vue
git commit -m "feat(client): add user attribution to execution results"
```

---

## Task 9: Manual End-to-End Testing

**Files:**
- None (testing only)

**Step 1: Start server**

Run in terminal 1: `cd server && node index.js`
Expected: Server running on port 3000

**Step 2: Start client**

Run in terminal 2: `cd client_ && npm run dev`
Expected: Vite dev server running

**Step 3: Test basic execution**

1. Open browser to localhost (from Vite output)
2. Click "Start Session"
3. Verify you see the default main.js file
4. Click the "Output" button in TopBar
5. Verify OutputPane appears on the right
6. Click "Run" button
7. Verify you see output "Hello, World!" (or whatever is in main.js)

**Step 4: Test Python**

1. Click "+" to add new file
2. Name it "test.py", select Python
3. Type: `print("Hello from Python")`
4. Click "Run"
5. Verify output shows "Hello from Python"
6. Verify exit code is 0
7. Verify execution time is displayed

**Step 5: Test errors**

1. In test.py, type: `print(undefined_variable)`
2. Click "Run"
3. Verify error output shows in red
4. Verify exit code is non-zero

**Step 6: Test keyboard shortcut**

1. Clear editor
2. Type: `print("Shortcut test")`
3. Press Ctrl+Enter (Cmd+Enter on Mac)
4. Verify execution happens without clicking Run button

**Step 7: Test collaboration (two browser tabs)**

1. Open second browser tab to same localhost URL
2. In both tabs, click "Start Session"
3. In both tabs, select the same file
4. In Tab 1, click "Run"
5. Verify Tab 2 also sees the execution result
6. Verify Tab 2 shows Tab 1's user color/ID in the result

**Step 8: Test output pane persistence**

1. Close output pane
2. Refresh browser
3. Verify output pane stays closed
4. Open output pane
5. Refresh browser
6. Verify output pane opens automatically

**Step 9: Test unsupported language**

1. Add new file with language "markdown"
2. Type some text
3. Verify Run button is disabled
4. Verify tooltip says execution not supported

**Step 10: Document test results**

Create file: `docs/manual-test-results.md`

```markdown
# Manual Test Results - Code Execution Feature

**Date:** 2026-02-17
**Tester:** [Your name]

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Basic JavaScript execution | ✅ | Works |
| Python execution | ✅ | Works |
| Error handling | ✅ | Displays stderr in red |
| Keyboard shortcut (Ctrl+Enter) | ✅ | Works |
| Collaboration (two users) | ✅ | Both users see results |
| User attribution | ✅ | Shows user color/ID |
| Output pane persistence | ✅ | State saved in localStorage |
| Unsupported language | ✅ | Run button disabled |
| Clear output button | ✅ | Clears all results |
| File switching | ✅ | Output clears when changing files |

## Issues Found

[List any issues discovered during testing]

## Browser Tested

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
```

**Step 11: Commit test results**

```bash
git add docs/manual-test-results.md
git commit -m "docs: add manual test results for code execution feature"
```

---

## Task 10: Add Playwright Tests (Collaboration)

**Files:**
- Create: `client_/tests/e2e/code-execution.spec.ts`
- Modify: `client_/package.json` (if Playwright not installed)

**Step 1: Install Playwright (if needed)**

Run: `cd client_ && npm install -D @playwright/test`

**Step 2: Create Playwright config (if not exists)**

Create `client_/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3: Create test directory**

Run: `mkdir -p client_/tests/e2e`

**Step 4: Write Playwright tests**

Create `client_/tests/e2e/code-execution.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Code Execution', () => {
  test('should execute JavaScript code and show output', async ({ page }) => {
    // Start session
    await page.goto('/');
    await page.click('text=Start Session');

    // Wait for editor to load
    await page.waitForSelector('.monaco-editor');

    // Toggle output pane
    await page.click('text=Output');

    // Wait for output pane
    await page.waitForSelector('text=Run');

    // Click run button
    await page.click('button:has-text("Run")');

    // Wait for execution to complete
    await page.waitForSelector('text=Exit: 0', { timeout: 10000 });

    // Verify output is visible
    const output = await page.textContent('pre');
    expect(output).toBeTruthy();
  });

  test('should show error for invalid code', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Session');
    await page.waitForSelector('.monaco-editor');

    // Clear editor and type invalid code
    await page.keyboard.press('Control+A');
    await page.keyboard.type('console.log(undefined_variable)');

    // Open output and run
    await page.click('text=Output');
    await page.click('button:has-text("Run")');

    // Wait for execution
    await page.waitForTimeout(3000);

    // Verify error is shown
    const hasError = await page.locator('text=ERROR').isVisible();
    expect(hasError).toBe(true);
  });

  test('should execute code with keyboard shortcut', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Session');
    await page.waitForSelector('.monaco-editor');

    // Focus editor
    await page.click('.monaco-editor');

    // Press Ctrl+Enter
    await page.keyboard.press('Control+Enter');

    // Verify output pane opened
    await page.waitForSelector('text=Run');

    // Verify execution happened
    await page.waitForSelector('text=Exit: 0', { timeout: 10000 });
  });

  test('should show user attribution in results', async ({ context }) => {
    // Open two pages (two users)
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Both join session
    await page1.goto('/');
    await page1.click('text=Start Session');
    await page1.waitForSelector('.monaco-editor');

    await page2.goto('/');
    await page2.click('text=Start Session');
    await page2.waitForSelector('.monaco-editor');

    // Page 1: Open output and run code
    await page1.click('text=Output');
    await page1.click('button:has-text("Run")');
    await page1.waitForSelector('text=Exit: 0', { timeout: 10000 });

    // Page 2: Open output and verify it sees the result
    await page2.click('text=Output');

    // Both pages should show user attribution (color badge)
    const page1Badge = await page1.locator('[style*="backgroundColor"]').first();
    const page2Badge = await page2.locator('[style*="backgroundColor"]').first();

    expect(await page1Badge.isVisible()).toBe(true);
    expect(await page2Badge.isVisible()).toBe(true);

    await page1.close();
    await page2.close();
  });

  test('should disable run button for unsupported language', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Start Session');
    await page.waitForSelector('.monaco-editor');

    // Add markdown file
    await page.click('button[title="Add file"]');
    await page.fill('input[placeholder="File name"]', 'README.md');
    await page.selectOption('select', 'markdown');
    await page.click('text=Create');

    // Open output pane
    await page.click('text=Output');

    // Verify run button is disabled
    const runButton = page.locator('button:has-text("Run")');
    await expect(runButton).toBeDisabled();
  });
});
```

**Step 5: Add test script to package.json**

In `client_/package.json`, add:

```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

**Step 6: Run tests (with server running)**

In terminal 1, make sure server is running:
Run: `cd server && node index.js`

In terminal 2:
Run: `cd client_ && npm run test:e2e`

Expected: All tests pass

**Step 7: Commit**

```bash
git add client_/tests/e2e/code-execution.spec.ts client_/playwright.config.ts client_/package.json
git commit -m "test: add Playwright e2e tests for code execution"
```

---

## Task 11: Add Output Truncation for Long Results

**Files:**
- Modify: `server/services/executionService.js`

**Step 1: Add output truncation**

In `server/services/executionService.js`, update the executeCode function:

```javascript
const MAX_OUTPUT_LENGTH = 10000;

function truncateOutput(output, maxLength = MAX_OUTPUT_LENGTH) {
  if (output.length <= maxLength) {
    return { content: output, truncated: false };
  }
  return {
    content: output.substring(0, maxLength) + '\n\n[Output truncated - exceeded 10,000 characters]',
    truncated: true
  };
}

async function executeCode(code, language) {
  // ... existing code ...

  const executionTime = Date.now() - startTime;
  const result = response.data.run;

  const stdoutData = truncateOutput(result.stdout || '');
  const stderrData = truncateOutput(result.stderr || '');

  return {
    stdout: stdoutData.content,
    stderr: stderrData.content,
    exitCode: result.code || 0,
    executionTime,
    language: pistonConfig.language,
    version: pistonConfig.version,
    truncated: stdoutData.truncated || stderrData.truncated
  };
}
```

**Step 2: Update Socket.IO handler to include truncated flag**

In `server/index.js`, update execution_result emit:

```javascript
io.to(room).emit("execution_result", {
  fileId,
  executionId,
  output: result.stdout,
  stderr: result.stderr,
  exitCode: result.exitCode,
  executionTime: result.executionTime,
  language: result.language,
  truncated: result.truncated || false,
  user: {
    socketId: socket.id
  },
  timestamp: new Date().toISOString()
});
```

**Step 3: Update client types**

In `client_/src/composables/useCodeExecution.ts`:

```typescript
export interface ExecutionResult {
  executionId: string
  output: string
  stderr: string
  exitCode: number
  executionTime: number
  language: string
  truncated?: boolean
  user: {
    socketId: string
  }
  timestamp: string
}
```

**Step 4: Show truncation warning in OutputPane**

In `client_/src/components/OutputPane.vue`, add warning badge:

```vue
<div class="mb-2 flex items-center gap-2 text-sm">
  <!-- ... existing badges ... -->

  <span
    v-if="result.truncated"
    class="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
  >
    TRUNCATED
  </span>
</div>
```

**Step 5: Test truncation**

1. Start server and client
2. In editor, create code that prints 15,000 characters:
   ```python
   print("x" * 15000)
   ```
3. Run the code
4. Verify output is truncated and warning badge is shown

**Step 6: Commit**

```bash
git add server/services/executionService.js server/index.js client_/src/composables/useCodeExecution.ts client_/src/components/OutputPane.vue
git commit -m "feat: add output truncation for long execution results"
```

---

## Task 12: Final Verification and Documentation

**Files:**
- Create: `docs/features/code-execution.md`
- Modify: `README.md` (if exists)

**Step 1: Run all type checks**

Run: `cd client_ && npm run type-check`
Expected: No errors

**Step 2: Run linter**

Run: `cd client_ && npm run lint`
Expected: No errors

**Step 3: Create feature documentation**

Create `docs/features/code-execution.md`:

```markdown
# Code Execution Feature

Execute code in multiple programming languages directly in the collaborative editor.

## Supported Languages

- JavaScript (Node.js 18.15.0)
- TypeScript (5.0.3)
- Python (3.10.0)
- Java (15.0.2)
- C++ (10.2.0)
- C (10.2.0)
- Go (1.16.2)
- Rust (1.68.2)
- Ruby (3.0.1)
- PHP (8.2.3)

## Usage

### Running Code

1. **Via Button:** Click the "Output" button in the top bar to open the output pane, then click "Run"
2. **Via Keyboard:** Press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac) to execute code

### Output Pane

The output pane appears on the right side of the editor and shows:
- Execution results (stdout/stderr)
- Exit code
- Execution time
- User who ran the code (with color attribution)
- Timestamp

### Collaborative Execution

When multiple users are editing the same file:
- Any user can execute the code
- All users see the execution results
- Results show which user triggered the execution (color badge with user ID)

### Features

- **Real-time results:** All users see output immediately
- **Error handling:** Runtime and compilation errors displayed in red
- **Output truncation:** Very long output (>10,000 chars) is automatically truncated
- **Execution history:** Recent executions are kept in the output pane per file
- **Keyboard shortcut:** Quick execution with Ctrl/Cmd+Enter

## Technical Details

### Execution Service

Code execution uses the [Piston API](https://github.com/engineer-man/piston), an open-source code execution engine.

- **Timeout:** 10 seconds per execution
- **Output limit:** 10,000 characters
- **Rate limiting:** Subject to Piston API limits

### Architecture

```
Client                    Server                  Piston API
  |                         |                         |
  |-- execute_code -------->|                         |
  |                         |-- POST /execute ------->|
  |                         |<-- result --------------|
  |<-- execution_result ----|                         |
  |   (broadcast to room)   |                         |
```

### Socket.IO Events

**Client → Server:**
- `execute_code`: `{ fileId, code, language }`
- `get_supported_languages`: Get list of supported languages

**Server → Client:**
- `execution_result`: Successful execution result
- `execution_error`: Execution error
- `supported_languages`: Array of supported language IDs

## Limitations

- Maximum execution time: 10 seconds
- Maximum output size: 10,000 characters
- No persistent file system (each execution is isolated)
- No package installation (uses default runtime versions)
- Subject to Piston API availability and rate limits

## Future Enhancements

- Custom runtime configurations
- File upload support for multi-file projects
- Package installation (npm, pip, etc.)
- Persistent execution environments
- Input/stdin support for interactive programs
```

**Step 4: Update README (if exists)**

If `README.md` exists at project root, add:

```markdown
## Features

- Real-time collaborative code editing
- Multi-language code execution (10+ languages)
- Live cursor tracking
- User presence indicators
- File management (create, delete, switch files)
- Theme toggle (dark/light mode)
```

**Step 5: Commit documentation**

```bash
git add docs/features/code-execution.md README.md
git commit -m "docs: add code execution feature documentation"
```

---

## Completion

**All tasks complete!**

The code execution feature is now fully implemented with:
- ✅ Multi-language support (10 languages)
- ✅ Collaborative execution with user attribution
- ✅ Output pane with execution history
- ✅ Keyboard shortcut (Ctrl/Cmd+Enter)
- ✅ Error handling and truncation
- ✅ End-to-end Playwright tests
- ✅ Complete documentation

**Next steps:**
1. Use **superpowers:finishing-a-development-branch** to complete this work
2. Decide whether to merge, create PR, or continue iterating
