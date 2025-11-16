import { ref } from 'vue';
import type { Editor } from '@/types';

export function useEditorManager() {
  const editors = ref<Editor[]>([]);
  const activeEditorId = ref<number>(1);

  function setEditorsList(editorsList: Omit<Editor, 'content'>[]) {
    editors.value = editorsList.map(e => ({ ...e, content: '' }));
    const firstEditor = editors.value[0];
    if (firstEditor && !editors.value.find(e => e.id === activeEditorId.value)) {
      activeEditorId.value = firstEditor.id;
    }
  }

  function addEditor(editor: Omit<Editor, 'content'>) {
    if (!editors.value.find(e => e.id === editor.id)) {
      editors.value.push({ ...editor, content: '' });
    }
  }

  function removeEditor(editorId: number) {
    const index = editors.value.findIndex(e => e.id === editorId);
    if (index !== -1) {
      editors.value.splice(index, 1);
      
      // If removed editor was active, select another one
      const firstEditor = editors.value[0];
      if (activeEditorId.value === editorId && firstEditor) {
        activeEditorId.value = firstEditor.id;
      }
    }
  }

  function selectEditor(editorId: number) {
    activeEditorId.value = editorId;
  }

  function updateEditorContent(editorId: number, content: string) {
    const editor = editors.value.find(e => e.id === editorId);
    if (editor) {
      editor.content = content;
    }
  }

  function getEditor(editorId: number): Editor | undefined {
    return editors.value.find(e => e.id === editorId);
  }

  return {
    editors,
    activeEditorId,
    setEditorsList,
    addEditor,
    removeEditor,
    selectEditor,
    updateEditorContent,
    getEditor
  };
}
