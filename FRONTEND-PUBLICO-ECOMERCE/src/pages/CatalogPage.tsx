import { useState, useEffect, useMemo } from 'preact/hooks';
import {
    SlidersHorizontal, X, ChevronDown, Check,
    ShoppingCart, Heart, ArrowUpDown, Grid3X3, List,
    Tag, Sparkles, TrendingUp, Search, Filter, Layers, Package
} from 'lucide-preact';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProductos, useElementos } from '../hooks/useCatalogo';
import type { Producto, Variante } from '../services/catalogoService';
import { formatearPrecio, calcularDescuento } from '../utils/precios';
import { addToCart } from '../signals/cart';
import { isCartOpen } from '../signals/ui';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop';

/** Tolera boolean true, string "true", o number 1 (distintos serializadores de pg/redis) */
export const esVisible = (v: any): boolean => v === true || v === 1 || v === 'true';

/** Variantes visibles con o sin stock */
export const variantesVisibles = (p: Producto): Variante[] =>
    (p.variantes ?? []).filter(v => esVisible(v.visibilidad));

/** Primera variante visible con stock; si todas agotadas, la primera visible */
export const variantePrincipal = (p: Producto): Variante | undefined => {
    const vis = variantesVisibles(p);
    return vis.find(v => (v.stock ?? 0) > 0) ?? vis[0];
};

/** Suma del stock de todas las variantes visibles */
export const stockTotal = (p: Producto): number =>
    variantesVisibles(p).reduce((acc, v) => acc + (v.stock ?? 0), 0);

/** Imagen principal */
export const imagenPrincipal = (p: Producto): string =>
    variantePrincipal(p)?.imagenes?.[0] ?? FALLBACK_IMG;

// ─── ORDENAR OPCIONES ─────────────────────────────────────────────────────────

const ORDENAR_OPCIONES = [
    { value: 'reciente', label: 'Más recientes' },
    { value: 'precio_asc', label: 'Menor precio' },
    { value: 'precio_desc', label: 'Mayor precio' },
];

// ─── SKELETON CARD ────────────────────────────────────────────────────────────

function CardSkeleton() {
    return (
        <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse flex flex-col">
            <div class="aspect-square bg-slate-200" />
            <div class="p-4 flex flex-col gap-3">
                <div class="h-3 bg-slate-200 rounded w-1/3" />
                <div class="h-4 bg-slate-200 rounded w-4/5" />
                <div class="h-4 bg-slate-200 rounded w-3/5" />
                <div class="mt-2 flex justify-between">
                    <div class="h-7 bg-slate-200 rounded w-2/5" />
                    <div class="h-9 w-9 bg-slate-200 rounded-xl" />
                </div>
            </div>
        </div>
    );
}

// ─── SIDEBAR SECTION ──────────────────────────────────────────────────────────

function SidebarSection({
    title, children, defaultOpen = true
}: { title: string; children: any; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div class="border-b border-slate-100 last:border-0 pb-5 last:pb-0 mb-5 last:mb-0">
            <button
                onClick={() => setOpen(o => !o)}
                class="w-full flex items-center justify-between text-sm font-bold text-slate-800 mb-3 hover:text-brand-600 transition-colors"
            >
                {title}
                <ChevronDown size={16} class={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && children}
        </div>
    );
}

// ─── PRODUCT CARD — GRID ──────────────────────────────────────────────────────

