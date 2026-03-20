import { useState, useEffect } from 'preact/hooks';
import { Package, Image as ImageIcon, Plus, Trash2, Save, X, ChevronDown, UploadCloud, Tag, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-preact';
import { useNavigate, useParams } from 'react-router-dom';
import { productsApi } from '../api';
import { showToast } from '../signals';
import { getMinioUrl } from '../utils/minio';
import { AdminLayout } from '../components/AdminLayout';

interface VarianteLocal {
    idLocal: string;
    idBackend?: string;
    nombre: string;
    descripcion: string;
    caracteristicas: { clave: string, valor: string }[];
    imagenesExistentes: string[];
    imagenesNuevas: File[];
    imagenesPreview: string[];
    stock: string;
    precio: string;
    visibilidad: boolean;
    posicion: number;
    ventas: number;
}

export function EditProductPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data load state
    const [loadingData, setLoadingData] = useState(true);

    // Product Main Details
    const [visibilidad, setVisibilidad] = useState<boolean>(true);
    const [idCategoria, setIdCategoria] = useState<string>('');
    const [idMarca, setIdMarca] = useState<string>('');

    // Variants List
    const [variantes, setVariantes] = useState<VarianteLocal[]>([]);
    const [deletedVariants, setDeletedVariants] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Elements Data
    const [categorias, setCategorias] = useState<any[]>([]);
    const [marcas, setMarcas] = useState<any[]>([]);

    // --- Data Fetching ---
    useEffect(() => {
        if (!id) return;

        Promise.all([
            productsApi.getProductById(id),
            productsApi.getElements()
        ])
            .then(([resProd, resElem]) => {
                const product = resProd.data;

                // Set Elements
                setCategorias(resElem.data.categorias || []);
                setMarcas(resElem.data.marcas || []);

                // Set Product Stats
                setVisibilidad(product.visibilidad);
                setIdCategoria(product.id_categoria || '');
                setIdMarca(product.id_marca || '');

                const loadedVariantes = (product.variantes || [])
                    .map((v: any, index: number) => {
                        const caracArray = [];
                        if (v.caracteristicas) {
                            for (const [clave, valor] of Object.entries(v.caracteristicas)) {
                                caracArray.push({ clave, valor: valor as string });
                            }
                        }

                        const imagenesExistentes = v.imagenes || [];
                        const imagenesPreview = imagenesExistentes.map((imgName: string) => getMinioUrl(imgName, 'productos'));

                        return {
                            idLocal: Math.random().toString(36).substring(7),
                            idBackend: v.id,
                            nombre: v.nombre || '',
                            descripcion: v.descripcion || '',
                            caracteristicas: caracArray,
                            imagenesExistentes,
                            imagenesNuevas: [],
                            imagenesPreview,
                            stock: (v.stock || 0).toString(),
                            precio: v.precio ? v.precio.toString() : '0',
                            visibilidad: v.visibilidad !== undefined ? v.visibilidad : true,
                            posicion: v.posicion !== undefined ? v.posicion : index,
                            ventas: parseInt(v.ventas || '0', 10)
                        };
                    })
                    .sort((a: any, b: any) => {
                        if (a.posicion === -1) return 1;
                        if (b.posicion === -1) return -1;
                        return a.posicion - b.posicion;
                    });

                setVariantes(loadedVariantes);
                setLoadingData(false);
            })
            .catch((err) => {
                console.error(err);
                showToast("Error al cargar el producto o elementos", "error");
                navigate('/productos');
            });
    }, [id]);


    // --- Variant Handlers ---
    const addVariante = () => {
        setVariantes([...variantes, {
            idLocal: Math.random().toString(36).substring(7),
            nombre: `Variante ${variantes.length + 1}`,
            descripcion: '',
            caracteristicas: [],
            imagenesExistentes: [],
            imagenesNuevas: [],
            imagenesPreview: [],
            stock: '1',
            precio: '0',
            visibilidad: true,
            posicion: variantes.length,
            ventas: 0
        }]);
    };

    const removeVariante = (idLocal: string) => {
        if (variantes.length === 1) {
            showToast('El producto debe tener al menos una variante.', 'warning');
            return;
        }

        const varToRemove = variantes.find(v => v.idLocal === idLocal);

        // If it's saved in the backend, track its deletion
        if (varToRemove?.idBackend) {
            setDeletedVariants([...deletedVariants, varToRemove.idBackend]);
        }

        // Cleanup local blob URLs
        varToRemove?.imagenesNuevas.forEach((_, idx) => {
            // Need to map the preview correctly, object urls are appended at the end
            const previewIndex = varToRemove.imagenesExistentes.length + idx;
            URL.revokeObjectURL(varToRemove.imagenesPreview[previewIndex]);
        });

        setVariantes(variantes.filter(v => v.idLocal !== idLocal));
    };

    const updateVariante = (idLocal: string, field: keyof VarianteLocal, value: any) => {
        setVariantes(variantes.map(v =>
            v.idLocal === idLocal ? { ...v, [field]: value } : v
        ));
    };

    const moveVariante = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newVariantes = [...variantes];
            [newVariantes[index - 1], newVariantes[index]] = [newVariantes[index], newVariantes[index - 1]];
            newVariantes.forEach((v, i) => v.posicion = i);
            setVariantes(newVariantes);
        } else if (direction === 'down' && index < variantes.length - 1) {
            const newVariantes = [...variantes];
            [newVariantes[index + 1], newVariantes[index]] = [newVariantes[index], newVariantes[index + 1]];
            newVariantes.forEach((v, i) => v.posicion = i);
            setVariantes(newVariantes);
        }
    };

    // --- Characteristics Handlers ---
    const addCharacteristic = (idLocal: string) => {
        setVariantes(variantes.map(v => {
            if (v.idLocal === idLocal) {
                return { ...v, caracteristicas: [...v.caracteristicas, { clave: '', valor: '' }] };
            }
            return v;
        }));
    };

    const updateCharacteristic = (idLocal: string, index: number, field: 'clave' | 'valor', value: string) => {
        setVariantes(variantes.map(v => {
            if (v.idLocal === idLocal) {
                const newCarac = [...v.caracteristicas];
                newCarac[index] = { ...newCarac[index], [field]: value };
                return { ...v, caracteristicas: newCarac };
            }
            return v;
        }));
    };

    const removeCharacteristic = (idLocal: string, index: number) => {
        setVariantes(variantes.map(v => {
            if (v.idLocal === idLocal) {
                return { ...v, caracteristicas: v.caracteristicas.filter((_, i) => i !== index) };
            }
            return v;
        }));
    };

    // --- Image Upload Handlers ---
    const handleImageSelect = (idLocal: string, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));

        setVariantes(variantes.map(v => {
            if (v.idLocal === idLocal) {
                const totalCurrent = v.imagenesExistentes.length + v.imagenesNuevas.length;
                const canAdd = 8 - totalCurrent;
                const filesToAdd = newFiles.slice(0, canAdd);
                const previewsToAdd = newPreviews.slice(0, canAdd);

                if (newFiles.length > canAdd) {
                    showToast('Se limitaron las imágenes al máximo de 8 por variante', 'warning');
                }

                return {
                    ...v,
                    imagenesNuevas: [...v.imagenesNuevas, ...filesToAdd],
                    imagenesPreview: [...v.imagenesPreview, ...previewsToAdd]
                };
            }
            return v;
        }));
    };

    const removeImage = (idLocal: string, indexToRemove: number) => {
        setVariantes(variantes.map(v => {
            if (v.idLocal === idLocal) {
                const exCount = v.imagenesExistentes.length;

                if (indexToRemove < exCount) {
                    // It's an existing image
                    return {
                        ...v,
                        imagenesExistentes: v.imagenesExistentes.filter((_, i) => i !== indexToRemove),
                        imagenesPreview: v.imagenesPreview.filter((_, i) => i !== indexToRemove)
                    };
                } else {
                    // It's a new local image
                    const newIndex = indexToRemove - exCount;
                    URL.revokeObjectURL(v.imagenesPreview[indexToRemove]);

                    return {
                        ...v,
                        imagenesNuevas: v.imagenesNuevas.filter((_, i) => i !== newIndex),
                        imagenesPreview: v.imagenesPreview.filter((_, i) => i !== indexToRemove)
                    };
                }
            }
            return v;
        }));
    };

    // --- Submit Flow ---
    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        // Basic Validation
        let hasErrors = false;
        variantes.forEach(v => {
            if (!v.nombre.trim()) hasErrors = true;
            if (Number(v.precio) < 0) hasErrors = true;
            if (Number(v.stock) < 0) hasErrors = true;
        });

        if (hasErrors) {
            showToast('Por favor, completa los campos requeridos en todas las variantes.', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            showToast('Iniciando proceso de actualización...', 'info');

            // 1. Delete removed variants from backend
            for (const idToDelete of deletedVariants) {
                await productsApi.deleteVariant(idToDelete);
            }

            // 2. Calculate sequential positions for visible variants
            let posCounter = 0;
            const variantesConPosicion = variantes.map(v => ({
                ...v,
                finalPosicion: v.visibilidad ? posCounter++ : -1
            }));

            // 3. Upload new Images for each variant and format payload
            const finalVariantesParaBackend = await Promise.all(variantesConPosicion.map(async (vari) => {
                let nombresNuevos: string[] = [];

                if (vari.imagenesNuevas.length > 0) {
                    const formData = new FormData();
                    vari.imagenesNuevas.forEach(file => {
                        formData.append('imagenes', file);
                    });

                    // Call backend to get 'tempo-...' names
                    const uploadRes = await productsApi.uploadImages(formData, 'productos');
                    nombresNuevos = uploadRes.data || [];
                }

                const caracteristicasObj: Record<string, string> = {};
                vari.caracteristicas.forEach(c => {
                    if (c.clave.trim() && c.valor.trim()) {
                        caracteristicasObj[c.clave.trim()] = c.valor.trim();
                    }
                });

                return {
                    id: vari.idBackend, // undefined if it's a new variant
                    nombre: vari.nombre,
                    descripcion: vari.descripcion,
                    caracteristicas: caracteristicasObj,
                    imagenes: [...vari.imagenesExistentes, ...nombresNuevos],
                    stock: Number(vari.stock),
                    precio: Number(vari.precio),
                    visibilidad: vari.visibilidad,
                    posicion: vari.finalPosicion
                };
            }));

            // 4. Construct final payload
            const productPayload = {
                id: id,
                id_categoria: idCategoria || null,
                id_marca: idMarca || null,
                visibilidad: visibilidad,
                variantes: finalVariantesParaBackend,
                carpetaImagenes: 'productos'
            };

            showToast('Imágenes procesadas. Guardando cambios...', 'info');

            // 5. Send final patch request
            await productsApi.updateProduct(productPayload);

            showToast('¡Producto actualizado exitosamente!', 'success');

            // Redirect back to list
            setTimeout(() => {
                navigate('/productos');
            }, 1000);

        } catch (error: any) {
            console.error("Submit Error:", error);
            const errData = error.response?.data?.error;
            let errMsg = 'Ocurrió un error al actualizar el producto.';
            if (typeof errData === 'string') {
                errMsg = errData;
            } else if (Array.isArray(errData) && errData.length > 0) {
                errMsg = errData[0].message || errMsg;
            }
            showToast(errMsg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingData) {
        return (
            <AdminLayout title="Editar Producto">
                <div class="min-h-[50vh] flex flex-col items-center justify-center">
                    <div class="w-10 h-10 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin mb-4" />
                    <p class="text-slate-500 font-medium">Cargando producto a editar...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Editar Producto">
            <div class={`p-8 max-w-5xl mx-auto w-full space-y-8 animate-fade-in pb-32 ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}>

                <div class="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/productos')}
                        class="p-2 bg-white border border-slate-200 text-slate-500 hover:text-brand-600 hover:border-brand-300 rounded-xl transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                                <Package size={20} class="text-amber-600" />
                            </div>
                            Editar Producto
                        </h2>
                        <p class="text-slate-500 mt-1 font-medium ml-14">Modifica los detalles, controla stock y gestiona variantes.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} class="space-y-8">

                    {/* General Information Section */}
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Package size={18} class="text-slate-400" />
                            Información General
                        </h3>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="space-y-2">
                                <label class="text-sm font-bold text-slate-700">Estado de Visibilidad</label>
                                <select
                                    value={visibilidad.toString()}
                                    onChange={(e: any) => setVisibilidad(e.target.value === 'true')}
                                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 appearance-none text-slate-700"
                                >
                                    <option value="true">Público (Visible en tienda)</option>
                                    <option value="false">Oculto (Borrador)</option>
                                </select>
                            </div>

                            <div class="space-y-2">
                                <label class="text-sm font-bold text-slate-700">Categoría (Opcional)</label>
                                <div class="relative">
                                    <select
                                        value={idCategoria}
                                        onChange={(e: any) => setIdCategoria(e.target.value)}
                                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 appearance-none text-slate-700"
                                    >
                                        <option value="">Sin Categoría</option>
                                        {categorias.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div class="space-y-2">
                                <label class="text-sm font-bold text-slate-700">Marca (Opcional)</label>
                                <div class="relative">
                                    <select
                                        value={idMarca}
                                        onChange={(e: any) => setIdMarca(e.target.value)}
                                        class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 appearance-none text-slate-700"
                                    >
                                        <option value="">Sin Marca</option>
                                        {marcas.map(marca => (
                                            <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Variants Section */}
                    <div class="space-y-6">
                        <div class="flex items-center justify-between px-2">
                            <h3 class="text-lg font-bold text-slate-800">Variantes</h3>
                            <button
                                type="button"
                                onClick={addVariante}
                                class="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                                <Plus size={16} />
                                Añadir Variante
                            </button>
                        </div>

                        {variantes.map((variante, index) => (
                            <div key={variante.idLocal} class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative group">

                                <div class="absolute top-4 right-4 flex items-center gap-2 z-10">
                                    <button
                                        type="button"
                                        onClick={() => moveVariante(index, 'up')}
                                        title="Subir posición"
                                        disabled={index === 0}
                                        class={`p-2 rounded-lg transition-colors ${index === 0 ? 'text-slate-300' : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100 cursor-pointer'}`}
                                    >
                                        <ArrowUp size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveVariante(index, 'down')}
                                        title="Bajar posición"
                                        disabled={index === variantes.length - 1}
                                        class={`p-2 rounded-lg transition-colors ${index === variantes.length - 1 ? 'text-slate-300' : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100 cursor-pointer'}`}
                                    >
                                        <ArrowDown size={18} />
                                    </button>

                                    {variantes.length > 1 && (
                                        <div class="w-px h-5 bg-slate-200 mx-1"></div>
                                    )}

                                    {variantes.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (variante.ventas > 0) {
                                                    showToast('No se puede eliminar una variante que ya tiene ventas, para proteger el sistema.', 'error');
                                                    return;
                                                }
                                                removeVariante(variante.idLocal);
                                            }}
                                            disabled={variante.ventas > 0}
                                            class={`p-2 rounded-lg transition-colors ${variante.ventas > 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer'}`}
                                            title={variante.ventas > 0 ? "No se puede eliminar porque ya tiene ventas" : (variante.idBackend ? "Eliminar variante permanentemente" : "Descartar variante")}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-3 items-center">
                                    <h4 class="font-bold text-slate-800 tracking-tight">
                                        {index === 0 ? 'Variante Principal' : `Variante (Posición ${index + 1})`}
                                    </h4>
                                    {variante.idBackend ?
                                        <span class="text-[10px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-500">Persistente</span> :
                                        <span class="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">Nueva Adición</span>
                                    }
                                    {!variante.visibilidad && (
                                        <span class="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded ml-auto">Oculta (Pos. -1)</span>
                                    )}
                                </div>

                                <div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Variant Details */}
                                    <div class="space-y-5">
                                        <div class="space-y-2">
                                            <label class="text-sm font-bold text-slate-700">Nombre de la Variante <span class="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={variante.nombre}
                                                onInput={(e: any) => updateVariante(variante.idLocal, 'nombre', e.target.value)}
                                                placeholder="Ej. Tenis Nike Air - Talla 40 - Azul"
                                                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 transition-all"
                                            />
                                        </div>

                                        <div class="space-y-2">
                                            <label class="text-sm font-bold text-slate-700">Descripción Larga</label>
                                            <textarea
                                                rows={3}
                                                value={variante.descripcion}
                                                onInput={(e: any) => updateVariante(variante.idLocal, 'descripcion', e.target.value)}
                                                placeholder="Detalles sobre materiales, origen, etc."
                                                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 transition-all resize-none"
                                            />
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div class="space-y-2">
                                                <label class="text-sm font-bold text-slate-700">Precio (COP) <span class="text-red-500">*</span></label>
                                                <div class="relative">
                                                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={variante.precio === '0' || !variante.precio ? '' : new Intl.NumberFormat('es-CO').format(Number(variante.precio) / 100)}
                                                        onInput={(e: any) => {
                                                            const rawValue = e.target.value.replace(/\D/g, '');
                                                            const cents = rawValue ? (parseInt(rawValue, 10) * 100).toString() : '0';
                                                            updateVariante(variante.idLocal, 'precio', cents);
                                                        }}
                                                        placeholder="0"
                                                        class="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div class="space-y-2">
                                                <label class="text-sm font-bold text-slate-700">Stock Inicial <span class="text-red-500">*</span></label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    required
                                                    value={variante.stock}
                                                    onInput={(e: any) => updateVariante(variante.idLocal, 'stock', e.target.value)}
                                                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 transition-all"
                                                />
                                            </div>
                                            <div class="space-y-2">
                                                <label class="text-sm font-bold text-slate-700">Visibilidad</label>
                                                <select
                                                    value={variante.visibilidad.toString()}
                                                    onChange={(e: any) => updateVariante(variante.idLocal, 'visibilidad', e.target.value === 'true')}
                                                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 appearance-none text-slate-700 transition-all"
                                                >
                                                    <option value="true">Público</option>
                                                    <option value="false">Oculto</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Characteristics Table */}
                                        <div class="space-y-3 pt-2">
                                            <div class="flex items-center justify-between">
                                                <label class="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    <Tag size={16} class="text-slate-400" />
                                                    Atributos Extra (Opcional)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => addCharacteristic(variante.idLocal)}
                                                    class="text-xs font-bold text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-lg hover:bg-brand-100 hover:border-brand-200 transition-colors flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Plus size={14} /> Añadir Atributo
                                                </button>
                                            </div>

                                            {variante.caracteristicas.length === 0 ? (
                                                <p class="text-xs font-medium text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center">Sin atributos extra listados. Usa este espacio para color, material, talla, etc.</p>
                                            ) : (
                                                <div class="space-y-2">
                                                    {variante.caracteristicas.map((carac, idx) => (
                                                        <div key={idx} class="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Ej. Color"
                                                                value={carac.clave}
                                                                onInput={(e: any) => updateCharacteristic(variante.idLocal, idx, 'clave', e.target.value)}
                                                                class="w-2/5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Ej. Rojo Pasión"
                                                                value={carac.valor}
                                                                onInput={(e: any) => updateCharacteristic(variante.idLocal, idx, 'valor', e.target.value)}
                                                                class="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-brand-500"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeCharacteristic(variante.idLocal, idx)}
                                                                class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Eliminar atributo"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Image Uploader */}
                                    <div class="space-y-4">
                                        <label class="text-sm font-bold text-slate-700">Fotografías (Máx 8)</label>

                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {/* Previews Combined */}
                                            {variante.imagenesPreview.map((url, imgIdx) => (
                                                <div key={imgIdx} class="aspect-square rounded-xl border border-slate-200 overflow-hidden relative group">
                                                    <img src={url} class="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(variante.idLocal, imgIdx)}
                                                        class="absolute inset-x-0 bottom-0 bg-red-600/90 text-white p-1 flex justify-center translate-y-full group-hover:translate-y-0 transition-transform cursor-pointer"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Upload Button */}
                                            {(variante.imagenesExistentes.length + variante.imagenesNuevas.length) < 8 && (
                                                <label class="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-brand-300 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-brand-500 relative">
                                                    <UploadCloud size={24} class="mb-1" />
                                                    <span class="text-[10px] font-bold uppercase tracking-wider">Subir</span>
                                                    <input
                                                        type="file"
                                                        accept="image/png, image/jpeg, image/webp"
                                                        multiple
                                                        onChange={(e: any) => handleImageSelect(variante.idLocal, e.target.files)}
                                                        class="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                        <p class="text-xs text-slate-500 font-medium">Formato recomendado: JPG, PNG o WEBP. Proporción 1:1.</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fixed Bottom Action Bar */}
                    <div class="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-40 flex justify-end gap-3 shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.05)]">
                        <button
                            type="button"
                            onClick={() => navigate(`/productos/${id}`)}
                            class="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            class={`flex items-center gap-2 px-8 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-md hover:shadow-brand-500/30 transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-brand-500'}`}
                        >
                            {isSubmitting ? (
                                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {isSubmitting ? 'Guardando cambios...' : 'Guardar Cambios'}
                        </button>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}
