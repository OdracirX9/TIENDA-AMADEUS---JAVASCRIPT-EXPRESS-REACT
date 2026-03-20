import axios from 'axios';

// La URL base del API Gateway sin el sufijo específico de la landing page
// Esto asegura que las peticiones vayan al proxy correcto en el API Gateway
const BASE_GATEWAY = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4001';

const pagosClient = axios.create({
    baseURL: `${BASE_GATEWAY}/ecomerce-regenievex-metodos-pagos`,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // IMPORTANTE: Para enviar la cookie de sesión a comprobarSesionActiva
});

pagosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[Pagos API Error]', error?.response?.status, error?.message);
        return Promise.reject(error);
    }
);

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface GenerarPagoBody {
    variantes: {
        id: string;
        cantidad: number;
    }[];
    direccion_envio_id: string;
}

export interface RespuestaGenerarPago {
    mensaje: string;
    link_pago: string;
}

export interface TransaccionWompi {
    id_wompi: string;
    estado_pago: string;
    compra_total: number;
    fecha_pago: string;
    metodo_pago: string;
    id_orden: string | null;
    estado_envio: string | null;
}

// ── Endpoints ──────────────────────────────────────────────────────────────────

export const generarPagoProxy = async (datos: GenerarPagoBody): Promise<RespuestaGenerarPago> => {
    const res = await pagosClient.post('/generar-pago', datos);
    return res.data;
};

export const obtenerTransaccionWompi = async (id: string): Promise<TransaccionWompi> => {
    const res = await pagosClient.get(`/usuario/transaccion-wompi/${id}`);
    return res.data;
};
