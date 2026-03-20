import { useState } from 'preact/hooks';
import { Calendar, CreditCard, Mail, MapPin, Package, Phone, Save, Truck, X } from 'lucide-preact';
import { getMinioUrl } from '../../utils/minio';
import { ordersApi } from '../../api';
import { showToast } from '../../signals';

interface OrderDetailsModalProps {
    order: any;
    onClose: () => void;
    onUpdate: () => void;
}

export function OrderDetailsModal({ order, onClose, onUpdate }: OrderDetailsModalProps) {
    const [estadoEnvio, setEstadoEnvio] = useState(order.estado_envio);
    const [numeroGuia, setNumeroGuia] = useState(order.numero_guia || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await ordersApi.updateShippingStatus(order.id, {
                estado_envio: estadoEnvio,
                numero_guia: numeroGuia || undefined
            });
            showToast('Estado de envío actualizado', 'success');
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            showToast('Error al actualizar el estado', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const isApproved = status?.toUpperCase() === 'APPROVED';
        return (
            <span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                {status || 'PENDING'}
            </span>
        );
    };

    return (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden shadow-brand-500/10">
                {/* Header */}
                <div class="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 class="text-xl font-bold text-slate-800">Orden #{order.id.split('-')[0]}</h2>
                        <div class="flex items-center gap-2 mt-1">
                            <Calendar size={14} class="text-slate-400" />
                            <p class="text-sm font-medium text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        class="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div class="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                    {/* Columna Izquierda: Detalles */}
                    <div class="flex-1 space-y-6">

                        {/* Tarjeta Cliente */}
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Mail size={16} class="text-brand-500" />
                                Información del Cliente
                            </h3>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <p class="text-xs text-slate-500 mb-1">Nombre</p>
                                    <p class="text-sm font-semibold text-slate-800">{order.nombre_usuario}</p>
                                </div>
                                <div>
                                    <p class="text-xs text-slate-500 mb-1">Teléfono</p>
                                    <p class="text-sm font-semibold text-slate-800 flex items-center gap-1">
                                        <Phone size={14} class="text-slate-400" /> {order.celular}
                                    </p>
                                </div>
                                <div class="col-span-2">
                                    <p class="text-xs text-slate-500 mb-1">Correo Electrónico</p>
                                    <p class="text-sm font-semibold text-slate-800">{order.correo}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tarjeta Envío */}
                        <div class="bg-slate-50 border border-slate-200 rounded-xl p-5">
                            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <MapPin size={16} class="text-brand-500" />
                                Dirección de Envío
                            </h3>
                            <p class="text-sm font-medium text-slate-800">{order.direccion_envio}</p>
                            <p class="text-sm text-slate-500 mt-1">{order.ciudad}, {order.departamento}</p>
                        </div>

                        {/* Productos */}
                        <div>
                            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Package size={16} class="text-brand-500" />
                                Artículos ({order.productos?.length || 0})
                            </h3>
                            <div class="space-y-3">
                                {order.productos?.map((prod: any, idx: number) => (
                                    <div key={idx} class="flex items-center gap-4 p-3 border border-slate-200 rounded-xl bg-white">
                                        <img
                                            src={getMinioUrl(prod.imagen, 'productos')}
                                            alt={prod.nombre}
                                            class="w-16 h-16 object-cover rounded-lg bg-slate-100 border border-slate-200"
                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=Foto'; }}
                                        />
                                        <div class="flex-1">
                                            <p class="text-sm font-bold text-slate-800 line-clamp-1">{prod.nombre}</p>
                                            <p class="text-xs text-slate-500">{prod.marca} • {prod.categoria}</p>
                                            <div class="flex items-center justify-between mt-2">
                                                <p class="text-xs font-semibold text-slate-700">Cant: {prod.cantidad}</p>
                                                <p class="text-sm font-bold text-brand-600">${(Number(prod.sub_total) / 100).toLocaleString('es-CO')}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Columna Derecha: Gestión */}
                    <div class="w-full lg:w-80 space-y-6">

                        {/* Resumen Financiero */}
                        <div class="bg-brand-50 border border-brand-100 rounded-xl p-5">
                            <h3 class="text-sm font-bold text-brand-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <CreditCard size={16} class="text-brand-600" />
                                Pago
                            </h3>
                            <div class="space-y-3">
                                <div class="flex justify-between items-center pb-3 border-b border-brand-200/50">
                                    <span class="text-sm text-brand-700">Estado Wompi</span>
                                    <StatusBadge status={order.estado_pago} />
                                </div>
                                <div class="flex justify-between items-center pb-3 border-b border-brand-200/50">
                                    <span class="text-sm text-brand-700">Método</span>
                                    <span class="text-sm font-semibold text-brand-900">{order.metodo_pago || 'N/A'}</span>
                                </div>
                                <div class="flex justify-between items-center pb-3 border-b border-brand-200/50">
                                    <span class="text-sm text-brand-700">Envío</span>
                                    <span class="text-sm font-semibold text-brand-900">${(Number(order.precio_envio || 0) / 100).toLocaleString('es-CO')}</span>
                                </div>
                                <div class="flex justify-between items-center pt-2">
                                    <span class="text-sm font-bold text-brand-800">Total Pagado</span>
                                    <span class="text-lg font-black text-brand-600">${(Number(order.compra_total || 0) / 100).toLocaleString('es-CO')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Gestión de Envío */}
                        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Truck size={16} class="text-indigo-500" />
                                Gestión Logística
                            </h3>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">Estado del Envío</label>
                                    <select
                                        value={estadoEnvio}
                                        onChange={(e) => setEstadoEnvio(e.currentTarget.value)}
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
                                    >
                                        <option value="Pendiente">🟡 Pendiente (Pagado)</option>
                                        <option value="Procesando">🔵 Procesando (En Bodega)</option>
                                        <option value="Enviado">🟣 Enviado (En Tránsito)</option>
                                        <option value="Entregado">🟢 Entregado</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-xs font-semibold text-slate-600 mb-1.5">Número de Guía (Tracking)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: SERVI-123456789"
                                        value={numeroGuia}
                                        onInput={(e) => setNumeroGuia(e.currentTarget.value)}
                                        class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono"
                                    />
                                    <p class="text-[10px] text-slate-400 mt-1">Opcional. Código de seguimiento de la transportadora.</p>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    class="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-70"
                                >
                                    {isSaving ? (
                                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
