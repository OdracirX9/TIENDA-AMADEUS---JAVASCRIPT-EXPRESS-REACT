import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';
import { cartSignal, removeCartItem, updateCartItemQuantity } from '../signals/cart';
import { formatearPrecio } from '../utils/precios';

interface ShoppingCartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ShoppingCartSidebar({ isOpen, onClose }: ShoppingCartSidebarProps) {
    const navigate = useNavigate();

    return (
        <>
            {/* Backdrop */}
            <div
                class={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                class={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div class="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div class="flex items-center gap-3">
                        <div class="p-2.5 bg-brand-50 rounded-xl text-brand-600">
                            <ShoppingBag size={24} />
                        </div>
                        <h2 class="font-display font-bold text-xl text-slate-800">Mi Carrito</h2>
                        <span class="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold leading-none">
                            {cartSignal.value.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        class="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Cart Items (Dynamic) */}
                <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {cartSignal.value.length === 0 ? (
                        <div class="flex flex-col items-center justify-center py-10 opacity-60">
                            <ShoppingBag size={48} class="text-slate-300 mb-4" />
                            <p class="text-slate-500 font-medium">Tu carrito está vacío</p>
                        </div>
                    ) : (
                        cartSignal.value.map(item => (
                            <div key={item.id_variante} class="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div class="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                                    <img src={item.imagen || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80"} alt={item.producto_nombre || "Producto"} class="w-full h-full object-cover" />
                                </div>
                                <div class="flex flex-col justify-between flex-1">
                                    <div>
                                        <div class="flex justify-between items-start gap-2">
                                            <h3 class="font-bold text-slate-800 leading-tight">
                                                {item.producto_nombre || "Variante de Producto"}
                                            </h3>
                                            <button
                                                onClick={() => removeCartItem(item.id_variante)}
                                                class="text-slate-400 hover:text-rose-500 transition-colors p-1" aria-label="Eliminar producto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p class="text-sm text-slate-500 mt-1">
                                            {item.variante_nombre ? item.variante_nombre : `ID Variante: ${item.id_variante}`}
                                        </p>
                                    </div>
                                    <div class="flex items-center justify-between mt-3">
                                        <div class="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200">
                                            <button
                                                onClick={() => updateCartItemQuantity(item.id_variante, item.cantidad - 1)}
                                                class="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:shadow-sm hover:text-brand-600 transition-all cursor-pointer"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span class="text-sm font-bold text-slate-700 w-4 text-center">{item.cantidad}</span>
                                            <button
                                                onClick={() => updateCartItemQuantity(item.id_variante, item.cantidad + 1)}
                                                class="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:shadow-sm hover:text-brand-600 transition-all cursor-pointer"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <span class="font-bold text-slate-800">
                                            {formatearPrecio((item.precio || 0) * item.cantidad)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Checkout */}
                <div class="p-6 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
                    <div class="space-y-3 mb-6">
                        <div class="flex justify-between text-slate-500 text-sm">
                            <span>Subtotal</span>
                            <span class="font-medium text-slate-800">
                                {formatearPrecio(cartSignal.value.reduce((acc, curr) => acc + (curr.precio || 0) * curr.cantidad, 0))}
                            </span>
                        </div>
                        <div class="h-px bg-slate-100 w-full my-3"></div>
                        <div class="flex justify-between items-center">
                            <span class="font-display font-bold text-slate-800">Total</span>
                            <span class="font-display font-bold text-2xl text-brand-600">
                                {formatearPrecio(cartSignal.value.reduce((acc, curr) => acc + (curr.precio || 0) * curr.cantidad, 0))}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            import('../signals/pendingCheckout').then(({ clearPendingCheckout }) => {
                                clearPendingCheckout();
                                navigate('/procesar-compra');
                            });
                        }}
                        class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98]"
                    >
                        <span>Ir a Pagar</span>
                        <ArrowRight size={18} class="group-hover:translate-x-1.5 transition-transform" />
                    </button>
                    <p class="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Pago seguro y encriptado
                    </p>
                </div>
            </div>
        </>
    );
}
