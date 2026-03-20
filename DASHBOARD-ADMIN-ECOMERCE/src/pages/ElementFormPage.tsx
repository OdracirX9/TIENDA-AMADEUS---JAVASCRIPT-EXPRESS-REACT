import { useState, useEffect } from 'preact/hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Image as ImageIcon, X } from 'lucide-preact';
import { productsApi } from '../api';
import { showToast } from '../signals';
import { AdminLayout } from '../components/AdminLayout';
import { getMinioUrl } from '../utils/minio';

interface ElementFormPageProps {
    endpointTipo: 'categorias' | 'marcas';
    titulo: string;
}

export function ElementFormPage({ endpointTipo, titulo }: ElementFormPageProps) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [imagenFile, setImagenFile] = useState<File | null>(null);
    const [imagenPreview, setImagenPreview] = useState<string | null>(null);
    const [imagenExistente, setImagenExistente] = useState<string | null>(null);

    const [loading, setLoading] = useState(!!id);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (id) {
            productsApi.getElements().then(res => {
                const elements = res.data[endpointTipo] || [];
                const target = elements.find((e: any) => e.id === id);
                if (target) {
                    setNombre(target.nombre);
                    setDescripcion(target.descripcion || '');
                    setImagenExistente(target.imagen);
                    if (target.imagen) {
                        setImagenPreview(getMinioUrl(target.imagen, 'productos'));
                    }
                } else {
                    showToast(`${titulo} no encontrada`, 'error');
                    navigate(`/${endpointTipo}`);
                }
            }).catch(() => {
                showToast(`Error al cargar datos de ${titulo.toLowerCase()}`, 'error');
                navigate(`/${endpointTipo}`);
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [id, endpointTipo, titulo, navigate]);

    const handleImageSelect = (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            setImagenFile(file);
            setImagenPreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImagenFile(null);
        setImagenPreview(null);
        setImagenExistente(null);
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();

        if (!nombre.trim()) {
            showToast('El nombre es obligatorio', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            let imagenFinal = imagenExistente;

            if (imagenFile) {
                showToast('Subiendo imagen...', 'info');
                const fd = new FormData();
                fd.append('imagenes', imagenFile);
                const uploadRes = await productsApi.uploadImages(fd, 'productos');
                const names = uploadRes.data || [];
                if (names.length > 0) {
                    imagenFinal = names[0];
                }
            }

            const payload = {
                elemento: endpointTipo,
                carpetaImagenes: 'productos',
                nombre,
                descripcion,
                imagen: imagenFinal || ''
            };

            showToast(`Guardando ${titulo.toLowerCase()}...`, 'info');

            if (id) {
                await productsApi.updateElement({ id, ...payload });
                showToast(`${titulo} actualizada correctamente`, 'success');
            } else {
                await productsApi.createElement(payload);
                showToast(`${titulo} creada correctamente`, 'success');
            }

            navigate(`/${endpointTipo}`);
        } catch (error: any) {
            console.error(error);
            showToast(error.response?.data?.error || `Error al guardar la ${titulo.toLowerCase()}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout title={id ? `Editar ${titulo}` : `Nueva ${titulo}`}>
                <div class="p-8 max-w-4xl mx-auto flex justify-center items-center py-20">
                    <div class="w-10 h-10 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title={id ? `Editar ${titulo}` : `Nueva ${titulo}`}>
            <div class="p-8 pb-24 max-w-4xl mx-auto w-full space-y-6 relative z-10">

                {/* Header Back Button */}
                <div class="flex items-center gap-4 mb-2">
                    <button
                        onClick={() => navigate(`/${endpointTipo}`)}
                        class="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-slate-800 tracking-tight">
                            {id ? `Editar ${titulo}` : `Crear ${titulo}`}
                        </h2>
                        <p class="text-slate-500 mt-1">
                            Completa los detalles básicos para publicar este elemento.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} class="space-y-6">
                    <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">

                        <div class="space-y-2">
                            <label class="text-sm font-bold text-slate-700">Nombre de la {titulo}</label>
                            <input
                                type="text"
                                value={nombre}
                                onInput={(e: any) => setNombre(e.target.value)}
                                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50"
                                placeholder={`Ej. ${endpointTipo === 'categorias' ? 'Nombres de Categoría...' : 'Nike, Adidas...'}`}
                            />
                        </div>

                        <div class="space-y-2">
                            <label class="text-sm font-bold text-slate-700">Descripción (Opcional)</label>
                            <textarea
                                value={descripcion}
                                onInput={(e: any) => setDescripcion(e.target.value)}
                                rows={4}
                                class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 resize-y"
                                placeholder={`Describe esta ${titulo.toLowerCase()}...`}
                            />
                        </div>

                        <div class="space-y-2">
                            <label class="text-sm font-bold text-slate-700">Imagen Publicitaria</label>

                            {imagenPreview ? (
                                <div class="relative w-48 h-48 rounded-xl overflow-hidden border-2 border-slate-200 group">
                                    <img src={imagenPreview} alt="Preview" class="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        class="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div class="w-full">
                                    <label class="flex flex-col items-center justify-center w-full h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-brand-400 transition-colors">
                                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                            <ImageIcon size={32} class="text-slate-400 mb-2" />
                                            <p class="text-sm font-semibold text-slate-600">Haz clic para buscar o arrastra una imagen</p>
                                            <p class="text-xs text-slate-500 mt-1">PNG, JPG o WEBP (Máx. 5MB)</p>
                                        </div>
                                        <input
                                            type="file"
                                            class="hidden"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => navigate(`/${endpointTipo}`)}
                            class="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            class="flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-sm shadow-brand-500/30 disabled:opacity-70 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Guardar {titulo}
                                </>
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </AdminLayout>
    );
}
