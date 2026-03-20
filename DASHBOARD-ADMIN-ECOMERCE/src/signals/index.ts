import { signal } from '@preact/signals';

export const adminUser = signal<any>(null);
export const authLoading = signal<boolean>(true);
export const isAuthenticated = signal<boolean>(false);

// Subscribe to update isAuthenticated easily
adminUser.subscribe((user) => {
    isAuthenticated.value = !!user;
});

// Toasts System
export interface ToastMessage {
    id: string;
    text: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export const toasts = signal<ToastMessage[]>([]);

export function showToast(text: string, type: ToastMessage['type'] = 'info') {
    const id = Math.random().toString(36).substring(7);
    toasts.value = [...toasts.value, { id, text, type }];
    setTimeout(() => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    }, 4000);
}
