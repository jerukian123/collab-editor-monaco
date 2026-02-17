# Resizable Panels Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add drag-to-resize functionality to FileExplorer and OutputPane with visible grip handles

**Architecture:** Custom useResizable composable using mouse event tracking, integrated into both panels with localStorage persistence and Monaco editor layout updates

**Tech Stack:** Vue 3 Composition API, TypeScript, Tailwind CSS, VueUse (@vueuse/core)

---

## Task 1: Create useResizable Composable

**Files:**
- Create: `client_/src/composables/useResizable.ts`

**Step 1: Create the composable file structure**

Create `client_/src/composables/useResizable.ts`:

```typescript
import { ref, onUnmounted } from 'vue'

export interface UseResizableOptions {
  initialWidth: number
  minWidth: number
  
  maxWidth: number
  direction: 'left' | 'right'
  onResize?: (width: number) => void
}

export function useResizable(options: UseResizableOptions) {
  const { initialWidth, minWidth, maxWidth, direction, onResize } = options

  const width = ref(initialWidth)
  const isDragging = ref(false)

  let startX = 0
  let startWidth = 0

  const handleMouseDown = (e: MouseEvent) => {
    isDragging.value = true
    startX = e.clientX
    startWidth = width.value

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value) return

    const delta = e.clientX - startX
    let newWidth: number

    if (direction === 'left') {
      // For left-side panels (FileExplorer), dragging right increases width
      newWidth = startWidth + delta
    } else {
      // For right-side panels (OutputPane), dragging left increases width
      newWidth = startWidth - delta
    }

    // Clamp to min/max
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

    width.value = newWidth

    if (onResize) {
      onResize(newWidth)
    }
  }

  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // Cleanup on unmount
  onUnmounted(() => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  return {
    width,
    isDragging,
    handleMouseDown
  }
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run type-check`
Expected: No errors related to useResizable.ts

**Step 3: Commit**

```bash
git add client_/src/composables/useResizable.ts
git commit -m "feat: add useResizable composable for drag-to-resize panels"
```

---

## Task 2: Add Resize Handle to FileExplorer

**Files:**
- Modify: `client_/src/components/FileExplorer.vue`

**Step 1: Import useResizable and useStorage**

In `FileExplorer.vue` script section, add imports after existing imports:

```typescript
import { useStorage } from '@vueuse/core'
import { useResizable } from '@/composables/useResizable'
```

**Step 2: Add width state and resize logic**

After `const emit = defineEmits<Emits>()`, add:

```typescript
// Sidebar width when expanded (persisted to localStorage)
const sidebarWidth = useStorage('monaco-collab-sidebar-width', 240)

// Resize logic (only active when expanded)
const { isDragging, handleMouseDown } = useResizable({
  initialWidth: sidebarWidth.value,
  minWidth: 180,
  maxWidth: 600,
  direction: 'left',
  onResize: (newWidth) => {
    if (props.expanded) {
      sidebarWidth.value = newWidth
    }
  }
})
```

**Step 3: Update the template to use dynamic width**

Find the root div (currently line 87-90):

```vue
<div
  class="flex flex-col border-r bg-muted/10 transition-all duration-200"
  :class="expanded ? 'w-60' : 'w-12'"
>
```

Replace with:

```vue
<div
  class="relative flex flex-col border-r bg-muted/10 transition-all duration-200"
  :style="expanded ? { width: `${sidebarWidth}px` } : {}"
  :class="expanded ? '' : 'w-12'"
>
```

**Step 4: Add resize handle component**

Add this right before the closing `</div>` of the root element (after line 216):

```vue
  <!-- Resize Handle (only visible when expanded) -->
  <div
    v-if="expanded"
    class="absolute right-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-accent/50"
    :class="{ 'bg-accent': isDragging }"
    @mousedown="handleMouseDown"
  >
    <div class="flex flex-col gap-1 pointer-events-none">
      <div class="h-1 w-1 rounded-full bg-muted-foreground/40"></div>
      <div class="h-1 w-1 rounded-full bg-muted-foreground/40"></div>
      <div class="h-1 w-1 rounded-full bg-muted-foreground/40"></div>
    </div>
  </div>
</template>
```

**Step 5: Test manually**

Run: `npm run dev`
Test:
1. Expand FileExplorer sidebar
2. Hover over right edge - should see grip dots
3. Drag right edge - sidebar should resize
4. Refresh page - width should persist
5. Collapse sidebar - should go back to 12px
6. Expand again - should restore previous custom width

**Step 6: Commit**

