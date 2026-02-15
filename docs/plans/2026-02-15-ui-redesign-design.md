# UI Redesign: Minimal & Elegant Collaborative Editor

**Date:** 2026-02-15
**Status:** Approved
**Approach:** Component Refresh - New shadcn-vue UI with existing logic

## Overview

Complete UI/UX redesign of the collaborative Monaco editor to create a minimal, elegant portfolio piece. The redesign focuses on modern code playground aesthetics (inspired by CodeSandbox/StackBlitz) while maintaining the core collaborative editing functionality.

## Goals

- Create an impressive visual design for portfolio showcase
- Maintain minimal, clean interface with no clutter
- Support both dark and light modes
- Keep feature set lean - focus on core collaborative editing
- Use shadcn-vue for polished, accessible components
- Prioritize instant, snappy interactions over animations

## Primary Use Case

Personal portfolio/demo - designed to impress visitors with clean design and smooth real-time collaboration features.

## Design Principles

1. **Minimal Chrome** - Full-screen editor focus, minimal UI elements
2. **Instant Feedback** - No flashy animations, snappy responses (no transition lag)
3. **Generous Spacing** - Breathing room, high contrast, clean typography
4. **Accessible** - Both light and dark modes, proper ARIA labels
5. **Lean Features** - Core collaborative editing only, no feature bloat

## Tech Stack

### New Additions
- **shadcn-vue** - Component library for Vue 3
- **Tailwind CSS** - Styling framework (required by shadcn)
- **class-variance-authority (CVA)** - Component variants
- **tailwindcss-animate** - Minimal transitions
- **@vueuse/core** - Composables (theme toggle, etc.)

### Existing (Maintained)
- Vue 3 + TypeScript
- Monaco Editor + vite-plugin-monaco-editor
- Socket.IO client
- Vite build system

### shadcn Components to Install
- Button
- Card
- Avatar
- Badge
- Separator
- DropdownMenu
- ScrollArea
- Tooltip

## File Structure

```
client_/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn components (auto-generated)
│   │   ├── EditorShell.vue      # Main layout wrapper
│   │   ├── WelcomeScreen.vue    # Landing/welcome state
│   │   ├── TopBar.vue           # Top navigation bar
│   │   ├── FileExplorer.vue     # Sidebar file list
│   │   ├── MonacoEditor.vue     # Refactored Playground.vue
│   │   ├── ThemeToggle.vue      # Dark/light mode switcher
│   │   └── UserAvatar.vue       # Reusable user presence component
│   ├── lib/
│   │   └── utils.ts             # shadcn utilities (cn helper)
│   ├── assets/
│   │   └── index.css            # Global styles + theme variables
│   └── App.vue                  # Simplified orchestration
```

## Application States

### State 1: Welcome Screen (No Active Session)
**When:** First load, before connecting to Socket.IO, or after explicit disconnect

**Visual:**
- Centered card (max-width: 480px)
- Hero text: "Collaborative Code Editor"
- Subtext: "Real-time editing powered by Monaco & Socket.IO"
- Optional feature hints (3 items): Live collaboration, Multiple files, Instant sync
- Primary CTA button: "Start Session"
- Theme toggle visible (top-right)

**Behavior:**
- Click "Start Session" → connects to Socket.IO → transitions to EditorShell
- Instant transition, no loading spinners
- Error toast if connection fails

### State 2: Active Editor (Connected, Single User)
**When:** Connected to Socket.IO, editing solo

**Layout:**
- **Full-screen Monaco editor**
- **Top bar** (fixed, subtle, semi-transparent):
  - App name/logo (left)
  - Active file name (center-left)
  - User avatar (self) (center-right)
  - Theme toggle (right)
- **File explorer sidebar** (left, retractable):
  - Default: Expanded on desktop, collapsed on mobile
  - Width: 240px (expanded) / 48px (collapsed)
  - Transition: 200ms slide
- **Status indicator** (bottom-right):
  - Connection status dot + text
  - Auto-hides after 3s when stable

### State 3: Multi-User Collaboration
**When:** Other users join the session

**Changes from State 2:**
- **Top bar:** Multiple overlapping user avatars
- **Monaco editor:** Live cursor widgets visible for remote users
- **File explorer:** Per-file presence dots showing which file users are viewing
- **User avatars:** Subtle pulse when someone types

