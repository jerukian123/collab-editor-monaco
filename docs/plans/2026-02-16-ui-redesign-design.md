# UI/UX Redesign - Collaborative Monaco Editor

**Date:** 2026-02-16
**Status:** Approved
**Approach:** Component Refresh

## Overview

Complete UI/UX redesign of the collaborative Monaco editor to create a minimal, elegant portfolio piece. The redesign focuses on modern aesthetics, clean architecture, and polished user experience while maintaining existing Socket.IO and Monaco integration.

## Goals

- **Primary use case:** Personal portfolio/demo to showcase development skills
- **Design direction:** Modern code playground aesthetic (CodeSandbox/StackBlitz inspired)
- **Feature philosophy:** Lean and focused - core collaborative editing only
- **Visual style:** Minimal but elegant, clean and spacious
- **User experience:** Snappy and instant interactions, no flashy animations

## Design Decisions

### Approach: Component Refresh (Selected)

Build completely new UI layer using shadcn-vue while keeping existing Socket.IO and Monaco editor logic intact.

**Rationale:**
- Fastest path to polished, production-ready UI
- Proven backend logic (Socket.IO, Monaco integration) stays intact
- shadcn-vue provides consistent, accessible components out of the box
- Lower risk - focus on visual impact for portfolio showcase
- Can refactor architecture later if needed

**Alternatives considered:**
- Full architectural rewrite with composables - too time-consuming for portfolio demo
- Hybrid approach with partial refactoring - unnecessary complexity

## Tech Stack

### New Additions
- **shadcn-vue** - Component library for Vue 3
- **Tailwind CSS** - Utility-first CSS framework (required by shadcn)
- **class-variance-authority (CVA)** - Component variant management
- **tailwindcss-animate** - Minimal transition utilities
- **@vueuse/core** - Composition utilities (theme toggle, etc.)

### Existing (Unchanged)
- Vue 3 + TypeScript
- Monaco Editor + vite-plugin-monaco-editor
- Socket.IO client
- Vite build system

### Installation Steps
1. Install shadcn-vue CLI and initialize with default config
2. Configure Tailwind with dark mode support (`class` strategy)
3. Set up CSS variables for theming (shadcn provides baseline)
4. Install core components: Button, Card, Avatar, Badge, Separator, DropdownMenu, ScrollArea

## Architecture

### File Structure
```
client_/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn components (auto-generated)
│   │   ├── EditorShell.vue      # New: main layout wrapper
│   │   ├── WelcomeScreen.vue    # New: landing state
│   │   ├── TopBar.vue           # New: header with controls
│   │   ├── FileExplorer.vue     # New: sidebar file tree
│   │   ├── MonacoEditor.vue     # Refactored Playground.vue
│   │   ├── ThemeToggle.vue      # New: dark/light switcher
│   │   └── UserAvatar.vue       # New: reusable user indicator
│   ├── lib/
│   │   └── utils.ts             # shadcn utilities (cn helper)
│   ├── assets/
│   │   └── index.css            # Tailwind + theme variables
│   └── App.vue                  # Simplified orchestration
```

### Component Hierarchy
```
App.vue
├── WelcomeScreen.vue (if not connected)
└── EditorShell.vue (if connected)
    ├── TopBar.vue
    │   ├── UserAvatar.vue (multiple instances)
    │   └── ThemeToggle.vue
    ├── FileExplorer.vue
    └── MonacoEditor.vue
```

### Data Flow
- **App.vue** owns global state:
  - Socket.IO connection
  - Connected users list
  - File list (editors)
  - Active file ID
  - Theme preference
- State flows down via props
- Events flow up via emits
- Socket.IO events handled in App.vue, state updated there

## Layout & Visual Design

### Application States

#### State 1: Welcome Screen (No Active Session)
- Centered card with minimal branding
- Hero text: "Collaborative Code Editor"
- Subtext: "Real-time editing powered by Monaco & Socket.IO"
- "Start Session" CTA button
- Theme toggle visible
- Clean, spacious white space

