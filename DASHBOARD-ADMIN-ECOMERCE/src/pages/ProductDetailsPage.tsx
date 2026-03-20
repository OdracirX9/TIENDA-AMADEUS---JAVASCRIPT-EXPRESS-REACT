import { useState, useEffect } from 'preact/hooks';
import { Package, ArrowLeft, Tag, Layers, Eye, EyeOff, CheckCircle2, ChevronRight, Image as ImageIcon, Trash2 } from 'lucide-preact';
import { useNavigate, useParams } from 'react-router-dom';
import { productsApi } from '../api';
import { showToast } from '../signals';
import { getMinioUrl } from '../utils/minio';
import { AdminLayout } from '../components/AdminLayout';

export function ProductDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<number>(0);

    const [categorias, setCategorias] = useState<any[]>([]);
    const [marcas, setMarcas] = useState<any[]>([]);

    const fetchProduct = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [resProd, resElem] = await Promise.all([
                productsApi.getProductById(id),
                productsApi.getElements()
            ]);
            setProduct(resProd.data);
            setCategorias(resElem.data.categorias || []);
            setMarcas(resElem.data.marcas || []);
        } catch (error) {
            showToast('Error al cargar los detalles del producto', 'error');
            console.error(error);
            navigate('/productos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchProduct();
        }
    }, [id]);

    if (loading) {
        return (
            <AdminLayout title="Detalles del Producto">
                <div class="p-8 max-w-7xl mx-auto flex justify-center items-center min-h-[50vh]">
                    <div class="text-center">
                        <div class="w-12 h-12 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
                        <p class="text-slate-500 font-medium tracking-wide">Cargando detalles...</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (!product) return null;

    const currentVariant = product.variantes?.[selectedVariant];

    const totalVentasStr = product.variantes?.reduce((acc: number, v: any) => acc + parseInt(v.ventas || '0', 10), 0) || 0;
    const hasSales = totalVentasStr > 0;

    const handleDeleteProduct = async () => {
        if (hasSales) {
            showToast('No se puede eliminar un producto que ya tiene ventas, para proteger el sistema.', 'error');
            return;
        }

        const confirm = window.confirm('¿Estás seguro de que deseas eliminar permanentemente este producto y todas sus variantes? Esta acción no se puede deshacer.');
        if (!confirm) return;

        try {
            await productsApi.deleteProduct(product.id);
            showToast('Producto eliminado exitosamente', 'success');
            navigate('/productos');
        } catch (error: any) {
            console.error(error);
            showToast(error.response?.data?.error || 'Error al eliminar el producto', 'error');
        }
    };

    return (
        <AdminLayout title="Detalles del Producto">
            <div class="p-8 max-w-7xl mx-auto w-full space-y-6 pb-20 animate-fade-in relative">

                {/* Header Actions */}
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                    <div class="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/productos')}
                            class="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 hover:border-brand-300 rounded-xl transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-2xl font-bold text-slate-800 tracking-tight">Detalles del Producto</h2>
                                <span class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${product.visibilidad
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {product.visibilidad ? <Eye size={14} /> : <EyeOff size={14} />}
                                    {product.visibilidad ? 'Público' : 'Oculto'}
                                </span>
                            </div>
                            <p class="text-slate-500 mt-1 font-medium text-sm flex items-center gap-2">
                                ID Referencia: <code class="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-xs font-mono">{product.id}</code>
                            </p>
                            <div class="flex items-center gap-4 mt-2">
                                {product.id_categoria && (
                                    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                        <Layers size={14} class="text-indigo-500" />
                                        Categoría: {categorias.find(c => c.id === product.id_categoria)?.nombre || 'Desconocida'}
                                    </div>
                                )}
                                {product.id_marca && (
                                    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                                        <Tag size={14} class="text-rose-500" />
                                        Marca: {marcas.find(m => m.id === product.id_marca)?.nombre || 'Desconocida'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Action Buttons */}
                    <div class="flex items-center gap-2">
                        <button
                            onClick={() => navigate(`/productos/editar/${product.id}`)}
                            class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:text-brand-600 hover:border-brand-300 transition-colors cursor-pointer"
                        >
                            Editar Producto
                        </button>
                        <button
                            onClick={handleDeleteProduct}
                            disabled={hasSales}
                            class={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-semibold transition-colors
                                ${hasSales
                                    ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                    : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 cursor-pointer'
                                }`}
                            title={hasSales ? "No se puede eliminar porque este producto ya tiene ventas registradas" : "Eliminar permanentemente"}
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Sidebar: Variants List */}
                    <div class="lg:col-span-4 space-y-4">
                        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <h3 class="font-bold text-slate-800 text-sm tracking-widest uppercase flex items-center gap-2 mb-4">
                                <Layers size={16} class="text-brand-500" />
                                Variantes ({product.variantes?.length || 0})
                            </h3>

                            <div class="space-y-3">
                                {[...(product.variantes || [])].sort((a: any, b: any) => {
                                    if (a.posicion === -1) return 1;
                                    if (b.posicion === -1) return -1;
                                    return a.posicion - b.posicion;
                                }).map((variante: any, idx: number) => {
                                    const miniatura = variante.imagenes?.[0] ? getMinioUrl(variante.imagenes[0], 'productos') : null;
                                    const isSelected = selectedVariant === idx;

                                    return (
                                        <button
                                            key={variante.id}
                                            onClick={() => setSelectedVariant(idx)}
                                            class={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-4 ${isSelected
                                                ? 'bg-brand-50 border-brand-300 shadow-md shadow-brand-500/10'
                                                : 'bg-white border-slate-200 hover:border-brand-200 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div class="w-12 h-12 rounded-lg bg-white border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                                {miniatura ? (
                                                    <img src={miniatura} class="w-full h-full object-cover" />
                                                ) : (
                                                    <Package size={18} class="text-slate-300" />
                                                )}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${variante.posicion === -1 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        {variante.posicion === -1 ? 'Oculta (-1)' : (variante.posicion === 0 ? 'Principal' : `Pos. ${variante.posicion + 1}`)}
                                                    </span>
                                                </div>
                                                <h4 class={`text-sm font-bold truncate ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                                                    {variante.nombre}
                                                </h4>
                                                <p class="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-2">
                                                    Stock: {variante.stock}
                                                    {variante.precio ? (
                                                        <span class="font-bold text-slate-700">
                                                            · ${(Number(variante.precio) / 100).toLocaleString('es-CO')}
                                                        </span>
                                                    ) : null}
                                                </p>
                                            </div>
                                            <ChevronRight size={18} class={`${isSelected ? 'text-brand-500' : 'text-slate-300'}`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right Area: Selected Variant Details */}
                    <div class="lg:col-span-8">
                        {currentVariant ? (
                            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                {/* Variant Header */}
                                <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div class="flex items-center gap-3 mb-1">
                                            <h3 class="text-xl font-bold text-slate-800">{currentVariant.nombre}</h3>
                                            <span class={`text-[10px] font-bold px-2 py-0.5 rounded ${currentVariant.posicion === -1 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {currentVariant.posicion === -1 ? 'Oculta (-1)' : (currentVariant.posicion === 0 ? 'Principal' : `Posición ${currentVariant.posicion + 1}`)}
                                            </span>
                                        </div>
                                        <p class="text-sm font-medium text-slate-500 flex items-center gap-2">
                                            ID: <span class="font-mono text-xs">{currentVariant.id}</span>
                                            · Insertado: {new Date(currentVariant.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div class="flex gap-4">
                                        <div class="text-right">
                                            <p class="text-xs font-bold text-slate-400 tracking-widest uppercase">Stock</p>
                                            <p class={`text-lg font-black ${Number(currentVariant.stock) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {currentVariant.stock} <span class="text-sm font-medium opacity-70">uds</span>
                                            </p>
                                        </div>
                                        <div class="w-px bg-slate-200" />
                                        <div class="text-right">
                                            <p class="text-xs font-bold text-slate-400 tracking-widest uppercase">Precio Actual</p>
                                            <p class="text-lg font-black text-brand-600">
                                                ${(Number(currentVariant.precio) / 100).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Body Information */}
                                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                                    {/* Characteristics */}
                                    <div class="space-y-6">
                                        {currentVariant.descripcion && (
                                            <div>
                                                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Tag size={14} /> Descripción Larga
                                                </h4>
                                                <p class="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    {currentVariant.descripcion}
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Atributos Extra</h4>
                                            {currentVariant.caracteristicas && Object.keys(currentVariant.caracteristicas).length > 0 ? (
                                                <ul class="space-y-2">
                                                    {Object.entries(currentVariant.caracteristicas).map(([key, value]: any) => (
                                                        <li key={key} class="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                            <span class="font-bold text-slate-700 capitalize">{key}</span>
                                                            <span class="font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">{value}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p class="text-sm font-medium text-slate-400 italic">No hay características técnicas listadas.</p>
                                            )}
                                        </div>

                                        <div>
                                            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Análisis</h4>
                                            <div class="flex items-center gap-6">
                                                <div class="flex py-3 px-5 rounded-xl border border-slate-100 bg-white shadow-sm flex-col">
                                                    <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Visitas/Ventas</span>
                                                    <span class="text-xl font-black text-slate-800">{currentVariant.ventas || 0}</span>
                                                </div>
                                                <div class="flex py-3 px-5 rounded-xl border border-slate-100 bg-white shadow-sm flex-col">
                                                    <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Posición Lista</span>
                                                    <span class={`text-xl font-black ${currentVariant.posicion === -1 ? 'text-amber-500' : 'text-slate-800'}`}>
                                                        {currentVariant.posicion === -1 ? '-1 (Oculto)' : `#${currentVariant.posicion + 1}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media Gallery */}
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <ImageIcon size={14} /> Galería Multimedia
                                        </h4>

                                        {currentVariant.imagenes && currentVariant.imagenes.length > 0 ? (
                                            <div class="grid grid-cols-2 gap-3">
                                                {currentVariant.imagenes.map((img: string, i: number) => (
                                                    <a
                                                        key={img}
                                                        href={getMinioUrl(img, 'productos')}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group relative block cursor-pointer"
                                                    >
                                                        <img
                                                            src={getMinioUrl(img, 'productos')}
                                                            alt={`Imagen ${i + 1}`}
                                                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div class="absolute inset-x-0 bottom-0 bg-slate-900/80 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                                            <p class="text-[10px] font-mono text-white/90 truncate">{img}</p>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <div class="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                                                <ImageIcon size={32} class="mb-2 opacity-50" />
                                                <p class="text-sm font-medium">Esta variante no tiene imágenes</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div class="h-full min-h-[400px] border border-slate-200 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                <Package size={48} class="mb-4 opacity-50" />
                                <h3 class="text-lg font-bold text-slate-600 mb-1">Selecciona una Variante</h3>
                                <p class="text-sm font-medium text-slate-500 max-w-sm text-center">Haz clic en alguna de las opciones del panel izquierdo para visualizar su información completa y galería de imágenes.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}