export function ProductCardGrid({
    producto, favoritos, toggleFav
}: { producto: Producto; favoritos: Set<string>; toggleFav: (id: string) => void }) {
    const navigate = useNavigate();
    const variante = variantePrincipal(producto);
    const imagen = imagenPrincipal(producto);
    const precio = variante?.precio ?? 0;
    const descuento = variante?.precio_descuento ?? null;
    const descPct = calcularDescuento(precio, descuento);
    const stock = stockTotal(producto);
    const agotado = stock === 0;
    const numVariantes = variantesVisibles(producto).length;
    const nombre = variante?.nombre ?? 'Producto';

    return (
        <div
            onClick={() => {
                if (variante) navigate(`/producto/${variante.id}`);
            }}
            class="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-900/8 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
        >
            {/* Badge descuento */}
            {descPct && !agotado && (
                <div class="absolute top-3 left-3 z-10">
                    <span class="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">-{descPct}%</span>
                </div>
            )}

            {/* Favorito */}
            <button
                onClick={(e) => { e.stopPropagation(); toggleFav(producto.id); }}
                class="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
            >
                <Heart size={15} class={favoritos.has(producto.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
            </button>

            {/* Imagen */}
            <div class={`relative aspect-square overflow-hidden bg-slate-50 ${agotado ? 'opacity-60' : ''}`}>
                <img
                    src={imagen} alt={nombre}
                    class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                />
                {agotado && (
                    <div class="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                        <span class="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full">Agotado</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div class="p-4 flex flex-col flex-1">
                {/* Marca */}
                {producto.nombre_marca && (
                    <span class="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">
                        {producto.nombre_marca}
                    </span>
                )}

                {/* Nombre */}
                <h3 class="text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-2 group-hover:text-brand-700 transition-colors flex-1">
                    {nombre}
                </h3>

                {/* Stock y variantes */}
                <div class="flex items-center gap-3 mb-3">
                    <span class={`flex items-center gap-1 text-[11px] font-bold ${agotado ? 'text-rose-500' : 'text-emerald-600'}`}>
                        <Package size={11} />
                        {agotado ? 'Agotado' : `${stock} en stock`}
                    </span>
                    <span class="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <Layers size={11} />
                        {numVariantes} variante{numVariantes !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Precio + carrito */}
                <div class="flex items-end justify-between mt-auto">
                    <div>
                        {descuento && descuento < precio && !agotado && (
                            <p class="text-xs text-slate-400 line-through font-medium">{formatearPrecio(precio)}</p>
                        )}
                        <p class={`font-black text-lg leading-none ${agotado ? 'text-slate-400' : 'text-slate-900'}`}>
                            {formatearPrecio(descuento && descuento < precio ? descuento : precio)}
                        </p>
                    </div>
                    {!agotado && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (variante) {
                                    addToCart({
                                        id_variante: variante.id,
                                        cantidad: 1,
                                        maxCantidad: stock,
                                        precio: (descuento && descuento < precio ? descuento : precio) / 100, // as pricing handles uncents
                                        producto_nombre: producto.nombre,
                                        variante_nombre: variante.nombre,
                                        imagen: imagen
                                    });
                                    isCartOpen.value = true;
                                }
                            }}
                            class="w-9 h-9 rounded-xl bg-brand-50 hover:bg-brand-600 flex items-center justify-center text-brand-600 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                        >
                            <ShoppingCart size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── PRODUCT CARD — LIST ──────────────────────────────────────────────────────

function ProductCardList({
    producto, favoritos, toggleFav
}: { producto: Producto; favoritos: Set<string>; toggleFav: (id: string) => void }) {
    const navigate = useNavigate();
    const variante = variantePrincipal(producto);
    const imagen = imagenPrincipal(producto);
    const precio = variante?.precio ?? 0;
    const descuento = variante?.precio_descuento ?? null;
    const descPct = calcularDescuento(precio, descuento);
    const stock = stockTotal(producto);
    const agotado = stock === 0;
    const numVariantes = variantesVisibles(producto).length;
    const nombre = variante?.nombre ?? 'Producto';

    return (
        <div
            onClick={() => {
                if (variante) navigate(`/producto/${variante.id}`);
            }}
            class="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:shadow-slate-900/5 transition-all duration-300 overflow-hidden flex cursor-pointer"
        >
            {/* Imagen */}
            <div class={`relative w-44 shrink-0 bg-slate-50 ${agotado ? 'opacity-60' : ''}`}>
                <img
                    src={imagen} alt={nombre}
                    class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                />
                {descPct && !agotado && (
                    <span class="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">-{descPct}%</span>
                )}
            </div>

            {/* Info */}
            <div class="p-5 flex flex-col flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                        {producto.nombre_marca && (
                            <span class="text-[10px] font-black text-brand-600 uppercase tracking-widest">{producto.nombre_marca}</span>
                        )}
                        <h3 class="font-bold text-slate-800 text-base leading-tight mt-0.5 group-hover:text-brand-700 transition-colors">
                            {nombre}
                        </h3>
                        {producto.nombre_categoria && (
                            <span class="text-xs text-slate-400 font-medium block mt-0.5">{producto.nombre_categoria}</span>
                        )}
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleFav(producto.id); }}
                        class="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0"
                    >
                        <Heart size={15} class={favoritos.has(producto.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'} />
                    </button>
                </div>

                {/* Stock y variantes */}
                <div class="flex items-center gap-4 mt-2">
                    <span class={`flex items-center gap-1 text-xs font-bold ${agotado ? 'text-rose-500' : 'text-emerald-600'}`}>
                        <Package size={12} />
                        {agotado ? 'Sin stock' : `${stock} unidades disponibles`}
                    </span>
                    <span class="flex items-center gap-1 text-xs font-semibold text-slate-400">
                        <Layers size={12} />
                        {numVariantes} variante{numVariantes !== 1 ? 's' : ''}
                    </span>
                </div>

                <div class="flex items-center justify-between mt-auto pt-4">
                    <div>
                        {descuento && descuento < precio && !agotado && (
                            <p class="text-sm text-slate-400 line-through">{formatearPrecio(precio)}</p>
                        )}
                        <p class={`text-2xl font-black ${agotado ? 'text-slate-400' : 'text-slate-900'}`}>
                            {formatearPrecio(descuento && descuento < precio ? descuento : precio)}
                        </p>
                        {!agotado && <p class="text-xs text-emerald-600 font-semibold mt-0.5">Envíos a toda Colombia</p>}
                    </div>
                    {agotado ? (
                        <span class="text-sm font-bold text-slate-400 bg-slate-100 px-4 py-2 rounded-xl">Agotado</span>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (variante) {
                                    addToCart({
                                        id_variante: variante.id,
                                        cantidad: 1,
                                        maxCantidad: stock,
                                        precio: (descuento && descuento < precio ? descuento : precio) / 100, // as pricing handles uncents
                                        producto_nombre: producto.nombre,
                                        variante_nombre: variante.nombre,
                                        imagen: imagen
                                    });
                                    isCartOpen.value = true;
                                }
                            }}
                            class="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-brand-500/20 transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                        >
                            <ShoppingCart size={15} /> Agregar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function CatalogPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // ── URL params (navbar search → ?search=, breadcrumbs → ?marca= / ?categoria=)
    const urlParams = new URLSearchParams(location.search);
    const searchInicial = urlParams.get('search') ?? '';
    const categoriaInicial = urlParams.get('categoria') ?? '';
    const marcaInicial = urlParams.get('marca') ?? '';

    // ── Filtros ───────────────────────────────────────────────────────────────
    const [search, setSearch] = useState(searchInicial);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(categoriaInicial);
    const [marcaSeleccionada, setMarcaSeleccionada] = useState(marcaInicial);
    const [precioMaxCentavos, setPrecioMaxCentavos] = useState<number | null>(null); // null = sin límite aplicado
    const [sliderLocalCentavos, setSliderLocalCentavos] = useState<number | null>(null); // valor visual mientras se arrastra
    const [ordenar, setOrdenar] = useState('reciente');
    const [vista, setVista] = useState<'grid' | 'list'>('grid');
    const [sidebarMovil, setSidebarMovil] = useState(false);
    const [favoritos, setFavoritos] = useState<Set<string>>(new Set());

    // Sincronizar con URL cuando cambia (e.g. búsqueda desde navbar)
    useEffect(() => {
        const p = new URLSearchParams(location.search);
        setSearch(p.get('search') ?? '');
        setCategoriaSeleccionada(p.get('categoria') ?? '');
        setMarcaSeleccionada(p.get('marca') ?? '');
    }, [location.search]);

    // ── Datos del API ─────────────────────────────────────────────────────────
    const { data: elementos, loading: loadingElementos } = useElementos();
    const {
        data: productos,
        loading: loadingProductos,
        error: errorProductos,
    } = useProductos({
        search: search || undefined,
        categoria: categoriaSeleccionada || undefined,
        marca: marcaSeleccionada || undefined,
    });

    // Precio máximo dinámico: el mayor precio de todos los productos cargados (en centavos)
    const precioMaxDinamico = useMemo(() => {
        if (!productos || productos.length === 0) return 100_000_00; // 100.000 pesos default
        return productos.reduce((max, p) => {
            const precio = variantePrincipal(p)?.precio ?? 0;
            return precio > max ? precio : max;
        }, 0);
    }, [productos]);

    // Controles del slider:
    // - sliderMax: techo del slider (el precio más alto en el catálogo)
    // - sliderLocal: valor visual mientras el usuario arrastra (no filtra aún)
    // - precioMaxCentavos: filtro real aplicado (solo cambia al hacer clic en "Aplicar")
    const sliderMax = precioMaxDinamico;
    const sliderLocal = sliderLocalCentavos ?? precioMaxCentavos ?? sliderMax;

    // ── Ordenar + filtro de precio en cliente ─────────────────────────────────
    const productosFiltrados = useMemo(() => {
        let base = (productos ?? []).filter(p => variantesVisibles(p).length > 0);

        // Filtro precio máximo
        if (precioMaxCentavos !== null) {
            base = base.filter(p => (variantePrincipal(p)?.precio ?? 0) <= precioMaxCentavos);
        }

        // Ordenamiento
        if (ordenar === 'precio_asc') return [...base].sort((a, b) => (variantePrincipal(a)?.precio ?? 0) - (variantePrincipal(b)?.precio ?? 0));
        if (ordenar === 'precio_desc') return [...base].sort((a, b) => (variantePrincipal(b)?.precio ?? 0) - (variantePrincipal(a)?.precio ?? 0));
        return base;
    }, [productos, precioMaxCentavos, ordenar]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const limpiarFiltros = () => {
        setSearch('');
        setCategoriaSeleccionada('');
        setMarcaSeleccionada('');
        setPrecioMaxCentavos(null);
        setSliderLocalCentavos(null);
        navigate('/tienda', { replace: true });
    };

    const toggleFav = (id: string) => setFavoritos(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const hayFiltros = search || categoriaSeleccionada || marcaSeleccionada || precioMaxCentavos !== null;

    // ── Sidebar content ───────────────────────────────────────────────────────
    const SidebarContent = () => (
        <div>
            {/* Categorías */}
            <SidebarSection title="Categorías" defaultOpen>
                {loadingElementos ? (
                    <div class="space-y-2">{[...Array(4)].map((_, i) => <div key={i} class="h-9 bg-slate-100 rounded-xl animate-pulse" />)}</div>
                ) : (
                    <ul class="space-y-1">
                        {(elementos?.categorias ?? []).map(cat => (
                            <li key={cat.id}>
                                <button
                                    onClick={() => setCategoriaSeleccionada(c => c === cat.id ? '' : cat.id)}
                                    class={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left
                                        ${categoriaSeleccionada === cat.id
                                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                >
                                    {categoriaSeleccionada === cat.id && <Check size={12} class="text-brand-600 shrink-0" strokeWidth={3} />}
                                    {cat.nombre}
                                </button>
                            </li>
                        ))}
                        {!loadingElementos && (elementos?.categorias ?? []).length === 0 && (
                            <p class="text-xs text-slate-400 px-2 py-1">Sin categorías disponibles</p>
                        )}
                    </ul>
                )}
            </SidebarSection>

            {/* Marcas */}
            <SidebarSection title="Marcas" defaultOpen>
                {loadingElementos ? (
                    <div class="flex flex-wrap gap-2">{[...Array(5)].map((_, i) => <div key={i} class="h-7 w-20 bg-slate-100 rounded-full animate-pulse" />)}</div>
                ) : (
                    <div class="flex flex-wrap gap-2">
                        {(elementos?.marcas ?? []).map(marca => (
                            <button
                                key={marca.id}
                                onClick={() => setMarcaSeleccionada(m => m === marca.id ? '' : marca.id)}
                                class={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                                    ${marcaSeleccionada === marca.id
                                        ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10'
                                        : 'border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600'
                                    }`}
                            >
                                {marca.nombre}
                            </button>
                        ))}
                        {!loadingElementos && (elementos?.marcas ?? []).length === 0 && (
                            <p class="text-xs text-slate-400">Sin marcas disponibles</p>
                        )}
                    </div>
                )}
            </SidebarSection>

            {/* Precio máximo */}
            <SidebarSection title="Precio máximo" defaultOpen>
                <div class="space-y-3">
                    {/* Etiquetas: mínimo y valor local del slider */}
                    <div class="flex items-center justify-between text-xs font-bold">
                        <span class="text-slate-400">{formatearPrecio(0)}</span>
                        <span class={sliderLocal !== (precioMaxCentavos ?? sliderMax) ? 'text-amber-500' : 'text-brand-600'}>
                            {formatearPrecio(sliderLocal)}
                        </span>
                    </div>

                    {/* Slider — solo actualiza el valor local */}
                    <input
                        type="range"
                        min={0}
                        max={sliderMax || 1}
                        step={Math.max(1, Math.round(sliderMax / 100))}
                        value={sliderLocal}
                        onInput={(e) => setSliderLocalCentavos(Number((e.target as HTMLInputElement).value))}
                        class="w-full accent-brand-600 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer"
                    />

                    {/* Botón aplicar — visible cuando el valor local difiere del filtro aplicado */}
                    {sliderLocal !== (precioMaxCentavos ?? sliderMax) && (
                        <button
                            onClick={() => {
                                const val = sliderLocal < sliderMax ? sliderLocal : null;
                                setPrecioMaxCentavos(val);
                                if (val === null) setSliderLocalCentavos(null);
                            }}
                            class="w-full h-8 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        >
                            Aplicar precio
                        </button>
                    )}

                    {/* Quitar límite — visible cuando hay filtro de precio activo */}
                    {precioMaxCentavos !== null && (
                        <button
                            onClick={() => { setPrecioMaxCentavos(null); setSliderLocalCentavos(null); }}
                            class="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1"
                        >
                            <X size={11} /> Quitar límite
                        </button>
                    )}
                </div>
            </SidebarSection>

            {/* Limpiar */}
            {hayFiltros && (
                <button
                    onClick={limpiarFiltros}
                    class="w-full flex items-center justify-center gap-2 py-2.5 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 transition-colors mt-1"
                >
                    <X size={14} /> Limpiar filtros
                </button>
            )}
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div class="bg-[#f5f5f5] min-h-screen">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div class="bg-white border-b border-slate-100">
                <div class="max-w-[1400px] mx-auto px-4 md:px-6 py-10">
                    <div class="flex items-end justify-between gap-4 flex-wrap">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <Sparkles size={16} class="text-brand-500" />
                                <span class="text-xs font-black uppercase tracking-widest text-brand-600">Catálogo</span>
                            </div>
                            <h1 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Todos los productos</h1>
                            <p class="text-slate-500 font-medium mt-1">
                                {loadingProductos
                                    ? <span class="inline-block h-4 w-32 bg-slate-200 rounded animate-pulse" />
                                    : <>{productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
                                        {hayFiltros && <span class="ml-2 text-brand-600 font-bold">· Filtros activos</span>}
                                    </>
                                }
                            </p>
                        </div>

                        {/* Pills de filtros activos */}
                        {hayFiltros && (
                            <div class="flex flex-wrap items-center gap-2">
                                {search && (
                                    <span class="flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                        <Search size={11} /> "{search}"
                                        <button onClick={() => { setSearch(''); navigate('/tienda', { replace: true }); }}><X size={11} /></button>
                                    </span>
                                )}
                                {categoriaSeleccionada && (
                                    <span class="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                        <Tag size={11} />
                                        {elementos?.categorias.find(c => c.id === categoriaSeleccionada)?.nombre ?? 'Categoría'}
                                        <button onClick={() => setCategoriaSeleccionada('')}><X size={11} /></button>
                                    </span>
                                )}
                                {marcaSeleccionada && (
                                    <span class="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                        <TrendingUp size={11} />
                                        {elementos?.marcas.find(m => m.id === marcaSeleccionada)?.nombre ?? 'Marca'}
                                        <button onClick={() => setMarcaSeleccionada('')}><X size={11} /></button>
                                    </span>
                                )}
                                {precioMaxCentavos !== null && (
                                    <span class="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
                                        Hasta {formatearPrecio(precioMaxCentavos)}
                                        <button onClick={() => setPrecioMaxCentavos(null)}><X size={11} /></button>
                                    </span>
                                )}
                                <button onClick={limpiarFiltros} class="text-xs font-bold text-rose-500 hover:text-rose-700 underline underline-offset-2">
                                    Limpiar todo
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div class="max-w-[1400px] mx-auto px-4 md:px-6 py-6 flex gap-6 items-start">

                {/* ── Sidebar desktop ────────────────────────────────────── */}
                <aside class="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-24">
                    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div class="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
                            <SlidersHorizontal size={18} class="text-brand-500" />
                            <h2 class="font-black text-slate-800">Filtros</h2>
                        </div>
                        <SidebarContent />
                    </div>
                </aside>

                {/* ── Zona principal ──────────────────────────────────────── */}
                <div class="flex-1 min-w-0">

                    {/* Barra de controles */}
                    <div class="flex items-center justify-between gap-3 mb-5 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">

                        {/* Botón filtros móvil */}
                        <button
                            onClick={() => setSidebarMovil(true)}
                            class="lg:hidden flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 px-4 h-9 rounded-xl hover:border-brand-300 hover:text-brand-600 transition-colors"
                        >
                            <Filter size={16} />
                            Filtros{hayFiltros ? ` (${[search, categoriaSeleccionada, marcaSeleccionada, precioMaxCentavos !== null ? '1' : ''].filter(Boolean).length})` : ''}
                        </button>

                        {/* Ordenar */}
                        <div class="flex items-center gap-2 ml-auto">
                            <ArrowUpDown size={15} class="text-slate-400 shrink-0" />
                            <select
                                value={ordenar}
                                onChange={(e) => setOrdenar((e.target as HTMLSelectElement).value)}
                                class="text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                            >
                                {ORDENAR_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* Vista */}
                        <div class="hidden sm:flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                            <button
                                onClick={() => setVista('grid')}
                                class={`w-8 h-7 rounded-lg flex items-center justify-center transition-all ${vista === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Grid3X3 size={15} />
                            </button>
                            <button
                                onClick={() => setVista('list')}
                                class={`w-8 h-7 rounded-lg flex items-center justify-center transition-all ${vista === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {errorProductos && (
                        <div class="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center mb-5">
                            <p class="text-rose-600 font-bold text-sm">{errorProductos}</p>
                        </div>
                    )}

                    {/* Skeletons de carga */}
                    {loadingProductos && !productos && (
                        <div class={`${vista === 'grid'
                            ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'
                            : 'flex flex-col gap-3'}`}
                        >
                            {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
                        </div>
                    )}

                    {/* Sin resultados */}
                    {!loadingProductos && !errorProductos && productosFiltrados.length === 0 && (
                        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-24 text-center">
                            <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <Search size={28} class="text-slate-400" />
                            </div>
                            <h3 class="text-lg font-black text-slate-700 mb-2">Sin resultados</h3>
                            <p class="text-sm text-slate-400 font-medium mb-6 max-w-xs">
                                No encontramos productos con los filtros actuales. Prueba cambiando los criterios.
                            </p>
                            <button onClick={limpiarFiltros} class="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-colors">
                                Limpiar filtros
                            </button>
                        </div>
                    )}

                    {/* Productos */}
                    {!loadingProductos && productosFiltrados.length > 0 && (
                        vista === 'grid' ? (
                            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {productosFiltrados.map(p => (
                                    <ProductCardGrid key={p.id} producto={p} favoritos={favoritos} toggleFav={toggleFav} />
                                ))}
                            </div>
                        ) : (
                            <div class="flex flex-col gap-3">
                                {productosFiltrados.map(p => (
                                    <ProductCardList key={p.id} producto={p} favoritos={favoritos} toggleFav={toggleFav} />
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* ── Drawer filtros móvil ────────────────────────────────────── */}
            {sidebarMovil && (
                <div class="fixed inset-0 z-50 flex">
                    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSidebarMovil(false)} />
                    <div class="relative ml-auto w-80 max-w-[90vw] h-full bg-white shadow-2xl flex flex-col">
                        <div class="flex items-center justify-between p-5 border-b border-slate-100">
                            <div class="flex items-center gap-2">
                                <SlidersHorizontal size={18} class="text-brand-500" />
                                <h2 class="font-black text-slate-800">Filtros</h2>
                            </div>
                            <button onClick={() => setSidebarMovil(false)}
                                class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                                <X size={16} class="text-slate-600" />
                            </button>
                        </div>
                        <div class="flex-1 overflow-y-auto p-5">
                            <SidebarContent />
                        </div>
                        <div class="p-5 border-t border-slate-100">
                            <button onClick={() => setSidebarMovil(false)}
                                class="w-full h-12 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-brand-500/20 transition-all">
                                Ver {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
