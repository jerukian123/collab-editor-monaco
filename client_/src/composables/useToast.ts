import {ref} from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

const toasts = ref<Toast[]>([]);

let idCounter = 0;

export interface Toast {
    id: number;
    type: ToastType;
    message: string;
    duration: number;
}

export function useToast() {
    const addToast = (type: ToastType, message: string, duration = 3000) => {
        const id = idCounter++;
        toasts.value.push({ id, type, message, duration });

        setTimeout(() => {
            removeToast(id);
        }, duration);
    };

    const removeToast = (id: number) => {
        const index = toasts.value.findIndex(toast => toast.id === id);
        if (index !== -1) {
            toasts.value.splice(index, 1);
        }
    };

    return {
        toasts,
        addToast,
        removeToast
    };
}
