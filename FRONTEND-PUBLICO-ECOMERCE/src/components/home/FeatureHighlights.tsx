import { Zap, Shield, Star } from 'lucide-preact';

export function FeatureHighlights() {
    return (
        <section class="border-y border-slate-200 bg-white">
            <div class="max-w-[1400px] mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                <div class="flex items-center gap-4 md:justify-center p-4">
                    <div class="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                        <Zap size={24} />
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-800">Envíos Rápidos</h3>
                        <p class="text-sm font-medium text-slate-500">Recibe tus compras en 24h</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 md:justify-center p-4">
                    <div class="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-800">Pagos Seguros</h3>
                        <p class="text-sm font-medium text-slate-500">Protección SSL garantizada</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 md:justify-center p-4">
                    <div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Star size={24} />
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-800">Calidad Premium</h3>
                        <p class="text-sm font-medium text-slate-500">Solo las mejores marcas</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
