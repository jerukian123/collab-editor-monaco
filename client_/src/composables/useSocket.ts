import { ref, onUnmounted } from 'vue';
import io, { Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/constants';

export function useSocket() {
  const socket = ref<Socket | null>(null);
  const clientId = ref<string>('');
  const isConnected = ref(false);

  function connect() {
    socket.value = io(SOCKET_URL);

    socket.value.on('connect', () => {
      isConnected.value = true;
    });

    socket.value.on('connected', (id: string) => {
      clientId.value = id;
      console.log('Connected with ID:', id);
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });

    return socket.value;
  }

  function disconnect() {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  }

  function emit(event: string, data: any) {
    socket.value?.emit(event, data);
  }

  function on(event: string, callback: (...args: any[]) => void) {
    socket.value?.on(event, callback);
  }

  function off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      socket.value?.off(event, callback);
    } else {
      socket.value?.off(event);
    }
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    clientId,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off
  };
}
