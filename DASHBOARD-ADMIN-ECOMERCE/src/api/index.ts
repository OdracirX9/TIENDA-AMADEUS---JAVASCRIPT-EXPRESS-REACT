import axios from 'axios';

const API_GATEWAY = import.meta.env.VITE_API_URL || 'http://localhost:4001';

export const apiClient = axios.create({
    baseURL: API_GATEWAY,
    withCredentials: true, // Crucial para que lleguen las cookies HTTP-Only de sesion admin
});

// API Administrar Productos (Donde reside el admin auth y catálogo)
const ADMIN_API = '/ecomerce-regenievex-administrar-productos';

export const authApi = {
    login: async (correo: string, password: string) => {
        return apiClient.post(`${ADMIN_API}/admin/auth/login`, { correo, password });
    },
    sesion: async () => {
        return apiClient.get(`${ADMIN_API}/admin/auth/sesion`);
    },
    logout: async () => {
        return apiClient.post(`${ADMIN_API}/admin/auth/logout`);
    }
};

export const productsApi = {
    getProducts: async ({ page = 1, limit = 50, search = '', categoria = '', marca = '' } = {}) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(search && { search }),
            ...(categoria && { categoria }),
            ...(marca && { marca }),
        });
        return apiClient.get(`${ADMIN_API}/admin/obtener-productos?${params.toString()}`);
    },
    uploadImages: async (formData: FormData, folder: string = 'productos') => {
        return apiClient.post(`${ADMIN_API}/guardar-imagenes?carpeta=${folder}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    createProduct: async (productData: any) => {
        return apiClient.post(`${ADMIN_API}/crear-nuevo-producto`, productData);
    },
    getProductById: async (id: string) => {
        return apiClient.get(`${ADMIN_API}/admin/obtener-producto/${id}`);
    },
    updateProduct: async (productData: any) => {
        return apiClient.patch(`${ADMIN_API}/modificar-producto`, productData);
    },
    deleteVariant: async (id: string) => {
        return apiClient.delete(`${ADMIN_API}/borrar-variante/${id}`);
    },
    deleteProduct: async (id: string) => {
        return apiClient.delete(`${ADMIN_API}/borrar-producto/${id}`);
    },
    // Elementos (Marcas y Categorias)
    getElements: async () => {
        return apiClient.get(`${ADMIN_API}/admin/obtener-elementos`);
    },
    createElement: async (elementData: any) => {
        return apiClient.post(`${ADMIN_API}/crear-nuevo-elemento`, elementData);
    },
    updateElement: async (elementData: any) => {
        return apiClient.patch(`${ADMIN_API}/actualizar-elemento`, elementData);
    },
    deleteElement: async (id: string, tipo: string) => {
        return apiClient.delete(`${ADMIN_API}/borrar-elemento/${id}?tipo=${tipo}`);
    }
};

export const ordersApi = {
    getOrders: async ({ page = 1, limit = 50 } = {}) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        return apiClient.get(`${ADMIN_API}/admin/obtener-ordenes?${params.toString()}`);
    },
    getDashboardStats: async () => {
        return apiClient.get(`${ADMIN_API}/admin/obtener-estadisticas`);
    },
    getOrderById: async (id: string) => {
        return apiClient.get(`${ADMIN_API}/admin/obtener-orden/${id}`);
    },
    updateShippingStatus: async (id: string, data: { estado_envio: string; numero_guia?: string }) => {
        return apiClient.patch(`${ADMIN_API}/admin/estado-envio/${id}`, data);
    }
};

export const clientsApi = {
    getClients: async ({ page = 1, limit = 50 } = {}) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        return apiClient.get(`${ADMIN_API}/admin/obtener-clientes?${params.toString()}`);
    },
    deleteClient: async (id: string) => {
        return apiClient.delete(`${ADMIN_API}/admin/borrar-cliente/${id}`);
    }
};

// ─── CONTENIDO DINÁMICO DE LANDING PAGE ──────────────────────────────────
export const landingPageApi = {
    getAll: async () => {
        return apiClient.get(`${ADMIN_API}/admin/obtener-landing-page`);
    },
    create: async (data: { titulo: string; descripcion: string; array_variantes: string[]; visibilidad: boolean; posicion: number; }) => {
        return apiClient.post(`${ADMIN_API}/admin/crear-landing-page`, data);
    },
    update: async (id: string, data: any) => {
        return apiClient.patch(`${ADMIN_API}/admin/actualizar-landing-page/${id}`, data);
    },
    delete: async (id: string) => {
        return apiClient.delete(`${ADMIN_API}/admin/borrar-landing-page/${id}`);
    }
};
export const shippingApi = {
    getShippingRates: async () => {
        return apiClient.get(`${ADMIN_API}/admin/obtener-tarifas-envio`);
    },
    createShippingRate: async (data: { departamento: string, ciudad: string, precio: number, tiempo_estimado?: string }) => {
        return apiClient.post(`${ADMIN_API}/admin/crear-tarifa-envio`, data);
    },
    deleteShippingRate: async (id: string) => {
        return apiClient.delete(`${ADMIN_API}/admin/borrar-tarifa-envio/${id}`);
    }
};
