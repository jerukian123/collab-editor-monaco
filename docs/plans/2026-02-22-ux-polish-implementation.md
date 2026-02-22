# UX Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add onboarding improvements (username persistence, URL-based room sharing, card animation) and a global toast notification system to the collab-editor-monaco app.

**Architecture:** The toast system is a global Vue singleton composable (`useToast`) wired into `App.vue` socket event handlers and `EditorShell.vue` execution callbacks. Onboarding changes are isolated to `WelcomeScreen.vue`, `TopBar.vue`, and `App.vue`. No new dependencies needed — uses Vue reactivity, `localStorage`, `URLSearchParams`, and Tailwind CSS.

**Tech Stack:** Vue 3 (Composition API), TypeScript, Tailwind CSS 3, lucide-vue-next icons, Radix Vue (already installed), Socket.IO client

---

## Task 1: Create the `useToast` composable

**Files:**
- Create: `client_/src/composables/useToast.ts`

**Context:** This is a global singleton (module-level reactive state) that any component can import. It stores the active toast list and exposes functions to add/remove toasts.

**Step 1: Create the file with the full implementation**

```typescript
// client_/src/composables/useToast.ts
import { ref } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
}

// Module-level state — shared across all component instances (singleton)
const toasts = ref<Toast[]>([])

let _idCounter = 0

export function useToast() {
  const addToast = (options: { message: string; type: ToastType; duration?: number }) => {
    const id = String(++_idCounter)
    const toast: Toast = {
      id,
      message: options.message,
      type: options.type,
      duration: options.duration ?? 4000,
    }
    toasts.value.push(toast)
    setTimeout(() => removeToast(id), toast.duration)
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  return { toasts, addToast, removeToast }
}
```

**Step 2: Verify the file was created**

Open `client_/src/composables/useToast.ts` and confirm contents match above.

**Step 3: Commit**

```bash
git add client_/src/composables/useToast.ts
git commit -m "feat: add useToast singleton composable"
```

---

## Task 2: Create `Toast.vue` individual toast card

**Files:**
- Create: `client_/src/components/Toast.vue`

**Context:** A single dismissible toast card. Receives `toast` prop of type `Toast`. Emits `close` when the × button is clicked. Uses lucide-vue-next icons and Tailwind for styling. The color strip on the left and icon vary by `type`.

**Step 1: Create the component**

```vue
<!-- client_/src/components/Toast.vue -->
<script setup lang="ts">
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-vue-next'
import type { Toast, ToastType } from '@/composables/useToast'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ close: [] }>()

const config: Record<ToastType, { icon: typeof Info; border: string; iconClass: string }> = {
  info:    { icon: Info,          border: 'border-l-blue-500',   iconClass: 'text-blue-500' },
  success: { icon: CheckCircle,   border: 'border-l-green-500',  iconClass: 'text-green-500' },
  warning: { icon: AlertTriangle, border: 'border-l-yellow-500', iconClass: 'text-yellow-500' },
  error:   { icon: XCircle,       border: 'border-l-red-500',    iconClass: 'text-red-500' },
}
</script>

<template>
  <div
    :class="[
      'flex items-start gap-3 rounded-lg border border-border border-l-4 bg-background px-4 py-3 shadow-lg w-80',
      config[toast.type].border
    ]"
  >
    <component
      :is="config[toast.type].icon"
      :class="['mt-0.5 h-4 w-4 shrink-0', config[toast.type].iconClass]"
    />
    <p class="flex-1 text-sm leading-snug">{{ toast.message }}</p>
    <button
      class="ml-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      @click="emit('close')"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
```

**Step 2: Commit**

```bash
git add client_/src/components/Toast.vue
git commit -m "feat: add Toast component with type-matched styling"
```

---

## Task 3: Create `ToastContainer.vue`

**Files:**
- Create: `client_/src/components/ToastContainer.vue`

**Context:** Fixed bottom-right overlay that renders all active toasts using Vue's `<TransitionGroup>` for stacked slide-in/out animations. Imports `useToast` and `Toast.vue`. Mount this once in `App.vue` at root level.

**Step 1: Create the component**

```vue
<!-- client_/src/components/ToastContainer.vue -->
<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import Toast from './Toast.vue'

const { toasts, removeToast } = useToast()
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    <TransitionGroup
      name="toast"
      tag="div"
      class="flex flex-col gap-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto"
      >
        <Toast :toast="toast" @close="removeToast(toast.id)" />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.25s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(2rem);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(2rem);
}
</style>
```

