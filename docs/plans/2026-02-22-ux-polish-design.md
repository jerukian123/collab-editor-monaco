# UX Polish Design: Onboarding Improvements + Toast Notification System

**Date:** 2026-02-22
**Goal:** Portfolio showcase polish — improve first impressions and real-time feedback throughout the app
**Scope:** A weekend sprint (2–3 days)

---

## Overview

Two complementary UX improvements that work together to make the app feel polished and alive:

1. **Onboarding improvements** — better welcome screen experience (username persistence, URL-based room sharing, animations)
2. **Toast notification system** — global real-time event feedback (user joined/left, host changes, code execution results)

---

## Feature 1: Onboarding Improvements

### Username Persistence
Save the entered username to `localStorage` under the key `collab_username`. On mount, auto-fill the username input if a saved value exists. This removes friction for returning users.

**Files:** `client_/src/components/WelcomeScreen.vue`

### Room Code in URL
- When a room is **created**, update the browser URL to `?room=ROOMCODE` using `history.replaceState` (no page reload)
- When the **welcome screen loads**, read the `?room=` query param and pre-fill the room code input field and switch to the "Join" tab automatically
- This makes rooms shareable via URL — users can send a link and land with the code pre-filled

**Files:** `client_/src/components/WelcomeScreen.vue`, `client_/src/App.vue`

### Copy Invite Link
In the TopBar, augment the existing room code chip so that clicking it copies the full invite URL (`window.location.origin + ?room=ROOMCODE`) instead of just the raw room code. The chip display text stays as the room code for at-a-glance visibility.

**Files:** `client_/src/components/TopBar.vue`

### Animated Card Entrance
Add a CSS fade + slide-up entrance animation to the welcome screen card on mount. Implemented with Tailwind's `animate-` utilities or a simple CSS keyframe. No JavaScript animation library needed.

**Files:** `client_/src/components/WelcomeScreen.vue`

---

## Feature 2: Toast Notification System

### Architecture
A lightweight, global toast system built on Vue's reactivity without any external library.

**Components:**
- `client_/src/composables/useToast.ts` — global singleton reactive store
- `client_/src/components/ToastContainer.vue` — fixed position wrapper, stacks toasts bottom-right
- `client_/src/components/Toast.vue` — individual toast card with icon, message, and close button

### Toast Composable (`useToast.ts`)
```typescript
interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number  // default: 4000ms
}
```

Exposes:
- `toasts: Ref<Toast[]>` — reactive list
- `addToast(toast: Omit<Toast, 'id'>): void` — generates ID, pushes, auto-removes after duration
- `removeToast(id: string): void` — removes immediately (for close button)

### Toast Container
- Fixed, `bottom-4 right-4`, `z-50`
- Renders `<Toast>` for each entry in `toasts`
- Uses Vue `<TransitionGroup>` for stacked slide-in/out animations

### Individual Toast
- Rounded card with left-colored border (type-matched color)
- Icon (lucide-vue-next): `Info`, `CheckCircle`, `AlertTriangle`, `XCircle`
- Message text
- Close button (×)
- Auto-dismisses after `duration` ms with a smooth exit animation

### Toast Triggers

| Socket Event | Message | Type | Condition |
|---|---|---|---|
| `user_joined` | "**{username}** joined the room" | info | Always |
| `user_left` | "**{username}** left the room" | info | Always |
| `kicked` | "You were removed from the room" | error | Always |
| `room_closed` | "The room was closed by the host" | warning | Always |
| `host_transferred` | "You are now the host" | success | Only shown to the new host |
| Code execution success | "Code executed successfully" | success | `stdout` present, no error |
| Code execution error | "Execution failed" | error | `stderr` present or runtime error |

### Wiring
- `App.vue` — add `useToast()` calls inside `user_joined`, `user_left`, `kicked`, `room_closed`, `host_transferred` socket handlers
- `useCodeExecution.ts` — add `useToast()` calls on execution result
- `App.vue` template — mount `<ToastContainer />` at root level

---

## Files to Create

| File | Purpose |
|---|---|
| `client_/src/composables/useToast.ts` | Global toast store |
| `client_/src/components/ToastContainer.vue` | Fixed toast wrapper |
| `client_/src/components/Toast.vue` | Individual toast card |

## Files to Modify

| File | Change |
|---|---|
| `client_/src/components/WelcomeScreen.vue` | Username persistence, URL room code, animation |
| `client_/src/components/TopBar.vue` | Copy invite link instead of raw room code |
| `client_/src/App.vue` | Mount ToastContainer, wire socket events to toasts, URL state after room create |
| `client_/src/composables/useCodeExecution.ts` | Wire execution result to toasts |

---

## Success Criteria

- [ ] Username is remembered across page refreshes
- [ ] Visiting `?room=ABC123` pre-fills the join form
- [ ] Clicking room code chip in TopBar copies full invite URL
- [ ] Welcome card animates in on load
- [ ] User join/leave events show toasts with correct username
- [ ] Kicked and room-closed events show toasts before redirect to welcome screen
- [ ] Host transfer shows toast only to the new host
- [ ] Code execution shows success/error toast
- [ ] Toasts auto-dismiss after 4 seconds
- [ ] Toasts have smooth slide-in and slide-out animations
- [ ] Multiple toasts stack correctly without overlap
