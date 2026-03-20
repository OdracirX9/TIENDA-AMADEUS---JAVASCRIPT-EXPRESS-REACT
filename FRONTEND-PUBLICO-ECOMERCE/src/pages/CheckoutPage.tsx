import { useState, useEffect } from 'preact/hooks';
import { useNavigate } from 'react-router-dom';
import { MapPin, ShieldCheck, Check, Loader2, CheckCircle2, AlertCircle, Loader, Trash2 } from 'lucide-preact';
import { checkoutSignal } from '../signals/checkout';
import { isAuthenticated, clienteUser } from '../signals';
import { formatearPrecio } from '../utils/precios';
import { getMinioUrl } from '../utils/minio';
import { generarPagoProxy } from '../services/pagosService';
import { colombiaData } from '../utils/ColombiaData';
import {
    obtenerSesionUsuario,
    crearDireccionUsuario,
    actualizarDireccionUsuario,
    eliminarDireccionUsuario,
    type DireccionEnvio,
} from '../services/usuarioService';
import { consultarTarifaEnvioEndpoint } from '../services/apiClient';

export function CheckoutPage() {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState<DireccionEnvio[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [loadingAddresses, setLoadingAddresses] = useState(true);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [costoEnvio, setCostoEnvio] = useState<number>(0);
    const [cargandoEnvio, setCargandoEnvio] = useState(false);

    const usuario = clienteUser.value;

    // ── Estado del formulario de dirección ────────────────────────────────────
    const [mostrarForm, setMostrarForm] = useState(false);
    const [direccionEditando, setDireccionEditando] = useState<DireccionEnvio | null>(null);
    const [formDir, setFormDir] = useState<Partial<DireccionEnvio>>({});
    const [cargandoDir, setCargandoDir] = useState(false);
    const [errorDir, setErrorDir] = useState<string | null>(null);

    const departamentos = Object.keys(colombiaData).sort();
    const ciudadesList = formDir.departamento && colombiaData[formDir.departamento]
        ? colombiaData[formDir.departamento].filter((c: string) => c !== 'TODO')
        : [];

    // ── UI Moderna (Toasts y Modales) ──────────────────────────────
    const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'loading'; message: string }>({ show: false, type: 'loading', message: '' });
    const [modalEliminar, setModalEliminar] = useState<{ show: boolean; idToDelete: string | null }>({ show: false, idToDelete: null });

    const mostrarToast = (message: string, type: 'success' | 'error' | 'loading', duracion = 3000) => {
        setToast({ show: true, type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast({ show: false, type, message: '' }), duracion);
        }
    };

    const items = checkoutSignal.value;
    const subtotal = items.reduce((acc, current) => acc + current.sub_total, 0);
    const total = subtotal + costoEnvio;

    useEffect(() => {
        if (!isAuthenticated.value || items.length === 0) {
            navigate('/tienda');
            return;
        }

        const fetchAddresses = async () => {
            try {
                const response = await obtenerSesionUsuario();
                if (response.direcciones) {
                    setAddresses(response.direcciones);
                    if (response.direcciones.length > 0 && !selectedAddressId) {
                        setSelectedAddressId(response.direcciones[0].id);
                    }
                }
            } catch (err) {
                console.error("Error cargando direcciones", err);
            } finally {
                setLoadingAddresses(false);
            }
        };

        fetchAddresses();
    }, [navigate, items]);

    // Calcular costo de envío cuando cambia la dirección seleccionada
    useEffect(() => {
        const calcularEnvio = async () => {
            if (!selectedAddressId) {
                setCostoEnvio(0);
                return;
            }

            const direccion = addresses.find(d => d.id === selectedAddressId);
            if (direccion) {
                setCargandoEnvio(true);
                try {
                    const tarifa = await consultarTarifaEnvioEndpoint(direccion.departamento, direccion.ciudad);
                    setCostoEnvio(tarifa);
                } catch (e) {
                    console.error("No se pudo calcular la tarifa, usando fallback");
                    setCostoEnvio(2000000);
                } finally {
                    setCargandoEnvio(false);
                }
            }
        };

        calcularEnvio();
    }, [selectedAddressId, addresses]);

    const handleGenerarPago = async () => {
        if (!selectedAddressId) {
            setError("Por favor, selecciona una dirección de envío.");
            return;
        }

        setProcessingPayment(true);
        setError(null);

        try {
            const body = {
                variantes: items.map(item => ({ id: item.id, cantidad: item.cantidad })),
                direccion_envio_id: selectedAddressId
            };

            const data = await generarPagoProxy(body);

            if (data && data.link_pago) {
                // Open Wompi in a new tab
                window.open(data.link_pago, '_blank');
                // Redirect this page to waiting confirmation, replacing history to prevent back navigation
                navigate('/esperando-confirmacion', { replace: true });
            } else {
                throw new Error("No se recibió el enlace de pago");
            }

        } catch (err: any) {
            console.error("Error generando pago:", err);
            setError(err.response?.data?.mensaje || "Hubo un error al generar la orden de pago. Inténtalo más tarde.");
            setProcessingPayment(false);
        }
    };

    // ── Logica del formulario de direcciones ──────────────────────────────────
    const recargarSesionDir = async () => {
        try {
            const data = await obtenerSesionUsuario();
            if (data.direcciones) {
                setAddresses(data.direcciones);
                // Si la dirección seleccionada ya no existe (fue eliminada), selecciona la primera o null
                if (!data.direcciones.find(d => d.id === selectedAddressId)) {
                    setSelectedAddressId(data.direcciones.length > 0 ? data.direcciones[0].id : null);
                }
            }
        } catch (e) { console.error(e); }
    };

    const abrirFormNuevaDir = () => {
        setFormDir({
            nombre_usuario: usuario?.nombre || '',
            celular: usuario?.celular || '',
            direccion_envio: '',
            ciudad: '',
            departamento: '',
            descripcion: ''
        });
        setDireccionEditando(null);
        setErrorDir(null);
        setMostrarForm(true);
    };

    const abrirFormEditarDir = (dir: DireccionEnvio) => {
        setFormDir({ ...dir });
        setDireccionEditando(dir);
        setErrorDir(null);
        setMostrarForm(true);
    };

    const guardarDireccion = async (e: Event) => {
        e.preventDefault();
        setErrorDir(null);

        const { nombre_usuario, celular, direccion_envio, ciudad, departamento } = formDir;
        if (!nombre_usuario || !celular || !direccion_envio || !ciudad || !departamento) {
            setErrorDir('Revisa los campos obligatorios (*).');
            mostrarToast('Faltan campos obligatorios', 'error');
            return;
        }

        setCargandoDir(true);
        mostrarToast(direccionEditando ? 'Actualizando dirección...' : 'Guardando dirección...', 'loading');
        try {
            if (direccionEditando) {
                await actualizarDireccionUsuario(formDir as DireccionEnvio);
                mostrarToast('Dirección actualizada con éxito', 'success');
            } else {
                await crearDireccionUsuario(formDir as Omit<DireccionEnvio, 'id'>);
                mostrarToast('Dirección creada con éxito', 'success');
            }
            setMostrarForm(false);
            await recargarSesionDir();
        } catch (err: any) {
            setErrorDir(err?.response?.data || 'Error al guardar la dirección');
            mostrarToast(err?.response?.data || 'Error al guardar la dirección', 'error');
        } finally {
            setCargandoDir(false);
        }
    };

    const borrarDireccion = (id: string, e: Event) => {
        e.stopPropagation();
        setModalEliminar({ show: true, idToDelete: id });
    };

    const confirmarBorrarDireccion = async () => {
        const id = modalEliminar.idToDelete;
        if (!id) return;

        setModalEliminar({ show: false, idToDelete: null });
        setCargandoDir(true);
        mostrarToast('Eliminando dirección...', 'loading');
        try {
            await eliminarDireccionUsuario(id);
            mostrarToast('Dirección eliminada correctamente', 'success');
            await recargarSesionDir();
        } catch (err: any) {
            mostrarToast('Error al eliminar la dirección', 'error');
        } finally {
            setCargandoDir(false);
        }
    };

    if (items.length === 0) return null;

    return (
        <div class="max-w-[1200px] mx-auto w-full px-6 py-12 flex-1 flex flex-col relative">
            <h1 class="text-3xl font-display font-bold text-slate-800 mb-8 tracking-tight">Proceso de compra</h1>

            <div class="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
                {/* Left Column - Cart Items */}
                <div class="w-full lg:w-3/5 space-y-6">
                    <div class="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                        <h2 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            Carro de compra
                        </h2>

                        <div class="space-y-4">
                            {items.map(item => (
                                <div key={item.id} class="flex items-center gap-4 p-4 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <div class="w-20 h-20 sm:w-24 sm:h-24 bg-slate-200 rounded-2xl overflow-hidden shrink-0">
                                        {item.imagen && <img src={getMinioUrl(item.imagen, 'productos')} alt={item.nombre} class="w-full h-full object-cover" />}
                                    </div>
                                    <div class="flex-1">
                                        <h3 class="font-bold text-slate-800">{item.nombre}</h3>
                                        <p class="text-slate-500 text-sm mt-1">Cantidad: {item.cantidad}</p>
                                    </div>
                                    <div class="font-bold text-slate-800 whitespace-nowrap">
                                        {formatearPrecio(item.sub_total)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div class="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                            <span class="text-slate-500 font-medium">Subtotal de productos:</span>
                            <span class="text-xl font-bold text-slate-800">{formatearPrecio(subtotal)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column - Shipping & Order Summary */}
                <div class="w-full lg:w-2/5 space-y-6">

                    {/* Shipping Address */}
                    <div class="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <MapPin size={22} class="text-brand-500" />
                                Dirección de envío
                            </h2>
                            {!mostrarForm && (
                                <button
                                    onClick={abrirFormNuevaDir}
                                    class="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    + Añadir
                                </button>
                            )}
                        </div>

                        {mostrarForm ? (
                            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 fade-in">
                                <h3 class="text-sm font-black text-slate-800 mb-4 border-b border-slate-200 pb-2">
                                    {direccionEditando ? 'Editar Dirección' : 'Añadir Nueva Dirección'}
                                </h3>

                                {errorDir && (
                                    <div class="mb-4 p-3 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100">
                                        {errorDir}
                                    </div>
                                )}

                                <form onSubmit={guardarDireccion} class="space-y-3">
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-slate-500 uppercase">Nombre *</label>
                                        <input
                                            type="text"
                                            value={formDir.nombre_usuario || ''}
                                            onInput={(e) => setFormDir({ ...formDir, nombre_usuario: (e.target as HTMLInputElement).value })}
                                            class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-brand-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-slate-500 uppercase">Celular *</label>
                                        <input
                                            type="tel"
                                            value={formDir.celular || ''}
                                            onInput={(e) => setFormDir({ ...formDir, celular: (e.target as HTMLInputElement).value })}
                                            class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-brand-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-slate-500 uppercase">Dirección Completa *</label>
                                        <input
                                            type="text"
                                            value={formDir.direccion_envio || ''}
                                            onInput={(e) => setFormDir({ ...formDir, direccion_envio: (e.target as HTMLInputElement).value })}
                                            class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-brand-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div class="space-y-1">
                                            <label class="text-[10px] font-bold text-slate-500 uppercase">Dpto *</label>
                                            <select
                                                required
                                                value={formDir.departamento || ''}
                                                onChange={(e) => setFormDir({ ...formDir, departamento: (e.currentTarget as HTMLSelectElement).value, ciudad: '' })}
                                                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-brand-500 focus:outline-none transition-all"
                                            >
                                                <option value="" disabled>Departamento...</option>
                                                {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div class="space-y-1">
                                            <label class="text-[10px] font-bold text-slate-500 uppercase">Ciudad *</label>
                                            <select
                                                required
                                                disabled={!formDir.departamento}
                                                value={formDir.ciudad || ''}
                                                onChange={(e) => setFormDir({ ...formDir, ciudad: (e.currentTarget as HTMLSelectElement).value })}
                                                class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-brand-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="" disabled>Ciudad...</option>
                                                {ciudadesList.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        <label class="text-[10px] font-bold text-slate-500 uppercase">Notas adicionales</label>
                                        <input
                                            type="text"
                                            value={formDir.descripcion || ''}
                                            onInput={(e) => setFormDir({ ...formDir, descripcion: (e.target as HTMLInputElement).value })}
                                            class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-brand-500 focus:outline-none transition-all"
                                            placeholder="Detalles del inmueble..."
                                        />
                                    </div>

                                    <div class="flex gap-2 pt-3 border-t border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setMostrarForm(false)}
                                            disabled={cargandoDir}
                                            class="w-1/2 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={cargandoDir}
                                            class="w-1/2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-sm shadow-brand-500/20 flex justify-center items-center gap-2 transition-all"
                                        >
                                            {cargandoDir && <Loader size={14} class="animate-spin" />}
                                            Guardar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : loadingAddresses ? (
                            <div class="flex items-center justify-center p-6">
                                <Loader2 class="w-8 h-8 text-slate-300 animate-spin" />
                            </div>
                        ) : addresses.length === 0 ? (
                            <div class="text-center p-6 bg-rose-50 rounded-2xl border border-rose-100">
                                <p class="text-rose-600 font-medium text-sm mb-2">No tienes direcciones guardadas.</p>
                                <button
                                    onClick={abrirFormNuevaDir}
                                    class="text-sm font-bold text-rose-700 hover:text-rose-800 underline"
                                >
                                    Agrega una para continuar
                                </button>
                            </div>
                        ) : (
                            <div class="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {addresses.map(addr => (
                                    <div
                                        key={addr.id}
                                        onClick={() => setSelectedAddressId(addr.id)}
                                        class={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative group ${selectedAddressId === addr.id ? 'border-brand-500 bg-brand-50/30' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div class="flex items-start gap-3">
                                            <div class={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors ${selectedAddressId === addr.id ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300'}`}>
                                                {selectedAddressId === addr.id && <Check size={12} strokeWidth={3} />}
                                            </div>
                                            <div class="flex-1 pr-16">
                                                <p class="font-bold text-sm text-slate-800">{addr.direccion_envio}</p>
                                                <p class="text-xs font-semibold text-slate-500 mt-0.5">{addr.ciudad}, {addr.departamento}</p>
                                                <div class="mt-2 text-xs text-slate-500 flex flex-col gap-0.5">
                                                    <span>Recibe: {addr.nombre_usuario}</span>
                                                    <span>Tel: {addr.celular}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons appear on hover active when selected */}
                                        <div class="absolute top-3 right-3 flex flex-col gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); abrirFormEditarDir(addr); }}
                                                class="p-1.5 text-brand-600 bg-brand-100 hover:bg-brand-200 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <span class="text-[10px] font-bold px-1 uppercase">Editar</span>
                                            </button>
                                            <button
                                                onClick={(e) => borrarDireccion(addr.id, e)}
                                                class="p-1.5 text-rose-600 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors mt-1"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} class="mx-auto" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div class="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                        <h2 class="text-xl font-bold text-slate-800 mb-6 font-display">Resumen de compra</h2>

                        <div class="space-y-4 text-sm font-medium text-slate-500">
                            <div class="flex justify-between items-center">
                                <span>Subtotal de productos:</span>
                                <span class="text-slate-800 font-bold">{formatearPrecio(subtotal)}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span>Costo de envío:</span>
                                {cargandoEnvio ? (
                                    <Loader2 class="w-4 h-4 text-brand-500 animate-spin" />
                                ) : (
                                    <span class="text-slate-800 font-bold">{formatearPrecio(costoEnvio)}</span>
                                )}
                            </div>
                        </div>

                        <div class="mt-6 pt-6 border-t border-dashed border-slate-200 flex justify-between items-end">
                            <span class="text-lg font-bold text-slate-800">Total a pagar:</span>
                            {cargandoEnvio ? (
                                <Loader2 class="w-6 h-6 text-brand-500 animate-spin" />
                            ) : (
                                <span class="text-3xl font-display font-black text-brand-600">{formatearPrecio(total)}</span>
                            )}
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div class="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                        <h2 class="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ShieldCheck size={22} class="text-emerald-500" />
                            Forma de pago
                        </h2>

                        <div class="bg-slate-50 rounded-2xl p-5 mb-6 text-sm text-slate-600 leading-relaxed border border-slate-100">
                            Para poder realizar el pago del producto. Usted será redirigido a la plataforma de <strong class="text-slate-900">Wompi</strong>, en donde podrá seleccionar el método de pago que desee y realizar el pago de forma segura.
                            <br /><br />
                            Una vez finalizado el pago, será redirigido de nuevo a nuestra página confirmando el pago realizado.
                        </div>

                        {error && (
                            <div class="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-xl font-medium border border-rose-100">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handleGenerarPago}
                            disabled={processingPayment || !selectedAddressId || mostrarForm || cargandoEnvio}
                            class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                        >
                            {processingPayment ? (
                                <>
                                    <Loader2 class="w-5 h-5 animate-spin" /> Procesando...
                                </>
                            ) : (
                                "Ir a pagar"
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── TOAST NOTIFICATION ────────────────────────────────────────── */}
            {toast.show && (
                <div class="fixed bottom-6 right-6 z-50 animate-fade-in-up">
                    <div class={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                        toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                            'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
                        }`}>
                        {toast.type === 'success' && <CheckCircle2 size={20} class="text-emerald-500" />}
                        {toast.type === 'error' && <AlertCircle size={20} class="text-rose-500" />}
                        {toast.type === 'loading' && <Loader size={20} class="text-brand-500 animate-spin" />}
                        <span class="font-bold text-sm tracking-wide">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* ── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ──────────────────────── */}
            {modalEliminar.show && (
                <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div class="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 transform transition-all animate-scale-up">
                        <div class="p-8">
                            <div class="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-100 shadow-inner">
                                <Trash2 size={28} class="text-rose-500" />
                            </div>
                            <h3 class="text-xl font-black text-slate-900 text-center mb-2">¿Eliminar dirección?</h3>
                            <p class="text-sm text-slate-500 text-center font-medium mb-8">Esta acción no se puede deshacer.</p>
                            <div class="flex gap-3">
                                <button
                                    onClick={() => setModalEliminar({ show: false, idToDelete: null })}
                                    disabled={cargandoDir}
                                    class="flex-1 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-sm transition-colors border border-slate-200 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmarBorrarDireccion}
                                    disabled={cargandoDir}
                                    class="flex-1 px-4 py-3 bg-gradient-to-r from-rose-500 to-red-500 hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {cargandoDir && <Loader size={16} class="animate-spin" />}
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scale-up {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                .animate-scale-up { animation: scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .fade-in { animation: fade-in 0.2s ease-in-out; }
            `}} />
        </div>
    );
}