**Step 2: Commit**

```bash
git add client_/src/components/ToastContainer.vue
git commit -m "feat: add ToastContainer with TransitionGroup slide animation"
```

---

## Task 4: Mount `ToastContainer` in `App.vue` and wire socket events

**Files:**
- Modify: `client_/src/App.vue`

**Context:** `App.vue` is where all socket event handlers live (`user_joined`, `user_left`, `kicked`, `room_closed`, `host_transferred`, `room_created`). We need to:
1. Import `ToastContainer` and mount it in the template
2. Import `useToast` and call `addToast` inside the existing event handlers
3. After `room_created` fires, call `history.replaceState` to put `?room=ROOMCODE` in the URL

**Step 1: Add imports at the top of the `<script setup>` block**

In `client_/src/App.vue`, add these imports alongside the existing ones:

```typescript
import ToastContainer from './components/ToastContainer.vue'
import { useToast } from './composables/useToast'
```

After the existing `const { clientId, connect, emit, on, off, disconnect } = useSocket()` line, add:

```typescript
const { addToast } = useToast()
```

**Step 2: Wire `user_joined` handler (around line 166)**

Find the existing handler:
```typescript
on('user_joined', ({ socketId, username: joinedName, color }: { socketId: string, username: string, color: string }) => {
  if (!users.value.has(socketId)) {
    users.value.set(socketId, { socketId, username: joinedName, color })
  }
})
```

Add the toast call inside the `if` block:
```typescript
on('user_joined', ({ socketId, username: joinedName, color }: { socketId: string, username: string, color: string }) => {
  if (!users.value.has(socketId)) {
    users.value.set(socketId, { socketId, username: joinedName, color })
    addToast({ message: `${joinedName} joined the room`, type: 'info' })
  }
})
```

**Step 3: Wire `user_left` handler (around line 172)**

Find the existing handler:
```typescript
on('user_left', ({ socketId }: { socketId: string }) => {
  users.value.delete(socketId)
})
```

Replace with:
```typescript
on('user_left', ({ socketId }: { socketId: string }) => {
  const leavingUser = users.value.get(socketId)
  if (leavingUser) {
    addToast({ message: `${leavingUser.username} left the room`, type: 'info' })
  }
  users.value.delete(socketId)
})
```

**Step 4: Wire `kicked` handler (around line 139)**

Find:
```typescript
on('kicked', () => {
  resetToWelcome()
})
```

Replace with:
```typescript
on('kicked', () => {
  addToast({ message: 'You were removed from the room', type: 'error', duration: 6000 })
  resetToWelcome()
})
```

**Step 5: Wire `room_closed` handler (around line 143)**

Find:
```typescript
on('room_closed', () => {
  resetToWelcome()
})
```

Replace with:
```typescript
on('room_closed', () => {
  addToast({ message: 'The room was closed by the host', type: 'warning', duration: 6000 })
  resetToWelcome()
})
```

**Step 6: Wire `host_transferred` handler (around line 147)**

Find:
```typescript
on('host_transferred', ({ newHostId }: { newHostId: string }) => {
  hostId.value = newHostId
  isHost.value = newHostId === clientId.value
})
```

Replace with:
```typescript
on('host_transferred', ({ newHostId }: { newHostId: string }) => {
  hostId.value = newHostId
  isHost.value = newHostId === clientId.value
  if (newHostId === clientId.value) {
    addToast({ message: 'You are now the host', type: 'success' })
  }
})
```

**Step 7: Update URL after room is created — inside `room_created` handler (around line 111)**

Find the end of the `room_created` handler body (after `loadEditors(editors)`):
```typescript
on('room_created', ({ roomCode: code, editors, users: userList, isHost: host }: ...) => {
  // ... existing lines ...
  loadEditors(editors)
})
```

Add one line after `loadEditors(editors)`:
```typescript
  history.replaceState(null, '', `?room=${code}`)
```

**Step 8: Mount `ToastContainer` in the template**

In the `<template>` section, add `<ToastContainer />` as a sibling to the existing `<WelcomeScreen>` / `<EditorShell>` conditional block:

