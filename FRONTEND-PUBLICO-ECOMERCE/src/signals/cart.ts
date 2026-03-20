import { signal } from '@preact/signals';
import { isAuthenticated } from './index'; // or other appropiate import for auth signal
import {
    obtenerCarritoServidor,
    agregarItemCarritoServidor,
    actualizarItemCarritoServidor,
    eliminarItemCarritoServidor,
    vaciarCarritoServidor
} from '../services/carritoService';
import { getProductos } from '../services/catalogoService';

export interface CartItem {
    id_variante: string;
    cantidad: number;

    // Additional properties that we might want to attach when fetching product details
    // But for the logic core, we only strictly need ID and Quantity.
    producto_nombre?: string;
    variante_nombre?: string;
    precio?: number;
    imagen?: string;
}

const LOCAL_STORAGE_KEY = 'ecomerce_cart_temp';

// ── Manejo de LocalStorage ──────────────────────────────────────
const getLocalCart = (): CartItem[] => {
    try {
        const item = localStorage.getItem(LOCAL_STORAGE_KEY);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

const setLocalCart = (cart: CartItem[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
};

export const clearLocalCart = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export const hasLocalCartItems = (): boolean => {
    return getLocalCart().length > 0;
};

// ── Estado Global Reactivo (Signal) ─────────────────────────────
export const cartSignal = signal<CartItem[]>(getLocalCart());

// ── Lógica de Sincronización y Acciones ─────────────────────────

/**
 * Carga el carrito del servidor y sobreescribe el estado local si el
 * usuario está autenticado. 
 */
export const syncCartFromAPI = async () => {
    if (!isAuthenticated.value) return;

    try {
        const data = await obtenerCarritoServidor();
        if (data.items && data.items.length > 0) {
            // Intentar rehidratar los datos estéticos del carrito obteniendo el catálogo
            let productos: any[] = [];
            try {
                productos = await getProductos();
            } catch (err) {
                console.error("No se pudo obtener el catálogo para rehidratar el carrito", err);
            }

            // Mapeamos los datos de la DB al formato del Signal
            cartSignal.value = data.items.map(item => {
                let producto_nombre, variante_nombre, precio, imagen;

                for (const prod of productos) {
                    const v = (prod.variantes || []).find((vari: any) => vari.id === item.id_variante);
                    if (v) {
                        producto_nombre = prod.nombre;
                        variante_nombre = v.nombre;
                        const desc = v.precio_descuento;
                        const base = v.precio;
                        precio = desc && desc < base ? desc : base;
                        imagen = v.imagenes?.[0];
                        break;
                    }
                }

                return {
                    id_variante: item.id_variante,
                    cantidad: Number(item.cantidad),
                    producto_nombre,
                    variante_nombre,
                    precio,
                    imagen
                };
            });
        } else {
            cartSignal.value = [];
        }
    } catch (error) {
        console.error("Error obteniendo el carrito del servidor", error);
    }
};

// ── Lógica de Debounce (Opción B del Plan) ──────────────────────
const updateTimers: Record<string, ReturnType<typeof setTimeout>> = {};

const debounceCartUpdate = (id_variante: string, cantidadExacta: number) => {
    if (updateTimers[id_variante]) {
        clearTimeout(updateTimers[id_variante]);
    }

    // Configurado a 2 segundos exactos (2000ms) según solicitud del usuario.
    updateTimers[id_variante] = setTimeout(async () => {
        try {
            await actualizarItemCarritoServidor(id_variante, cantidadExacta);
        } catch (error) {
            console.error("Error en autoguardado de cantidad del carrito", error);
        } finally {
            delete updateTimers[id_variante];
        }
    }, 2000);
};

export interface AddToCartProps {
    id_variante: string;
    cantidad: number;
    maxCantidad?: number; // Optional sync
    precio?: number;
    producto_nombre?: string;
    variante_nombre?: string;
    imagen?: string;
}

/**
 * Agrega un item al carrito. Si el usuario está logueado, lo envía a BD.
 * Si no, lo guarda en LocalStorage. Si ya existe, suma la cantidad.
 */
export const addToCart = async (props: AddToCartProps) => {
    const { id_variante, cantidad, maxCantidad, precio, producto_nombre, variante_nombre, imagen } = props;
    const limit = maxCantidad ?? 99;

    // Optimistic UI o estado directo
    const current = [...cartSignal.value];
    const existingIndex = current.findIndex(item => item.id_variante === id_variante);
    let isNewAddition = false;

    if (existingIndex >= 0) {
        current[existingIndex].cantidad = Math.min(current[existingIndex].cantidad + cantidad, limit);
    } else {
        isNewAddition = true;
        current.push({
            id_variante,
            cantidad: Math.min(cantidad, limit),
            precio,
            producto_nombre,
            variante_nombre,
            imagen
        });
    }

    // Actualiza Signal instántaneamente
    cartSignal.value = current;

    if (isAuthenticated.value) {
        if (isNewAddition) {
            // Es completamentey nuevo en su carrito, disparamos POST en nube
            try {
                // Mandamos a sumar la cantidad inicial
                await agregarItemCarritoServidor(id_variante, Math.min(cantidad, limit));
            } catch (error) {
                console.error("Error al agregar item en DB", error);
            }
        } else {
            // Ya existía en su carrito. Hacemos autoguardado a los 2 segundos mediante PATCH usando el total.
            debounceCartUpdate(id_variante, current[existingIndex].cantidad);
        }
    } else {
        // En local
        setLocalCart(current);
    }
};

/**
 * Actualiza la cantidad exacta de un item.
 */
export const updateCartItemQuantity = async (id_variante: string, cantidadExacta: number) => {
    if (cantidadExacta <= 0) {
        await removeCartItem(id_variante);
        return;
    }

    const current = [...cartSignal.value];
    const existingIndex = current.findIndex(item => item.id_variante === id_variante);

    if (existingIndex >= 0) {
        current[existingIndex].cantidad = cantidadExacta;
        cartSignal.value = current;

        if (isAuthenticated.value) {
            debounceCartUpdate(id_variante, cantidadExacta);
        } else {
            setLocalCart(current);
        }
    }
};

/**
 * Elimina un item del carrito
 */
export const removeCartItem = async (id_variante: string) => {
    // Si había un temporizador de autoguardado para este variante pendiente, cancelarlo.
    if (updateTimers[id_variante]) {
        clearTimeout(updateTimers[id_variante]);
        delete updateTimers[id_variante];
    }

    const current = cartSignal.value.filter(item => item.id_variante !== id_variante);
    cartSignal.value = current;

    if (isAuthenticated.value) {
        try {
            await eliminarItemCarritoServidor(id_variante);
        } catch (error) {
            console.error("Error al eliminar item en DB", error);
        }
    } else {
        setLocalCart(current);
    }
};

/**
 * Vacía el carrito por completo
 */
export const clearCart = async () => {
    cartSignal.value = [];

    // Si queremos obligar el vaciado de Local Storage independientemente de la autenticación:
    clearLocalCart();

    if (isAuthenticated.value) {
        try {
            await vaciarCarritoServidor();
        } catch (error) {
            console.error("Error al vaciar el carrito en DB", error);
        }
    }
};

/**
 * Fusiona el carrito que esté guardado localmente hacia la cuenta de la BD,
 * luego limpia el localStorage y recarga del servidor.
 */
export const mergeLocalCartToAccount = async () => {
    const itemsLocales = getLocalCart();
    if (itemsLocales.length === 0) return;

    try {
        // Insertamos cada item local a la base de datos (con UPSERT mediante el endpoint POST)
        const promises = itemsLocales.map(item =>
            agregarItemCarritoServidor(item.id_variante, item.cantidad)
        );

        await Promise.all(promises);

        // Limpiamos local
        clearLocalCart();

        // Refrescamos desde servidor
        await syncCartFromAPI();
    } catch (error) {
        console.error("Error durante la fusión de carritos", error);
    }
};

// ── Auto-Sincronización ─────────────────────────────────────────
// Cuando el estado de autenticación cambie a verdadero (p. ej. recarga de página), hidratamos el carrito.
isAuthenticated.subscribe((isAuth) => {
    if (isAuth) {
        syncCartFromAPI();
    }
});
