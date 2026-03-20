import { TrendingUp, ArrowRight, ShoppingCart } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';
import { useProductos } from '../../hooks/useCatalogo';
import type { Producto } from '../../services/catalogoService';
import { formatearPrecio } from '../../utils/precios';

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: obtener la imagen principal de un producto
// ─────────────────────────────────────────────────────────────────────────────
function getImagenPrincipal(producto: Producto): string {
    const primeraVariante = producto.variantes?.[0];
    const imagenes = primeraVariante?.imagenes;
    if (imagenes && imagenes.length > 0) return imagenes[0];
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop';
}

// ─────────────────────────────────────────────────────────────────────────────
//  SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────
function ProductoSkeleton() {
    return (
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col animate-pulse">
            <div class="aspect-square bg-slate-200" />
            <div class="p-5 flex-1 flex flex-col gap-3">
                <div class="h-4 bg-slate-200 rounded w-3/4" />
                <div class="h-3 bg-slate-100 rounded w-1/2" />
                <div class="mt-auto flex items-center justify-between">
                    <div class="h-6 bg-slate-200 rounded w-1/3" />
                    <div class="w-10 h-10 rounded-full bg-slate-200" />
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export function TrendingProducts() {
    const navigate = useNavigate();
    const { data: productos, loading, error } = useProductos();

    // Mostrar sólo los primeros 4 productos
    const trending = productos?.slice(0, 4) ?? [];

    return (
        <section class="max-w-[1400px] mx-auto px-6 py-20">
            <div class="flex items-end justify-between mb-10">
                <div>
                    <h2 class="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <TrendingUp class="text-brand-500" size={32} /> Tendencias
                    </h2>
                    <p class="text-slate-500 font-medium mt-2">Los productos más buscados por nuestra comunidad.</p>
                </div>
                <button
                    onClick={() => navigate('/tienda')}
                    class="hidden md:flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700 transition-colors"
                >
                    Ver todos <ArrowRight size={18} />
                </button>
            </div>

            {/* Estado de error */}
            {error && (
                <div class="text-center py-16 text-slate-400">
                    <p class="font-medium">{error}</p>
                </div>
            )}

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Skeletons mientras carga */}
                {loading && !productos && (
                    <>
                        <ProductoSkeleton />
                        <ProductoSkeleton />
                        <ProductoSkeleton />
                        <ProductoSkeleton />
                    </>
                )}

                {/* Productos reales */}
                {!loading && trending.length === 0 && !error && (
                    <p class="col-span-4 text-center text-slate-400 font-medium py-10">
                        No hay productos disponibles en este momento.
                    </p>
                )}

                {trending.map((producto) => {
                    const variante = producto.variantes?.[0];
                    const precio = variante?.precio ?? 0;
                    const precioDescuento = variante?.precio_descuento;
                    const nombre = variante?.nombre ?? 'Producto sin nombre';
                    const imagen = getImagenPrincipal(producto);

                    return (
                        <div
                            key={producto.id}
                            onClick={() => navigate(`/producto/${variante?.id ?? producto.id}`)}
                            class="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 cursor-pointer flex flex-col"
                        >
                            {/* Imagen */}
                            <div class="relative aspect-square bg-slate-100 overflow-hidden">
                                {producto.nombre_marca && (
                                    <div class="absolute top-3 left-3 z-10">
                                        <span class="px-2.5 py-1 bg-white/90 backdrop-blur-md text-[10px] font-bold text-slate-800 rounded uppercase tracking-widest shadow-sm">
                                            {producto.nombre_marca}
                                        </span>
                                    </div>
                                )}
                                <img
                                    src={imagen}
                                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    alt={nombre}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop';
                                    }}
                                />

                                {/* Botón agregar rápido */}
                                <div class="absolute bottom-4 inset-x-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 z-20">
                                    <button class="w-full py-3 bg-white text-slate-900 font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-brand-50 hover:text-brand-600 shadow-xl">
                                        <ShoppingCart size={16} /> Agregar Rápido
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div class="p-5 flex-1 flex flex-col">
                                <h3 class="font-bold text-slate-800 text-lg leading-tight mb-2 group-hover:text-brand-600 transition-colors line-clamp-2">
                                    {nombre}
                                </h3>

                                <div class="mt-auto flex items-center justify-between">
                                    <div>
                                        {precioDescuento && precioDescuento < precio && (
                                            <p class="text-sm text-slate-400 line-through font-medium">
                                                {formatearPrecio(precio)}
                                            </p>
                                        )}
                                        <p class="text-lg font-black text-slate-900">
                                            {formatearPrecio(precioDescuento && precioDescuento < precio ? precioDescuento : precio)}
                                        </p>
                                    </div>
                                    <div class="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-brand-600 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                                        <ArrowRight size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
