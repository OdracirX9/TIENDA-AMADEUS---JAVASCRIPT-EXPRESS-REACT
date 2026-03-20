import { useState, useEffect } from 'preact/hooks';
import { AdminLayout } from '../components/AdminLayout';
import { shippingApi } from '../api';
import { showToast } from '../signals';
import { Truck, Plus, Trash2, MapPin, Loader, FileSearch, Save, Search } from 'lucide-preact';
import { colombiaData } from '../utils/ColombiaData';

interface TarifaEnvio {
    id: string;
    departamento: string;
    ciudad: string;
    precio: number;
    tiempo_estimado: string | null;
    created_at: string;
}

export function ShippingPage() {
    const [tarifas, setTarifas] = useState<TarifaEnvio[]>([]);
    const [cargando, setCargando] = useState(true);
    const [abrirModal, setAbrirModal] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    // Estados del Formulario
    const [deptSeleccionado, setDeptSeleccionado] = useState<string>('');
    const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>('');
    const [precioForm, setPrecioForm] = useState<string>('');
    const [tiempoForm, setTiempoForm] = useState<string>('');
    const [guardando, setGuardando] = useState(false);

    const departamentos = Object.keys(colombiaData).sort();
    const ciudades = deptSeleccionado ? colombiaData[deptSeleccionado] : [];

    const fetchTarifas = async () => {
        setCargando(true);
        try {
            const res = await shippingApi.getShippingRates();
            setTarifas(res.data);
        } catch (error) {
            console.error("Error cargando tarifas:", error);
            showToast("No se pudieron cargar las tarifas de envío", "error");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        fetchTarifas();
    }, []);

    const formatearMoneda = (valor: number): string => {
        return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    };

    const handleCrearTarifa = async (e: Event) => {
        e.preventDefault();
        if (!deptSeleccionado || !ciudadSeleccionada || !precioForm) {
            return showToast("Completa los campos obligatorios", "warning");
        }

        setGuardando(true);
        try {
            const numPrecio = parseInt(precioForm.replace(/\D/g, ''), 10);

            await shippingApi.createShippingRate({
                departamento: deptSeleccionado,
                ciudad: ciudadSeleccionada,
                precio: numPrecio * 100, // Enviar en centavos
                tiempo_estimado: tiempoForm || undefined
            });

            showToast("Tarifa registrada/sobrescrita correctamente", "success");
            setAbrirModal(false);
            setDeptSeleccionado('');
            setCiudadSeleccionada('');
            setPrecioForm('');
            setTiempoForm('');
            await fetchTarifas();

        } catch (error) {
            console.error(error);
            showToast("Error al guardar la tarifa", "error");
        } finally {
            setGuardando(false);
        }
    };

    const handleDelete = async (id: string, nombre: string) => {
        if (!window.confirm(`¿Estás seguro de eliminar la regla de envío para ${nombre}?`)) return;

        try {
            await shippingApi.deleteShippingRate(id);
            showToast("Tarifa eliminada", "success");
            setTarifas(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error(error);
            showToast("Error eliminando tarifa", "error");
        }
    };

    const tarifasFiltradas = tarifas.filter(tarifa =>
        tarifa.ciudad.toLowerCase().includes(busqueda.toLowerCase()) ||
        tarifa.departamento.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <AdminLayout title="Tarifas de Envío">
            <div class="p-8 pb-24 max-w-7xl mx-auto space-y-6 relative z-10">

                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold flex items-center gap-2">
                            <Truck class="text-brand-500" /> Precios de Logística
                        </h2>
                        <p class="text-slate-500 text-sm mt-1">
                            Configura los costos de envío para diferentes departamentos y municipios.
                        </p>
                    </div>

                    <button
                        onClick={() => setAbrirModal(true)}
                        class="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl font-medium tracking-wide flex items-center gap-2 transition-colors shadow-brand-500/20 shadow-lg"
                    >
                        <Plus size={18} /> Añadir Tarifa
                    </button>
                </div>

                {/* Buscador */}
                <div class="relative w-full max-w-md">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por ciudad o departamento..."
                        value={busqueda}
                        onInput={(e) => setBusqueda(e.currentTarget.value)}
                        class="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm shadow-sm"
                    />
                </div>

                {/* Tabla de Tarifas */}
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {cargando ? (
                        <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader size={30} class="animate-spin mb-3 text-brand-500" />
                            <p>Cargando rutas logísticas...</p>
                        </div>
                    ) : tarifas.length === 0 ? (
                        <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                            <FileSearch size={48} class="mb-4 opacity-50" />
                            <p class="text-lg font-medium">Bandeja Vacía</p>
                            <p class="text-sm mt-1">Aún no has configurado ninguna tarifa de distribución local.</p>
                        </div>
                    ) : (
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                                        <th class="py-4 px-6 font-semibold w-1/3">Destino (Dept / Ciudad)</th>
                                        <th class="py-4 px-6 font-semibold">Tiempos de Entrega</th>
                                        <th class="py-4 px-6 font-semibold text-right">Precio Fijo COP</th>
                                        <th class="py-4 px-6 font-semibold text-center w-24">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tarifasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} class="py-8 text-center text-slate-500">
                                                No se encontraron resultados para la búsqueda "{busqueda}"
                                            </td>
                                        </tr>
                                    ) : (
                                        tarifasFiltradas.map((tarifa) => (
                                            <tr key={tarifa.id} class="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                                                <td class="py-4 px-6">
                                                    <div class="flex flex-col">
                                                        <span class="font-bold text-slate-800 text-base">{tarifa.ciudad === 'TODO' ? 'Todo el Departamento' : tarifa.ciudad}</span>
                                                        <span class="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <MapPin size={10} /> {tarifa.departamento}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td class="py-4 px-6">
                                                    {tarifa.tiempo_estimado ? (
                                                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                            {tarifa.tiempo_estimado}
                                                        </span>
                                                    ) : <span class="text-slate-400 text-xs italic">— Sin especificar</span>}
                                                </td>
                                                <td class="py-4 px-6 text-right">
                                                    <span class="text-base font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-lg border border-brand-100">
                                                        {formatearMoneda(tarifa.precio / 100)}
                                                    </span>
                                                </td>
                                                <td class="py-4 px-6 text-center">
                                                    <button
                                                        onClick={() => handleDelete(tarifa.id, `${tarifa.departamento} - ${tarifa.ciudad}`)}
                                                        class="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Eliminar regla"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>

            {/* Modal de Creación - Glassmorphism UI */}
            {abrirModal && (
                <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div class="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 class="text-xl font-bold flex items-center gap-2">
                                <MapPin class="text-brand-500" size={20} />
                                Nueva Regla Geográfica
                            </h3>
                            <p class="text-xs text-slate-500 mt-1">Si ya existe una tarifa para la ciudad elegida, se sobrescribirá.</p>
                        </div>

                        <form onSubmit={handleCrearTarifa} class="p-6 space-y-5">
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Departamento *</label>
                                    <select
                                        required
                                        value={deptSeleccionado}
                                        onChange={(e) => {
                                            setDeptSeleccionado(e.currentTarget.value);
                                            setCiudadSeleccionada('');
                                        }}
                                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium"
                                    >
                                        <option value="" disabled>Selecciona el Departamento...</option>
                                        {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-1.5">Ciudad / Municipio *</label>
                                    <select
                                        required
                                        disabled={!deptSeleccionado}
                                        value={ciudadSeleccionada}
                                        onChange={(e) => setCiudadSeleccionada(e.currentTarget.value)}
                                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="" disabled>Elige el municipio correspondiente...</option>
                                        {ciudades.map(c => (
                                            <option key={c} value={c}>
                                                {c === 'TODO' ? '🎯 Aplicar a TODO el departamento (General)' : c}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-semibold text-slate-700 mb-1.5">Costo (COP) *</label>
                                        <div class="relative">
                                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                required
                                                placeholder="15000"
                                                value={precioForm}
                                                onInput={(e) => setPrecioForm(e.currentTarget.value)}
                                                class="w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm font-bold placeholder:font-normal"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-semibold text-slate-700 mb-1.5">Estimado <span class="text-slate-400 font-normal">(Opcional)</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 1-3 días"
                                            value={tiempoForm}
                                            onInput={(e) => setTiempoForm(e.currentTarget.value)}
                                            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div class="pt-4 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setAbrirModal(false)}
                                    class="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardando}
                                    class="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg font-medium tracking-wide flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {guardando ? <Loader size={18} class="animate-spin" /> : <Save size={18} />}
                                    Guardar Tarifa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
