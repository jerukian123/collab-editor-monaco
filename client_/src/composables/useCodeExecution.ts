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
    emit('get_supported_languages', {})
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
