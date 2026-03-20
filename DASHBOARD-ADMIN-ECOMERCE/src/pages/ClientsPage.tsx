import { useState, useEffect } from 'preact/hooks';
import { Users, Search, Trash2, Mail, Phone, Calendar, AlertTriangle } from 'lucide-preact';
import { AdminLayout } from '../components/AdminLayout';
import { clientsApi } from '../api';
import { showToast } from '../signals';

export function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clientToDelete, setClientToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await clientsApi.getClients({ page: 1, limit: 100 });
            if (response.data && response.data.data) {
                setClients(response.data.data);
            }
        } catch (error) {
            console.error(error);
            showToast('Error al cargar clientes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const filteredClients = clients.filter(client => {
        return client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.celular && client.celular.includes(searchTerm));
    });

    const confirmDelete = async () => {
        if (!clientToDelete) return;

        try {
            setIsDeleting(true);
            await clientsApi.deleteClient(clientToDelete.id);
            showToast('Cliente eliminado correctamente', 'success');
            setClientToDelete(null);
            fetchClients(); // Reload the list
        } catch (error) {
            console.error(error);
            showToast('Error al eliminar cliente', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AdminLayout title="Gestión de Clientes">
            <div class="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20 animate-fade-in">

                {/* Header & Search */}
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-md">
                                <Users size={20} class="text-white" />
                            </div>
                            Directorio de Clientes
                        </h2>
                        <p class="text-slate-500 mt-1 font-medium ml-14">Visualiza y gestiona todos los usuarios registrados en tu tienda.</p>
                    </div>

                    <div class="relative w-full md:w-80">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, correo o celular..."
                            value={searchTerm}
                            onInput={(e) => setSearchTerm(e.currentTarget.value)}
                            class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div class="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                    <th class="p-4 font-semibold">Cliente</th>
                                    <th class="p-4 font-semibold">Contacto</th>
                                    <th class="p-4 font-semibold">Registro</th>
                                    <th class="p-4 font-semibold text-center">Órdenes</th>
                                    <th class="p-4 font-semibold">Total Gastado</th>
                                    <th class="p-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} class="p-8 text-center text-slate-500">
                                            <div class="w-8 h-8 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
                                            Cargando clientes...
                                        </td>
                                    </tr>
                                ) : filteredClients.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} class="p-12 text-center">
                                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Users size={24} class="text-slate-400" />
                                            </div>
                                            <h3 class="text-slate-800 font-semibold mb-1">No hay clientes</h3>
                                            <p class="text-slate-500 text-xs">No se encontraron usuarios que coincidan con la búsqueda.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClients.map(client => (
                                        <tr key={client.id} class="hover:bg-slate-50/50 transition-colors group">
                                            <td class="p-4">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shrink-0">
                                                        {client.nombre.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div class="font-bold text-slate-800">{client.nombre}</div>
                                                        <div class="text-[10px] text-slate-400 font-mono mt-0.5">ID: {client.id.split('-')[0]}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="p-4 space-y-1">
                                                <div class="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                    <Mail size={12} class="text-slate-400" />
                                                    {client.correo}
                                                </div>
                                                {client.celular && (
                                                    <div class="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                                                        <Phone size={12} class="text-slate-400" />
                                                        {client.celular}
                                                    </div>
                                                )}
                                            </td>
                                            <td class="p-4 text-xs font-medium text-slate-600 flex items-center gap-1.5 pt-5">
                                                <Calendar size={14} class="text-slate-400" />
                                                {new Date(client.created_at).toLocaleDateString()}
                                            </td>
                                            <td class="p-4 text-center">
                                                <span class="inline-flex items-center justify-center min-w-[2rem] h-6 px-2.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                                                    {client.total_ordenes}
                                                </span>
                                            </td>
                                            <td class="p-4 font-bold text-slate-800">
                                                ${(Number(client.total_gastado || 0) / 100).toLocaleString('es-CO')}
                                            </td>
                                            <td class="p-4 text-right">
                                                <button
                                                    onClick={() => setClientToDelete(client)}
                                                    class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-auto block"
                                                    title="Eliminar Cliente"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {clientToDelete && (
                <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                    <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>

                        <div class="flex items-start gap-4 mb-6">
                            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <AlertTriangle class="text-red-600" size={24} />
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-slate-800">Eliminar Cliente</h3>
                                <p class="text-sm text-slate-600 mt-1">
                                    ¿Estás seguro de que deseas eliminar permanentemente a <span class="font-bold text-slate-800">{clientToDelete.nombre}</span>?
                                </p>
                                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                                    <p class="text-xs text-amber-800 font-medium">
                                        Las órdenes de este cliente se mantendrán anonimizadas en el historial contable. Toda la información personal y de sesión será destruida irreversiblemente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setClientToDelete(null)}
                                disabled={isDeleting}
                                class="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-70 shadow-sm hover:shadow-md hover:shadow-red-500/20"
                            >
                                {isDeleting ? (
                                    <>
                                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Eliminando...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Sí, Eliminar Cliente
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
