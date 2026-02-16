import { ref, onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue';
import * as monaco from 'monaco-editor';
import type { RemoteCursor, CursorPosition } from '@/types';
import { generateRandomColor, createCursorWidget } from '@/utils/cursorWidget';
import { EDITOR_CONFIG } from '@/constants/index';

export function useMonacoEditor(
  container: Ref<HTMLDivElement | null>,
  options: {
    initialContent?: string;
    language?: string;
    isVisible?: boolean;
    onContentChange?: (content: string) => void;
    onCursorPositionChange?: (position: { lineNumber: number; column: number }) => void;
  }
) {
  const editorRef = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
  const remoteCursors = new Map<string, RemoteCursor>();

  function initializeEditor() {
    if (!container.value) return;

    editorRef.value = monaco.editor.create(container.value, {
      value: options.initialContent || '',
      language: options.language || EDITOR_CONFIG.defaultLanguage,
      theme: EDITOR_CONFIG.theme,
      fontSize: EDITOR_CONFIG.fontSize
    });

    setupEventHandlers();
  }

  function setupEventHandlers() {
    if (!editorRef.value) return;

    // Content change handler
    editorRef.value.onKeyUp(() => {
      if (editorRef.value && options.onContentChange) {
        const content = editorRef.value.getValue();
        options.onContentChange(content);
      }
    });

    // Cursor position change handler
    editorRef.value.onDidChangeCursorPosition((event) => {
      if (options.onCursorPositionChange) {
        options.onCursorPositionChange(event.position);
      }
    });
  }

  function updateContent(content: string, preserveCursor = true) {
    if (!editorRef.value) return;

    const currentPosition = preserveCursor ? editorRef.value.getPosition() : null;
    editorRef.value.setValue(content);
    
    if (currentPosition) {
      editorRef.value.setPosition(currentPosition);
    }
  }

  function updateRemoteCursor(data: CursorPosition) {
    if (!editorRef.value) return;

    const existingCursor = remoteCursors.get(data.socketId);
    
    if (existingCursor) {
      // Update existing cursor position
      existingCursor.position = {
        lineNumber: data.lineNumber,
        column: data.column
      };
      editorRef.value.layoutContentWidget(existingCursor.widget);
    } else {
      // Create new cursor widget
      const position = { lineNumber: data.lineNumber, column: data.column };
      const color = generateRandomColor();
      const widget = createCursorWidget(data.socketId, position, color);
      
      editorRef.value.addContentWidget(widget);
      remoteCursors.set(data.socketId, { widget, position, color });
    }
  }

  function removeRemoteCursor(socketId: string) {
    const cursor = remoteCursors.get(socketId);
    if (cursor && editorRef.value) {
      editorRef.value.removeContentWidget(cursor.widget);
      remoteCursors.delete(socketId);
    }
  }

  function layout() {
    editorRef.value?.layout();
  }

  function dispose() {
    editorRef.value?.dispose();
    remoteCursors.clear();
  }

  // Watch for visibility changes and relayout
  if (options.isVisible !== undefined) {
    watch(() => options.isVisible, async (isVisible) => {
      if (isVisible && editorRef.value) {
        await nextTick();
        layout();
      }
    });
  }

  onMounted(() => {
    initializeEditor();
  });

  onUnmounted(() => {
    dispose();
  });

  return {
    editor: editorRef,
    updateContent,
    updateRemoteCursor,
    removeRemoteCursor,
    layout,
    dispose
  };
}
