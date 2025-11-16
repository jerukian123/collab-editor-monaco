<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Playground from './components/Playground.vue';
import Sidebar from './components/Sidebar.vue';
import io from 'socket.io-client';

interface Editor {
  id: number;
  name: string;
  language: string;
  content: string;
}

const activeEditorId = ref<number>(1);
const editors = ref<Editor[]>([]);
let socketRef: any = null;

onMounted(() => {
  // Initialize Socket.IO for editor list sync
  socketRef = io("http://localhost:3000");

  // Receive initial editors list
  socketRef.on("editors_list", (editorsList: { id: number; name: string; language: string }[]) => {
    editors.value = editorsList.map(e => ({ ...e, content: '' }));
    if (editors.value.length > 0) {
      activeEditorId.value = editors.value[0].id;
    }
    console.log("Received editors list:", editorsList);
  });

  // Handle editor added by another client
  socketRef.on("editor_added", (editor: { id: number; name: string; language: string }) => {
    if (!editors.value.find(e => e.id === editor.id)) {
      editors.value.push({ ...editor, content: '' });
      console.log("Editor added from server:", editor);
    }
  });

  // Handle editor removed by another client
  socketRef.on("editor_removed", (editorId: number) => {
    const index = editors.value.findIndex(e => e.id === editorId);
    if (index !== -1) {
      editors.value.splice(index, 1);
      
      // If removed editor was active, select another one
      if (activeEditorId.value === editorId && editors.value.length > 0) {
        activeEditorId.value = editors.value[0].id;
      }
      console.log("Editor removed from server:", editorId);
    }
  });
});

onUnmounted(() => {
  if (socketRef) {
    socketRef.disconnect();
  }
});

const handleEditorSelected = (id: number) => {
  activeEditorId.value = id;
  console.log('Editor selected:', id);
};

const handleEditorAdded = (editor: { id: number; name: string; language: string }) => {
  // Send to server to sync with all clients
  if (socketRef) {
    socketRef.emit("add_editor", { name: editor.name, language: editor.language });
  }
};

const handleEditorRemoved = (id: number) => {
  // Send to server to sync with all clients
  if (socketRef) {
    socketRef.emit("remove_editor", id);
  }
};

const handleContentChange = (editorId: number, content: string) => {
  const editor = editors.value.find(e => e.id === editorId);
  if (editor) {
    editor.content = content;
  }
};
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
