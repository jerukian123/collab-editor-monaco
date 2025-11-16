# Refactored Codebase Structure

## Overview
The codebase has been refactored to improve readability, maintainability, and reusability by extracting logic into composables and utilities.

## Directory Structure

```
src/
├── components/          # Vue components
│   ├── Playground.vue   # Monaco editor wrapper (refactored)
│   └── Sidebar.vue      # Editor list sidebar
├── composables/         # Reusable Vue composables
│   ├── useSocket.ts     # Socket.IO connection management
│   ├── useMonacoEditor.ts # Monaco editor initialization & management
│   └── useEditorManager.ts # Editor list state management
├── utils/               # Utility functions
│   └── cursorWidget.ts  # Cursor widget creation helpers
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared interfaces
├── constants/           # App-wide constants
│   └── index.ts         # Socket events, config, URLs
└── assets/              # Static assets
    └── main.css         # Global styles
```

## Key Composables

### `useSocket()`
Manages Socket.IO connection lifecycle and provides helper methods.

**Returns:**
- `clientId` - Connected client's socket ID
- `isConnected` - Connection status
- `connect()` - Establish connection
- `emit(event, data)` - Send event to server
- `on(event, callback)` - Listen for server events
- `disconnect()` - Close connection

### `useMonacoEditor(container, options)`
Initializes and manages Monaco editor instance.

**Parameters:**
- `container` - Ref to DOM element
- `options` - Configuration object with callbacks

**Returns:**
- `editor` - Monaco editor instance
- `updateContent(content)` - Update editor content
- `updateRemoteCursor(data)` - Show/update remote cursor
- `layout()` - Recalculate editor dimensions

### `useEditorManager()`
Manages the list of editors and active editor state.

**Returns:**
- `editors` - Array of editor objects
- `activeEditorId` - Currently selected editor ID
- `addEditor(editor)` - Add new editor to list
- `removeEditor(id)` - Remove editor from list
- `selectEditor(id)` - Set active editor
- `updateEditorContent(id, content)` - Update editor content

## Migration Guide

### Before (Old Playground.vue)
200+ lines with mixed concerns: socket handling, Monaco setup, cursor management all in one file.

### After (New Playground.vue)
~80 lines, focused on component logic only. Complex operations delegated to composables.

## Benefits

1. **Separation of Concerns** - Each composable has a single responsibility
2. **Reusability** - Composables can be used in multiple components
3. **Testability** - Isolated functions are easier to unit test
4. **Type Safety** - Centralized TypeScript types prevent errors
5. **Maintainability** - Changes to one feature don't affect others
6. **Readability** - Smaller files, clearer intent

## Usage Example

```vue
<script setup lang="ts">
import { useSocket } from '@/composables/useSocket';
import { useMonacoEditor } from '@/composables/useMonacoEditor';

const editorContainer = ref(null);
const { emit, on } = useSocket();

const { updateContent } = useMonacoEditor(editorContainer, {
  initialContent: 'console.log("Hello")',
  onContentChange: (content) => {
    emit('code_change', content);
  }
});
</script>
```

## Next Steps

1. Replace old `App.vue` with `App.refactored.vue`
2. Replace old `Playground.vue` with `Playground.refactored.vue`
3. Remove old files once testing is complete
4. Add unit tests for composables
5. Add JSDoc comments to exported functions
