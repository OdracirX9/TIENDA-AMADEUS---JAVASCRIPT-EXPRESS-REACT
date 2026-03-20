import axios from 'axios';

/**
 * Cliente Axios para el API Gateway.
 *
 * El Gateway actúa como proxy entre el frontend y los microservicios.
 * Inyecta automáticamente el header 'imagine-dragons' (JWT) hacia el backend,
 * por lo que el frontend no necesita ningún header de autenticación especial.
 *
 * La URL base se configura mediante la variable de entorno VITE_API_GATEWAY_URL.
 *
 * Rutas disponibles:
 *  - /ecomerce-regenievex/conseguir-productos
 *  - /ecomerce-regenievex/conseguir-elementos
 *  - /ecomerce-regenievex/conseguir-producto/:id
 */
const apiClient = axios.create({
    baseURL: (import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:4001') + '/ecomerce-regenievex',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de respuesta: log de errores en desarrollo
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[API Gateway Error]', error?.response?.status, error?.message);
        return Promise.reject(error);
    }
);

export const consultarTarifaEnvioEndpoint = async (departamento: string, ciudad: string): Promise<number> => {
    try {
        const respuesta = await apiClient.post('/comprobar-tarifa-envio', { departamento, ciudad });
        if (respuesta.data && respuesta.data.valido) {
            return respuesta.data.tarifa;
        }
        return 2000000;
    } catch (error) {
        console.error("Error al consultar la tarifa de envío:", error);
        return 2000000; // Fallback predeterminado
    }
};

export default apiClient;
