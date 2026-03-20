import { useState, useEffect } from 'preact/hooks';
import {
    ShoppingCart, Heart, Share2, Truck,
    ChevronLeft, Check, Zap,
    Tag, BadgeCheck, MapPin, Clock, AlertTriangle, Home
} from 'lucide-preact';
import { useParams, useNavigate } from 'react-router-dom';
import { useProducto } from '../hooks/useCatalogo';
import { useSEO } from '../hooks/useSEO';
import type { Producto, Variante } from '../services/catalogoService';
import { formatearPrecio, calcularDescuento } from '../utils/precios';
import { addToCart } from '../signals/cart';
import { isCartOpen } from '../signals/ui';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop';

/** Tolera boolean true, string "true", o number 1 (distintos serializadores de pg/redis) */
const esVisible = (v: any): boolean => v === true || v === 1 || v === 'true';

/** Filtra variantes visibles y con stock ordenadas por posición */
const variantesVisibles = (producto: Producto): Variante[] =>
    (producto.variantes ?? [])
        .filter((v: Variante) => esVisible(v.visibilidad))
        .sort((a: Variante, b: Variante) => (a.posicion ?? 0) - (b.posicion ?? 0));

/** Todas las imágenes de una variante (ya son URLs MinIO completas desde el servicio) */
const imagenesDeVariante = (variante: Variante): string[] => {
    const imgs = variante.imagenes ?? [];
    return imgs.length > 0 ? imgs : [FALLBACK_IMG];
};

/** Precio final en centavos: descuento si existe y es menor, sino precio normal */
const precioFinalCentavos = (v: Variante): number =>
    v.precio_descuento && v.precio_descuento < v.precio ? v.precio_descuento : v.precio;

// ─── SKELETON ────────────────────────────────────────────────────────────────