## Component Specifications

### App.vue (Root Orchestrator)
**Responsibilities:**
- Socket.IO connection management
- Global state: connected users, file list, active file ID, theme

**State:**
```typescript
{
  isConnected: boolean
  socketId: string
  users: Map<string, { color: string, currentFile: number }>
  files: Array<{ id: number, name: string, language: string, content: string }>
  activeFileId: number
}
```

**Socket.IO Events Handled:**
- `connected` - Store socket ID
- `editors_list` - Initialize file list
- `editor_added` - Add file to list
- `editor_removed` - Remove file from list
- `receive_code` - Update file content
- `receive_cursor_position` - Forward to MonacoEditor
- User join/leave - Update users map

### WelcomeScreen.vue
**Props:** None

**Visual Elements:**
- shadcn Card component
- Hero typography (text-3xl, bold)
- Subtitle (text-muted-foreground)
- Feature hints (optional, icon + text)
- shadcn Button (primary, large)

**Events:**
- `@start` - Emitted when "Start Session" clicked

### EditorShell.vue
**Props:**
```typescript
{
  users: Map<string, User>
  files: File[]
  activeFileId: number
}
```

**Layout:**
- TopBar (fixed top)
- FileExplorer (retractable left sidebar)
- MonacoEditor (flex-1, fills remaining space)

**State:**
- `sidebarCollapsed: boolean` (persisted to localStorage)

**Events:**
- `@file-select` - User clicked a file
- `@file-add` - User added a new file
- `@file-delete` - User deleted a file
- `@sidebar-toggle` - Sidebar expanded/collapsed

### TopBar.vue
**Props:**
```typescript
{
  activeFileName: string
  users: Map<string, User>
}
```

**Layout:**
- Logo/app name (left)
- Active file name (center-left, truncated if long)
- User avatars (center-right, overlapping, max 5 visible + overflow badge)
- Theme toggle (right)

**Components Used:**
- UserAvatar (multiple instances)
- ThemeToggle
- shadcn Badge (for overflow count)

### FileExplorer.vue (Sidebar)
**Props:**
```typescript
{
  files: File[]
  activeFileId: number
  collapsed: boolean
  userPresence: Map<number, string[]> // fileId -> socketIds
}
```

**Visual (Expanded):**
- Header: "Files" + New File button + Collapse button
- File list (shadcn ScrollArea):
  - File icon (based on language)
  - File name
  - Active indicator (accent color highlight)
  - User presence dots (colored dots for users viewing this file)
  - Delete button on hover (if more than 1 file exists)
- Footer: + New File button

**Visual (Collapsed):**
- File count badge
- Expand arrow icon
- Tooltips on hover

**Events:**
- `@file-select(fileId)` - User clicked file
- `@file-add(name, language)` - User added file (with prompt dialog)
- `@file-delete(fileId)` - User deleted file (with confirmation)
- `@toggle` - Expand/collapse sidebar

### MonacoEditor.vue
**Props:**
```typescript
{
  fileId: number
  initialContent: string
  language: string
  users: Map<string, User>
  isVisible: boolean
}
```

**Responsibilities:**
- Create Monaco editor instance
- Handle content changes → emit + Socket.IO broadcast
- Handle cursor position changes → emit + Socket.IO broadcast
- Render remote cursor widgets
- Auto-resize when sidebar toggles

**Socket.IO Integration:**
- Emit `send_code` on content change (throttled 500ms)
- Emit `send_cursor_position` on cursor move (throttled 100ms)
- Receive `receive_code` → update editor value (with flag to prevent loop)
- Receive `receive_cursor_position` → update/create cursor widgets

