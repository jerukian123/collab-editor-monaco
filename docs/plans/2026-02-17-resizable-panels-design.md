# Resizable Panels Design

**Date:** 2026-02-17
**Feature:** Drag-to-resize functionality for FileExplorer and OutputPane

## Overview

Add drag-to-resize capability to both the FileExplorer (left sidebar) and OutputPane (right panel) to give users fine-grained control over panel widths while maintaining existing expand/collapse and show/hide functionality.

## Requirements

### FileExplorer (Left Sidebar)
- Keep existing expand/collapse button (toggles between 60px and 12px)
- Add drag-to-resize when expanded
- Width constraints: 180px - 600px when expanded
- Resize handle on right edge
- Persist width to localStorage

### OutputPane (Right Panel)
- Keep existing close button (X)
- Add drag-to-resize for width adjustment
- Width constraints: 300px - 800px
- Resize handle on left edge
- Persist width to localStorage (already exists)

### Visual Design
- Visible resize handle with grip dots
- Always visible (not subtle/invisible)
- Clear visual feedback during drag

## Architecture

### Core Mechanism

The resize system is built around a reusable `useResizable` composable that handles drag logic:

1. Resize handle positioned on panel border
2. Mouse down on handle → start tracking mouse movement
3. Mouse move → calculate new width based on mouse position and direction
4. Apply min/max constraints
5. Update panel width reactively
6. Mouse up → stop tracking, persist to localStorage

### Components

- **useResizable composable** - Reusable drag logic using VueUse primitives
- **Resize handle** - Visual grip component (inline in each panel)
- **Modified FileExplorer** - Integrate resize handle and logic
- **Modified OutputPane** - Integrate resize handle and logic
- **EditorShell** - Watch width changes and trigger Monaco editor resize

### Data Flow

- Each panel maintains its own width in a reactive ref
- Width constrained by min/max values
- Width persisted to localStorage using `useStorage`
- FileExplorer needs new `sidebarWidth` storage key
- OutputPane uses existing `outputPaneWidth` storage key

## Implementation Details

### useResizable Composable

**Location:** `client_/src/composables/useResizable.ts`

**Interface:**
```typescript
interface UseResizableOptions {
  initialWidth: number
  minWidth: number
  maxWidth: number
  direction: 'left' | 'right'  // which side to resize from
  onResize?: (width: number) => void
}

function useResizable(options: UseResizableOptions) {
  return {
    width: Ref<number>           // current width
    isDragging: Ref<boolean>     // is user dragging?
    handleMouseDown: (e: MouseEvent) => void  // attach to handle
  }
}
```

**Implementation:**
- Use `ref` for width and isDragging state
- On `handleMouseDown`:
  - Record starting mouse X position and starting width
  - Add document-level mousemove and mouseup listeners
- On `mousemove`:
  - Calculate delta from start position
  - For 'left' direction (FileExplorer): add delta to width
  - For 'right' direction (OutputPane): subtract delta from width
  - Clamp result between min/max
  - Update width ref
  - Call optional onResize callback
- On `mouseup`: remove listeners, set isDragging to false
- Add cursor style management (col-resize cursor during drag)

### FileExplorer Integration

**Changes:**
1. Add new localStorage key: `monaco-collab-sidebar-width` (default: 240px)
2. Modify width logic:
   - When collapsed: use `w-12` (12px)
   - When expanded: use dynamic `sidebarWidth` value
3. Add resize handle on right edge (direction: 'left')
4. Only show resize handle when `expanded === true`
5. Keep expand/collapse button unchanged

**Code:**
```typescript
const sidebarWidth = useStorage('monaco-collab-sidebar-width', 240)
const { width, isDragging, handleMouseDown } = useResizable({
  initialWidth: sidebarWidth.value,
  minWidth: 180,
  maxWidth: 600,
  direction: 'left',
  onResize: (newWidth) => {
    sidebarWidth.value = newWidth
  }
})
```

### OutputPane Integration

**Changes:**
1. Use existing `outputPaneWidth` from localStorage (default: 400px)
2. Add resize handle on left edge (direction: 'right')
3. Always show resize handle when pane is visible
4. Keep close button unchanged

**Code:**
```typescript
// In OutputPane.vue (receives width as prop from parent)
const { isDragging, handleMouseDown } = useResizable({
  initialWidth: props.width,
  minWidth: 300,
  maxWidth: 800,
  direction: 'right',
  onResize: (newWidth) => {
    emit('resize', newWidth)  // notify parent to update storage
  }
})
```

### EditorShell Changes

- Listen for OutputPane resize events and update `outputPaneWidth` storage
- Trigger Monaco editor layout on width changes (already implemented for expand/collapse)

## Visual Design

### Resize Handle Structure

```vue
<div
  class="resize-handle"
  @mousedown="handleMouseDown"
>
  <div class="grip-dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
</div>
```

### Styling (Tailwind CSS)

**resize-handle:**
- Width: 8px (touch-friendly)
- Height: 100%
- Absolute positioned on edge
- Background: transparent, hover shows subtle bg (gray-200 light / gray-700 dark)
- Cursor: col-resize
- z-index above content

**grip-dots:**
- Centered vertically and horizontally
- 3 dots stacked vertically, 4px spacing
- Each dot: 3px circle
- Color: gray-400 light / gray-600 dark

**Active state (isDragging):**
- Handle background: blue-100 / blue-900
- Dots become more prominent
- Body cursor: col-resize

### Positioning

- **FileExplorer**: `absolute right-0 top-0` (right edge)
- **OutputPane**: `absolute left-0 top-0` (left edge)

### Interaction Feedback

- Hover: handle background subtly appears
- Active drag: handle and dots more prominent, body cursor changes
- Smooth transition on hover (100ms ease)

## State Persistence

### Storage Keys

1. **FileExplorer**: `monaco-collab-sidebar-width` (new, default: 240)
   - Only stores width when expanded
   - Collapsed state uses existing `monaco-collab-sidebar-expanded` key

2. **OutputPane**: `monaco-collab-output-width` (existing, default: 400)
   - Wire up to resize events

### Implementation

Use `useStorage` from VueUse (already in use):
- Automatic localStorage sync
- Reactive updates
- Type-safe

## Edge Cases

1. **Window resize**: Clamp panel width if viewport becomes smaller
2. **Rapid dragging**: Throttle resize updates (16ms / 60fps)
3. **Drag outside viewport**: Continue tracking with document listeners
4. **Double-click handle**: Optional - reset to default width
5. **Monaco editor layout**: Auto-trigger on width changes

## Performance Considerations

- Width updates are direct ref mutations (fast)
- Monaco layout triggered after drag ends or throttled during drag
- No unnecessary re-renders - only width value changes
- Minimal DOM manipulation

## Accessibility

- Resize handles are mouse-only (standard pattern)
- Keyboard users use expand/collapse buttons
- Screen readers ignore resize handles (aria-hidden)
- Maintains existing keyboard navigation

## Success Criteria

- [ ] Users can drag FileExplorer right edge to resize when expanded
- [ ] Users can drag OutputPane left edge to resize when visible
- [ ] Width constraints enforced (FileExplorer: 180-600px, OutputPane: 300-800px)
- [ ] Widths persist to localStorage
- [ ] Visible grip dots on resize handles
- [ ] Smooth drag experience with visual feedback
- [ ] Monaco editor auto-layouts on resize
- [ ] Existing expand/collapse and close buttons still work
- [ ] No performance degradation during resize
