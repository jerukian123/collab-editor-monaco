<script setup lang="ts">
import { ref, computed } from 'vue'
import { Play, X, Trash2 } from 'lucide-vue-next'
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

// Get user info by socket ID
const getUserInfo = (socketId: string) => {
  return props.users.get(socketId)
}

// Get short user ID for display
const getShortUserId = (socketId: string) => {
  return socketId.substring(0, 6)
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
