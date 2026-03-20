import { useState } from 'preact/hooks';
import { AdminLayout } from '../components/AdminLayout';
import { Database, RefreshCw, Trash2, AlertTriangle } from 'lucide-preact';
import { apiClient } from '../api';
import { showToast } from '../signals';

export function OptionsPage() {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [showConfirm, setShowConfirm] = useState<'update' | 'clear' | null>(null);

    const handleUpdateCache = async () => {
        setIsUpdating(true);
        try {
            const response = await apiClient.post('/ecomerce-regenievex-administrar-productos/admin/actualizar-cache');
            showToast(response.data.message || 'Caché actualizada globalmente', 'success');
        } catch (error: any) {
            console.error('Error actualizando caché:', error);
            showToast(error.response?.data?.error || 'Error al actualizar la caché global', 'error');
        } finally {
            setIsUpdating(false);
            setShowConfirm(null);
        }
    };

    const handleClearCache = async () => {
        setIsClearing(true);
        try {
            const response = await apiClient.delete('/ecomerce-regenievex-administrar-productos/admin/eliminar-cache');
            showToast(response.data.message || 'Caché eliminada', 'success');
        } catch (error: any) {
            console.error('Error eliminando caché:', error);
            showToast(error.response?.data?.error || 'Error al limpiar la caché', 'error');
        } finally {
            setIsClearing(false);
            setShowConfirm(null);
        }
    };

    return (
        <AdminLayout title="Opciones del Sistema">
            <div class="p-8 pb-24 max-w-4xl mx-auto w-full relative z-10">

                <div class="mb-8">
                    <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Database class="text-brand-500" />
                        Gestión de Caché Global (Redis)
                    </h1>
                    <p class="text-slate-500 mt-2">
                        Controla el almacenamiento en memoria rápida utilizado por la tienda pública. Refrescar la caché asegura
                        que los clientes vean los últimos productos, marcas y categorías.
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Botón Actualizar Caché */}
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4 hover:border-brand-200 transition-colors">
                        <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                            <RefreshCw size={24} />
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-lg">Actualizar Todo</h3>
                            <p class="text-sm text-slate-500 mt-1">Borra la caché actual y vuelve a consultar todos los registros de la base de datos para subirlos a Redis.</p>
                        </div>
                        <button
                            onClick={() => setShowConfirm('update')}
                            disabled={isUpdating || isClearing}
                            class="mt-auto px-5 py-2.5 rounded-xl font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isUpdating ? <span class="animate-spin"><RefreshCw size={18} /></span> : <RefreshCw size={18} />}
                            Forzar Refresco Global
                        </button>
                    </div>

                    {/* Botón Borrar Caché */}
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-start gap-4 hover:border-red-200 transition-colors">
                        <div class="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-800 text-lg">Vaciar Caché</h3>
                            <p class="text-sm text-slate-500 mt-1">Elimina toda la memoria Redis sin crear nuevos registros de inmediato. Usar solo en emergencias.</p>
                        </div>
                        <button
                            onClick={() => setShowConfirm('clear')}
                            disabled={isUpdating || isClearing}
                            class="mt-auto px-5 py-2.5 rounded-xl font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isClearing ? <span class="animate-spin"><RefreshCw size={18} /></span> : <Trash2 size={18} />}
                            Vaciar Memoria
                        </button>
                    </div>
                </div>

                {/* Confirmación Modal/Alert en pantalla */}
                {showConfirm && (
                    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div class="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-up">
                            <div class="flex items-center gap-3 mb-4 text-amber-500">
                                <AlertTriangle size={32} />
                                <h3 class="text-xl font-bold text-slate-800">Cuidado</h3>
                            </div>

                            <p class="text-slate-600 mb-6">
                                {showConfirm === 'update'
                                    ? 'Estás a punto de vaciar y reescribir por completo la información de la base de datos en memoria Redis (Productos, Marcas, Categorías). ¿Estás seguro de que quieres realizar esta intensa operación ahora mismo?'
                                    : 'Estás a punto de dejar vacía toda la memoria caché. Esto impactará temporalmente las consultas del e-commerce público. ¿Confirmas esta acción de eliminación?'
                                }
                            </p>

                            <div class="flex gap-3 justify-end mt-8">
                                <button
                                    onClick={() => setShowConfirm(null)}
                                    class="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={showConfirm === 'update' ? handleUpdateCache : handleClearCache}
                                    class={`px-4 py-2 font-bold text-white rounded-xl transition-colors flex items-center gap-2 ${showConfirm === 'update' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    Sí, ejecutar acción
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
