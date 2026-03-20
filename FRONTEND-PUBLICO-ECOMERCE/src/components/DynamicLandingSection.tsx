import { useRef } from 'preact/hooks';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-preact';
import type { Producto } from '../services/catalogoService';
import { ProductCardGrid } from '../pages/CatalogPage';

interface Props {
    titulo: string;
    descripcion: string;
    productos: Producto[];
}

export function DynamicLandingSection({ titulo, descripcion, productos }: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const { current } = scrollRef;
        const scrollAmount = direction === 'left' ? -400 : 400;
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    if (productos.length === 0) return null;

    return (
        <section class="max-w-[1400px] mx-auto px-6 py-16 overflow-hidden">
            {/* Cabecera de la sección */}
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div class="max-w-2xl">
                    <div class="flex items-center gap-2 mb-3">
                        <div class="w-10 h-[2px] bg-brand-500 rounded-full" />
                        <Sparkles size={16} class="text-brand-500 animate-pulse" />
                        <span class="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600">Recomendado</span>
                    </div>
                    <h2 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                        {titulo}
                    </h2>
                    <p class="text-slate-500 font-medium mt-3 text-lg leading-relaxed">
                        {descripcion}
                    </p>
                </div>

                {/* Controles del carrusel */}
                <div class="flex items-center gap-3">
                    <button
                        onClick={() => scroll('left')}
                        class="w-12 h-12 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-brand-600 hover:border-brand-300 hover:shadow-lg transition-all flex items-center justify-center active:scale-90"
                        aria-label="Anterior"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        class="w-12 h-12 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-brand-600 hover:border-brand-300 hover:shadow-lg transition-all flex items-center justify-center active:scale-90"
                        aria-label="Siguiente"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            </div>

            {/* Contenedor del Carrusel */}
            <div class="relative group">
                <div
                    ref={scrollRef}
                    class="flex gap-6 overflow-x-auto pb-8 scroll-smooth no-scrollbar snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {productos.map((producto) => (
                        <div key={producto.id} class="min-w-[280px] sm:min-w-[320px] max-w-[350px] snap-start">
                            <ProductCardGrid
                                producto={producto}
                                favoritos={new Set()}
                                toggleFav={() => { }}
                            />
                        </div>
                    ))}
                </div>

                {/* Indicador visual de scroll lateral para móvil */}
                <div class="md:hidden flex justify-center mt-4 gap-1">
                    <div class="w-8 h-1 bg-brand-500 rounded-full" />
                    <div class="w-2 h-1 bg-slate-200 rounded-full" />
                    <div class="w-2 h-1 bg-slate-200 rounded-full" />
                </div>
            </div>

            <style>
                {`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                `}
            </style>
        </section>
    );
}
