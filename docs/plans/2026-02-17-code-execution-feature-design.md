# Code Execution Feature Design

**Date:** 2026-02-17
**Feature:** Multi-language code execution with collaborative output
**Approach:** Piston API integration

## Overview

Add the ability to execute code in multiple programming languages within the collaborative Monaco editor. Users can run code and see results in a dedicated output pane, with attribution showing who triggered each execution. All users in the same file see execution results in real-time.

## Architecture

### High-level Flow

1. **Client-side:** User clicks "Run" button in the editor → Client sends code + language to server via Socket.IO
2. **Server-side:** Server receives execution request → Makes HTTP POST to Piston API → Returns result to all users in the same file room
3. **Client-side:** All users receive execution result → Output pane updates with results + user attribution

### New Components

**Frontend:**
- `OutputPane.vue` - Display execution results to the right of editor
- `RunButton.vue` - Trigger code execution (inside OutputPane top bar)
- Language selector updates - Add execution support indicator

**Backend:**
- `executionService.js` - Handle Piston API integration (make requests, parse responses)
- New Socket.IO events: `execute_code`, `execution_result`, `execution_error`

### Integration Points

- Output pane shares the same file context as Monaco editor
- Language from file metadata determines Piston runtime
- User info (socketId, color) attached to execution results for attribution

## Components & UI Layout

### EditorShell.vue Updates

- Add `OutputPane` to the RIGHT of Monaco editor in a resizable split pane
- Layout: `Sidebar | Editor | OutputPane` (three-column layout)
- Add toggle button in main TopBar to show/hide output pane
- OutputPane width stored in localStorage, collapsible

### OutputPane.vue Structure

```
┌─ OutputPane Top Bar ──────────┐
│ [Run Button] [Clear] [Close]  │
├───────────────────────────────┤
│                               │
│  Execution Results            │
│  (scrollable history)         │
│                               │
└───────────────────────────────┘
```

**Features:**
- Own top bar with Run button (primary action), Clear button, Close button
- Shows execution results with syntax highlighting
- Displays: user avatar/color, timestamp, execution time, exit code
- Multiple result entries (history of recent runs in this session)
- Auto-scrolls to newest result
- Starts hidden, opens automatically on first execution or manual toggle

### RunButton (Inside OutputPane Top Bar)

- Green "Run" button with play icon
- Shows spinner during execution
- Disabled if no active file or unsupported language
- Keyboard shortcut: Ctrl/Cmd+Enter triggers it even when pane is hidden (will auto-open pane)

### Language Support

- Map Monaco language IDs to Piston runtimes (e.g., `python` → `python3`, `javascript` → `node`)
- Start with ~15-20 common languages (Python, JavaScript, TypeScript, Java, C++, Go, Rust, etc.)
- Show visual indicator if current language supports execution

## Data Flow

### Execution Flow

1. **User triggers execution:**
   - User clicks Run button or hits Ctrl/Cmd+Enter
   - Client collects: `fileId`, `code`, `language`, `socketId`
   - Emits Socket.IO event: `execute_code` with this data

2. **Server processes request:**
   - Server receives `execute_code` event
   - Maps Monaco language to Piston runtime (e.g., `python` → `python3`)
   - Makes HTTP POST to Piston API: `https://emkc.org/api/v2/piston/execute`
   - Request body: `{ language, version, files: [{ content: code }] }`

3. **Piston responds:**
   - Returns: `{ run: { stdout, stderr, code, signal }, language, version }`
   - Server parses response

4. **Broadcast to room:**
   - Server emits to room `editor-${fileId}`: `execution_result` event
   - Includes: output, exit code, execution time, user info (socketId, color)
   - All users in that file room receive the result

5. **Client displays result:**
   - OutputPane receives `execution_result`
   - Adds new entry to results history
   - Auto-opens pane if hidden
   - Scrolls to show new result

### State Management

