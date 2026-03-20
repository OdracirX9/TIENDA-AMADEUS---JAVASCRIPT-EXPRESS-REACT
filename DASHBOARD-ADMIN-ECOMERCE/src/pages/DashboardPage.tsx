import { Package, ShoppingCart, TrendingUp, Users, Loader, Calendar, CreditCard } from 'lucide-preact';
import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect } from 'preact/hooks';
import { ordersApi } from '../api';
import { showToast } from '../signals';

// Tipado rápido para las estadísticas
interface DashboardStats {
    total_ventas: string | number;
    ordenes_pendientes: string | number;
    productos_activos: string | number;
    nuevos_clientes: string | number;
}

export function DashboardPage() {

    const [statsData, setStatsData] = useState<DashboardStats>({ total_ventas: 0, ordenes_pendientes: 0, productos_activos: 0, nuevos_clientes: 0 });
    const [ordenesRecientes, setOrdenesRecientes] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    const formatearMoneda = (valor: any): string => {
        const num = Number(valor) / 100;
        if (isNaN(num)) return '$0';
        return num.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    };

    const formatearFechaReciente = (fechaString: string) => {
        const fecha = new Date(fechaString);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fecha.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} hrs`;
        if (diffDays === 1) return `Ayer`;
        return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            setCargando(true);
            try {
                // Ejecutar ambas promesas en paralelo
                const [statsRes, ordenesRes] = await Promise.all([
                    ordersApi.getDashboardStats(),
                    ordersApi.getOrders({ limit: 5 })
                ]);

                if (statsRes.data) {
                    setStatsData(statsRes.data);
                }
                if (ordenesRes.data && ordenesRes.data.data) {
                    setOrdenesRecientes(ordenesRes.data.data);
                }
            } catch (error) {
                console.error("Error al cargar resumen:", error);
                showToast("Error al sincronizar las métricas generales.", 'error');
            } finally {
                setCargando(false);
            }
        };

        fetchDashboardData();
    }, []);

    const statsConfig = [
        { label: 'Ingresos Históricos', value: formatearMoneda(statsData.total_ventas), increase: 'Aprobado', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 border border-emerald-100' },
        { label: 'Órdenes sin enviar', value: statsData.ordenes_pendientes?.toString() || '0', increase: 'Pendientes', icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50 border border-amber-100' },
        { label: 'Variantes de Productos', value: statsData.productos_activos?.toString() || '0', increase: 'Activas', icon: Package, color: 'text-brand-500', bg: 'bg-brand-50 border border-brand-100' },
        { label: 'Clientes Registrados', value: statsData.nuevos_clientes?.toString() || '0', increase: 'Global', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 border border-indigo-100' },
    ];

    if (cargando) {
        return (
            <AdminLayout title="Resumen General">
                <div class="p-8 max-w-7xl mx-auto w-full min-h-[80vh] flex flex-col items-center justify-center gap-4 text-slate-500">
                    <Loader size={30} class="animate-spin text-brand-500" />
                    <p class="font-medium text-sm">Cargando métricas del sistema...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Resumen General">
            <div class="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20 animate-fade-in">

                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Panel Central 👋</h3>
                        <p class="text-slate-500 mt-1 font-medium">Estadísticas en tiempo real de tu tienda.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statsConfig.map((stat, i) => (
                        <div key={i} class="bg-white border border-slate-200 rounded-2xl p-6 glass-panel flex flex-col gap-4 relative overflow-hidden group hover:border-brand-200 hover:shadow-brand-500/10 transition-all">
                            <div class="flex justify-between items-start">
                                <div class={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} shadow-sm`}>
                                    <stat.icon size={24} />
                                </div>
                                <span class={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest ${stat.bg} ${stat.color}`}>
                                    {stat.increase}
                                </span>
                            </div>
                            <div>
                                <h4 class="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</h4>
                                <p class="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts/Tables Area */}
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gráfico Placeholder */}
                    <div class="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 glass-panel min-h-[400px] flex flex-col">
                        <div class="flex items-center justify-between mb-6">
                            <h4 class="text-lg font-bold text-slate-800">Gráfico de Ventas (Próximamente)</h4>
                        </div>
                        <div class="flex-1 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                            <TrendingUp size={40} class="text-slate-300 mb-3" />
                            <p class="text-slate-500 text-sm font-medium">Este es un espacio reservado para futuras implementaciones de gráficas analíticas por fecha.</p>
                        </div>
                    </div>

                    {/* Órdenes Recientes */}
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 glass-panel flex flex-col">
                        <div class="flex items-center justify-between mb-6">
                            <h4 class="text-lg font-bold text-slate-800">Órdenes Recientes</h4>
                        </div>

                        <div class="flex-1 flex flex-col gap-3">
                            {ordenesRecientes.length === 0 ? (
                                <div class="flex-1 flex flex-col items-center justify-center py-10 text-center">
                                    <ShoppingCart size={32} class="text-slate-300 mb-3" />
                                    <p class="text-sm font-medium text-slate-400">No hay órdenes registradas.</p>
                                </div>
                            ) : (
                                ordenesRecientes.map((orden) => {
                                    const estadoPagoClass = orden.estado_pago?.toUpperCase() === 'APPROVED' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                        orden.estado_pago?.toUpperCase() === 'PENDING' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                            orden.estado_pago?.toUpperCase() === 'DECLINED' ? 'text-rose-600 bg-rose-50 border-rose-100' :
                                                'text-slate-600 bg-slate-50 border-slate-200';

                                    const truncId = orden.id.split('-')[0].toUpperCase();

                                    return (
                                        <div key={orden.id} class="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors cursor-pointer group">
                                            <div class="flex items-center gap-3 w-full min-w-0">
                                                <div class="w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center group-hover:bg-brand-50 group-hover:border-brand-100 group-hover:text-brand-600 transition-colors">
                                                    <ShoppingCart size={18} class="text-slate-500 group-hover:text-brand-500" />
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-sm font-black text-slate-800 truncate mb-0.5">#{truncId}</p>
                                                    <p class="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                                        <Calendar size={10} /> {formatearFechaReciente(orden.created_at)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div class="text-right shrink-0">
                                                <p class="text-sm font-black text-slate-800 mb-1.5">{formatearMoneda(orden.compra_total)}</p>
                                                <span class={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-widest ${estadoPagoClass}`}>
                                                    {orden.estado_pago || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}