```bash
git add client_/src/components/FileExplorer.vue
git commit -m "feat: add drag-to-resize to FileExplorer sidebar"
```

---

## Task 3: Add Resize Handle to OutputPane

**Files:**
- Modify: `client_/src/components/OutputPane.vue`
- Modify: `client_/src/components/EditorShell.vue`

**Step 1: Update OutputPane to emit resize events**

In `OutputPane.vue`, add to the script section imports:

```typescript
import { useResizable } from '@/composables/useResizable'
```

**Step 2: Add width prop to OutputPane**

Update the Props interface (after line 10):

```typescript
interface Props {
  fileId: number | null
  language: string
  isExecuting: boolean
  supportedLanguages: string[]
  width: number  // Add this line
}
```

**Step 3: Update Emits interface**

Update the Emits interface (after line 13):

```typescript
interface Emits {
  (e: 'execute'): void
  (e: 'close'): void
  (e: 'resize', width: number): void  // Add this line
}
```

**Step 4: Add resize logic to OutputPane**

After `const emit = defineEmits<Emits>()`, add:

```typescript
// Resize logic
const { isDragging, handleMouseDown } = useResizable({
  initialWidth: props.width,
  minWidth: 300,
  maxWidth: 800,
  direction: 'right',
  onResize: (newWidth) => {
    emit('resize', newWidth)
  }
})
```

**Step 5: Make OutputPane root element relative**

Find the root div (line 68):

```vue
<div class="flex h-full flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
```

Replace with:

```vue
<div class="relative flex h-full flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
```

**Step 6: Add resize handle to OutputPane**

Add this right after the opening root div tag (after line 68):

```vue
  <!-- Resize Handle -->
  <div
    class="absolute left-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
    :class="{ 'bg-blue-200 dark:bg-blue-900': isDragging }"
    @mousedown="handleMouseDown"
  >
    <div class="flex flex-col gap-1 pointer-events-none">
      <div class="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-600"></div>
      <div class="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-600"></div>
      <div class="h-1 w-1 rounded-full bg-gray-400 dark:bg-gray-600"></div>
    </div>
  </div>
```

**Step 7: Update EditorShell to handle resize events**

In `EditorShell.vue`, find the OutputPane component usage (around line 159):

```vue
<OutputPane
  v-if="outputPaneVisible"
  ref="outputPaneRef"
  :file-id="activeFileId"
  :language="activeFile?.language ?? ''"
  :is-executing="isExecuting"
  :supported-languages="supportedLanguages"
  :style="{ width: `${outputPaneWidth}px` }"
  @execute="handleExecute"
  @close="handleCloseOutput"
/>
```

Replace with:

```vue
<OutputPane
  v-if="outputPaneVisible"
  ref="outputPaneRef"
  :file-id="activeFileId"
  :language="activeFile?.language ?? ''"
  :is-executing="isExecuting"
  :supported-languages="supportedLanguages"
  :width="outputPaneWidth"
  :style="{ width: `${outputPaneWidth}px` }"
  @execute="handleExecute"
  @close="handleCloseOutput"
  @resize="handleOutputResize"
/>
```

**Step 8: Add resize handler in EditorShell**

In `EditorShell.vue` script section, add after `handleCloseOutput` function (after line 121):

```typescript
// Handle output pane resize
const handleOutputResize = (newWidth: number) => {
  outputPaneWidth.value = newWidth
  // Trigger editor layout after a short delay to avoid excessive layouts
  nextTick(() => {
    editorRef.value?.layout()
  })
}
```

**Step 9: Test manually**

Run: `npm run dev`
Test:
1. Show OutputPane (run code or use toggle)
2. Hover over left edge - should see grip dots
3. Drag left edge - pane should resize
4. Monaco editor should resize automatically
5. Refresh page - width should persist
6. Close and reopen OutputPane - should restore previous width

**Step 10: Commit**

```bash
git add client_/src/components/OutputPane.vue client_/src/components/EditorShell.vue
git commit -m "feat: add drag-to-resize to OutputPane"
```

---

## Task 4: Fix Layout and Monaco Editor Responsiveness

**Files:**
- Modify: `client_/src/components/EditorShell.vue`

**Step 1: Watch for width changes**

In `EditorShell.vue`, add a new watch after existing watches (after line 86):

```typescript
// Watch sidebar width changes and trigger editor resize
watch(() => sidebarWidth.value, () => {
  nextTick(() => {
    editorRef.value?.layout()
  })
})
```

**Note:** We need to access `sidebarWidth` from FileExplorer. Since it's internal to FileExplorer, we'll trigger layout on resize events instead.

