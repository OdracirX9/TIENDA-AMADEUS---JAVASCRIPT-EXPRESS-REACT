import { useEffect, useState } from 'preact/hooks';
import { useNavigate } from 'react-router-dom';
import { cartSignal } from '../signals/cart';
import { checkoutSignal } from '../signals/checkout';
import { pendingCheckoutSignal, clearPendingCheckout } from '../signals/pendingCheckout';
import { isAuthenticated } from '../signals';
import { isCartOpen } from '../signals/ui';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-preact';
import apiClient from '../services/apiClient';

interface ItemValidado {
    id_variante: string;
    nombre: string;
    precio_unitario: number;
    cantidad: number;
    sub_total: number;
    imagen: string;
}

export function ProcesarCompraPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Close cart sidebar if it's open
        isCartOpen.value = false;

        // 2. Validate session
        if (!isAuthenticated.value) {
            navigate('/login');
            return;
        }

        const procesar = async () => {
            try {
                // 3. Determine source of items (Buy Now vs Cart)
                const isPending = pendingCheckoutSignal.value.length > 0;
                let payload = [];

                if (isPending) {
                    payload = pendingCheckoutSignal.value;
                } else if (cartSignal.value.length > 0) {
                    payload = cartSignal.value.map(item => ({
                        id_variante: item.id_variante,
                        cantidad: item.cantidad
                    }));
                } else {
                    navigate('/tienda');
                    return;
                }

                // 4. Validate with backend
                const response = await apiClient.post('/comprobar-productos-para-compra', payload);

                if (response.data && response.data.valido) {
                    // 5. Transform API response to CheckoutItems
                    const itemsToCheckout = response.data.items.map((item: ItemValidado) => ({
                        id: item.id_variante,
                        cantidad: item.cantidad,
                        nombre: item.nombre,
                        precio: item.precio_unitario,
                        imagen: item.imagen,
                        sub_total: item.sub_total
                    }));

                    // 6. Save in checkout signal
                    checkoutSignal.value = itemsToCheckout;

                    // 7. Clear pending checkout signal if it was used
                    if (isPending) {
                        clearPendingCheckout();
                    }

                    // 8. Redirect to actual checkout page
                    navigate('/checkout', { replace: true });
                } else {
                    throw new Error("Respuesta inválida del servidor");
                }
            } catch (err: any) {
                console.error("Error validando checkout:", err);
                // Handle specific error message if backend returns it
                const errorMsg = err.response?.data?.error || "Hubo un error al procesar tu compra. Por favor, intenta de nuevo.";
                setError(errorMsg);

                // If it was a pending checkout, clear it so next time it defaults to cart
                clearPendingCheckout();
            }
        };

        procesar();

    }, [navigate]);

    if (error) {
        return (
            <div class="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-slate-50">
                <div class="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
                    <div class="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle class="w-10 h-10 text-rose-500" />
                    </div>
                    <h2 class="text-2xl font-black text-slate-800 mb-3">No pudimos procesar tu orden</h2>
                    <p class="text-slate-500 mb-8 font-medium">
                        {error}
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
                    >
                        <ArrowLeft size={20} />
                        Volver e intentar de nuevo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div class="min-h-[60vh] flex flex-col items-center justify-center p-6">
            <Loader2 class="w-12 h-12 text-brand-600 animate-spin mb-4" />
            <h2 class="text-xl font-bold text-slate-800 animate-pulse">
                Preparando tu orden...
            </h2>
            <p class="text-slate-500 mt-2 font-medium">
                Validando disponibilidad y precios en tiempo real
            </p>
        </div>
    );
}