#### State 2: Active Editor (Connected, No Other Users)
- Full-screen Monaco editor
- Retractable file explorer sidebar (left)
- Top bar with logo, active file name, theme toggle
- Connection status indicator (bottom-right)
- Minimal chrome, maximum editor space

#### State 3: Multi-user Active
- Same as State 2
- User avatars appear in top bar
- Live cursor overlays in Monaco editor
- Per-file user presence indicators in file explorer

### Layout Specifications

#### File Explorer Sidebar
- **Width:** 240px expanded, 48px collapsed
- **Default state:** Expanded on desktop (≥1024px), collapsed on mobile
- **Transition:** 200ms slide animation
- **Toggle control:** Icon button at top of sidebar

**When expanded:**
- Header: "Files" title + New File button + Collapse button
- File list (scrollable):
  - File icon (based on language)
  - File name
  - Active indicator (accent color highlight)
  - Hover actions: Delete button (if >1 file exists)
  - User presence dots (colored dots for users viewing that file)
- Footer: + New File button

**When collapsed:**
- File count badge
- Expand arrow icon
- Tooltips on hover

#### Top Bar
- **Height:** 48px
- **Fixed position:** Top of viewport
- **Semi-transparent background** with backdrop blur
- **Layout (left to right):**
  - App logo/name (left, 16px padding)
  - Active file name (center-left, prominent text)
  - User avatars (center-right, overlapping circles)
  - Theme toggle button (right, 16px padding)

#### Monaco Editor
- **Position:** Fills remaining space
- **Dynamic width:** Adjusts when sidebar toggles
- **Auto-resize:** Monaco `.layout()` called on sidebar state change
- **Theme:** Matches app theme (vs-dark / vs-light)
- **Font size:** 18px (existing)

#### Connection Status
- **Position:** Bottom-right corner, 16px padding
- **Content:** Colored dot + status text
  - Green + "Connected" (stable)
  - Yellow + "Reconnecting..." (unstable)
  - Red + "Disconnected" (offline)
- **Behavior:** Auto-hides after 3 seconds when stable
- **Component:** shadcn Badge

### Color System

#### Light Mode
- Background: `#ffffff` (white)
- Surface: `#fafafa` (zinc-50)
- Text: `#18181b` (zinc-900)
- Muted text: `#71717a` (zinc-500)
- Borders: `#e4e4e7` (zinc-200)
- Accent: Blue-600 or custom brand color
- Monaco theme: `vs-light`

#### Dark Mode
- Background: `#09090b` (zinc-950)
- Surface: `#18181b` (zinc-900)
- Text: `#fafafa` (zinc-50)
- Muted text: `#a1a1aa` (zinc-400)
- Borders: `#27272a` (zinc-800)
- Accent: Blue-400 or custom brand color
- Monaco theme: `vs-dark`

#### User Colors (Collaboration)
- Palette of 8-10 distinct, accessible colors
- Generated consistently from socket ID hash
- Adjusted brightness for contrast in each mode
- Used for: avatars, cursor widgets, presence indicators

### Typography
- **Font family:** System font stack or Inter
- **Heading:** 2xl-3xl, bold weight
- **Body:** Base size (16px), normal weight
- **Small text:** Sm size (14px), medium weight
- **Code:** Monaco editor default (Menlo, Monaco, Consolas)

### Visual Principles
- High contrast text for readability
- Generous padding and spacing (8px scale: 8, 16, 24, 32, etc.)
- Minimal borders - prefer subtle shadows/backgrounds
- Consistent spacing throughout
- No animations on interactions (instant feedback)
- Smooth transitions only for layout changes (sidebar, etc.)

## Component Specifications

### App.vue
**Responsibilities:**
- Initialize and manage Socket.IO connection
- Maintain global state (users, files, active file, theme)
- Handle Socket.IO events (file CRUD, user join/leave)
- Provide state to child components via props
- Route between WelcomeScreen and EditorShell

