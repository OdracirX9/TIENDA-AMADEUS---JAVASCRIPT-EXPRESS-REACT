import { useState, useEffect } from 'preact/hooks';
import { Package, Search, ChevronRight, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-preact';
import { AdminLayout } from '../components/AdminLayout';
import { ordersApi } from '../api';
import { showToast } from '../signals';
import { OrderDetailsModal } from '../components/Orders/OrderDetailsModal';

export function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Pendiente' | 'Procesando' | 'Enviado' | 'historial' | 'sin_procesar'>('Pendiente');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await ordersApi.getOrders({ page: 1, limit: 100 });
            if (response.data && response.data.data) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error(error);
            showToast('Error al cargar órdenes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(order => {
        const matchSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.nombre_usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.correo.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'historial') {
            return matchSearch && order.estado_envio === 'Entregado';
        } else if (activeTab === 'Pendiente') {
            return matchSearch && order.estado_envio === 'Pendiente' && order.estado?.toUpperCase() === 'APPROVED';
        } else if (activeTab === 'sin_procesar') {
            return matchSearch && order.estado?.toUpperCase() !== 'APPROVED';
        } else {
            return matchSearch && order.estado_envio === activeTab;
        }
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'Pendiente': return { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock };
            case 'Procesando': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Package };
            case 'Enviado': return { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Truck };
            case 'Entregado': return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 };
            default: return { bg: 'bg-slate-100', text: 'text-slate-700', icon: AlertCircle };
        }
    };

    const handleViewOrder = async (id: string) => {
        try {
            showToast('Cargando detalles de orden...', 'info');
            const response = await ordersApi.getOrderById(id);
            setSelectedOrder(response.data);
            setIsModalOpen(true);
        } catch (error) {
            console.error(error);
            showToast('Error al cargar detalle de la orden', 'error');
        }
    };

    const handleUpdateComplete = () => {
        fetchOrders(); // Recarga las ordenes después de actualizar
    };

    return (
        <AdminLayout title="Gestión de Órdenes">
            <div class="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20 animate-fade-in">

                {/* Header & Tabs */}
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex flex-wrap items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-max gap-1">
                        <button
                            onClick={() => setActiveTab('Pendiente')}
                            class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'Pendiente' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setActiveTab('Procesando')}
                            class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'Procesando' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Procesando
                        </button>
                        <button
                            onClick={() => setActiveTab('Enviado')}
                            class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'Enviado' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Enviados
                        </button>
                        <button
                            onClick={() => setActiveTab('historial')}
                            class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'historial' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Historial
                        </button>
                        <button
                            onClick={() => setActiveTab('sin_procesar')}
                            class={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'sin_procesar' ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            Órdenes sin Procesar (Pagos)
                        </button>
                    </div>

                    <div class="relative w-full md:w-80">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por ID, nombre o correo..."
                            value={searchTerm}
                            onInput={(e) => setSearchTerm(e.currentTarget.value)}
                            class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div class="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                    <th class="p-4 font-semibold">Orden</th>
                                    <th class="p-4 font-semibold">Cliente</th>
                                    <th class="p-4 font-semibold">Fecha</th>
                                    <th class="p-4 font-semibold">Estado Financiero</th>
                                    <th class="p-4 font-semibold">Estado Envío</th>
                                    <th class="p-4 font-semibold">Total</th>
                                    <th class="p-4 font-semibold text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} class="p-8 text-center text-slate-500">
                                            <div class="w-8 h-8 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
                                            Cargando órdenes...
                                        </td>
                                    </tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} class="p-12 text-center">
                                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Package size={24} class="text-slate-400" />
                                            </div>
                                            <h3 class="text-slate-800 font-semibold mb-1">No hay órdenes</h3>
                                            <p class="text-slate-500 text-xs">No se encontraron resultados para la búsqueda actual.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map(order => {
                                        const StatusIcon = getStatusConfig(order.estado_envio).icon;
                                        return (
                                            <tr key={order.id} class="hover:bg-slate-50/50 transition-colors group">
                                                <td class="p-4">
                                                    <div class="font-medium text-slate-800">#{order.id.split('-')[0]}</div>
                                                    <div class="text-[10px] text-slate-400 font-mono">{order.id}</div>
                                                </td>
                                                <td class="p-4">
                                                    <div class="font-medium text-slate-800">{order.nombre_usuario}</div>
                                                    <div class="text-xs text-slate-500">{order.correo}</div>
                                                </td>
                                                <td class="p-4 text-slate-600">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </td>
                                                <td class="p-4">
                                                    <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${order.estado?.toUpperCase() === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {order.estado || 'PENDING'}
                                                    </span>
                                                </td>
                                                <td class="p-4">
                                                    <span class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusConfig(order.estado_envio).bg} ${getStatusConfig(order.estado_envio).text}`}>
                                                        <StatusIcon size={12} />
                                                        {order.estado_envio}
                                                    </span>
                                                </td>
                                                <td class="p-4 font-bold text-slate-800">
                                                    ${(Number(order.compra_total || 0) / 100).toLocaleString('es-CO')}
                                                </td>
                                                <td class="p-4 text-right">
                                                    <button
                                                        onClick={() => handleViewOrder(order.id)}
                                                        class="w-8 h-8 rounded-full flex items-center justify-center ml-auto text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={handleUpdateComplete}
                />
            )}
        </AdminLayout>
    );
}
