import axios from 'axios';

const BASE_GATEWAY = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4001';

const carritoClient = axios.create({
    baseURL: `${BASE_GATEWAY}/ecomerce-regenievex-usuarios/sesion-usuario`,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

export interface CartItemAPI {
    id_carrito: string;
    id_variante: string;
    cantidad: number;
    updated_at: string;
}

export const obtenerCarritoServidor = async (): Promise<{ items: CartItemAPI[] }> => {
    const res = await carritoClient.get('/carrito');
    return res.data;
};

export const agregarItemCarritoServidor = async (id_variante: string, cantidad: number) => {
    const res = await carritoClient.post('/carrito', { id_variante, cantidad });
    return res.data;
};

export const actualizarItemCarritoServidor = async (id_variante: string, cantidad: number) => {
    const res = await carritoClient.patch(`/carrito/${id_variante}`, { cantidad });
    return res.data;
};

export const eliminarItemCarritoServidor = async (id_variante: string) => {
    const res = await carritoClient.delete(`/carrito/${id_variante}`);
    return res.data;
};

export const vaciarCarritoServidor = async () => {
    const res = await carritoClient.delete('/carrito');
    return res.data;
};
