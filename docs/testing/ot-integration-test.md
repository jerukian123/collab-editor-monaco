# OT Integration Testing

## Manual Test Scenarios

### Test 1: Late Joiner Receives Content

**Steps:**
1. User A creates a room
2. User A types "hello world" in main.js
3. User B joins the room
4. User B opens main.js

**Expected:**
- User B sees "hello world" in the editor
- Console shows "Synced to revision N"

### Test 2: Concurrent Editing Converges

**Steps:**
1. User A and User B both in same editor
2. Both type simultaneously at different positions
3. Wait for operations to sync

**Expected:**
- Both users see the same final content
- No overwrites or lost characters

### Test 3: Insert at Same Position

**Steps:**
1. Both users have cursor at position 0 in "abc"
2. User A types "x"
3. User B types "y"

**Expected:**
- Final content is "xyabc" or "yxabc" (deterministic)
- Both users converge to same result

### Test 4: Delete Overlapping Text

**Steps:**
1. Document contains "hello world"
2. User A deletes "hello"
3. User B deletes "ello w" (overlapping)

**Expected:**
- Operations transform correctly
- No errors thrown
- Final content is deterministic

### Test 5: Server Restart Recovery

**Steps:**
1. User A creates room, types content
2. Restart server (Ctrl+C, npm start)
3. User A refreshes browser

**Expected:**
- Room still exists (within 30 min expiry)
- Content is recovered from PostgreSQL
- User can continue editing

### Test 6: Large Paste Operation

**Steps:**
1. User pastes 1000+ lines of code
2. Check server logs

**Expected:**
- Operation processes without errors
- Database write scheduled
- Other users receive the operation

## Database Verification

**Check documents table:**
```sql
SELECT * FROM editor_documents;
```

**Expected columns:**
- room_code, editor_id, content, revision, updated_at

**Verify revision increments:**
- Each operation should increment revision by 1

## Performance Testing

**Rapid typing test:**
1. Type continuously for 30 seconds
2. Check debounced writes (should batch, not write every keystroke)

**Expected:**
- Database writes occur ~2 seconds after typing stops
- No performance degradation
