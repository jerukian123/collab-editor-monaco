export const SOCKET_URL = 'http://localhost:3000';

export const EDITOR_CONFIG = {
  theme: 'vs-dark',
  fontSize: 18,
  defaultLanguage: 'javascript'
} as const;

export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_EDITOR: 'join_editor',
  LEAVE_EDITOR: 'leave_editor',
  SEND_CODE: 'send_code',
  SEND_CURSOR_POSITION: 'send_cursor_position',
  ADD_EDITOR: 'add_editor',
  REMOVE_EDITOR: 'remove_editor',
  
  // Server -> Client
  CONNECTED: 'connected',
  EDITORS_LIST: 'editors_list',
  EDITOR_ADDED: 'editor_added',
  EDITOR_REMOVED: 'editor_removed',
  RECEIVE_CODE: 'receive_code',
  RECEIVE_CURSOR_POSITION: 'receive_cursor_position'
} as const;