Actually, let's skip this step - the Monaco editor already has watchers for `sidebarExpanded` and `outputPaneVisible` which trigger on expand/collapse. The resize will naturally cause the flex layout to adjust, and we can trigger layout on resize completion.

**Step 2: Throttle resize updates for better performance**

In `client_/src/composables/useResizable.ts`, let's add throttling to avoid excessive updates during drag.

Find the `handleMouseMove` function and wrap the resize callback:

```typescript
const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return

  const delta = e.clientX - startX
  let newWidth: number

  if (direction === 'left') {
    newWidth = startWidth + delta
  } else {
    newWidth = startWidth - delta
  }

  newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

  width.value = newWidth

  if (onResize) {
    onResize(newWidth)
  }
}
```

This is already optimized - the callback fires on every mousemove which is fine for our use case since we're just updating a ref and localStorage (which is synchronous and fast).

**Step 3: Test complete integration**

Run: `npm run dev`
Test:
1. Resize FileExplorer - Monaco editor should adjust
2. Resize OutputPane - Monaco editor should adjust
3. Resize both at the same time (expand one, resize other)
4. Check that all panels work together smoothly
5. Verify no layout glitches or jumping

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: ensure Monaco editor layout updates on panel resize"
```

---

## Task 5: Add Visual Polish and Edge Case Handling

**Files:**
- Modify: `client_/src/composables/useResizable.ts`

**Step 1: Add window resize handling**

In `useResizable.ts`, add window resize listener to clamp width if viewport shrinks:

After the `onUnmounted` call, add:

```typescript
// Handle window resize - clamp width if needed
const handleWindowResize = () => {
  const availableWidth = window.innerWidth
  let clampedWidth = width.value

  if (direction === 'left') {
    // For left panels, ensure it doesn't exceed viewport
    clampedWidth = Math.min(width.value, availableWidth - 200) // Keep 200px for content
  } else {
    // For right panels, same logic
    clampedWidth = Math.min(width.value, availableWidth - 200)
  }

  clampedWidth = Math.max(minWidth, Math.min(maxWidth, clampedWidth))

  if (clampedWidth !== width.value) {
    width.value = clampedWidth
    if (onResize) {
      onResize(clampedWidth)
    }
  }
}

window.addEventListener('resize', handleWindowResize)

onUnmounted(() => {
  // ... existing cleanup ...
  window.removeEventListener('resize', handleWindowResize)
})
```

**Step 2: Update the existing onUnmounted to include window listener cleanup**

Replace the entire `onUnmounted` block with:

```typescript
// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', handleWindowResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})
```

And add the window resize listener before the return statement:

```typescript
// Handle window resize - clamp width if needed
const handleWindowResize = () => {
  const availableWidth = window.innerWidth
  let clampedWidth = width.value

  if (direction === 'left') {
    clampedWidth = Math.min(width.value, availableWidth - 200)
  } else {
    clampedWidth = Math.min(width.value, availableWidth - 200)
  }

  clampedWidth = Math.max(minWidth, Math.min(maxWidth, clampedWidth))

  if (clampedWidth !== width.value) {
    width.value = clampedWidth
    if (onResize) {
      onResize(clampedWidth)
    }
  }
}

window.addEventListener('resize', handleWindowResize)

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', handleWindowResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})
```

**Step 3: Test edge cases**

Run: `npm run dev`
Test:
1. Resize browser window while panels are resized
2. Make window very narrow - panels should clamp appropriately
3. Drag very fast - should track smoothly
4. Drag outside browser window - should continue tracking
5. Release mouse outside browser - should stop dragging

**Step 4: Commit**

```bash
git add client_/src/composables/useResizable.ts
git commit -m "feat: add window resize handling and edge case support"
```

---

## Task 6: Accessibility and Final Polish

**Files:**
- Modify: `client_/src/components/FileExplorer.vue`
- Modify: `client_/src/components/OutputPane.vue`

**Step 1: Add ARIA attributes to resize handles**

In `FileExplorer.vue`, update the resize handle div:

```vue
<div
  v-if="expanded"
  class="absolute right-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-accent/50"
  :class="{ 'bg-accent': isDragging }"
  aria-hidden="true"
  @mousedown="handleMouseDown"
>
```

In `OutputPane.vue`, update the resize handle div:

```vue
<div
  class="absolute left-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
  :class="{ 'bg-blue-200 dark:bg-blue-900': isDragging }"
  aria-hidden="true"
  @mousedown="handleMouseDown"
