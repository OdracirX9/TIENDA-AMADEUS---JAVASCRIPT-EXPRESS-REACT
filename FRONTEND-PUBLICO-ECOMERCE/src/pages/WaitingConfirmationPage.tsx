import { useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink, ShoppingBag, ChevronRight } from 'lucide-preact';

export function WaitingConfirmationPage() {
    const navigate = useNavigate();

    return (
        <div class="max-w-[800px] mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center min-h-[70vh]">
            <div class="bg-white rounded-[2rem] p-8 sm:p-12 shadow-sm border border-slate-100 text-center w-full relative overflow-hidden">
                {/* Background Decoration */}
                <div class="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none"></div>
                <div class="absolute bottom-0 left-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60 pointer-events-none"></div>

                <div class="relative z-10 flex flex-col items-center">
                    {/* Animated Loader Icon */}
                    <div class="w-24 h-24 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-brand-500/10 relative">
                        <Loader2 size={48} strokeWidth={2} class="animate-spin" />
                    </div>

                    {/* Title & Message */}
                    <h1 class="text-3xl sm:text-4xl font-display font-black text-slate-800 mb-4 tracking-tight">
                        Procesando tu compra
                    </h1>
                    <p class="text-slate-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                        Hemos abierto el portal de <span class="font-bold text-slate-700">Wompi</span> en una nueva pestaña para que completes tu pago de forma segura.
                    </p>

                    {/* Instruction Box */}
                    <div class="bg-slate-50 border border-slate-100 rounded-2xl p-6 w-full max-w-md mb-10 text-left">
                        <h3 class="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                            <ExternalLink size={16} class="text-brand-500" />
                            ¿Qué sigue ahora?
                        </h3>
                        <ul class="space-y-3 text-sm text-slate-600">
                            <li class="flex gap-3">
                                <span class="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                                <span>Completa el proceso de pago en la pestaña de <strong>Wompi</strong>.</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                                <span>Una vez finalizado, recibirás un correo con la confirmación.</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="flex-shrink-0 w-5 h-5 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                                <span>Puedes cerrar esta ventana o ir a ver tus pedidos.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
                        <button
                            onClick={() => navigate('/dashboard')}
                            class="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                        >
                            <ShoppingBag size={18} />
                            Ver mis pedidos
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            class="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                            Volver al inicio
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
