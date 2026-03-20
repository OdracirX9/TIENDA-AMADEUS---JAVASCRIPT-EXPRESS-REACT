import axios from 'axios';
import { clienteUser } from '../signals';
import { clearCart } from '../signals/cart';

/**
 * Cliente Axios dedicado al servidor de usuarios.
 * Requiere withCredentials=true para que las cookies de sesión
 * sean enviadas y recibidas correctamente entre el frontend y el Gateway.
 *
 * La URL base se configura con VITE_API_GATEWAY_URL (sin el sufijo de ruta).
 */
const BASE_GATEWAY = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4001';

const usuarioClient = axios.create({
    baseURL: `${BASE_GATEWAY}/ecomerce-regenievex-usuarios`,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,   // ← Requerido para cookies de sesión
});

usuarioClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Detectar si la sesión expiró o es inválida
        if (error?.response?.status === 401) {
            const originalRequest = error.config;

            // Evitar bucle infinito si la petición original que falló ya era el logout
            if (originalRequest.url !== '/auth/logout') {
                // 1. Limpiar estado global inmediatamente
                clienteUser.value = null;

                // 2. Comunicar al backend que destruya la cookie HTTP-Only para estar seguros
                try {
                    await usuarioClient.post('/auth/logout');
                } catch (e) {
                    // Ignorar errores del logout forzado
                }
            }
        }

        console.error('[Usuario API Error]', error?.response?.status, error?.message);
        return Promise.reject(error);
    }
);

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface UsuarioSesion {
    id: string;
    nombre: string;
    correo: string;
    celular: string | null;
    created_at: string;
}

export interface Transaccion {
    id: string;
    id_wompi: string;
    estado: string;
    descripcion: string;
    compra_total: number;
    metodo_pago: string | null;
    created_at: string;
    updated_at: string | null;
}

export interface DireccionEnvio {
    id: string;
    nombre_usuario: string;
    celular: string;
    direccion_envio: string;
    ciudad: string;
    departamento: string;
    descripcion: string | null;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginUsuario = async (correo: string, password: string) => {
    const res = await usuarioClient.post('/auth/login', { correo, password });
    return res.data;
};

export const registroUsuario = async (nombre: string, correo: string, password: string) => {
    const res = await usuarioClient.post('/auth/registro', { nombre, correo, password });
    return res.data;
};

// ── Sesión / datos del usuario ────────────────────────────────────────────────

export const obtenerSesionUsuario = async (): Promise<{
    usuario?: UsuarioSesion;
    transacciones?: Transaccion[];
    direcciones?: DireccionEnvio[];
}> => {
    const res = await usuarioClient.get('/sesion-usuario', {
        params: { usuario: 'true', transaccion: 'true', direccion: 'true' }
    });
    return res.data;
};

export const cerrarSesionUsuario = async () => {
    // El servidor-usuarios destruye la sesión en este endpoint
    const res = await usuarioClient.post('/auth/logout');
    // Limpiamos el carrito local
    await clearCart();
    return res.data;
};

export const actualizarUsuario = async (datos: Partial<Pick<UsuarioSesion, 'nombre' | 'correo' | 'celular'>>) => {
    // El sub-router de sesion-usuario monta PATCH en '/', por eso la barra final es necesaria.
    const res = await usuarioClient.patch('/sesion-usuario/', datos);
    return res.data;
};

// ── Direcciones de envío ──────────────────────────────────────────────────────

export const crearDireccionUsuario = async (datos: Omit<DireccionEnvio, 'id'>) => {
    const res = await usuarioClient.post('/sesion-usuario/actualizar-direccion-envio', datos);
    return res.data;
};

export const actualizarDireccionUsuario = async (datos: DireccionEnvio) => {
    const res = await usuarioClient.patch('/sesion-usuario/actualizar-direccion-envio', datos);
    return res.data;
};

export const eliminarDireccionUsuario = async (idDireccion: string) => {
    const res = await usuarioClient.delete(`/sesion-usuario/actualizar-direccion-envio?id=${idDireccion}`);
    return res.data;
};

// ── Órdenes del usuario ───────────────────────────────────────────────────────

/** Orden del usuario devuelta por GET /sesion-usuario/mis-ordenes */
export interface OrdenUsuario {
    id: string;
    created_at: string;
    estado_envio: string | null;
    estado_pago: string | null;
    compra_total: number;   // en centavos
    metodo_pago: string | null;
    total_productos: number;
    precio_envio: number;
}

/** Producto dentro del detalle de una orden */
export interface ProductoOrden {
    id_producto: string;
    nombre: string;
    marca: string | null;
    categoria: string | null;
    imagen: string | null;   // nombre de archivo → usar getMinioUrl para la URL completa
    cantidad: number;
    precio: number;          // en centavos
    descuento: number | null;
    sub_total: number;       // en centavos
}

/** Detalle completo de una orden */
export interface OrdenDetalle {
    id: string;
    nombre_usuario: string;
    correo: string;
    celular: string | null;
    direccion_envio: string;
    ciudad: string;
    departamento: string;
    estado_envio: string | null;
    numero_guia: string | null;
    created_at: string;
    estado_pago: string | null;
    compra_total: number;    // en centavos
    precio_envio: number;    // en centavos
    metodo_pago: string | null;
    id_wompi: string | null;
    productos: ProductoOrden[] | null;
}

/** Lista todas las órdenes del usuario autenticado */
export const obtenerMisOrdenes = async (): Promise<OrdenUsuario[]> => {
    const res = await usuarioClient.get('/sesion-usuario/mis-ordenes');
    return res.data;
};

/** Obtiene el detalle completo de una orden del usuario autenticado */
export const obtenerMiOrden = async (id: string): Promise<OrdenDetalle> => {
    const res = await usuarioClient.get(`/sesion-usuario/mi-orden/${id}`);
    return res.data;
};
