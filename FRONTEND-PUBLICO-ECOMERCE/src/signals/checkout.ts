import { signal } from '@preact/signals';

export interface CheckoutItem {
    id: string; // ID de la variante
    cantidad: number;
    nombre: string;
    precio: number;
    imagen: string;
    sub_total: number;
}

export const checkoutSignal = signal<CheckoutItem[]>([]);
