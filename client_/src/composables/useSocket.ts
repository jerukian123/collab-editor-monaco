import { ref } from 'vue';
import io, { Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants';

// Singleton socket instance shared across all components
let socketInstance: Socket | null = null;
const clientId = ref<string>('');
const isConnected = ref(false);

export function useSocket() {
  function connect() {
    // Only create one socket instance
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL);

      socketInstance.on('connect', () => {
        isConnected.value = true;
        console.log('Socket connected');
      });

      socketInstance.on('connected', (id: string) => {
        clientId.value = id;
        console.log('Connected with ID:', id);
      });

      socketInstance.on('disconnect', () => {
        isConnected.value = false;
        console.log('Socket disconnected');
      });
    }

    return socketInstance;
  }

  function disconnect() {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }

  function emit(event: string, data: any) {
    socketInstance?.emit(event, data);
  }

  function on(event: string, callback: (...args: any[]) => void) {
    socketInstance?.on(event, callback);
  }

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