```html
<template>
  <div>
    <WelcomeScreen ... />
    <EditorShell ... />
    <ToastContainer />
  </div>
</template>
```

**Step 9: Verify the app compiles**

```bash
cd /path/to/collab-editor-monaco/client_
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

**Step 10: Commit**

```bash
git add client_/src/App.vue
git commit -m "feat: wire toast notifications for user join/leave, kick, room close, host transfer"
```

---

## Task 5: Wire toast notifications for code execution in `EditorShell.vue`

**Files:**
- Modify: `client_/src/components/EditorShell.vue`

**Context:** `EditorShell.vue` calls `onExecutionResult` and `onExecutionError` callbacks. We add toast calls inside these callbacks. The execution result has `exitCode`, `output` (stdout), `stderr` fields. Success = `exitCode === 0`. Error = `exitCode !== 0` or the `execution_error` event fired.

**Step 1: Add imports**

In `client_/src/components/EditorShell.vue`, add alongside existing imports:

```typescript
import { useToast } from '@/composables/useToast'
```

After the `useCodeExecution()` destructure, add:
```typescript
const { addToast } = useToast()
```

**Step 2: Update `onExecutionResult` callback (around line 117)**

Find:
```typescript
onExecutionResult((result) => {
  outputPaneRef.value?.addResult(result)
})
```

Replace with:
```typescript
onExecutionResult((result) => {
  outputPaneRef.value?.addResult(result)
  if (result.exitCode === 0) {
    addToast({ message: 'Code executed successfully', type: 'success' })
  } else {
    addToast({ message: 'Execution finished with errors', type: 'error' })
  }
})
```

**Step 3: Update `onExecutionError` callback (around line 121)**

Find:
```typescript
onExecutionError((error) => {
  outputPaneRef.value?.addResult(error)
})
```

Replace with:
```typescript
onExecutionError((error) => {
  outputPaneRef.value?.addResult(error)
  addToast({ message: 'Execution failed', type: 'error' })
})
```

**Step 4: Build check**

```bash
cd /path/to/collab-editor-monaco/client_
npm run build 2>&1 | tail -20
```

Expected: builds without errors.

**Step 5: Commit**

```bash
git add client_/src/components/EditorShell.vue
git commit -m "feat: add toast notifications for code execution result and error"
```

---

## Task 6: Onboarding — username persistence and URL room code in `WelcomeScreen.vue`

**Files:**
- Modify: `client_/src/components/WelcomeScreen.vue`

**Context:** Two improvements:
1. On mount, read `localStorage.getItem('collab_username')` and pre-fill `username`. On each input event, save the value back to localStorage.
2. On mount, read `?room=` from the URL query params. If present, set `roomCode` to that value and switch `activeTab` to `'join'`.

The component already uses `ref` for `username`, `roomCode`, and `activeTab`.

**Step 1: Add `onMounted` import**

The component already imports `ref` and `computed` from Vue. Add `onMounted`:

```typescript
import { ref, computed, onMounted } from 'vue'
```

**Step 2: Add `onMounted` logic after the existing `const localError = ref('')` line**

```typescript
onMounted(() => {
  // Restore saved username
  const saved = localStorage.getItem('collab_username')
  if (saved) username.value = saved

  // Pre-fill room code from URL query param
  const params = new URLSearchParams(window.location.search)
  const roomParam = params.get('room')
  if (roomParam) {
    roomCode.value = roomParam
    activeTab.value = 'join'
  }
})
```

**Step 3: Save username to localStorage on every input**

The username `<Input>` currently has `@input="clearError"`. Update it to also save:

In the `<template>` section, find:
```html
@input="clearError"
```
on the username input and change to:
```html
@input="() => { clearError(); if (username.trim()) localStorage.setItem('collab_username', username.trim()) }"
```

**Step 4: Add card entrance animation**

Tailwind's `animate-` utilities don't include a slide-up-fade by default, so we use a scoped CSS keyframe. In the `<template>`, find the `<Card>` element:

```html
<Card class="w-full max-w-lg">
```

Add an `animate-enter` class to it:
```html
<Card class="w-full max-w-lg animate-enter">
```

Then add a `<style>` block at the bottom of the file (after `</template>`):

```html
<style scoped>
@keyframes enter {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-enter {
  animation: enter 0.35s ease-out both;
}
</style>
```

**Step 5: Build check**

```bash
cd /path/to/collab-editor-monaco/client_
npm run build 2>&1 | tail -20
```

Expected: builds without errors.

**Step 6: Commit**

```bash
git add client_/src/components/WelcomeScreen.vue
git commit -m "feat: add username persistence, URL room code pre-fill, and card entrance animation"
```

---

## Task 7: Onboarding — copy invite link in `TopBar.vue`

**Files:**
- Modify: `client_/src/components/TopBar.vue`

**Context:** The existing `copyRoomCode()` function copies just `props.roomCode`. Change it to copy the full invite URL: `window.location.origin + '?room=' + props.roomCode`. Also update the button tooltip text. No structural changes needed.

**Step 1: Update `copyRoomCode` function**

Find the existing function in `<script setup>`:
```typescript
function copyRoomCode() {
  navigator.clipboard.writeText(props.roomCode)
  copiedRoomCode.value = true
  setTimeout(() => {
    copiedRoomCode.value = false
  }, 1500)
}
```

Replace with:
```typescript
function copyRoomCode() {
  const inviteUrl = `${window.location.origin}?room=${props.roomCode}`
  navigator.clipboard.writeText(inviteUrl)
  copiedRoomCode.value = true
  setTimeout(() => {
    copiedRoomCode.value = false
  }, 1500)
}
```

**Step 2: Update the button tooltip**

Find:
```html
:title="copiedRoomCode ? 'Copied!' : 'Click to copy room code'"
```

Change to:
```html
:title="copiedRoomCode ? 'Copied!' : 'Click to copy invite link'"
```

**Step 3: Build check**

```bash
cd /path/to/collab-editor-monaco/client_
npm run build 2>&1 | tail -20
```

Expected: builds without errors.

**Step 4: Commit**

```bash
git add client_/src/components/TopBar.vue
git commit -m "feat: copy full invite URL from room code chip in TopBar"
```

---

## Task 8: Manual smoke test

**Goal:** Verify all features work together in the browser.

**Step 1: Start the dev server**

```bash
cd /path/to/collab-editor-monaco/client_
npm run dev
```

Open `http://localhost:5173` in the browser.

**Step 2: Test card animation**
- Reload the page. The welcome card should fade and slide up smoothly on load.

**Step 3: Test username persistence**
- Type a username. Reload the page. Username should still be filled in.

**Step 4: Test URL room code pre-fill**
- Navigate to `http://localhost:5173?room=ABCDEF`. The Join tab should be active with `ABCDEF` pre-filled in the room code input.

**Step 5: Test toast — user joined**
- Start server (`cd server && npm start`)
- Open two browser tabs. Create a room in Tab 1. Join with Tab 2.
- Tab 1 should show a blue toast: "{username} joined the room"

**Step 6: Test toast — user left**
- Close Tab 2. Tab 1 should show a gray/blue toast: "{username} left the room"

**Step 7: Test toast — host transfer**
- In Tab 1 (host), kick Tab 2's user. Tab 2 should show a red "You were removed from the room" toast before returning to the welcome screen.

**Step 8: Test toast — code execution**
- In the editor, type `print("hello")`, select Python, press Ctrl+Enter.
- A green "Code executed successfully" toast should appear.

**Step 9: Test invite link copy**
- In the TopBar, click the room code chip. The browser clipboard should contain `http://localhost:5173?room=ROOMCODE` (verify by pasting).

**Step 10: Test URL updates after room creation**
- Create a room. The browser URL bar should now show `?room=ROOMCODE`.

---

## Success Criteria

- [ ] Welcome card animates in on page load
- [ ] Username is remembered across page refreshes
- [ ] Visiting `?room=ABC123` pre-fills join form and switches to Join tab
- [ ] Creating a room updates the URL to `?room=ROOMCODE`
- [ ] Room code chip copies the full invite URL (not just the code)
- [ ] User join/leave toasts appear with correct username
- [ ] Kick toast appears before returning to welcome screen
- [ ] Room-closed toast appears before returning to welcome screen
- [ ] Host transfer toast appears only for the new host
- [ ] Execution success toast appears on `exitCode === 0`
- [ ] Execution error toast appears on non-zero exit or execution_error
- [ ] Toasts auto-dismiss after 4 seconds
- [ ] Toasts slide in from the right and slide out smoothly
- [ ] Multiple toasts stack without overlap