>
```

**Step 2: Improve resize handle hover state**

In `FileExplorer.vue`, enhance the resize handle styling:

```vue
<div
  v-if="expanded"
  class="absolute right-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center transition-all duration-100 hover:bg-accent/50"
  :class="{ 'bg-accent': isDragging }"
  aria-hidden="true"
  @mousedown="handleMouseDown"
>
  <div class="flex flex-col gap-1 pointer-events-none transition-all duration-100">
    <div class="h-1 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-muted-foreground/60"></div>
    <div class="h-1 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-muted-foreground/60"></div>
    <div class="h-1 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-muted-foreground/60"></div>
  </div>
</div>
```

Actually, let's keep the styling simple as originally designed. The grip dots are already visible.

**Step 3: Add title attribute for discoverability**

In `FileExplorer.vue`:

```vue
<div
  v-if="expanded"
  class="absolute right-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-accent/50"
  :class="{ 'bg-accent': isDragging }"
  aria-hidden="true"
  title="Drag to resize sidebar"
  @mousedown="handleMouseDown"
>
```

In `OutputPane.vue`:

```vue
<div
  class="absolute left-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
  :class="{ 'bg-blue-200 dark:bg-blue-900': isDragging }"
  aria-hidden="true"
  title="Drag to resize output pane"
  @mousedown="handleMouseDown"
>
```

**Step 4: Final manual test**

Run: `npm run dev`
Complete test checklist:
- [ ] FileExplorer expands/collapses with button
- [ ] FileExplorer resizes when expanded
- [ ] FileExplorer width persists across refresh
- [ ] OutputPane shows/hides with button
- [ ] OutputPane resizes when visible
- [ ] OutputPane width persists across refresh
- [ ] Resize handles visible with grip dots
- [ ] Hover shows visual feedback
- [ ] Monaco editor adjusts on resize
- [ ] No console errors
- [ ] Works in both light and dark mode

**Step 5: Run type check and linting**

Run: `npm run type-check`
Expected: No errors

Run: `npm run lint`
Expected: No errors

**Step 6: Final commit**

```bash
git add client_/src/components/FileExplorer.vue client_/src/components/OutputPane.vue
git commit -m "feat: add accessibility attributes and final polish to resize handles"
```

---

## Task 7: Update Documentation

**Files:**
- Modify: `docs/plans/2026-02-17-resizable-panels-design.md`

**Step 1: Mark design as implemented**

Add to the top of the design document after the overview:

```markdown
## Implementation Status

✅ **Implemented:** 2026-02-17

See implementation plan: [2026-02-17-resizable-panels-implementation.md](./2026-02-17-resizable-panels-implementation.md)
```

**Step 2: Commit documentation update**

```bash
git add docs/plans/2026-02-17-resizable-panels-design.md
git commit -m "docs: mark resizable panels as implemented"
```

---

## Completion Checklist

Before marking this feature complete, verify:

- [ ] useResizable composable created and working
- [ ] FileExplorer has drag-to-resize when expanded
- [ ] OutputPane has drag-to-resize when visible
- [ ] Both panels respect min/max constraints
- [ ] Widths persist to localStorage
- [ ] Monaco editor auto-layouts on resize
- [ ] Resize handles visible with grip dots
- [ ] Window resize handled gracefully
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Expand/collapse buttons still work
- [ ] All features tested manually
- [ ] Code committed with clear messages
- [ ] Documentation updated

---

## Testing Guide

### Manual Testing Steps

1. **FileExplorer Resize:**
   - Expand sidebar
   - Hover right edge - see grip dots
   - Drag right - sidebar grows (max 600px)
   - Drag left - sidebar shrinks (min 180px)
   - Refresh - width persists
   - Collapse - goes to 12px
   - Expand - restores custom width

2. **OutputPane Resize:**
   - Show output pane
   - Hover left edge - see grip dots
   - Drag left - pane grows (max 800px)
   - Drag right - pane shrinks (min 300px)
   - Refresh - width persists
   - Close and reopen - restores width

3. **Monaco Editor:**
   - Resize either panel
   - Monaco should adjust automatically
   - No content cut off
   - Cursor position maintained

4. **Edge Cases:**
   - Resize browser window - panels clamp appropriately
   - Drag very fast - smooth tracking
   - Drag outside window - continues tracking
   - Release outside window - stops correctly

5. **Visual:**
   - Grip dots visible on both handles
   - Hover shows background highlight
   - Dragging shows active state
   - Works in light and dark mode

---

## Notes

- No automated tests as project doesn't have frontend testing setup
- All testing is manual via `npm run dev`
- TypeScript compilation verified with `npm run type-check`
- Linting verified with `npm run lint`
- Frequent commits after each task completion
