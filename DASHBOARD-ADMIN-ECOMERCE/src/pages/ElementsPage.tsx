import { useState, useEffect } from 'preact/hooks';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Folder as FIcon, Layers, ImageIcon } from 'lucide-preact';
import { productsApi } from '../api';
import { showToast } from '../signals';
import { AdminLayout } from '../components/AdminLayout';
import { getMinioUrl } from '../utils/minio';

interface ElementoData {
    id: string;
    nombre: string;
    descripcion: string;
    imagen: string;
    created_at: string;
}

interface ElementsPageProps {
    titulo: string;
    tipoData: 'categorias' | 'marcas';
    tipoTabla: string;
}

export function ElementsPage({ titulo, tipoData, tipoTabla }: ElementsPageProps) {
    const navigate = useNavigate();
    const [elementos, setElementos] = useState<ElementoData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchElementos = async () => {
        try {
            setLoading(true);
            const res = await productsApi.getElements();
            // res.data has { marcas: [], categorias: [] }
            setElementos(res.data[tipoData] || []);
        } catch (error) {
            console.error(error);
            showToast(`Error al cargar ${titulo.toLowerCase()}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchElementos();
    }, [tipoData]);

    const handleDelete = async (id: string, nombre: string) => {
        const confirm = window.confirm(`¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`);
        if (!confirm) return;

        try {
            await productsApi.deleteElement(id, tipoTabla);
            showToast(`${titulo.slice(0, -1)} eliminada correctamente`, 'success');
            fetchElementos();
        } catch (error: any) {
            console.error(error);
            showToast(error.response?.data?.error || `Error al eliminar`, 'error');
        }
    };

    const filteredElementos = elementos.filter(el =>
        el.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (el.descripcion && el.descripcion.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <AdminLayout title={titulo}>
            <div class="p-8 pb-24 max-w-7xl mx-auto w-full space-y-6 relative z-10">
                {/* Actions Bar */}
                <div class="flex flex-col sm:flex-row justify-between gap-4">
                    <div class="relative w-full sm:w-96">
                        <input
                            type="text"
                            placeholder={`Buscar ${titulo.toLowerCase()}...`}
                            value={search}
                            onInput={(e: any) => setSearch(e.target.value)}
                            class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 shadow-sm"
                        />
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                    <button
                        onClick={() => navigate(`/${tipoData}/nuevo`)}
                        class="flex justify-center items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-brand-500/30 cursor-pointer"
                    >
                        <Plus size={18} />
                        Nueva {titulo.slice(0, -1)}
                    </button>
                </div>

                {/* Table */}
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                                    <th class="py-4 px-6 font-semibold w-24">Imagen</th>
                                    <th class="py-4 px-6 font-semibold">Nombre</th>
                                    <th class="py-4 px-6 font-semibold">Descripción</th>
                                    <th class="py-4 px-6 font-semibold w-40">Creada el</th>
                                    <th class="py-4 px-6 font-semibold text-right w-32">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} class="py-12 text-center">
                                            <div class="w-8 h-8 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
                                            <p class="text-slate-500 font-medium tracking-wide">Cargando {titulo.toLowerCase()}...</p>
                                        </td>
                                    </tr>
                                ) : filteredElementos.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} class="py-12 text-center">
                                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                {tipoData === 'categorias' ? <FIcon size={24} class="text-slate-400" /> : <Layers size={24} class="text-slate-400" />}
                                            </div>
                                            <p class="text-slate-600 font-semibold mb-1">No hay {titulo.toLowerCase()} aún</p>
                                            <p class="text-slate-400 text-sm">Empieza añadiendo una nueva.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredElementos.map((el) => (
                                        <tr key={el.id} class="hover:bg-slate-50 transition-colors group">
                                            <td class="py-4 px-6">
                                                <div class="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm">
                                                    {el.imagen ? (
                                                        <img
                                                            src={getMinioUrl(el.imagen, 'productos')}
                                                            alt={el.nombre}
                                                            class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <ImageIcon size={20} class="text-slate-400" />
                                                    )}
                                                </div>
                                            </td>
                                            <td class="py-4 px-6">
                                                <p class="font-bold text-slate-800">{el.nombre}</p>
                                            </td>
                                            <td class="py-4 px-6">
                                                <p class="text-sm text-slate-500 line-clamp-2 max-w-xs">{el.descripcion || <span class="text-slate-300 italic">Sin descripción</span>}</p>
                                            </td>
                                            <td class="py-4 px-6 text-sm text-slate-500 whitespace-nowrap">
                                                {new Date(el.created_at).toLocaleDateString('es-CO')}
                                            </td>
                                            <td class="py-4 px-6">
                                                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => navigate(`/${tipoData}/editar/${el.id}`)}
                                                        class="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(el.id, el.nombre)}
                                                        class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
