<script setup lang="ts">
import { onMounted } from 'vue';
import Playground from './components/Playground.refactored.vue';
import Sidebar from './components/Sidebar.vue';
import { useSocket } from '@/composables/useSocket';
import { useEditorManager } from '@/composables/useEditorManager';
import type { Editor } from '@/types';

const { connect, emit, on } = useSocket();
const {
  editors,
  activeEditorId,
  setEditorsList,
  addEditor,
  removeEditor,
  selectEditor,
  updateEditorContent
} = useEditorManager();

onMounted(() => {
  connect();

  // Receive initial editors list
  on('editors_list', (editorsList: Omit<Editor, 'content'>[]) => {
    setEditorsList(editorsList);
    console.log('Received editors list:', editorsList);
  });

  // Handle editor added by another client
  on('editor_added', (editor: Omit<Editor, 'content'>) => {
    addEditor(editor);
    console.log('Editor added from server:', editor);
  });

  // Handle editor removed by another client
  on('editor_removed', (editorId: number) => {
    removeEditor(editorId);
    console.log('Editor removed from server:', editorId);
  });
});

function handleEditorSelected(id: number) {
  selectEditor(id);
  console.log('Editor selected:', id);
}

function handleEditorAdded(editor: { id: number; name: string; language: string }) {
  emit('add_editor', { name: editor.name, language: editor.language });
}

function handleEditorRemoved(id: number) {
  emit('remove_editor', id);
}

function handleContentChange(editorId: number, content: string) {
  updateEditorContent(editorId, content);
}
</script>

<template>
  <main class="app-container">
    <Sidebar 
      :editors="editors"
      :active-editor-id="activeEditorId"
      @editor-selected="handleEditorSelected"
      @editor-added="handleEditorAdded"
      @editor-removed="handleEditorRemoved"
    />
    <div class="editor-container">
      <Playground 
        v-for="editor in editors"
        :key="editor.id"
        v-show="editor.id === activeEditorId"
        :editor-id="editor.id"
        :language="editor.language"
        :initial-content="editor.content"
        :is-visible="editor.id === activeEditorId"
        @content-change="handleContentChange"
      />
    </div>
  </main>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}
</style>
