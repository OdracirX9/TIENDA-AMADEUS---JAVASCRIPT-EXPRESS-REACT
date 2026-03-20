import { Zap, ArrowRight } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
    const navigate = useNavigate();

    return (
        <section class="relative bg-slate-900 overflow-hidden min-h-[600px] flex items-center">
            {/* Background Decorators */}
            <div class="absolute inset-0 z-0">
                <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent z-10"></div>
                {/* Placeholder image for a rich Banner */}
                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop" class="w-full h-full object-cover opacity-60" alt="Hero background" />
            </div>

            {/* Hero Content */}
            <div class="max-w-[1400px] mx-auto px-6 w-full relative z-20">
                <div class="max-w-2xl animate-slide-up">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-400/20 text-brand-300 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm">
                        <Zap size={14} /> Nueva Colección 2026
                    </span>
                    <h1 class="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
                        Eleva tu <br />
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-indigo-300">
                            Estilo de Vida
                        </span>
                    </h1>
                    <p class="text-lg text-slate-300 font-medium mb-10 max-w-lg leading-relaxed">
                        Descubre los productos más exclusivos con envíos el mismo día. Calidad garantizada en cada compra.
                    </p>

                    <div class="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={() => navigate('/tienda')}
                            class="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                        >
                            Explorar Catálogo
                            <ArrowRight size={20} class="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