**Remote Cursor Widgets:**
- 2px vertical line (user's color)
- Username label above cursor (small, refined typography)
- Label background matches cursor color
- Instant position updates (no animation)
- Remove widget when user disconnects or switches files

**Events:**
- `@content-change(fileId, content)` - Editor content changed
- `@cursor-move(fileId, position)` - Cursor position changed

### ThemeToggle.vue
**Implementation:**
- Uses `@vueuse/core` `useDark()` composable
- Toggles `dark` class on `<html>` element
- Persists to localStorage (`vueuse-color-scheme`)
- Default: System preference

**Visual:**
- Icon: Sun (light mode) / Moon (dark mode)
- shadcn Button (variant="ghost")
- Instant switch (no transition animation)
- Accessible ARIA labels

### UserAvatar.vue
**Props:**
```typescript
{
  socketId: string
  color: string
  showTooltip?: boolean
}
```

**Visual:**
- Circular avatar (32px diameter)
- Background: User's color
- Text: First 4-6 chars of socket ID (white, bold)
- Border: 2px solid background (for depth)

**Behavior:**
- Tooltip on hover shows full socket ID
- Fade in/out (200ms) when user joins/leaves

## Visual Design System

### Color Palette

**Light Mode:**
- Background: `#ffffff` (white)
- Surface: `#fafafa` (zinc-50)
- Text: `#18181b` (zinc-900)
- Muted text: `#71717a` (zinc-500)
- Border: `#e4e4e7` (zinc-200)
- Accent: Blue-600 or custom brand color
- Monaco theme: `vs-light`

**Dark Mode:**
- Background: `#09090b` (zinc-950)
- Surface: `#18181b` (zinc-900)
- Text: `#fafafa` (zinc-50)
- Muted text: `#a1a1aa` (zinc-400)
- Border: `#27272a` (zinc-800)
- Accent: Blue-400 or custom brand color
- Monaco theme: `vs-dark`

### Typography
- Font: System font stack or Inter
- Scale: Consistent 8px spacing scale
- Headings: Bold, high contrast
- Body: Regular weight, generous line-height

### Spacing
- Base unit: 8px
- Consistent padding/margins using Tailwind spacing scale
- Generous white space in welcome screen
- Tight spacing in file explorer for density

### Shadows & Borders
- Minimal borders (prefer subtle shadows or backgrounds)
- Light mode: Subtle shadows for depth
- Dark mode: Subtle border glow or elevation changes

## Collaboration Features

### User Presence Indicators

**Top Bar Avatars:**
- Overlapping circles (like GitHub contributors)
- Max 5 visible, then "+N" badge for overflow
- Fade in/out on join/leave (200ms)
- Tooltip shows full socket ID

**File Explorer Presence:**
- Small colored dots next to files
- Shows which file each user is viewing
- Helps coordinate team editing

**Live Cursors:**
- Rendered as Monaco content widgets
- 2px vertical line with user's color
- Username label above (background matches color)
- Instant position updates (no animation lag)
- Auto-removed when user disconnects or switches files

### Connection Status
**Visual:**
- Bottom-right corner badge
- Colored dot + status text
- Green: "Connected"
- Yellow: "Reconnecting..."
- Red: "Disconnected"

**Behavior:**
- Auto-hides after 3s when stable
- Reappears on status change
- Uses shadcn Badge component

### Real-Time Sync
- **Code changes:** Throttled 500ms, broadcast via Socket.IO
- **Cursor position:** Throttled 100ms, broadcast via Socket.IO
- **File switches:** Instant broadcast, no throttling
- **User join/leave:** Instant UI update

### User Color Generation
- Hash socket ID to generate color
- Palette of 8-10 distinct, accessible colors
- Ensure good contrast in both light and dark modes
- Colors persist per socket ID for consistency

## Data Flow

### Socket.IO Events

**Client → Server:**
- `join_editor(editorId)` - Join specific editor room
- `leave_editor(editorId)` - Leave editor room
- `send_code({ code, editorId })` - Broadcast code change
- `send_cursor_position({ lineNumber, column, socketId, editorId })` - Broadcast cursor position
- `add_editor({ name, language })` - Create new file
- `remove_editor(editorId)` - Delete file

**Server → Client:**
- `connected(socketId)` - Connection established, receive socket ID
- `editors_list(files)` - Initial file list on connection
- `editor_added(file)` - New file created by someone
- `editor_removed(editorId)` - File deleted by someone
- `receive_code({ code, editorId })` - Code update from another user
- `receive_cursor_position({ lineNumber, column, socketId, editorId })` - Cursor update from another user

### State Management

**App.vue owns:**
- Socket connection
- Connected users map
- File list
- Active file ID
- Theme preference (via @vueuse/core)

**Props flow down:**
```
App.vue
  ↓ users, files, activeFileId
EditorShell.vue
  ↓ activeFileName, users        ↓ files, activeFileId         ↓ fileId, content, users
TopBar.vue                     FileExplorer.vue              MonacoEditor.vue
  ↓ socketId, color
UserAvatar.vue
```

**Events flow up:**
```
FileExplorer.vue → @file-select, @file-add, @file-delete → EditorShell.vue → App.vue
MonacoEditor.vue → @content-change, @cursor-move → EditorShell.vue → App.vue → Socket.IO
```

## Implementation Strategy

### Phase 1: Setup & Foundation
1. Install shadcn-vue CLI and initialize
2. Configure Tailwind with dark mode (`class` strategy)
3. Set up CSS variables for theming
4. Install core shadcn components (Button, Card, Avatar, Badge, etc.)
5. Create `lib/utils.ts` with cn helper

### Phase 2: Welcome Screen
1. Create WelcomeScreen.vue
2. Implement basic layout with shadcn Card
3. Add "Start Session" button
4. Wire up connection logic

### Phase 3: Theme System
1. Create ThemeToggle.vue with @vueuse/core
2. Configure light/dark CSS variables
3. Test theme switching across all states
4. Ensure Monaco editor theme syncs

### Phase 4: Core Layout
1. Create EditorShell.vue with layout structure
2. Implement TopBar.vue with logo and placeholder avatars
3. Create basic FileExplorer.vue sidebar
4. Add sidebar toggle functionality with localStorage persistence

### Phase 5: Monaco Integration
1. Refactor Playground.vue → MonacoEditor.vue
2. Clean up existing cursor widget code
3. Integrate with new theming system
4. Handle editor resize on sidebar toggle

### Phase 6: File Management
1. Implement file list rendering in FileExplorer
2. Add file add/delete functionality
3. Wire up Socket.IO events for file sync
4. Add file switching logic

### Phase 7: Collaboration UI
1. Create UserAvatar.vue component
2. Implement user presence in TopBar
3. Add per-file presence dots in FileExplorer
4. Refine remote cursor styling in MonacoEditor
5. Add connection status indicator

### Phase 8: Polish & Refinement
1. Test both light and dark modes thoroughly
2. Ensure instant interactions (no lag)
3. Test multi-user scenarios
4. Responsive design for mobile/tablet
5. Accessibility audit (ARIA labels, keyboard navigation)
6. Performance check (throttling, memory leaks)

## Success Criteria

- ✅ Visually impressive, minimal, elegant design
- ✅ Both dark and light modes work perfectly
- ✅ Instant, snappy interactions (no animation lag)
- ✅ Real-time collaboration features work smoothly
- ✅ File explorer allows easy multi-file management
- ✅ Accessible (keyboard navigation, ARIA labels)
- ✅ Responsive across desktop/tablet/mobile
- ✅ No regressions in existing Socket.IO/Monaco functionality

## Out of Scope

- Advanced file operations (rename, move, folders)
- Authentication or user accounts
- Code execution or preview panes
- Syntax highlighting customization
- Export/import functionality
- Chat or comments
- Version history or undo/redo across sessions
- Custom themes beyond light/dark

## Technical Considerations

### Performance
- Monaco editor lazy-loaded via vite-plugin-monaco-editor
- Remote cursor updates throttled to 100ms
- Code sync throttled to 500ms
- File list kept lean (no heavy computations)

### Accessibility
- Proper ARIA labels on all interactive elements
- Keyboard navigation for file explorer
- Focus management for modal dialogs
- High contrast in both themes
- Screen reader friendly

### Browser Support
- Modern browsers only (ES2020+)
- Chrome, Edge, Firefox, Safari (latest versions)
- No IE11 support

### Mobile/Responsive
- Sidebar collapsed by default on mobile
- Touch-friendly targets (min 44px)
- Monaco editor resizes on orientation change
- Welcome screen stacks vertically on small screens

## Future Enhancements (Not in Scope)

- Share session via URL
- User nicknames/avatars
- Voice/video chat integration
- Code execution
- GitHub integration
- Advanced file operations (folders, rename)
- Syntax theme customization
- Minimap toggle

---

**Approved by:** User
**Next Step:** Create implementation plan using writing-plans skill
