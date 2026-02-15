<template>
  <div style="height: 100vh; width: 100%; display: flex; flex-direction: column;">
    <div style="height: 40px; background: #1e1e1e; border-bottom: 1px solid #333; display: flex; align-items: center; padding: 0 16px; color: #ccc; font-size: 14px;">
      <span style="opacity: 0.7;">Connected users:</span>
      <div style="margin-left: 12px; display: flex; gap: 8px;">
        <div 
          v-for="[socketId, cursor] in remoteCursors" 
          :key="socketId"
          :style="{
            background: cursor.color,
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }"
        >
          {{ socketId.substring(0, 8) }}
        </div>
      </div>
    </div>
    <div ref="editorContainer" style="flex: 1;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import * as monaco from 'monaco-editor';
import io from 'socket.io-client';

interface Props {
  editorId: number;
  language?: string;
  initialContent?: string;
  isVisible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  language: 'javascript',
  initialContent: '',
  isVisible: false
});

const emit = defineEmits<{
  contentChange: [editorId: number, content: string];
}>();

const editorContainer = ref<HTMLDivElement | null>(null);
const clientId = ref<string>("");
let socketRef: any = null;
let editorRef: monaco.editor.IStandaloneCodeEditor | null = null;
const remoteCursors = ref(new Map<string, { widget: monaco.editor.IContentWidget, position: { lineNumber: number, column: number }, color: string }>());

// Flag to prevent infinite loop when receiving remote updates
let isReceivingRemoteUpdate = false;
// Throttle timers
let contentChangeTimeout: number | null = null;
let cursorPositionTimeout: number | null = null;

// Generate random color for a user
const generateRandomColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
};

onMounted(() => {
  // Initialize Socket.IO
  socketRef = io("http://localhost:3000");

  // Join the specific editor room
  socketRef.on("connect", () => {
    socketRef.emit("join_editor", props.editorId);
    console.log(`Joined editor room: ${props.editorId}`);
  });

  // Initialize Monaco Editor
  if (editorContainer.value) {
    editorRef = monaco.editor.create(editorContainer.value, {
      value: props.initialContent,
      language: props.language,
      theme: "vs-dark",
      fontSize: 18,
    });

    // Set up editor event handlers
    editorRef.onDidChangeModelContent(() => {
      if (editorRef && !isReceivingRemoteUpdate) {
        const value = editorRef.getValue();
        console.log(value);
        
        // Throttle sending to avoid overwhelming the server
        if (contentChangeTimeout) {
          clearTimeout(contentChangeTimeout);
        }
        contentChangeTimeout = window.setTimeout(() => {
          sendCode(value);
          emit('contentChange', props.editorId, value);
        }, 500);
      }
    });

    editorRef.onDidChangeCursorPosition((cursor) => {
      if (!isReceivingRemoteUpdate) {
        const cursorPos = cursor.position;
        console.log(cursorPos);
        
        // Throttle cursor position updates
        if (cursorPositionTimeout) {
          clearTimeout(cursorPositionTimeout);
        }
        cursorPositionTimeout = window.setTimeout(() => {
          sendCursorPosition({
            lineNumber: cursorPos.lineNumber,
            column: cursorPos.column,
            socketId: clientId.value,
            editorId: props.editorId
          });
        }, 100);
      }
    });
  }

  // Socket.IO event listeners
  socketRef.on("connected", (socket_id: string) => {
    clientId.value = socket_id;
    console.log(clientId.value);
  });

  socketRef.on("receive_code", (data: { code: string; editorId: number }) => {
    if (editorRef && data.editorId === props.editorId) {
      // Set flag to prevent triggering change events
      isReceivingRemoteUpdate = true;
      
      // Save current cursor position
      const currentPosition = editorRef.getPosition();
      
      // Update code
      editorRef.setValue(data.code);
      
      // Restore cursor position
      if (currentPosition) {
        editorRef.setPosition(currentPosition);
      }
      
      console.log("Received code for editor", data.editorId, ":", data.code);
      
      // Reset flag after a brief delay
      setTimeout(() => {
        isReceivingRemoteUpdate = false;
      }, 50);
    }
  });

  socketRef.on("receive_cursor_position", (data: { lineNumber: number; column: number; socketId: string; editorId: number }) => {
    console.log("Received cursor position:", data);
    // Only show cursors for the same editor room
    if (editorRef && data.socketId !== clientId.value && data.editorId === props.editorId) {
      // Check if we already have a widget for this user
      const existingCursor = remoteCursors.value.get(data.socketId);
      
      if (existingCursor) {
        // Update position and re-layout
        existingCursor.position = { lineNumber: data.lineNumber, column: data.column };
        editorRef.layoutContentWidget(existingCursor.widget);
        console.log("Updated cursor widget for user:", data.socketId);
      } else {
        // Create new cursor widget with random color
        const position = { lineNumber: data.lineNumber, column: data.column };
        const color = generateRandomColor();
        
        const cursorWidget: monaco.editor.IContentWidget = {
          getDomNode: function () {
            const domNode = document.createElement("div");
            domNode.innerHTML = `
              <div style="position: relative; display: inline-block;">
                <div style="width: 2px; height: 20px; background: ${color}; position: relative;">
                  <div style="position: absolute; bottom: 100%; left: 0; background: ${color}; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 11px; white-space: nowrap; font-weight: 500; margin-bottom: 2px;">${data.socketId}</div>
                </div>
              </div>
            `;
            return domNode;
          },    
          getId: function () {
            return `cursor-${data.socketId}`;
          },
          getPosition: function () {
            const cursorData = remoteCursors.value.get(data.socketId);
            return {
              position: cursorData ? cursorData.position : position,
              preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
            };
          }
        };

        editorRef.addContentWidget(cursorWidget);
        remoteCursors.value.set(data.socketId, { widget: cursorWidget, position, color });
        console.log("Added cursor widget for user:", data.socketId);
      }
    }
  });
});

// Watch for visibility changes and relayout the editor
watch(() => props.isVisible, async (isVisible) => {
  if (isVisible && editorRef) {
    await nextTick();
    editorRef.layout();
    console.log(`Editor ${props.editorId} relayouted`);
  }
});

onUnmounted(() => {
  // Clear any pending timeouts
  if (contentChangeTimeout) {
    clearTimeout(contentChangeTimeout);
  }
  if (cursorPositionTimeout) {
    clearTimeout(cursorPositionTimeout);
  }
  
  // Leave the editor room
  if (socketRef) {
    socketRef.emit("leave_editor", props.editorId);
    socketRef.disconnect();
  }
  
  // Clean up Monaco Editor
  if (editorRef) {
    editorRef.dispose();
  }
});

const sendCode = (value: string) => {
  if (socketRef) {
    socketRef.emit("send_code", {
      code: value,
      editorId: props.editorId
    });
  }
};

const sendCursorPosition = (value: any) => {
  if (socketRef) {
    socketRef.emit("send_cursor_position", value);
  }
};
</script>

<style scoped>
</style>