**State:**
```typescript
interface AppState {
  isConnected: boolean
  clientId: string
  users: Map<string, UserInfo>
  files: EditorFile[]
  activeFileId: number | null
  theme: 'light' | 'dark'
}
```

**Socket.IO Events:**
- Listen: `connected`, `editors_list`, `editor_added`, `editor_removed`, `user_joined`, `user_left`
- Emit: `add_editor`, `remove_editor`, `join_editor`, `leave_editor`

### WelcomeScreen.vue
**Responsibilities:**
- Display landing page before connection
- Provide "Start Session" action

**Layout:**
- Centered shadcn Card (max-width: 480px)
- Hero text + subtext
- Optional feature hints (3 items with icons)
- Primary CTA button
- Theme toggle in corner

**Actions:**
- Click "Start Session" → emit `@start-session` → App.vue connects to Socket.IO

### EditorShell.vue
**Responsibilities:**
- Orchestrate main editor layout
- Manage sidebar toggle state
- Handle responsive layout

**Props:**
- `files: EditorFile[]`
- `activeFileId: number`
- `users: Map<string, UserInfo>`

**State:**
- `sidebarExpanded: boolean` (persisted to localStorage)

**Layout:**
- TopBar (fixed)
- FileExplorer (collapsible)
- MonacoEditor (fills space)

### TopBar.vue
**Responsibilities:**
- Display app branding and navigation
- Show active file name
- Display connected users
- Provide theme toggle

**Props:**
- `activeFileName: string`
- `users: Map<string, UserInfo>`

**Layout (flexbox):**
- Logo/name (flex-none)
- Active file (flex-none, margin-left)
- Spacer (flex-grow)
- User avatars (flex-none)
- Theme toggle (flex-none)

### FileExplorer.vue
**Responsibilities:**
- Display file list
- Handle file selection, creation, deletion
- Show per-file user presence

**Props:**
- `files: EditorFile[]`
- `activeFileId: number`
- `users: Map<string, UserInfo>` (with current file info)
- `expanded: boolean`

**Events:**
- `@file-select(fileId: number)`
- `@file-add(name: string, language: string)`
- `@file-delete(fileId: number)`
- `@toggle-sidebar()`

**Features:**
- Scrollable file list (shadcn ScrollArea)
- File icons based on language
- Active file highlight
- User presence dots (colored circles)
- New file modal/prompt
- Delete confirmation (if content exists)

### MonacoEditor.vue (Refactored Playground.vue)
**Responsibilities:**
- Initialize and manage Monaco editor instance
- Handle real-time code synchronization
- Display remote cursor widgets
- Emit local changes and cursor positions

**Props:**
- `fileId: number`
- `initialContent: string`
- `language: string`
- `isVisible: boolean` (for layout calculations)

**Events:**
- `@content-change(fileId: number, content: string)`
- `@cursor-move(position: CursorPosition)`

**Socket.IO Integration:**
- Emit: `send_code`, `send_cursor_position`
- Listen: `receive_code`, `receive_cursor_position`

**Cursor Widget Logic (Existing, Refined):**
- Generate consistent color from socket ID
- Create Monaco content widget
- 2px vertical line + username label
- Update position on `receive_cursor_position`
- Remove widget on user disconnect or file switch

**Anti-loop Protection (Existing):**
- `isReceivingRemoteUpdate` flag prevents infinite loops
- Throttling: 500ms for code changes, 100ms for cursor

### ThemeToggle.vue
**Responsibilities:**
- Toggle between light and dark modes
- Persist preference to localStorage

**Implementation:**
- Uses `@vueuse/core` `useDark()` composable
- Toggles `dark` class on `<html>` element
- Icon: Sun (light mode) / Moon (dark mode)
- Button style: Ghost/transparent
- Instant toggle (no animation)

### UserAvatar.vue
**Responsibilities:**
- Display single user presence indicator

**Props:**
- `socketId: string`
- `color: string`

