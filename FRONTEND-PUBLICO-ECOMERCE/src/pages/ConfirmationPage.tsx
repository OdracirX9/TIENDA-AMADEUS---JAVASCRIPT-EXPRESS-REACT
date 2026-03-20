import { useEffect, useState } from 'preact/hooks';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Package, Receipt, XCircle, AlertCircle, Loader2 } from 'lucide-preact';
import { obtenerTransaccionWompi, type TransaccionWompi } from '../services/pagosService';

export function ConfirmationPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const idWompi = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TransaccionWompi | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!idWompi) {
            setError("No se ha proporcionado un ID de transacción válido.");
            setLoading(false);
            return;
        }

        const fetchTransaction = async () => {
            try {
                const res = await obtenerTransaccionWompi(idWompi);
                setData(res);
            } catch (err) {
                console.error("Error obteniendo transacción", err);
                setError("No pudimos consultar el estado de tu transacción. Es posible que aún se esté procesando.");
            } finally {
                setLoading(false);
            }
        };

        fetchTransaction();
    }, [idWompi]);

    if (loading) {
        return (
            <div class="max-w-[800px] mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center min-h-[70vh]">
                <Loader2 class="w-16 h-16 text-brand-500 animate-spin mb-6" />
                <h2 class="text-2xl font-bold text-slate-800 animate-pulse">Verificando tu pago...</h2>
                <p class="text-slate-500 mt-2">Estamos conectando con Wompi para confirmar la transacción.</p>
            </div>
        );
    }

    // Determine state UI
    const isApproved = data?.estado_pago === 'APPROVED' || data?.estado_pago === 'COMPLETED';
    const isPending = data?.estado_pago === 'PENDING';
    const isErrorOrDeclined = !isApproved && !isPending;

    return (
        <div class="max-w-[800px] mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center min-h-[70vh]">
            <div class="bg-white rounded-[2rem] p-8 sm:p-12 shadow-sm border border-slate-100 text-center w-full relative overflow-hidden">
                {/* Decoration based on status */}
                {isApproved && (
                    <>
                        <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none"></div>
                        <div class="absolute bottom-0 left-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60 pointer-events-none"></div>
                    </>
                )}
                {isPending && (
                    <div class="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none"></div>
                )}
                {isErrorOrDeclined && (
                    <div class="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none"></div>
                )}

                <div class="relative z-10 flex flex-col items-center">
                    {/* Status Icon */}
                    {isApproved ? (
                        <div class="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                            <CheckCircle2 size={48} strokeWidth={2.5} />
                        </div>
                    ) : isPending ? (
                        <div class="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/20">
                            <AlertCircle size={48} strokeWidth={2.5} />
                        </div>
                    ) : (
                        <div class="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-500/20">
                            <XCircle size={48} strokeWidth={2.5} />
                        </div>
                    )}

                    {/* Title & Message */}
                    <h1 class="text-3xl sm:text-4xl font-display font-black text-slate-800 mb-4 tracking-tight">
                        {isApproved ? "¡Pago Exitoso!" : isPending ? "Pago Pendiente" : "Pago Declinado / Error"}
                    </h1>
                    <p class="text-slate-500 text-lg mb-10 max-w-md mx-auto">
                        {isApproved
                            ? "Tu pago ha sido procesado correctamente y tu pedido está siendo preparado para el envío."
                            : isPending
                                ? "Estamos esperando la confirmación final de Wompi. Esto puede tomar unos minutos o requerir acción en tu banco."
                                : error || "Lo sentimos, tu pago no pudo ser procesado. Por favor intenta con otro método de pago o comunícate con tu banco."}
                    </p>

                    {/* Order Details (if available) */}
                    {data && (
                        <div class="bg-slate-50/50 rounded-2xl p-6 sm:p-8 w-full max-w-lg mx-auto text-left mb-10 border border-slate-100/80">
                            <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Receipt size={20} class="text-slate-400" />
                                Detalles de la transacción
                            </h3>

                            <div class="space-y-4 text-sm">
                                <div class="flex justify-between items-center border-b border-slate-200/60 pb-4">
                                    <span class="text-slate-500 font-medium">Referencia Wompi</span>
                                    <span class="font-bold text-slate-800 font-mono text-xs">{data.id_wompi}</span>
                                </div>
                                {data.estado_envio && (
                                    <div class="flex justify-between items-center border-b border-slate-200/60 pb-4">
                                        <span class="text-slate-500 font-medium">Estado del envío</span>
                                        <span class="inline-flex items-center gap-1.5 bg-slate-200/60 text-slate-700 px-3 py-1.5 rounded-full font-bold text-xs ring-1 ring-slate-400/20">
                                            <Package size={14} /> {data.estado_envio}
                                        </span>
                                    </div>
                                )}
                                <div class="flex justify-between items-center pt-2">
                                    <span class="text-slate-500 font-medium text-base">Total reportado</span>
                                    <span class="font-black text-brand-600 text-2xl">
                                        $ {(data.compra_total / 100).toLocaleString('es-CO')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg">
                        <button
                            onClick={() => navigate('/dashboard')}
                            class="w-full sm:w-auto flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                        >
                            Ver mis pedidos
                        </button>

                        {isErrorOrDeclined ? (
                            <button
                                onClick={() => navigate('/checkout')}
                                class="w-full sm:w-auto flex-[1.5] flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                            >
                                Reintentar pago
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/')}
                                class="w-full sm:w-auto flex-[1.5] flex items-center justify-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-600/20 transition-all hover:-translate-y-0.5"
                            >
                                Volver a inicio <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
