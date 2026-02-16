<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>Editors</h3>
      <button @click="addEditor" class="add-btn">+</button>
    </div>
    <div class="editor-list">
      <div
        v-for="editor in editors"
        :key="editor.id"
        :class="['editor-item', { active: editor.id === activeEditorId }]"
        @click="selectEditor(editor.id)"
      >
        <span class="editor-name">{{ editor.name }}</span>
        <button 
          v-if="editors.length > 1"
          @click.stop="removeEditor(editor.id)" 
          class="remove-btn"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Editor {
  id: number;
  name: string;
  language: string;
}

interface Props {
  editors: Editor[];
  activeEditorId: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  editorSelected: [id: number];
  editorAdded: [editor: { id: number; name: string; language: string }];
  editorRemoved: [id: number];
}>();

let nextId = 100; // Use high number to avoid conflicts with server IDs

const addEditor = () => {
  const newEditor = {
    id: nextId++,
    name: `file${nextId - 100}.js`,
    language: 'javascript'
  };
  emit('editorAdded', newEditor);
};

const removeEditor = (id: number) => {
  if (props.editors.length > 1) {
    emit('editorRemoved', id);
  }
};

const selectEditor = (id: number) => {
  emit('editorSelected', id);
};
</script>

<style scoped>
.sidebar {
  width: 250px;
  background: #1e1e1e;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  color: #ccc;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.add-btn {
  background: #0e639c;
  border: none;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.2s;
}

.add-btn:hover {
  background: #1177bb;
}

.editor-list {
  flex: 1;
  overflow-y: auto;
}

.editor-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
  border-left: 2px solid transparent;
}

.editor-item:hover {
  background: #2a2d2e;
}

.editor-item.active {
  background: #094771;
  border-left-color: #0e639c;
}

.editor-name {
  font-size: 13px;
  flex: 1;
}

.remove-btn {
  background: transparent;
  border: none;
  color: #999;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  opacity: 0;
  transition: all 0.2s;
}

.editor-item:hover .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  background: #f14c4c;
  color: #fff;
}
</style>
