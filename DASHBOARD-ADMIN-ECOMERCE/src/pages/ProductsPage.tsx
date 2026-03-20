import { useState, useEffect } from 'preact/hooks';
import { Package, Plus, Search, Filter, MoreVertical, Edit2, Trash2 } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api';
import { showToast } from '../signals';
import { getMinioUrl } from '../utils/minio';
import { AdminLayout } from '../components/AdminLayout';

export function ProductsPage() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await productsApi.getProducts({ search });
            setProducts(res.data.data || []);
        } catch (error) {
            showToast('Error al cargar productos', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // debounce search
        const timer = setTimeout(() => {
            fetchProducts();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSearch = (e: any) => {
        setSearch(e.target.value);
    };

    return (
        <AdminLayout title="Catálogo de Productos">
            <div class="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20 animate-fade-in">
                {/* Header Area */}
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-md">
                                <Package size={20} class="text-white" />
                            </div>
                            Catálogo de Productos
                        </h2>
                        <p class="text-slate-500 mt-1 font-medium ml-14">Gestiona el inventario, variantes y opciones de visibilidad.</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button class="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold hover:border-brand-300 hover:text-brand-600 transition-colors shadow-sm cursor-pointer">
                            <Filter size={18} />
                            Filtros
                        </button>
                        <button
                            onClick={() => navigate('/productos/nuevo')}
                            class="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-500 transition-all shadow-md hover:shadow-lg hover:shadow-brand-500/30 cursor-pointer"
                        >
                            <Plus size={18} />
                            Nuevo Producto
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div class="bg-white border border-slate-200 rounded-2xl p-4 glass-panel flex items-center gap-4">
                    <div class="relative flex-1">
                        <Search size={20} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar productos por nombre de variante..."
                            value={search}
                            onInput={handleSearch}
                            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Products Table */}
                <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden glass-panel shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 border-b border-slate-200">
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Producto Principal</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Variantes</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Visibilidad</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha Creación</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} class="px-6 py-12 text-center">
                                            <div class="w-8 h-8 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
                                            <p class="text-slate-500 font-medium">Cargando productos...</p>
                                        </td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} class="px-6 py-12 text-center text-slate-500 font-medium">
                                            No se encontraron productos.
                                        </td>
                                    </tr>
                                ) : (
                                    [...products].sort((a: any, b: any) => {
                                        if (a.visibilidad === false && b.visibilidad !== false) return 1;
                                        if (b.visibilidad === false && a.visibilidad !== false) return -1;
                                        // Secundary sort: newest first
                                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                    }).map((grupo) => {
                                        // Extract the first variant to show as the "Main" product representation
                                        const primeraVariante = grupo.variantes && grupo.variantes.length > 0 ? grupo.variantes[0] : null;
                                        const nombreRepresentativo = primeraVariante ? primeraVariante.nombre : 'Producto sin variantes';
                                        const precioRepresentativo = primeraVariante && primeraVariante.precio ? (Number(primeraVariante.precio) / 100).toLocaleString('es-CO') : 'N/A';

                                        // APLICANDO EL FRONTEND MINIO URL HELPER
                                        let miniatura = "";
                                        if (primeraVariante && primeraVariante.imagenes && primeraVariante.imagenes.length > 0) {
                                            miniatura = getMinioUrl(primeraVariante.imagenes[0], 'productos');
                                        }

                                        return (
                                            <tr
                                                key={grupo.id}
                                                onClick={() => navigate(`/productos/${grupo.id}`)}
                                                class="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            >
                                                <td class="px-6 py-4">
                                                    <div class="flex items-center gap-4">
                                                        <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                            {miniatura ? (
                                                                <img src={miniatura} alt={nombreRepresentativo} class="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package size={20} class="text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 class="text-sm font-bold text-slate-800 line-clamp-1">{nombreRepresentativo}</h4>
                                                            <p class="text-xs font-medium text-slate-500 mt-0.5">ID: <span class="font-mono text-[10px] text-slate-400">{grupo.id.substring(0, 8)}...</span></p>
                                                            {precioRepresentativo !== 'N/A' && (
                                                                <p class="text-sm font-bold text-brand-600 mt-1">${precioRepresentativo}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 text-center">
                                                    <span class="inline-flex items-center justify-center min-w-[2rem] h-6 px-2.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                                                        {grupo.variantes ? grupo.variantes.length : 0}
                                                    </span>
                                                </td>
                                                <td class="px-6 py-4">
                                                    <span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${grupo.visibilidad
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                        {grupo.visibilidad ? 'Público' : 'Oculto'}
                                                    </span>
                                                </td>
                                                <td class="px-6 py-4">
                                                    <p class="text-sm font-medium text-slate-600">
                                                        {new Date(grupo.created_at).toLocaleDateString()}
                                                    </p>
                                                </td>
                                                <td class="px-6 py-4 text-right">
                                                    <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/productos/editar/${grupo.id}`);
                                                            }}
                                                            class="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Eliminar">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