function ProductSkeleton() {
    return (
        <div class="min-h-screen bg-[#f5f5f5] pb-20">
            <div class="bg-white border-b border-slate-100 h-10" />
            <div class="max-w-[1400px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_400px_320px] gap-6">
                <div class="bg-white rounded-2xl animate-pulse">
                    <div class="aspect-square bg-slate-200 rounded-t-2xl" />
                    <div class="p-4 flex gap-3">
                        {[...Array(4)].map((_, i) => <div key={i} class="w-16 h-16 bg-slate-200 rounded-xl" />)}
                    </div>
                </div>
                <div class="space-y-4 animate-pulse">
                    <div class="bg-white rounded-2xl p-6 space-y-4">
                        <div class="h-4 bg-slate-200 rounded w-1/3" />
                        <div class="h-8 bg-slate-200 rounded w-5/6" />
                        <div class="h-4 bg-slate-200 rounded w-1/2" />
                        <div class="h-20 bg-slate-200 rounded-2xl" />
                        <div class="flex gap-2 flex-wrap">{[...Array(3)].map((_, i) => <div key={i} class="h-10 w-32 bg-slate-200 rounded-xl" />)}</div>
                    </div>
                </div>
                <div class="animate-pulse">
                    <div class="bg-white rounded-2xl p-6 space-y-4">
                        <div class="h-5 bg-slate-200 rounded w-2/3" />
                        <div class="h-16 bg-slate-200 rounded-xl" />
                        <div class="h-12 bg-slate-200 rounded-2xl" />
                        <div class="h-12 bg-slate-200 rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── ERROR STATE ──────────────────────────────────────────────────────────────

function ProductError({ mensaje, onVolver }: { mensaje: string; onVolver: () => void }) {
    return (
        <div class="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
            <div class="bg-white rounded-3xl p-12 max-w-md text-center shadow-xl shadow-slate-900/5 border border-slate-100">
                <div class="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle class="text-rose-500" size={32} />
                </div>
                <h2 class="text-2xl font-black text-slate-900 mb-3">Producto no disponible</h2>
                <p class="text-slate-500 font-medium mb-8">{mensaje}</p>
                <button
                    onClick={onVolver}
                    class="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                    <Home size={18} /> Regresar a la tienda
                </button>
            </div>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function ProductPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: producto, loading, error } = useProducto(id);

    // Estado local de UI
    const [imagenActiva, setImagenActiva] = useState(0);
    const [varianteId, setVarianteId] = useState<string | null>(id ?? null);
    const [favorito, setFavorito] = useState(false);
    const [cantidad, setCantidad] = useState(1);
    const [copiado, setCopiado] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);

    // Actualizar varianteId si cambia el parámetro de la URL
    useEffect(() => {
        if (id) setVarianteId(id);
    }, [id]);

    // Cuando llegan los datos, seleccionar la variante indicada en la URL o la primera disponible
    useEffect(() => {
        if (!producto) return;
        const visibles = variantesVisibles(producto);
        if (visibles.length === 0) return;
        const varianteDeUrl = id ? visibles.find(v => v.id === id) : null;
        const inicial = varianteDeUrl ?? visibles[0];
        setVarianteId(inicial.id);
        setImagenActiva(0);
    }, [producto, id]);

    // Al cambiar de variante, actualizar la URL sin agregar al historial (replace)
    const cambiarVariante = (nuevoId: string) => {
        setVarianteId(nuevoId);
        navigate(`/producto/${nuevoId}`, { replace: true });
    };

    // Copiar la URL actual al portapapeles
    const compartir = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            // fallback silencioso
        }
    };

    // Reset imagen al cambiar de variante
    useEffect(() => { setImagenActiva(0); setCantidad(1); setDescExpanded(false); }, [varianteId]);

    // ── Loading / Error ───────────────────────────────────────────────────────
    if (loading) return <ProductSkeleton />;
    if (error || !producto)
        return <ProductError mensaje={error ?? 'Producto no encontrado.'} onVolver={() => navigate('/tienda')} />;

    // ── Datos derivados ───────────────────────────────────────────────────────
    const variantes = variantesVisibles(producto);
    const variante = variantes.find(v => v.id === varianteId) ?? variantes[0];
    const imagenes = imagenesDeVariante(variante);
    const precioCentavos = precioFinalCentavos(variante);
    const descPct = calcularDescuento(variante.precio, variante.precio_descuento);
    const maxCantidad = variante.stock ?? 1;
    const sinStock = maxCantidad === 0;

    // Características como array de pares
    const caracteristicas = variante.caracteristicas
        ? Object.entries(variante.caracteristicas as Record<string, string>)
        : [];

    const prevImg = () => setImagenActiva(i => (i - 1 + imagenes.length) % imagenes.length);
    const nextImg = () => setImagenActiva(i => (i + 1) % imagenes.length);

    // ── SEO Dinámico ──────────────────────────────────────────────────────────
    useSEO({
        title: `RegeNievex - ${variante.nombre}`,
        description: variante.descripcion?.slice(0, 160) ?? `Compra ${variante.nombre} en RegeNievex. Encuentra los mejores productos farmacéuticos.`,
        image: imagenes[0] !== FALLBACK_IMG ? imagenes[0] : undefined,
        url: window.location.href,
    });

    return (
        <div class="min-h-screen bg-[#f5f5f5] pb-20">

            {/* ── Breadcrumb ───────────────────────────────────────────────── */}
            <div class="bg-white border-b border-slate-100">
                <div class="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-2 text-xs font-medium text-slate-400 overflow-x-auto">
                    <button onClick={() => navigate('/')} class="hover:text-brand-600 transition-colors whitespace-nowrap">Inicio</button>
                    <ChevronLeft size={12} class="-rotate-180 shrink-0" />
                    <button onClick={() => navigate('/tienda')} class="hover:text-brand-600 transition-colors whitespace-nowrap">Catálogo</button>
                    {producto.nombre_categoria && (
                        <>
                            <ChevronLeft size={12} class="-rotate-180 shrink-0" />
                            <button
                                onClick={() => navigate(`/tienda?categoria=${producto.id_categoria}`)}
                                class="hover:text-brand-600 transition-colors whitespace-nowrap"
                            >
                                {producto.nombre_categoria}
                            </button>
                        </>
                    )}
                    {producto.nombre_marca && (
                        <>
                            <ChevronLeft size={12} class="-rotate-180 shrink-0" />
                            <button
                                onClick={() => navigate(`/tienda?marca=${producto.id_marca}`)}
                                class="hover:text-brand-600 transition-colors whitespace-nowrap"
                            >
                                {producto.nombre_marca}
                            </button>
                        </>
                    )}
                    <ChevronLeft size={12} class="-rotate-180 shrink-0" />
                    <span class="text-slate-600 truncate max-w-xs">{variante.nombre}</span>
                </div>
            </div>

            <div class="max-w-[1400px] mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_400px_320px] gap-6">

                {/* ══════════════════════════════════════════════════════════
                    COLUMNA 1 — Galería de imágenes
                ══════════════════════════════════════════════════════════ */}
                <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                    {/* Imagen principal */}
                    <div class="relative aspect-square group bg-slate-50">
                        <img
                            key={imagenes[imagenActiva]}
                            src={imagenes[imagenActiva]}
                            alt={variante.nombre}
                            class="w-full h-full object-contain transition-opacity duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                        />

                        {/* Badge descuento */}
                        {descPct && (
                            <div class="absolute top-4 left-4 bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                                -{descPct}% OFF
                            </div>
                        )}

                        {/* Sin stock overlay */}
                        {sinStock && (
                            <div class="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                <span class="bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-full">Agotado</span>
                            </div>
                        )}

                        {/* Nav arrows — solo si hay más de 1 imagen */}
                        {imagenes.length > 1 && (
                            <>
                                <button onClick={prevImg} class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                                    <ChevronLeft size={20} class="text-slate-700" />
                                </button>
                                <button onClick={nextImg} class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                                    <ChevronLeft size={20} class="-rotate-180 text-slate-700" />
                                </button>
                            </>
                        )}

                        {/* Dots */}
                        {imagenes.length > 1 && (
                            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {imagenes.map((_, i) => (
                                    <button key={i} onClick={() => setImagenActiva(i)}
                                        class={`rounded-full transition-all ${i === imagenActiva ? 'w-5 h-2 bg-brand-500' : 'w-2 h-2 bg-slate-400/60 hover:bg-slate-500'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Miniaturas */}
                    {imagenes.length > 1 && (
                        <div class="flex items-center gap-3 p-4 overflow-x-auto border-t border-slate-100">
                            {imagenes.map((img, i) => (
                                <button key={i} onClick={() => setImagenActiva(i)}
                                    class={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-50 transition-all ${i === imagenActiva ? 'border-brand-500 shadow-md shadow-brand-500/20 scale-105' : 'border-transparent hover:border-slate-300'}`}
                                >
                                    <img src={img} alt={`Vista ${i + 1}`} class="w-full h-full object-contain"
                                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Acciones */}
                    <div class="px-4 pb-4 flex items-center gap-4 border-t border-slate-100 pt-3">
                        <button onClick={() => setFavorito(!favorito)}
                            class={`flex items-center gap-2 text-sm font-semibold transition-colors ${favorito ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'}`}
                        >
                            <Heart size={18} class={favorito ? 'fill-rose-500' : ''} />
                            {favorito ? 'Guardado' : 'Guardar'}
                        </button>
                        <button onClick={compartir} class="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-500 transition-colors">
                            <Share2 size={18} /> {copiado ? '¡Enlace copiado!' : 'Compartir'}
                        </button>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    COLUMNA 2 — Información del producto
                ══════════════════════════════════════════════════════════ */}
                <div class="space-y-4">

                    {/* Encabezado + precio */}
                    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

                        {/* Marca / categoría pills */}
                        <div class="flex items-center flex-wrap gap-2 mb-3">
                            {producto.nombre_marca && (
                                <button
                                    onClick={() => navigate(`/tienda?marca=${producto.id_marca}`)}
                                    class="text-xs font-black uppercase tracking-widest text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full hover:bg-brand-100 transition-colors"
                                >
                                    {producto.nombre_marca}
                                </button>
                            )}
                            {producto.nombre_categoria && (
                                <button
                                    onClick={() => navigate(`/tienda?categoria=${producto.id_categoria}`)}
                                    class="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full hover:bg-slate-200 transition-colors"
                                >
                                    {producto.nombre_categoria}
                                </button>
                            )}
                            <span class="text-xs font-medium text-emerald-600 flex items-center gap-1 ml-auto">
                                <BadgeCheck size={13} /> Vendedor Oficial
                            </span>
                        </div>

                        {/* Nombre variante */}
                        <h1 class="text-2xl font-black text-slate-900 leading-tight mb-4">
                            {variante.nombre}
                        </h1>

                        {/* Marca sobre el precio */}
                        {producto.nombre_marca && (
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-xs font-black uppercase tracking-widest text-slate-400">Vendido por</span>
                                <span class="text-xs font-black uppercase tracking-widest text-brand-600">{producto.nombre_marca}</span>
                            </div>
                        )}

                        {/* Precio */}
                        <div class="bg-gradient-to-br from-slate-50 to-brand-50/30 rounded-2xl p-4 border border-slate-100 mb-5">
                            {descPct && (
                                <p class="text-sm line-through text-slate-400 font-medium mb-0.5">
                                    {formatearPrecio(variante.precio)}
                                </p>
                            )}
                            <div class="flex items-end gap-3">
                                <p class="text-4xl font-black text-slate-900">
                                    {formatearPrecio(precioCentavos)}
                                </p>
                                {descPct && (
                                    <span class="mb-1 bg-rose-100 text-rose-600 font-black text-sm px-2 py-0.5 rounded-lg">
                                        -{descPct}% OFF
                                    </span>
                                )}
                            </div>
                            <p class="text-sm text-slate-500 font-medium mt-2">
                                <span class="text-emerald-600 font-bold">6 cuotas sin interés</span>
                                {' '}de {formatearPrecio(Math.round(precioCentavos / 6))}
                            </p>
                        </div>

                        {/* Selector de variantes — cuadrícula con imagen */}
                        {variantes.length > 0 && (
                            <div class="mb-2">
                                <div class="flex items-center justify-between mb-3">
                                    <p class="text-sm font-bold text-slate-700">
                                        {variantes.length === 1 ? 'Variante' : `Variante (${variantes.length})`}:
                                        {' '}<span class="text-brand-600 font-semibold">{variante.nombre}</span>
                                    </p>
                                    {(variante.stock ?? 0) > 0 && (variante.stock ?? 0) <= 5 && (
                                        <span class="text-xs font-black text-rose-500">¡Últimas {variante.stock}!¡</span>
                                    )}
                                </div>

                                {/* Grid de cards de variante */}
                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {variantes.map(v => {
                                        const agotada = (v.stock ?? 0) === 0;
                                        const activa = v.id === varianteId;
                                        const imgThumb = v.imagenes?.[0] ?? FALLBACK_IMG;
                                        const precioV = v.precio_descuento && v.precio_descuento < v.precio
                                            ? v.precio_descuento : v.precio;
                                        const descV = v.precio_descuento && v.precio_descuento < v.precio
                                            ? Math.round((1 - v.precio_descuento / v.precio) * 100) : null;
                                        return (
                                            <button
                                                key={v.id}
                                                disabled={agotada}
                                                onClick={() => cambiarVariante(v.id)}
                                                class={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left focus:outline-none
                                                    ${agotada
                                                        ? 'border-slate-100 opacity-50 cursor-not-allowed'
                                                        : activa
                                                            ? 'border-brand-500 shadow-md shadow-brand-500/15 ring-2 ring-brand-500/20'
                                                            : 'border-slate-200 hover:border-brand-300 hover:shadow-sm'
                                                    }`}
                                            >
                                                {/* Imagen */}
                                                <div class="relative aspect-square bg-slate-50 w-full overflow-hidden">
                                                    <img
                                                        src={imgThumb}
                                                        alt={v.nombre}
                                                        class={`w-full h-full object-contain transition-transform duration-300 ${activa ? 'scale-105' : 'group-hover:scale-105'}`}
                                                        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                                                    />
                                                    {/* Badge activo */}
                                                    {activa && (
                                                        <div class="absolute top-1.5 right-1.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center shadow">
                                                            <Check size={10} class="text-white" strokeWidth={3} />
                                                        </div>
                                                    )}
                                                    {/* Badge descuento */}
                                                    {descV && !agotada && (
                                                        <div class="absolute top-1.5 left-1.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                                            -{descV}%
                                                        </div>
                                                    )}
                                                    {/* Agotado overlay */}
                                                    {agotada && (
                                                        <div class="absolute inset-0 bg-white/60 flex items-center justify-center">
                                                            <span class="text-[9px] font-black text-slate-500 bg-white/90 px-2 py-0.5 rounded-full">AGOTADO</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info debajo de la imagen */}
                                                <div class="px-2 py-1.5">
                                                    <p class={`text-[11px] font-bold leading-snug truncate ${agotada ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                                                        {v.nombre}
                                                    </p>
                                                    <p class={`text-[11px] font-black mt-0.5 ${agotada ? 'text-slate-300' : activa ? 'text-brand-600' : 'text-slate-800'}`}>
                                                        {formatearPrecio(precioV)}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Descripción */}
                    {variante.descripcion && (
                        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 class="font-bold text-slate-800 mb-3">Descripción</h3>
                            <div class="relative">
                                <div
                                    class="overflow-hidden transition-all duration-500 ease-in-out"
                                    style={{ maxHeight: descExpanded ? '2000px' : '96px' }}
                                >
                                    <p class="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                                        {variante.descripcion}
                                    </p>
                                </div>

                                {/* Máscara de difuminado — solo cuando está colapsado */}
                                {!descExpanded && (
                                    <div class="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                )}
                            </div>

                            <button
                                onClick={() => setDescExpanded(e => !e)}
                                class="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors flex items-center gap-1"
                            >
                                {descExpanded ? 'Leer menos ▲' : 'Leer más ▼'}
                            </button>
                        </div>
                    )}

                    {/* Características */}
                    {caracteristicas.length > 0 && (
                        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 class="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Características</h3>
                            <ul class="space-y-2.5">
                                {caracteristicas.map(([clave, valor]) => (
                                    <li key={clave} class="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                                        <div class="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check size={11} class="text-brand-600" strokeWidth={3} />
                                        </div>
                                        <span class="font-bold text-slate-700 capitalize">{clave}:</span>
                                        <span class="text-slate-500">{valor}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tags de navegación */}
                    <div class="flex flex-wrap gap-2">
                        {producto.nombre_marca && (
                            <button
                                onClick={() => navigate(`/tienda?marca=${producto.id_marca}`)}
                                class="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
                            >
                                <Tag size={10} /> {producto.nombre_marca}
                            </button>
                        )}
                        {producto.nombre_categoria && (
                            <button
                                onClick={() => navigate(`/tienda?categoria=${producto.id_categoria}`)}
                                class="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors"
                            >
                                <Tag size={10} /> {producto.nombre_categoria}
                            </button>
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    COLUMNA 3 — Panel de compra (sticky)
                ══════════════════════════════════════════════════════════ */}
                <div class="space-y-4">
                    <div class="sticky top-24 space-y-4">

                        {/* Card compra */}
                        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

                            {/* Stock */}
                            <div class="flex items-center gap-2 mb-4">
                                {sinStock ? (
                                    <>
                                        <div class="w-2 h-2 rounded-full bg-rose-400" />
                                        <span class="text-sm font-bold text-rose-600">Sin stock disponible</span>
                                    </>
                                ) : (
                                    <>
                                        <div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span class="text-sm font-bold text-emerald-600">Stock disponible</span>
                                        <span class="text-xs text-slate-400">({maxCantidad} unidades)</span>
                                    </>
                                )}
                            </div>

                            {/* Envío */}
                            {!sinStock && (
                                <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4">
                                    <p class="flex items-center gap-2 text-sm font-bold text-emerald-700">
                                        <Truck size={16} class="text-emerald-500" />
                                        Envíos a toda Colombia
                                    </p>
                                    <p class="text-xs text-emerald-600 font-medium mt-1 ml-6 flex items-center gap-1">
                                        <Clock size={11} /> Entrega estimada en 2-5 días hábiles
                                    </p>
                                </div>
                            )}

                            {/* Localización */}
                            <div class="flex items-center gap-2 text-xs text-slate-500 font-medium mb-5">
                                <MapPin size={13} class="text-slate-400" />
                                Entregas a{' '}
                                <span class="text-brand-600 font-bold">Colombia</span>
                            </div>

                            {/* Cantidad */}
                            {!sinStock && (
                                <div class="mb-5">
                                    <label class="block text-sm font-bold text-slate-700 mb-2">Cantidad</label>
                                    <div class="flex items-center gap-3">
                                        <button
                                            onClick={() => setCantidad(c => Math.max(1, c - 1))}
                                            class="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center font-black text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-all hover:scale-105 active:scale-95"
                                        >
                                            −
                                        </button>
                                        <span class="text-xl font-black text-slate-800 w-8 text-center">{cantidad}</span>
                                        <button
                                            onClick={() => setCantidad(c => Math.min(maxCantidad, c + 1))}
                                            class="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center font-black text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-all hover:scale-105 active:scale-95"
                                        >
                                            +
                                        </button>
                                        <span class="text-xs text-slate-400 font-medium">({maxCantidad} disp.)</span>
                                    </div>
                                </div>
                            )}

                            {/* Total dinámico */}
                            {!sinStock && cantidad > 1 && (
                                <div class="bg-brand-50 rounded-xl p-3 mb-4 text-sm font-bold text-brand-700">
                                    Total: {formatearPrecio(precioCentavos * cantidad)}
                                </div>
                            )}

                            {/* CTAs */}
                            <div class="space-y-3">
                                <button
                                    disabled={sinStock}
                                    onClick={() => {
                                        import('../signals/pendingCheckout').then(({ pendingCheckoutSignal }) => {
                                            pendingCheckoutSignal.value = [{
                                                id_variante: variante.id,
                                                cantidad: cantidad
                                            }];
                                            navigate('/procesar-compra');
                                        });
                                    }}
                                    class={`w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]
                                        ${sinStock
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-xl shadow-brand-500/20 hover:-translate-y-0.5'
                                        }`}
                                >
                                    <Zap size={22} />
                                    {sinStock ? 'Producto agotado' : 'Comprar ahora'}
                                </button>
                                {!sinStock && (
                                    <button
                                        onClick={() => {
                                            addToCart({
                                                id_variante: variante.id,
                                                cantidad: cantidad,
                                                maxCantidad: maxCantidad,
                                                precio: precioCentavos / 100, // as quantity pricing handles uncents
                                                producto_nombre: producto.nombre,
                                                variante_nombre: variante.nombre,
                                                imagen: imagenes[0]
                                            });
                                            isCartOpen.value = true;
                                        }}
                                        class="w-full h-14 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98 cursor-pointer]"
                                    >
                                        <ShoppingCart size={20} />
                                        Agregar al carrito
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Compra Protegida — Wompi */}
                        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                            {/* Header con logo Wompi */}
                            <div class="bg-gradient-to-r from-[#6C2EB9] to-[#C0228A] px-5 pt-4 pb-5">
                                <div class="flex items-center justify-between mb-3">
                                    {/* Logo Wompi SVG */}
                                    <svg viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-7 w-auto">
                                        <text x="0" y="24" font-family="Arial Black, sans-serif" font-weight="900" font-size="26" fill="white" letter-spacing="-1">wompi</text>
                                    </svg>
                                    {/* Badge Bancolombia */}
                                    <span class="text-[10px] font-black text-white/80 bg-white/15 border border-white/20 px-2 py-1 rounded-full tracking-wide">
                                        by Bancolombia
                                    </span>
                                </div>
                                <p class="text-xs text-white/80 font-medium leading-relaxed">
                                    Tus pagos están protegidos por la pasarela líder de Colombia.
                                </p>
                            </div>

                            {/* Garantías */}
                            <div class="p-5 space-y-3.5">

                                {/* PCI DSS */}
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                                        {/* Shield icon */}
                                        <svg xmlns="http://www.w3.org/2000/svg" class="text-violet-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            <path d="M9 12l2 2 4-4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p class="text-sm font-bold text-slate-800">Certificación PCI DSS Nivel 1</p>
                                        <p class="text-xs text-slate-400 mt-0.5">La máxima certificación de seguridad para transacciones con tarjetas.</p>
                                    </div>
                                </div>

                                {/* Antifraude */}
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="text-rose-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p class="text-sm font-bold text-slate-800">Antifraude 24 / 7</p>
                                        <p class="text-xs text-slate-400 mt-0.5">Monitoreo transaccional constante con análisis de riesgo en tiempo real.</p>
                                    </div>
                                </div>

                                {/* Tokenización */}
                                <div class="flex items-start gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="text-emerald-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p class="text-sm font-bold text-slate-800">Datos tokenizados</p>
                                        <p class="text-xs text-slate-400 mt-0.5">Tu información bancaria nunca se almacena en texto plano.</p>
                                    </div>
                                </div>

                                {/* Métodos de pago aceptados */}
                                <div class="pt-1 border-t border-slate-100">
                                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Métodos aceptados</p>
                                    <div class="flex flex-wrap gap-2">

                                        {/* Tarjeta crédito/débito */}
                                        <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6C2EB9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                                <line x1="1" y1="10" x2="23" y2="10" />
                                            </svg>
                                            <span class="text-[10px] font-bold text-slate-600">Tarjeta</span>
                                        </div>

                                        {/* PSE */}
                                        <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0077C8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                            </svg>
                                            <span class="text-[10px] font-bold text-slate-600">PSE</span>
                                        </div>

                                        {/* Nequi */}
                                        <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C0228A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 5.49 5.49l.95-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 15.4z" />
                                            </svg>
                                            <span class="text-[10px] font-bold text-slate-600">Nequi</span>
                                        </div>

                                        {/* Efectivo */}
                                        <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <line x1="12" y1="1" x2="12" y2="23" />
                                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                            </svg>
                                            <span class="text-[10px] font-bold text-slate-600">Efectivo</span>
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </div>


                    </div>
                </div>

            </div>
        </div>
    );
}