**Visual:**
- Circular avatar (32px diameter)
- Background: user color
- Text: First 4-6 chars of socket ID
- Border: 2px with background contrast
- Tooltip: Full socket ID on hover

## Collaboration Features

### User Presence

#### Top Bar Avatars
- Overlapping circular avatars (like GitHub contributors)
- Max 5 visible, then "+N" overflow badge
- Fade in/out when users join/leave (200ms)
- Tooltip shows full socket ID on hover
- Uses `UserAvatar.vue` component

#### File Explorer Indicators
- Small colored dots next to files
- Shows which users are viewing each file
- Helps users coordinate work
- Dot color matches user's avatar color

#### Live Cursors in Monaco
- Keep existing cursor widget implementation
- Refined styling:
  - 2px vertical line with user color
  - Username label above cursor
  - Smaller, refined typography (11px)
  - Label background matches cursor color
  - High contrast text on label
- Instant position updates (no animation)
- Remove widget on user disconnect or file switch

### Real-time Synchronization
- Code changes: Throttled to 500ms (existing)
- Cursor positions: Throttled to 100ms (existing)
- File operations: Instant broadcast
- User join/leave: Instant UI update

### Connection Status
- Bottom-right corner indicator
- States:
  - Connected: Green dot + "Connected" (auto-hide after 3s)
  - Reconnecting: Yellow dot + "Reconnecting..." (stays visible)
  - Disconnected: Red dot + "Disconnected" (stays visible)
- Uses shadcn Badge component
- Accessible labels for screen readers

## Theme System

### Implementation
- Uses `@vueuse/core` `useDark()` composable
- Toggles `dark` class on `<html>` element
- Default: System preference (`prefers-color-scheme`)
- Persists to localStorage (`vueuse-color-scheme` key)

### CSS Variables
- Defined in `src/assets/index.css`
- shadcn provides baseline set
- Separate values for `.dark` selector
- Variables include:
  - `--background`, `--foreground`
  - `--primary`, `--secondary`, `--accent`
  - `--muted`, `--border`, `--ring`
  - Destructive, success states

### Monaco Theme
- Switches automatically based on app theme
- Light mode: `vs-light`
- Dark mode: `vs-dark`
- Synchronized via watch on theme state

### User Color Adjustments
- Cursor colors adjusted for contrast in each mode
- Darker shades in light mode
- Lighter shades in dark mode
- Maintains color hue for user recognition

## File Management

### File Structure
```typescript
interface EditorFile {
  id: number
  name: string
  language: string
  content?: string // Cached locally
}
```

### Operations

#### Create File
1. User clicks "+ New File" in FileExplorer
2. Prompt for file name and language (modal or inline)
3. Emit `add_editor` to server
4. Server broadcasts `editor_added` to all clients
5. All clients add file to local list
6. Creating user's active file switches to new file

#### Delete File
1. User hovers file, clicks delete icon
2. If file has content, show confirmation dialog
3. If confirmed (or empty file), emit `remove_editor`
4. Server broadcasts `editor_removed` to all clients
5. All clients remove file from list
6. If deleted file was active, switch to first remaining file

#### Switch File
1. User clicks file in FileExplorer
2. Leave current file's Socket.IO room
3. Join new file's Socket.IO room
4. Update Monaco editor content and language
5. Request cursor positions for new room

### Sync Strategy
- File list synced via Socket.IO events
- File content NOT persisted on server (ephemeral)
- Content cached locally in component state
- On file switch, content saved to cache
- On reconnect, files reset to initial state

## User Experience Details

### First-Time Experience
1. User lands on WelcomeScreen
2. Clicks "Start Session"
3. Connects to Socket.IO
4. Transitions to EditorShell with default file (main.js)
5. Sidebar expanded by default (desktop)
6. Connection status shows "Connected" for 3s, then fades

### Collaboration Flow
1. User A creates session, starts editing
2. User B opens app, joins same session
3. User B sees User A's avatar appear in top bar
4. User B sees User A's cursor in editor (if same file)
5. Both users see real-time code changes
6. File explorer shows who's viewing which file

