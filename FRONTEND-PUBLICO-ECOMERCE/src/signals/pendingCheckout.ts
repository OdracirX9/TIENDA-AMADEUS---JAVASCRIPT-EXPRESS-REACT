import { signal } from '@preact/signals';

export interface PendingCheckoutItem {
    id_variante: string;
    cantidad: number;
}

// Holds items temporarily when bypassing the cart (e.g. "Buy Now")
export const pendingCheckoutSignal = signal<PendingCheckoutItem[]>([]);

export const clearPendingCheckout = () => {
    pendingCheckoutSignal.value = [];
};
