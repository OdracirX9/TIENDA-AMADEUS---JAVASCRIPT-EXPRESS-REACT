import { useState, useRef, useEffect } from 'preact/hooks';
import { Package, Image as ImageIcon, Plus, Trash2, Save, X, ChevronDown, UploadCloud, Tag, ArrowUp, ArrowDown } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api';
import { showToast } from '../signals';
import { AdminLayout } from '../components/AdminLayout';

interface VarianteLocal {
    idLocal: string;
    nombre: string;
    descripcion: string;
    caracteristicas: { clave: string, valor: string }[];
    imagenes: File[];
    imagenesPreview: string[];
    stock: string;
    precio: string;
    visibilidad: boolean;
    posicion: number;
}

export function CreateProductPage() {
    const navigate = useNavigate();

    // Product Main Details
    const [visibilidad, setVisibilidad] = useState<boolean>(true);
    const [idCategoria, setIdCategoria] = useState<string>('');
    const [idMarca, setIdMarca] = useState<string>('');

    // Elements Data
    const [categorias, setCategorias] = useState<any[]>([]);
    const [marcas, setMarcas] = useState<any[]>([]);

    useEffect(() => {
        productsApi.getElements()
            .then(res => {
                setCategorias(res.data.categorias || []);
                setMarcas(res.data.marcas || []);
            })
            .catch(err => {
                console.error("Error cargando marcas y categorias", err);
            });
    }, []);

    // Variants List
    const [variantes, setVariantes] = useState<VarianteLocal[]>([
        {
            idLocal: Math.random().toString(36).substring(7),
            nombre: 'Variante Principal',
            descripcion: '',
            caracteristicas: [],
            imagenes: [],
            imagenesPreview: [],
            stock: '1',
            precio: '0',
            visibilidad: true,
            posicion: 0
        }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Variant Handlers ---
    const addVariante = () => {
        setVariantes([...variantes, {
            idLocal: Math.random().toString(36).substring(7),
            nombre: `Variante ${variantes.length + 1}`,
            descripcion: '',
            caracteristicas: [],
            imagenes: [],
            imagenesPreview: [],
            stock: '1',
            precio: '0',
            visibilidad: true,
            posicion: variantes.length
        }]);
    };

    const removeVariante = (idLocal: string) => {
        if (variantes.length === 1) {
            showToast('El producto debe tener al menos una variante.', 'warning');
            return;
        }

        // Cleanup object URLs to avoid memory leaks
        const varToRemove = variantes.find(v => v.idLocal === idLocal);
        varToRemove?.imagenesPreview.forEach(url => URL.revokeObjectURL(url));

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

    // --- Image Upload Handlers (Local) ---
    const handleImageSelect = (idLocal: string, files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        const newPreviews = newFiles.map(file => URL.createObjectURL(file));

        setVariantes(variantes.map(v => {
            if (v.idLocal === idLocal) {
                // Limit to 8 images maximum as per backend Multer rules
                const combinedFiles = [...v.imagenes, ...newFiles].slice(0, 8);
                const combinedPreviews = [...v.imagenesPreview, ...newPreviews].slice(0, 8);
                return { ...v, imagenes: combinedFiles, imagenesPreview: combinedPreviews };
            }
            return v;
        }));
    };

    const removeImage = (idLocal: string, indexToRemove: number) => {
        setVariantes(variantes.map(v => {
            if (v.idLocal === idLocal) {
                URL.revokeObjectURL(v.imagenesPreview[indexToRemove]);
                return {
                    ...v,
                    imagenes: v.imagenes.filter((_, i) => i !== indexToRemove),
                    imagenesPreview: v.imagenesPreview.filter((_, i) => i !== indexToRemove)
                };
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
            if (Number(v.precio) <= 0) hasErrors = true;
            if (Number(v.stock) < 0) hasErrors = true;
        });

        if (hasErrors) {
            showToast('Por favor, completa los campos requeridos (Nombre, Precio válido, Stock válido) en todas las variantes.', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            showToast('Iniciando subida de imágenes...', 'info');

            // 1. Calculate sequential positions for visible variants
            let posCounter = 0;
            const variantesConPosicion = variantes.map(v => ({
                ...v,
                finalPosicion: v.visibilidad ? posCounter++ : -1
            }));

            // 2. Upload Images for each variant
            const finalVariantesParaBackend = await Promise.all(variantesConPosicion.map(async (vari) => {
                let imagenesSubidasNombres: string[] = [];

                if (vari.imagenes.length > 0) {
                    const formData = new FormData();
                    vari.imagenes.forEach(file => {
                        formData.append('imagenes', file);
                    });

                    // Call backend to get 'tempo-...' names
                    const uploadRes = await productsApi.uploadImages(formData, 'productos');
                    // uploadRes.data returns the array of uploaded names
                    imagenesSubidasNombres = uploadRes.data || [];
                }

                const caracteristicasObj: Record<string, string> = {};
                vari.caracteristicas.forEach(c => {
                    if (c.clave.trim() && c.valor.trim()) {
                        caracteristicasObj[c.clave.trim()] = c.valor.trim();
                    }
                });

                return {
                    nombre: vari.nombre,
                    descripcion: vari.descripcion,
                    caracteristicas: caracteristicasObj,
                    imagenes: imagenesSubidasNombres,
                    stock: Number(vari.stock),
                    precio: Number(vari.precio),
                    visibilidad: vari.visibilidad,
                    posicion: vari.finalPosicion
                };
            }));

            // 3. Construct final payload
            const productPayload = {
                id_categoria: idCategoria || null,
                id_marca: idMarca || null,
                visibilidad: visibilidad,
                variantes: finalVariantesParaBackend,
                carpetaImagenes: 'productos'
            };

            showToast('Imágenes guardadas. Creando producto...', 'info');

            // 4. Send final creation request
            await productsApi.createProduct(productPayload);

            showToast('¡Producto creado exitosamente!', 'success');

            // Redirect back to list
            setTimeout(() => {
                navigate('/productos');
            }, 1000);

        } catch (error: any) {
            console.error("Submit Error:", error);
            const errData = error.response?.data?.error;
            let errMsg = 'Ocurrió un error al crear el producto.';
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

    return (
        <AdminLayout title="Nuevo Producto">
            <div class={`p-8 max-w-5xl mx-auto w-full space-y-8 animate-fade-in pb-32 ${isSubmitting ? 'pointer-events-none opacity-60' : ''}`}>

                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                                <Plus size={20} class="text-brand-600" />
                            </div>
                            Crear Producto
                        </h2>
                        <p class="text-slate-500 mt-1 font-medium ml-14">Añade variantes e imágenes a tu nuevo listado.</p>
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
                                    class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 appearance-none"
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
                                            onClick={() => removeVariante(variante.idLocal)}
                                            class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                            title="Eliminar variante"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>

                                <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex gap-3 items-center">
                                    <h4 class="font-bold text-slate-800 tracking-tight">
                                        {index === 0 ? 'Variante Principal' : `Variante (Posición ${index + 1})`}
                                    </h4>
                                    {!variante.visibilidad && (
                                        <span class="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded">Oculta (Pos. -1)</span>
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
                                            {/* Previews */}
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
                                            {variante.imagenes.length < 8 && (
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
                            onClick={() => navigate('/productos')}
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
                            {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                        </button>
                    </div>

                </form>
            </div>
        </AdminLayout>
    );
}