### Responsive Behavior
- **Desktop (≥1024px):** Sidebar expanded by default, avatars fully visible
- **Tablet (768-1023px):** Sidebar collapsed by default, avatars visible
- **Mobile (<768px):** Sidebar collapsed, compact top bar, overflow menu for users

### Accessibility
- All shadcn components have proper ARIA labels
- Keyboard navigation supported throughout
- Focus indicators visible
- Theme toggle has accessible labels
- Color contrast meets WCAG AA standards
- Screen reader announcements for user join/leave

## Implementation Notes

### Monaco Editor Integration
- Keep existing vite-plugin-monaco-editor setup
- No changes to Monaco configuration
- Editor instance lifecycle unchanged
- Layout calculations on sidebar toggle:
  ```typescript
  watch(() => sidebarExpanded, () => {
    nextTick(() => editorRef?.layout())
  })
  ```

### Socket.IO Integration
- Keep existing server code (index.js) unchanged
- Client events unchanged (send_code, send_cursor_position, etc.)
- Room-based collaboration works as-is
- Add user tracking for presence features (if needed)

### State Management
- No Vuex/Pinia needed (props + emits sufficient)
- Local component state for UI (sidebar toggle, theme)
- App.vue as single source of truth for global state
- localStorage for persistence (theme, sidebar state)

### Performance Considerations
- Throttling prevents event spam (existing: 500ms code, 100ms cursor)
- Monaco editor reused, not recreated on file switch
- Cursor widgets reused/updated, not recreated
- File list limited to reasonable count (<50 files)

### Error Handling
- Socket.IO disconnection → show reconnecting state
- Failed reconnection → show disconnected state
- File operations validate (can't delete last file)
- Confirmation dialogs for destructive actions

## Success Criteria

### Visual Quality
- Clean, modern aesthetic matching CodeSandbox/StackBlitz
- Polished dark and light modes
- Consistent spacing and typography throughout
- Smooth, non-jarring transitions

### Functionality
- All existing features work (real-time editing, cursors, multi-file)
- File explorer allows easy file management
- Theme toggle works instantly and persists
- Collaboration features clearly visible and functional

### Code Quality
- Clean component separation
- Reusable UserAvatar component
- Type-safe TypeScript throughout
- Accessible shadcn components
- No console errors or warnings

### Portfolio Impact
- Impressive first impression (WelcomeScreen)
- Professional, polished appearance
- Demonstrates modern frontend skills
- Clean, readable codebase for hiring managers to review

## Out of Scope

### Not Included in This Design
- User authentication/accounts
- Persistent storage/database
- File upload from disk
- Export/download functionality
- Syntax error highlighting (beyond Monaco defaults)
- Code execution/preview
- Share links/invitations
- Chat/comments
- Version history
- Collaborative conflict resolution (last write wins)

### Future Enhancements (Potential)
- Share session via URL
- File download/export
- More language support (TypeScript, Python, etc.)
- Code execution sandbox
- Presence awareness (who's typing indicator)
- Customizable themes beyond light/dark

## Timeline Estimate

**Note:** Actual implementation plan will be created in next phase.

Estimated breakdown:
1. Setup (shadcn, Tailwind): 1-2 hours
2. WelcomeScreen: 1 hour
3. TopBar + ThemeToggle: 2 hours
4. FileExplorer: 3-4 hours
5. EditorShell layout: 2 hours
6. MonacoEditor refactor: 3-4 hours
7. UserAvatar + presence: 2 hours
8. Polish + testing: 2-3 hours

**Total:** ~16-20 hours of development

## Next Steps

1. Create detailed implementation plan (using writing-plans skill)
2. Set up shadcn-vue and Tailwind CSS
3. Build components in order: WelcomeScreen → EditorShell → children
4. Test collaboration features
5. Polish responsive design and accessibility
6. Deploy as portfolio piece

---

**Design approved by:** User
**Date:** 2026-02-16
**Next:** Create implementation plan
