import { useState, useEffect, useRef } from 'preact/hooks';
import { Search, ArrowRight, X, TrendingUp } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';
import { getCache, setCache } from '../utils/browserCache';
import { getProductos } from '../services/catalogoService';
import type { Producto } from '../services/catalogoService';
import { formatearPrecio } from '../utils/precios';

// ─────────────────────────────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface NavbarSearchProps {
    /** Si `true`, ocupa todo el ancho disponible (sidebar móvil) */
    fullWidth?: boolean;
    /** Callback para cerrar el menú móvil al navegar */
    onNavigate?: () => void;
}

// Cache local de productos para no llamar al API en cada keystroke
const CACHE_KEY_SEARCH = 'ecomerce:productos:{}'; // los productos sin filtros

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: imagen principal de un producto
// ─────────────────────────────────────────────────────────────────────────────
function getImagen(producto: Producto): string {
    return (
        producto.variantes?.[0]?.imagenes?.[0] ??
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────
export function NavbarSearch({ fullWidth = false, onNavigate }: NavbarSearchProps) {
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [resultados, setResultados] = useState<Producto[]>([]);
    const [abierto, setAbierto] = useState(false);
    const [cargando, setCargando] = useState(false);

    // Referencia al contenedor para cerrar al hacer click fuera
    const contenedorRef = useRef<HTMLDivElement>(null);

    // ── Cerrar al click fuera ──────────────────────────────────────────────
    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickFuera);
        return () => document.removeEventListener('mousedown', handleClickFuera);
    }, []);

    // ── Búsqueda con debounce de 300ms ─────────────────────────────────────
    useEffect(() => {
        const termino = query.trim();

        if (!termino) {
            setResultados([]);
            setAbierto(false);
            return;
        }

        const timer = setTimeout(async () => {
            setCargando(true);
            try {
                // 1. Intentar leer todos los productos desde caché del navegador
                let todos = getCache<Producto[]>(CACHE_KEY_SEARCH);

                // 2. Si no hay caché, llamar al API (sin filtros)
                if (!todos) {
                    todos = await getProductos({});
                    setCache(CACHE_KEY_SEARCH, todos, 5 * 60 * 1000);
                }

                // 3. Filtrar localmente por término de búsqueda
                const terminoLC = termino.toLowerCase();
                const filtrados = (todos ?? []).filter(p => {
                    const variantes = p.variantes ?? [];
                    return variantes.some(v =>
                        v.nombre?.toLowerCase().includes(terminoLC) ||
                        v.descripcion?.toLowerCase().includes(terminoLC)
                    ) || p.nombre_marca?.toLowerCase().includes(terminoLC)
                        || p.nombre_categoria?.toLowerCase().includes(terminoLC);
                });

                // Mostrar máximo 5 coincidencias en el dropdown
                setResultados(filtrados.slice(0, 5));
                setAbierto(true);
            } catch (e) {
                console.warn('[NavbarSearch] Error al buscar:', e);
                setResultados([]);
            } finally {
                setCargando(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // ── Navegar a /tienda con búsqueda completa ────────────────────────────
    const irAlCatalogo = (terminoBusqueda?: string) => {
        const t = terminoBusqueda ?? query.trim();
        setAbierto(false);
        setQuery('');
        onNavigate?.();
        if (t) {
            navigate(`/tienda?search=${encodeURIComponent(t)}`);
        } else {
            navigate('/tienda');
        }
    };

    // ── Navegar a producto individual ──────────────────────────────────────
    const irAProducto = (id: string) => {
        setAbierto(false);
        setQuery('');
        onNavigate?.();
        navigate(`/producto/${id}`);
    };

    // ── Enter: navegar directamente al catálogo ────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') irAlCatalogo();
        if (e.key === 'Escape') { setAbierto(false); setQuery(''); }
    };

    const mostrarDropdown = abierto && query.trim().length > 0;

    return (
        <div
            ref={contenedorRef}
            class={`relative ${fullWidth ? 'w-full' : 'flex-1 max-w-xl mx-auto'}`}
        >
            {/* ── Input ───────────────────────────────────────────────────── */}
            <div class="relative group">
                <input
                    id="navbar-search-input"
                    type="text"
                    value={query}
                    onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (query.trim()) setAbierto(true); }}
                    placeholder="Buscar productos, marcas, categorías..."
                    autoComplete="off"
                    class={`w-full h-12 pl-12 pr-10 bg-slate-100/50 border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:bg-white focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-400 ${fullWidth ? 'rounded-xl' : ''}`}
                />
                <Search
                    class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none"
                    size={20}
                />

                {/* Botón limpiar */}
                {query && (
                    <button
                        onClick={() => { setQuery(''); setAbierto(false); }}
                        class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* ── Dropdown de resultados ───────────────────────────────────── */}
            {mostrarDropdown && (
                <div class="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-100 overflow-hidden">

                    {/* Estado: cargando */}
                    {cargando && (
                        <div class="px-4 py-6 flex items-center gap-3 text-slate-400">
                            <div class="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                            <span class="text-sm font-medium">Buscando...</span>
                        </div>
                    )}

                    {/* Sin resultados */}
                    {!cargando && resultados.length === 0 && (
                        <div class="px-4 py-6 text-center text-slate-400">
                            <p class="text-sm font-medium">Sin resultados para <span class="font-bold text-slate-600">"{query}"</span></p>
                        </div>
                    )}

                    {/* Lista de coincidencias */}
                    {!cargando && resultados.length > 0 && (
                        <ul>
                            {resultados.map((producto) => {
                                const variante = producto.variantes?.[0];
                                const nombre = variante?.nombre ?? 'Producto';
                                const precio = variante?.precio ?? 0;
                                const descuento = variante?.precio_descuento;
                                const precioFinal = (descuento && descuento < precio) ? descuento : precio;
                                const imagen = getImagen(producto);

                                return (
                                    <li key={producto.id}>
                                        <button
                                            onClick={() => irAProducto(variante?.id ?? producto.id)}
                                            class="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left group/item"
                                        >
                                            {/* Miniatura */}
                                            <div class="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                                <img
                                                    src={imagen}
                                                    alt={nombre}
                                                    class="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src =
                                                            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop';
                                                    }}
                                                />
                                            </div>

                                            {/* Texto */}
                                            <div class="flex-1 min-w-0">
                                                {producto.nombre_marca && (
                                                    <p class="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-0.5">
                                                        {producto.nombre_marca}
                                                    </p>
                                                )}
                                                <p class="text-sm font-bold text-slate-800 truncate group-hover/item:text-brand-600 transition-colors">
                                                    {nombre}
                                                </p>
                                                <p class="text-xs font-semibold text-slate-500 mt-0.5">
                                                    {formatearPrecio(precioFinal)}
                                                </p>
                                            </div>

                                            <ArrowRight size={16} class="text-slate-300 group-hover/item:text-brand-500 transition-colors shrink-0" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* ── Botón: ver todos los resultados ─────────────────── */}
                    <div class="border-t border-slate-100">
                        <button
                            onClick={() => irAlCatalogo()}
                            class="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-brand-50 transition-colors group/all"
                        >
                            <span class="flex items-center gap-2 text-sm font-bold text-slate-700 group-hover/all:text-brand-700">
                                <TrendingUp size={16} class="text-brand-500" />
                                Ver todos los resultados de{' '}
                                <span class="text-brand-600">"{query}"</span>
                            </span>
                            <ArrowRight size={16} class="text-brand-400 group-hover/all:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
