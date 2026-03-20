import { Monitor, PlusCircle, LayoutTemplate, Eye, EyeOff, LayoutPanelTop, GripVertical, ArrowUp, ArrowDown, Edit, Trash2, Save, X, Plus, Search, Package } from 'lucide-preact';
import { useState, useEffect } from 'preact/hooks';
import { AdminLayout } from '../components/AdminLayout';
import { landingPageApi, productsApi } from '../api';
import { getMinioUrl } from '../utils/minio';
import { showToast } from '../signals';

interface LandingPageElement {
    id: string;
    titulo: string;
    descripcion: string;
    array_variantes: string[];
    posicion: number;
    visibilidad: boolean;
}

export function LandingPageSettings() {
    const [elementos, setElementos] = useState<LandingPageElement[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [elementToDelete, setElementToDelete] = useState<LandingPageElement | null>(null);

    // Form Data
    const [formData, setFormData] = useState<Partial<LandingPageElement>>({
        titulo: '',
        descripcion: '',
        array_variantes: [],
        visibilidad: true
    });
    // Visual detailed array to map UI cards instead of just IDs
    const [detailedVariantes, setDetailedVariantes] = useState<any[]>([]);

    const [tempVariantId, setTempVariantId] = useState('');

    // Search Logic
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const fetchElementos = async () => {
        try {
            setLoading(true);
            const res = await landingPageApi.getAll();
            const data = Array.isArray(res.data) ? res.data : [];
            // Sort by position
            const sorted = data.sort((a, b) => {
                if (a.posicion === -1) return 1;
                if (b.posicion === -1) return -1;
                return a.posicion - b.posicion;
            });
            setElementos(sorted);
        } catch (error) {
            console.error("Error fetching landing page elements:", error);
            showToast('Error al cargar los elementos de la Landing Page', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchElementos();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setSearchLoading(true);
                const res = await productsApi.getProducts({ search: searchQuery, limit: 10 });
                setSearchResults(res.data.data || []);
                setShowDropdown(true);
            } catch (err) {
                console.error("Error buscando productos:", err);
            } finally {
                setSearchLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // --- Order Logic ---
    const reorderAndSave = async (currentElements: LandingPageElement[]) => {
        // Recalculate positions based on visibility
        let posCounter = 0;
        const mappedElements = currentElements.map(v => ({
            ...v,
            posicion: v.visibilidad ? posCounter++ : -1
        }));

        setElementos(mappedElements); // Optimistic UI update

        try {
            // Only update elements whose position actually changed to minimize requests
            const updates = mappedElements.filter((el, idx) => {
                const original = elementos.find(e => e.id === el.id);
                return !original || original.posicion !== el.posicion;
            });

            if (updates.length > 0) {
                await Promise.all(updates.map(el =>
                    landingPageApi.update(el.id, { posicion: el.posicion })
                ));
            }
        } catch (error) {
            console.error("Error updating positions:", error);
            showToast('Error al actualizar las posiciones', 'error');
            fetchElementos(); // Revert on failure
        }
    };

    const moveElement = async (index: number, direction: 'up' | 'down') => {
        const newElements = [...elementos];
        if (direction === 'up' && index > 0) {
            [newElements[index - 1], newElements[index]] = [newElements[index], newElements[index - 1]];
        } else if (direction === 'down' && index < newElements.length - 1) {
            [newElements[index + 1], newElements[index]] = [newElements[index], newElements[index + 1]];
        } else {
            return;
        }

        await reorderAndSave(newElements);
        showToast('Posiciones actualizadas correctamente', 'success');
    };

    const toggleVisibility = async (element: LandingPageElement) => {
        try {
            const newVis = !element.visibilidad;
            // Optimistic update for the clicked element
            const updatedElements = elementos.map(e =>
                e.id === element.id ? { ...e, visibilidad: newVis } : e
            );

            // First update visibility
            await landingPageApi.update(element.id, { visibilidad: newVis });

            // Then reorder everything to close gaps
            await reorderAndSave(updatedElements);

            showToast(`Sección ${newVis ? 'publicada' : 'ocultada'} exitosamente`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al cambiar la visibilidad', 'error');
            fetchElementos();
        }
    };

    // --- Modal Handlers ---
    const openCreateModal = () => {
        setModalMode('create');
        setFormData({
            titulo: '',
            descripcion: '',
            array_variantes: [],
            visibilidad: true
        });
        setDetailedVariantes([]);
        setTempVariantId('');
        setIsModalOpen(true);
    };

    const openEditModal = async (element: LandingPageElement) => {
        setModalMode('edit');
        setFormData({ ...element });
        setTempVariantId('');
        setIsModalOpen(true);

        // Fetch details of existing variants to render them visually
        if (element.array_variantes && element.array_variantes.length > 0) {
            try {
                // Initial fallback while loading
                const fallbackDetails = element.array_variantes.map(id => ({
                    id: id,
                    nombre: 'Cargando datos...',
                    precio: null,
                    imagenes: []
                }));
                setDetailedVariantes(fallbackDetails);

                // Fetch actual data using a loop or a special lookup if exists
                const loadedDetails = await Promise.all(element.array_variantes.map(async (vid) => {
                    try {
                        const res = await productsApi.getProducts({ search: vid, limit: 1 });
                        if (res.data && res.data.data && res.data.data.length > 0) {
                            const product = res.data.data[0];
                            const variant = product.variantes?.find((v: any) => v.id === vid);
                            if (variant) {
                                return { ...variant, productName: product.variantes[0]?.nombre || 'Producto' };
                            }
                        }
                        return { id: vid, nombre: 'Variante no encontrada', imagenes: [] };
                    } catch (err) {
                        return { id: vid, nombre: 'Error al cargar', imagenes: [] };
                    }
                }));

                // Update detailed list merging with any manually added items in the meantime
                setDetailedVariantes(prev => {
                    return prev.map(p => {
                        const match = loadedDetails.find(l => l.id === p.id);
                        return match ? match : p;
                    });
                });

            } catch (err) {
                console.error("Error loading variant details", err);
            }
        } else {
            setDetailedVariantes([]);
        }
    };

    const closeModals = () => {
        setIsModalOpen(false);
        setDeleteModalOpen(false);
        setElementToDelete(null);
    };

    const handleAddVariant = (detailedObj: any = null) => {
        const idToAdd = detailedObj ? detailedObj.id : tempVariantId.trim();
        if (!idToAdd) return;

        if (!formData.array_variantes?.includes(idToAdd)) {
            setFormData({
                ...formData,
                array_variantes: [...(formData.array_variantes || []), idToAdd]
            });

            if (detailedObj) {
                setDetailedVariantes([...detailedVariantes, detailedObj]);
            } else {
                setDetailedVariantes([...detailedVariantes, { id: idToAdd, nombre: 'Añadido manualmente', imagenes: [] }]);
            }
        }
        setTempVariantId('');
    };

    const handleRemoveVariant = (variantToRemove: string) => {
        setFormData({
            ...formData,
            array_variantes: formData.array_variantes?.filter(v => v !== variantToRemove)
        });
        setDetailedVariantes(detailedVariantes.filter(v => v.id !== variantToRemove));
    };

    // --- Save Submit ---
    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        if (!formData.titulo?.trim()) {
            showToast('El título es obligatorio', 'warning');
            return;
        }

        try {
            setIsSubmitting(true);
            if (modalMode === 'create') {
                // Determine initial order (add to end)
                const newElements = [
                    ...elementos,
                    {
                        ...formData as LandingPageElement,
                        id: 'temp-id', // Backend will provide real UUID
                    }
                ];

                await landingPageApi.create({
                    titulo: formData.titulo.trim(),
                    descripcion: formData.descripcion?.trim() || '',
                    array_variantes: formData.array_variantes || [],
                    visibilidad: formData.visibilidad!,
                    posicion: 999 // Temporary high value, will be reordered
                });

                // Re-fetch and re-order everything to be sure
                const res = await landingPageApi.getAll();
                const fetched = Array.isArray(res.data) ? res.data : [];
                await reorderAndSave(fetched);

                showToast('Sección creada exitosamente', 'success');
            } else if (modalMode === 'edit' && formData.id) {
                await landingPageApi.update(formData.id, {
                    titulo: formData.titulo.trim(),
                    descripcion: formData.descripcion?.trim() || '',
                    array_variantes: formData.array_variantes || [],
                    visibilidad: formData.visibilidad
                });

                // Re-fetch to update state and potentially reorder if visibility changed
                const res = await landingPageApi.getAll();
                const fetched = Array.isArray(res.data) ? res.data : [];
                await reorderAndSave(fetched);

                showToast('Sección actualizada exitosamente', 'success');
            }
            closeModals();
        } catch (error) {
            console.error(error);
            showToast(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} la sección`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Delete Submit ---
    const confirmDelete = async () => {
        if (!elementToDelete) return;

        try {
            setIsSubmitting(true);
            await landingPageApi.delete(elementToDelete.id);

            // Filter out the deleted element and reorder remaining ones
            const remainingElements = elementos.filter(e => e.id !== elementToDelete.id);
            await reorderAndSave(remainingElements);

            showToast('Sección eliminada exitosamente', 'success');
            closeModals();
        } catch (error) {
            console.error(error);
            showToast('Error al eliminar la sección', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <AdminLayout title="Contenido de Landing Page">
            <div class="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20 animate-fade-in relative">
                {/* Header Area */}
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-md">
                                <Monitor size={20} class="text-white" />
                            </div>
                            Editor de Secciones
                        </h2>
                        <p class="text-slate-500 mt-1 font-medium ml-14">Administra las distintas secciones estáticas y dinámicas de la página de inicio.</p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button
                            onClick={openCreateModal}
                            class="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-500 transition-all shadow-md hover:shadow-lg hover:shadow-brand-500/30 cursor-pointer"
                        >
                            <PlusCircle size={18} />
                            Añadir Sección
                        </button>
                    </div>
                </div>

                {/* Content Table */}
                <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden glass-panel shadow-sm relative min-h-[400px]">
                    {loading ? (
                        <div class="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                            <div class="w-10 h-10 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin"></div>
                        </div>
                    ) : null}

                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 border-b border-slate-200">
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-32 text-center">Orden</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Sección</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Descripción</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Estado</th>
                                    <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                {elementos.length > 0 ? (
                                    elementos.map((item, index) => (
                                        <tr key={item.id} class="hover:bg-slate-50/80 transition-colors group">
                                            {/* Orden Handler */}
                                            <td class="px-6 py-4 text-center align-middle">
                                                <div class="flex items-center justify-center gap-1.5 opacity-50 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => moveElement(index, 'up')}
                                                        disabled={index === 0 || !item.visibilidad}
                                                        class={`p-1 rounded transition-colors ${index === 0 || !item.visibilidad ? 'text-slate-200' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 cursor-pointer'}`}
                                                    >
                                                        <ArrowUp size={16} />
                                                    </button>
                                                    <span class="text-slate-600 font-bold bg-slate-100 w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 shadow-sm text-xs">
                                                        {item.posicion === -1 ? '-' : item.posicion + 1}
                                                    </span>
                                                    <button
                                                        onClick={() => moveElement(index, 'down')}
                                                        disabled={index === elementos.length - 1 || !item.visibilidad}
                                                        class={`p-1 rounded transition-colors ${index === elementos.length - 1 || !item.visibilidad ? 'text-slate-200' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 cursor-pointer'}`}
                                                    >
                                                        <ArrowDown size={16} />
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Título e ID */}
                                            <td class="px-6 py-4">
                                                <h4 class="text-sm font-bold text-slate-800 line-clamp-1">{item.titulo}</h4>
                                                <p class="text-[10px] font-medium text-slate-500 mt-1">ID: <span class="font-mono text-slate-400">{item.id.substring(0, 8)}</span> - Variadas: <span class="text-brand-600 font-bold">{item.array_variantes.length}</span></p>
                                            </td>

                                            {/* Descripción */}
                                            <td class="px-6 py-4">
                                                <p class="text-xs font-medium text-slate-500 line-clamp-2 max-w-xs" title={item.descripcion}>
                                                    {item.descripcion || <span class="italic text-slate-400">Sin descripción</span>}
                                                </p>
                                            </td>

                                            {/* Estado de Visibilidad */}
                                            <td class="px-6 py-4 text-center">
                                                <span class={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${item.visibilidad
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                    {item.visibilidad ? 'Público' : 'Oculto'}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td class="px-6 py-4 text-right">
                                                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => toggleVisibility(item)}
                                                        class="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Visibilidad"
                                                    >
                                                        {item.visibilidad ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        class="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer" title="Editar">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setElementToDelete(item);
                                                            setDeleteModalOpen(true);
                                                        }}
                                                        class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Borrar">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (!loading &&
                                    <tr>
                                        <td colSpan={5} class="px-6 py-12 text-center text-slate-500 font-medium">
                                            <div class="flex flex-col items-center justify-center gap-4">
                                                <div class="p-4 bg-slate-100 rounded-full text-slate-400">
                                                    <LayoutTemplate size={32} />
                                                </div>
                                                <div>
                                                    <h4 class="font-bold text-slate-700 text-lg">No hay secciones configuradas</h4>
                                                    <p class="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Comienza añadiendo tu primer panel de ofertas o carrusel interactivo.</p>
                                                </div>
                                                <button onClick={openCreateModal} class="mt-2 btn btn-secondary text-sm px-4 py-2 hover:bg-slate-200 cursor-pointer border border-slate-300 rounded-xl transition-colors">Crear Primera Sección</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- MODAL CREAR / EDITAR --- */}
                {isModalOpen && (
                    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                        <div class="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
                            {/* Header Modal */}
                            <div class="flex items-center justify-between p-6 border-b border-slate-100">
                                <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100">
                                        <LayoutPanelTop size={18} />
                                    </div>
                                    {modalMode === 'create' ? 'Nueva Sección' : 'Editar Sección'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={closeModals}
                                    class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body Modal */}
                            <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
                                <form id="landing-form" onSubmit={handleSubmit} class="space-y-6">

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div class="space-y-2 md:col-span-2">
                                            <label class="text-sm font-bold text-slate-700">Título de la Sección <span class="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.titulo}
                                                onInput={(e: any) => setFormData({ ...formData, titulo: e.target.value })}
                                                placeholder="Ej. Ofertas Especiales"
                                                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 transition-all"
                                            />
                                        </div>

                                        <div class="space-y-2 md:col-span-2">
                                            <label class="text-sm font-bold text-slate-700">Descripción Corta</label>
                                            <textarea
                                                rows={2}
                                                value={formData.descripcion}
                                                onInput={(e: any) => setFormData({ ...formData, descripcion: e.target.value })}
                                                placeholder="Subtítulo o texto descriptivo visible para el cliente."
                                                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 transition-all resize-none"
                                            />
                                        </div>

                                        <div class="space-y-2">
                                            <label class="text-sm font-bold text-slate-700 flex items-center justify-between">
                                                <span>Visibilidad Inicial</span>
                                            </label>
                                            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, visibilidad: true })}
                                                    class={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${formData.visibilidad ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    Público
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, visibilidad: false })}
                                                    class={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${!formData.visibilidad ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    Oculto
                                                </button>
                                            </div>
                                        </div>

                                        <div class="space-y-2 md:col-span-2 relative">
                                            <label class="text-sm font-bold text-slate-700">Explorar y Añadir Variantes de Productos</label>

                                            {/* Search box with autocomplete */}
                                            <div class="relative">
                                                <div class="relative flex-1">
                                                    <Search size={18} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onInput={(e: any) => setSearchQuery(e.target.value)}
                                                        placeholder="Buscar por nombre de producto..."
                                                        class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 transition-all"
                                                    />
                                                </div>

                                                {/* Dropdown Result */}
                                                {(showDropdown && searchQuery.trim().length > 0) && (
                                                    <div class="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                                        {searchLoading ? (
                                                            <div class="p-4 text-center text-slate-500 text-sm font-medium">
                                                                <div class="w-5 h-5 border-2 border-brand-500/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
                                                                Buscando...
                                                            </div>
                                                        ) : searchResults.length === 0 ? (
                                                            <div class="p-4 text-center text-slate-500 text-sm font-medium">No se encontraron productos.</div>
                                                        ) : (
                                                            <div class="divide-y divide-slate-100">
                                                                {searchResults.flatMap(grupo =>
                                                                    (grupo.variantes || []).map((v: any) => {
                                                                        const miniatura = v.imagenes && v.imagenes.length > 0 ? getMinioUrl(v.imagenes[0], 'productos') : '';
                                                                        const isAdded = formData.array_variantes?.includes(v.id);

                                                                        return (
                                                                            <button
                                                                                key={v.id}
                                                                                type="button"
                                                                                disabled={isAdded}
                                                                                onClick={() => {
                                                                                    if (!isAdded) {
                                                                                        handleAddVariant({ ...v, productName: grupo.variantes[0]?.nombre || 'Producto' });
                                                                                        setSearchQuery('');
                                                                                        setShowDropdown(false);
                                                                                    }
                                                                                }}
                                                                                class={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer ${isAdded ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                                                                            >
                                                                                <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                                                    {miniatura ? (
                                                                                        <img src={miniatura} alt={v.nombre} class="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <Package size={16} class="text-slate-400" />
                                                                                    )}
                                                                                </div>
                                                                                <div class="flex-1">
                                                                                    <p class="text-sm font-bold text-slate-800 line-clamp-1">{v.nombre}</p>
                                                                                    <p class="text-xs text-slate-500 font-medium">Variante de: <span class="italic">{grupo.variantes[0]?.nombre || 'Desconocido'}</span></p>
                                                                                    <p class="text-[10px] font-mono text-slate-400 mt-0.5">ID: {v.id.substring(0, 12)}</p>
                                                                                </div>
                                                                                <div class={`text-xs font-bold px-2 py-1 rounded-md border whitespace-nowrap ${isAdded ? 'text-slate-500 bg-slate-100 border-slate-200' : 'text-brand-600 bg-brand-50 border-brand-100'}`}>
                                                                                    {isAdded ? 'Agregado' : '+ Añadir'}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* UI Grid of selected variants */}
                                            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl min-h-[120px]">
                                                {detailedVariantes.length === 0 && (
                                                    <div class="col-span-full text-xs text-slate-400 italic font-medium flex flex-col items-center justify-center py-4">
                                                        <Package size={24} class="mb-2 opacity-50" />
                                                        Sin variantes seleccionadas. Utiliza el buscador arriba.
                                                    </div>
                                                )}
                                                {detailedVariantes.map((variantObj, idx) => {
                                                    const miniatura = variantObj.imagenes && variantObj.imagenes.length > 0 ? getMinioUrl(variantObj.imagenes[0], 'productos') : '';
                                                    const formatPrice = variantObj.precio ? (Number(variantObj.precio) / 100).toLocaleString('es-CO') : null;

                                                    return (
                                                        <div key={variantObj.id} class="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm relative group">
                                                            <div class="absolute -top-2 -left-2 w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm z-10">
                                                                {idx + 1}
                                                            </div>
                                                            <div class="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                                {miniatura ? (
                                                                    <img src={miniatura} alt={variantObj.nombre} class="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Package size={20} class="text-slate-400" />
                                                                )}
                                                            </div>
                                                            <div class="flex-1 min-w-0 pr-6">
                                                                <h4 class="text-xs font-bold text-slate-800 line-clamp-1" title={variantObj.nombre}>{variantObj.nombre}</h4>
                                                                {variantObj.productName && <p class="text-[10px] font-medium text-slate-500 line-clamp-1">{variantObj.productName}</p>}
                                                                <p class="text-[10px] font-mono text-slate-400 mt-1">ID: {variantObj.id.substring(0, 8)}</p>
                                                                {formatPrice && <p class="text-[11px] font-bold text-brand-600 mt-0.5">${formatPrice}</p>}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveVariant(variantObj.id)}
                                                                title="Quitar variante"
                                                                class="absolute top-2 right-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                    </div>
                                </form>
                            </div>

                            {/* Footer Modal */}
                            <div class="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModals}
                                    class="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors border border-transparent cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    form="landing-form"
                                    disabled={isSubmitting}
                                    class={`flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-md hover:shadow-brand-500/30 transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-brand-500'}`}
                                >
                                    {isSubmitting ? (
                                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    {isSubmitting ? 'Guardando...' : 'Guardar Sección'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {deleteModalOpen && elementToDelete && (
                    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
                        <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-full h-1 bg-red-500"></div>

                            <h3 class="text-xl font-bold text-slate-800 mb-2 mt-2">¿Eliminar esta sección?</h3>
                            <p class="text-sm text-slate-500 mb-6">
                                Estás a punto de eliminar la sección <b>"{elementToDelete.titulo}"</b>. Esto quitará el carrusel o panel de la página de inicio. Esta acción no se puede deshacer.
                            </p>

                            <div class="flex justify-end gap-3">
                                <button
                                    onClick={closeModals}
                                    class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isSubmitting}
                                    class="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-md hover:shadow-red-500/30 transition-all cursor-pointer flex items-center justify-center min-w-[120px]"
                                >
                                    {isSubmitting ? <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </div>
        </AdminLayout>
    );
} 
