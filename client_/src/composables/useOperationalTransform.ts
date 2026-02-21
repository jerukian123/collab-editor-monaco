import { ref, type Ref } from 'vue'
import * as monaco from 'monaco-editor'

export type Operation =
  | { type: 'retain'; count: number }
  | { type: 'insert'; text: string }
  | { type: 'delete'; count: number }

export interface OperationData {
  editorId: number
  operation: Operation[]
  baseRevision: number
}

export function useOperationalTransform() {
  const currentRevision = ref(0)
  const pendingOps: Operation[][] = []
  const isApplyingRemoteOp = ref(false)

  /**
   * Convert Monaco content change events to OT operations
   */
  function monacoChangesToOperation(
    changes: monaco.editor.IModelContentChange[],
    model: monaco.editor.ITextModel
  ): Operation[] {
    if (changes.length === 0) return []

    const ops: Operation[] = []
    let cursor = 0
    const documentLength = model.getValueLength()

    // Sort changes by offset
    const sortedChanges = [...changes].sort((a, b) => a.rangeOffset - b.rangeOffset)

    for (const change of sortedChanges) {
      const offset = change.rangeOffset

      // Retain up to change position
      if (offset > cursor) {
        ops.push({ type: 'retain', count: offset - cursor })
        cursor = offset
      }

      // Delete old content
      if (change.rangeLength > 0) {
        ops.push({ type: 'delete', count: change.rangeLength })
        cursor += change.rangeLength
      }

      // Insert new content
      if (change.text) {
        ops.push({ type: 'insert', text: change.text })
      }
    }

    return ops
  }

  /**
   * Apply an operation to Monaco editor
   */
  function applyOperationToEditor(
    operation: Operation[],
    editor: monaco.editor.IStandaloneCodeEditor
  ) {
    const model = editor.getModel()
    if (!model) return

    isApplyingRemoteOp.value = true

    let cursor = 0
    const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []

    for (const op of operation) {
      if (op.type === 'retain') {
        cursor += op.count
      } else if (op.type === 'insert') {
        const position = model.getPositionAt(cursor)
        edits.push({
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text: op.text
        })
        cursor += op.text.length
      } else if (op.type === 'delete') {
        const startPos = model.getPositionAt(cursor)
        const endPos = model.getPositionAt(cursor + op.count)
        edits.push({
          range: new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column
          ),
          text: ''
        })
      }
    }

    if (edits.length > 0) {
      editor.executeEdits('remote-operation', edits)
    }

    isApplyingRemoteOp.value = false
  }

  /**
   * Reset revision (for sync)
   */
  function setRevision(revision: number) {
    currentRevision.value = revision
  }

  return {
    currentRevision,
    isApplyingRemoteOp,
    monacoChangesToOperation,
    applyOperationToEditor,
    setRevision
  }
}
