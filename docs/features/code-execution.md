# Code Execution Feature

Execute code in multiple programming languages directly in the collaborative editor.

## Supported Languages

| Language   | Runtime Version |
|------------|----------------|
| JavaScript | Node.js 20.11.1 |
| TypeScript | 5.0.3 |
| Python     | 3.12.0 |
| Go         | 1.16.2 |
| Rust       | 1.68.2 |
| Ruby       | 3.0.1 |
| PHP        | 8.2.3 |

## Usage

### Running Code

1. **Via Button:** Click the **Output** button in the top bar to open the output pane, then click **Run**
2. **Via Keyboard:** Press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac) to execute code

### Output Pane

The output pane appears on the right side of the editor and shows:
- Execution results (stdout/stderr)
- Exit code (green = 0, red = non-zero)
- Execution time in milliseconds
- Language and version
- User who triggered the execution (color-coded badge with short user ID)
- Timestamp

### Collaborative Execution

When multiple users are editing the same file:
- Any user can execute the code
- All users in the same file room see the execution results immediately
- Results show which user triggered the execution via a color-coded attribution badge

## Features

- **Real-time results:** All users in the file room receive output instantly via Socket.IO broadcast
- **User attribution:** Each result shows a colored badge identifying who ran the code
- **Error handling:** Runtime errors and non-zero exit codes shown with stderr in red
- **Output truncation:** Output exceeding 10,000 characters is truncated with a TRUNCATED badge
- **Execution history:** Up to 50 recent executions are shown per file session
- **Keyboard shortcut:** `Ctrl/Cmd+Enter` runs code and auto-opens the output pane
- **Persistent UI state:** Output pane visibility and width saved in localStorage

## Architecture

```
Client                    Server                  Piston API (localhost:2000)
  |                         |                         |
  |-- execute_code -------->|                         |
  |   { fileId, code,       |-- POST /api/v2/execute >|
  |     language }          |                         |
  |                         |<-- { run: { stdout,     |
  |                         |     stderr, code } } ---|
  |<-- execution_result ----|                         |
  |   (broadcast to room    |                         |
  |    editor-{fileId})     |                         |
```

### Socket.IO Events

**Client → Server:**
- `execute_code`: `{ fileId: number, code: string, language: string }`
- `get_supported_languages`: (no args) — returns array of supported language IDs

**Server → Client:**
- `execution_result`: `{ fileId, executionId, output, stderr, exitCode, executionTime, language, truncated, user: { socketId }, timestamp }`
- `execution_error`: `{ fileId, executionId, error, timestamp }`
- `supported_languages`: `string[]`

## Configuration

Set `PISTON_URL` environment variable to override the default Piston endpoint:

```bash
PISTON_URL=http://localhost:2000/api/v2 node server/index.js
```

The local Piston instance is configured in `piston/docker-compose.yaml`.

## Limitations

- Maximum execution time: 10 seconds (ECONNABORTED on timeout)
- Maximum output size: 10,000 characters per stdout/stderr
- No persistent file system (each execution is isolated)
- No package installation (uses default Piston runtime versions)
- Languages limited to those installed in the local Piston instance
