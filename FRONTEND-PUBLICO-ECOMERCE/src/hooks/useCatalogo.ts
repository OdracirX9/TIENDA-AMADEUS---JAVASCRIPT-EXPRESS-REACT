import { useState, useEffect, useRef } from 'preact/hooks';
import { getCache, setCache } from '../utils/browserCache';
import {
    getProductos,
    getElementos,
    getProductoPorId,
    type Producto,
    type Elementos,
    type FiltrosProducto,
} from '../services/catalogoService';

// TTL de 5 minutos en milisegundos
const CACHE_TTL = 5 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
//  ESTADO GENÉRICO
// ─────────────────────────────────────────────────────────────────────────────

interface HookState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  useProductos — Lista de productos con filtros opcionales
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook para obtener la lista de productos del catálogo.
 * La respuesta se guarda en localStorage durante 5 minutos.
 * Si hay datos válidos en caché, NO se hace petición al API.
 *
 * @param filtros - Filtros opcionales: search, categoria, marca (por ID)
 */
export function useProductos(filtros: FiltrosProducto = {}): HookState<Producto[]> {
    const [state, setState] = useState<HookState<Producto[]>>({
        data: null,
        loading: true,
        error: null,
    });

    // Construcción de clave de caché única por combinación de filtros
    const cacheKey = `ecomerce:productos:${JSON.stringify(filtros)}`;

    // Ref para evitar actualizar estado si el componente se desmontó
    const montado = useRef(true);

    useEffect(() => {
        montado.current = true;

        const fetchData = async () => {
            // 1. Intentar leer de caché primero
            const cached = getCache<Producto[]>(cacheKey);
            if (cached) {
                if (montado.current) {
                    setState({ data: cached, loading: false, error: null });
                }
                return;
            }

            // 2. Si no hay caché válida, consultar el API
            if (montado.current) {
                setState((prev) => ({ ...prev, loading: true, error: null }));
            }

            try {
                const data = await getProductos(filtros);

                // 3. Guardar en caché
                setCache(cacheKey, data, CACHE_TTL);

                if (montado.current) {
                    setState({ data, loading: false, error: null });
                }
            } catch (err: any) {
                console.error('[useProductos] Error al obtener productos:', err);
                if (montado.current) {
                    setState({ data: null, loading: false, error: 'No se pudieron cargar los productos.' });
                }
            }
        };

        fetchData();

        return () => {
            montado.current = false;
        };
    }, [cacheKey]);

    return state;
}

// ─────────────────────────────────────────────────────────────────────────────
//  useElementos — Marcas y categorías
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY_ELEMENTOS = 'ecomerce:elementos';

/**
 * Hook para obtener marcas y categorías disponibles.
 * Se almacenan en caché durante 5 minutos.
 */
export function useElementos(): HookState<Elementos> {
    const [state, setState] = useState<HookState<Elementos>>({
        data: null,
        loading: true,
        error: null,
    });

    const montado = useRef(true);

    useEffect(() => {
        montado.current = true;

        const fetchData = async () => {
            // 1. Revisar caché
            const cached = getCache<Elementos>(CACHE_KEY_ELEMENTOS);
            if (cached) {
                if (montado.current) {
                    setState({ data: cached, loading: false, error: null });
                }
                return;
            }

            // 2. Consultar API
            if (montado.current) {
                setState((prev) => ({ ...prev, loading: true, error: null }));
            }

            try {
                const data = await getElementos();
                setCache(CACHE_KEY_ELEMENTOS, data, CACHE_TTL);

                if (montado.current) {
                    setState({ data, loading: false, error: null });
                }
            } catch (err: any) {
                console.error('[useElementos] Error al obtener elementos:', err);
                if (montado.current) {
                    setState({ data: null, loading: false, error: 'No se pudieron cargar marcas y categorías.' });
                }
            }
        };

        fetchData();

        return () => {
            montado.current = false;
        };
    }, []);

    return state;
}

// ─────────────────────────────────────────────────────────────────────────────
//  useProducto — Detalle de un producto individual
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook para obtener el detalle de un producto por ID.
 * Se almacena en caché durante 5 minutos por ID.
 *
 * @param id - ID del producto
 */
export function useProducto(id: string | undefined): HookState<Producto> {
    const [state, setState] = useState<HookState<Producto>>({
        data: null,
        loading: true,
        error: null,
    });

    const montado = useRef(true);

    useEffect(() => {
        montado.current = true;

        if (!id) {
            setState({ data: null, loading: false, error: 'ID de producto no especificado.' });
            return;
        }

        const cacheKey = `ecomerce:producto:${id}`;

        const fetchData = async () => {
            // 1. Revisar caché
            const cached = getCache<Producto>(cacheKey);
            if (cached) {
                if (montado.current) {
                    setState({ data: cached, loading: false, error: null });
                }
                return;
            }

            // 2. Consultar API
            if (montado.current) {
                setState((prev) => ({ ...prev, loading: true, error: null }));
            }

            try {
                const data = await getProductoPorId(id);
                setCache(cacheKey, data, CACHE_TTL);

                if (montado.current) {
                    setState({ data, loading: false, error: null });
                }
            } catch (err: any) {
                const status = err?.response?.status;
                const msg =
                    status === 404
                        ? 'Producto no encontrado o no disponible.'
                        : 'Error al cargar el producto. Inténtalo de nuevo.';

                console.error('[useProducto] Error:', err);
                if (montado.current) {
                    setState({ data: null, loading: false, error: msg });
                }
            }
        };

        fetchData();

        return () => {
            montado.current = false;
        };
    }, [id]);

    return state;
}
