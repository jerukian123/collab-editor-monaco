<template>
  <div ref="editorContainer" style="height: 100vh; width: 100vw"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSocket } from '@/composables/useSocket';
import { useMonacoEditor } from '@/composables/useMonacoEditor';
import type { CursorPosition, CodeUpdate } from '@/types';

interface Props {
  editorId: number;
  language?: string;
  initialContent?: string;
  isVisible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  language: 'javascript',
  initialContent: '',
  isVisible: false
});

const emit = defineEmits<{
  contentChange: [editorId: number, content: string];
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
const { clientId, connect, emit: socketEmit, on } = useSocket();

// Initialize Monaco editor with composable
const { updateContent, updateRemoteCursor } = useMonacoEditor(editorContainer, {
  initialContent: props.initialContent,
  language: props.language,
  isVisible: props.isVisible,
  onContentChange: (content) => {
    emit('contentChange', props.editorId, content);
    socketEmit('send_code', {
      code: content,
      editorId: props.editorId
    });
  },
  onCursorPositionChange: (position) => {
    socketEmit('send_cursor_position', {
      lineNumber: position.lineNumber,
      column: position.column,
      socketId: clientId.value,
      editorId: props.editorId
    });
  }
});

onMounted(() => {
  const socket = connect();

  // Join editor room when connected
  socket.on('connect', () => {
    socketEmit('join_editor', props.editorId);
    console.log(`Joined editor room: ${props.editorId}`);
  });

  // Handle incoming code changes
  on('receive_code', (data: CodeUpdate) => {
    if (data.editorId === props.editorId) {
      updateContent(data.code, true);
      console.log(`Received code for editor ${data.editorId}`);
    }
  });

  // Handle remote cursor positions
  on('receive_cursor_position', (data: CursorPosition) => {
    if (data.socketId !== clientId.value && data.editorId === props.editorId) {
      updateRemoteCursor(data);
    }
  });
});
</script>

<style scoped>
</style>