- Execution results stored in component state (not persisted)
- Each file has separate execution history
- Switching files clears output pane (shows that file's history if any)

## Error Handling

### API-Level Errors

- **Piston API unreachable:** Show user-friendly message "Code execution service unavailable. Try again later."
- **Rate limiting:** If hit rate limits, show message with retry-after time
- **Invalid language/version:** Fallback to latest version or show unsupported language warning
- **Network timeout:** 10-second timeout on server, show "Execution timed out" message

### Execution Errors

- **Runtime errors (stderr):** Display in OutputPane with red text, show exit code
- **Compilation errors:** Show compiler output clearly formatted
- **Empty output:** Show message "Program completed with no output"
- **Very long output:** Truncate after 10,000 characters, show "[Output truncated]" warning

### User Experience

- **Concurrent executions:** Queue requests per user (no spam-clicking Run button)
- **File switching during execution:** Cancel pending request or let it complete but don't show result
- **User disconnects during execution:** Server completes but doesn't try to send result to disconnected socket
- **Unsupported language:** Disable Run button, show tooltip "Execution not supported for this language"

### Edge Cases

- **No code in editor:** Disable Run button or show "No code to execute"
- **Multiple users hit Run simultaneously:** All executions proceed independently, results shown with user attribution
- **Very fast execution:** Ensure spinner shows for at least 200ms (better UX than flickering)

### Logging

- Server logs all execution requests with: timestamp, socketId, language, success/failure
- Log Piston API response times for monitoring

## Testing Strategy

### Manual Testing Checklist

- **Basic execution:** Run simple "Hello World" in Python, JavaScript, Java
- **Error cases:** Test syntax errors, runtime errors, infinite loops (should timeout)
- **Output types:** Test stdout, stderr, mixed output, empty output
- **Language support:** Verify mapping works for top 10 languages

### Playwright MCP Automated Tests

**Collaboration testing:**
- Open two browser tabs as different users in same file
- User A clicks Run → verify User B sees result with User A's attribution
- Verify user avatars/colors appear correctly in output
- Test concurrent executions from multiple users

**UI interaction testing:**
- Toggle OutputPane open/close → verify state persists in localStorage
- Click Run button → verify spinner appears, output displays
- Test keyboard shortcut (Ctrl/Cmd+Enter) → verify execution triggers
- Resize OutputPane → verify width persists
- Clear output button → verify results are cleared
- Switch files → verify output pane updates/clears appropriately

**Error scenario testing:**
- Mock Piston API failure → verify error message displays
- Test with unsupported language → verify Run button is disabled
- Empty editor → verify appropriate feedback
- Long output → verify truncation works

### Integration Testing

- Mock Piston API responses in development
- Test Socket.IO event flow (execute_code → execution_result)
- Verify room-based broadcasting (only users in same file see results)

### User Acceptance Criteria

- ✅ User can execute code in 15+ languages
- ✅ Results appear in under 5 seconds for simple programs
- ✅ All users in file see who ran the code
- ✅ OutputPane can be hidden/shown without losing results
- ✅ Errors are clearly displayed and understandable
- ✅ Keyboard shortcut works

### Performance Considerations

- Piston API calls don't block other operations
- OutputPane renders efficiently with 50+ result entries
- No memory leaks from execution history (clear old results after 100 entries)

## Technical Details

### Piston API

**Endpoint:** `https://emkc.org/api/v2/piston/execute`

**Request format:**
```json
{
  "language": "python",
  "version": "3.10.0",
  "files": [
    {
      "name": "main.py",
      "content": "print('Hello, World!')"
    }
  ]
}
```

**Response format:**
```json
{
  "language": "python",
  "version": "3.10.0",
  "run": {
    "stdout": "Hello, World!\n",
    "stderr": "",
    "code": 0,
    "signal": null,
    "output": "Hello, World!\n"
  }
}
```

### Language Mapping

| Monaco Language | Piston Runtime |
|----------------|----------------|
| javascript     | node           |
| typescript     | typescript     |
| python         | python3        |
| java           | java           |
| cpp            | cpp            |
| c              | c              |
| go             | go             |
| rust           | rust           |
| ruby           | ruby           |
| php            | php            |
| swift          | swift          |
| kotlin         | kotlin         |
| csharp         | csharp         |

### Socket.IO Events

**Client → Server:**
- `execute_code`: `{ fileId: number, code: string, language: string }`

**Server → Client:**
- `execution_result`: `{ fileId: number, output: string, stderr: string, exitCode: number, executionTime: number, user: { socketId: string, color: string }, timestamp: string }`
- `execution_error`: `{ fileId: number, error: string, timestamp: string }`

## Implementation Phases

### Phase 1: Basic Execution (MVP)
- OutputPane component with basic layout
- Run button in OutputPane top bar
- Server-side Piston API integration
- Socket.IO events for execution
- Support for JavaScript and Python only
- Basic error handling

### Phase 2: Enhanced UX
- Add 13+ more languages
- Keyboard shortcut (Ctrl/Cmd+Enter)
- Resizable OutputPane
- Execution history per file
- Loading states and animations
- Syntax highlighting for output

### Phase 3: Collaboration Features
- User attribution in results
- Concurrent execution handling
- Real-time result broadcasting to all users
- User avatars/colors in output

### Phase 4: Polish & Testing
- Playwright MCP tests
- Error message refinement
- Performance optimization
- Output truncation for long results
- Clear output functionality

## Success Metrics

- Users successfully execute code in 95%+ of attempts
- Average execution time under 3 seconds
- Zero crashes from malformed input
- Positive user feedback on collaborative execution experience
