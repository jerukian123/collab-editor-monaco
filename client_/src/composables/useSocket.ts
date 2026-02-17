import { ref } from 'vue';
import io, { Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants';

// Singleton socket instance shared across all components
let socketInstance: Socket | null = null;
const clientId = ref<string>('');
const isConnected = ref(false);

export function useSocket() {
  function connect() {
    console.log('[useSocket] connect() called, socketInstance exists:', !!socketInstance)

    // Only create one socket instance
    if (!socketInstance) {
      console.log('[useSocket] Creating new socket instance to:', SOCKET_URL)
      socketInstance = io(SOCKET_URL);

      socketInstance.on('connect', () => {
        isConnected.value = true;
        console.log('[useSocket] Socket "connect" event fired');

      });

      socketInstance.on('connected', (id: string) => {
        clientId.value = id;
        console.log('Connected with ID:', id);
      });

      socketInstance.on('disconnect', () => {
        isConnected.value = false;
        clientId.value = '';
        console.log('Socket disconnected');
      });
    } else if (socketInstance.id && !clientId.value) {
      // HMR or re-mount: socket exists but ref was reset — restore from socket
      clientId.value = socketInstance.id;
    }

    return socketInstance;
  }

  function disconnect() {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function emit(event: string, data: any) {
    socketInstance?.emit(event, data);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function on(event: string, callback: (...args: any[]) => void) {
    socketInstance?.on(event, callback);
    console.log(`[useSocket] Registered handler for event: "${event}"`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      socketInstance?.off(event, callback);
    } else {
      socketInstance?.off(event);
    }
  }

  return {
    socket: socketInstance,
    clientId,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off
  };
}
