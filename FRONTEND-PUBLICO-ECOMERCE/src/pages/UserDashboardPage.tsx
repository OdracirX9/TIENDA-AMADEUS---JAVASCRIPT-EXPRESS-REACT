import { useState, useEffect } from 'preact/hooks';
import { Package, User, LogOut, MapPin, ChevronRight, Loader, ShoppingBag, Phone, Mail, Calendar, CreditCard, CheckCircle2, AlertCircle, Trash2, Truck, Archive, Box, X } from 'lucide-preact';
import { useNavigate } from 'react-router-dom';
import { clienteUser } from '../signals';
import {
    obtenerSesionUsuario,
    cerrarSesionUsuario,
    crearDireccionUsuario,
    actualizarDireccionUsuario,
    eliminarDireccionUsuario,
    obtenerMisOrdenes,
    obtenerMiOrden,
    type DireccionEnvio,
    type OrdenUsuario,
    type OrdenDetalle,
} from '../services/usuarioService';
import { formatearPrecio } from '../utils/precios';
import { getMinioUrl } from '../utils/minio';
import { colombiaData } from '../utils/ColombiaData';

type Seccion = 'pedidos' | 'direcciones' | 'perfil';

const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

const estadoPagoConfig: Record<string, { color: string; label: string; dot: string }> = {
    APPROVED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Pagado', dot: 'bg-emerald-400' },
    PENDING: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pendiente', dot: 'bg-amber-400' },
    DECLINED: { color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Rechazado', dot: 'bg-rose-400' },
    VOIDED: { color: 'bg-slate-50 text-slate-600 border-slate-200', label: 'Anulado', dot: 'bg-slate-400' },
};

const estadoEnvioConfig: Record<string, { color: string; label: string; dot: string }> = {
    PENDIENTE: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pendiente envío', dot: 'bg-amber-400' },
    PREPARANDO: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Preparando', dot: 'bg-blue-400' },
    ENVIADO: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'En camino', dot: 'bg-indigo-400' },
    ENTREGADO: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Entregado', dot: 'bg-emerald-400' },
    CANCELADO: { color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Cancelado', dot: 'bg-rose-400' },
};

export function UserDashboardPage() {
    const navigate = useNavigate();
    const [seccion, setSeccion] = useState<Seccion>('pedidos');
    const [cargando, setCargando] = useState(true);
    const [cerrando, setCerrando] = useState(false);

    const [direcciones, setDirecciones] = useState<DireccionEnvio[]>([]);
    const [ordenes, setOrdenes] = useState<OrdenUsuario[]>([]);
    const [cargandoOrdenes, setCargandoOrdenes] = useState(false);

    // ── Modal de detalle de orden ─────────────────────────────────────────────
    const [ordenDetalle, setOrdenDetalle] = useState<OrdenDetalle | null>(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const abrirDetalle = async (id: string) => {
        setOrdenDetalle(null);
        setCargandoDetalle(true);
        try {
            const detalle = await obtenerMiOrden(id);
            setOrdenDetalle(detalle);
        } catch (e) {
            console.error('[Dashboard] Error cargando detalle de orden:', e);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const cerrarDetalle = () => setOrdenDetalle(null);

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

    // ── Toasts y Modales ──────────────────────────────────────────────────────
    const [toast, setToast] = useState<{ show: boolean; type: 'success' | 'error' | 'loading'; message: string }>({ show: false, type: 'loading', message: '' });
    const [modalEliminar, setModalEliminar] = useState<{ show: boolean; idToDelete: string | null }>({ show: false, idToDelete: null });

    const mostrarToast = (message: string, type: 'success' | 'error' | 'loading', duracion = 3000) => {
        setToast({ show: true, type, message });
        if (type !== 'loading') {
            setTimeout(() => setToast({ show: false, type, message: '' }), duracion);
        }
    };

    // ── Cargar datos al montar ────────────────────────────────────────────────
    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                const [data] = await Promise.all([obtenerSesionUsuario()]);
                if (!clienteUser.value && !data.usuario) { navigate('/login'); return; }
                if (data.usuario) clienteUser.value = data.usuario;
                setDirecciones(data.direcciones ?? []);
            } catch {
                navigate('/login');
                return;
            } finally {
                setCargando(false);
            }

            setCargandoOrdenes(true);
            try {
                const misOrdenes = await obtenerMisOrdenes();
                setOrdenes(misOrdenes);
            } catch (e) {
                console.warn('[Dashboard] No se pudieron cargar las órdenes:', e);
            } finally {
                setCargandoOrdenes(false);
            }
        };
        cargar();
    }, []);

    const handleCerrarSesion = async () => {
        setCerrando(true);
        try { await cerrarSesionUsuario(); } catch { }
        clienteUser.value = null;
        navigate('/login');
    };

    const recargarSesionDir = async () => {
        try {
            const data = await obtenerSesionUsuario();
            if (data.direcciones) setDirecciones(data.direcciones);
        } catch (e) { console.error(e); }
    };

    const abrirFormNuevaDir = () => {
        setFormDir({ nombre_usuario: usuario?.nombre || '', celular: usuario?.celular || '', direccion_envio: '', ciudad: '', departamento: '', descripcion: '' });
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
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            setErrorDir(err?.response?.data || 'Error al guardar la dirección');
            mostrarToast(err?.response?.data || 'Error al guardar la dirección', 'error');
        } finally {
            setCargandoDir(false);
        }
    };

    const borrarDireccion = (id: string) => setModalEliminar({ show: true, idToDelete: id });

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
            setTimeout(() => window.location.reload(), 1500);
        } catch {
            mostrarToast('Error al eliminar la dirección', 'error');
        } finally {
            setCargandoDir(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (cargando) {
        return (
            <div class="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-slate-500">
                <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Loader size={26} class="animate-spin text-white" />
                </div>
                <p class="font-semibold text-sm text-slate-400">Cargando tu perfil...</p>
            </div>
        );
    }

    const navItems: { key: Seccion; icon: any; label: string }[] = [
        { key: 'pedidos', icon: Package, label: 'Mis pedidos' },
        { key: 'direcciones', icon: MapPin, label: 'Direcciones' },
        { key: 'perfil', icon: User, label: 'Mi perfil' },
    ];

    const iniciales = usuario?.nombre?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

    // ── Helper: campo de input ────────────────────────────────────────────────
    const inputClass = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-300";

    return (
        <div class="w-full bg-gradient-to-b from-slate-50 to-white min-h-screen pt-8 pb-24 md:py-12">
            <div class="max-w-[1200px] mx-auto px-4 md:px-6">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div class="mb-8 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-bold text-brand-600 uppercase tracking-widest mb-1">Panel de usuario</p>
                        <h1 class="text-2xl md:text-3xl font-black text-slate-900">
                            ¡Hola, <span class="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">{usuario?.nombre?.split(' ')[0]}</span>!
                        </h1>
                    </div>
                    <button
                        onClick={handleCerrarSesion}
                        disabled={cerrando}
                        class="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 text-rose-600 text-sm font-bold hover:bg-rose-50 transition-all disabled:opacity-50"
                    >
                        {cerrando ? <Loader size={15} class="animate-spin" /> : <LogOut size={15} />}
                        Cerrar sesión
                    </button>
                </div>

                <div class="flex flex-col md:flex-row gap-6">

                    {/* ── Sidebar ────────────────────────────────────────────── */}
                    <aside class="w-full md:w-72 shrink-0 space-y-4">

                        {/* Avatar card */}
                        <div class="bg-white rounded-3xl border border-slate-100 p-6 text-center shadow-sm shadow-slate-200/50">
                            <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black mb-4 shadow-lg shadow-brand-500/30">
                                {iniciales}
                            </div>
                            <h2 class="text-base font-black text-slate-800">{usuario?.nombre}</h2>
                            <p class="text-xs font-medium text-slate-400 mt-0.5 break-all line-clamp-2">{usuario?.correo}</p>

                            <div class="mt-5 grid grid-cols-2 gap-2 text-center">
                                <div class="bg-gradient-to-br from-brand-50 to-indigo-50 rounded-xl p-3 border border-brand-100">
                                    {cargandoOrdenes
                                        ? <Loader size={18} class="animate-spin text-brand-500 mx-auto" />
                                        : <p class="text-xl font-black text-slate-800">{ordenes.length}</p>
                                    }
                                    <p class="text-xs text-brand-600 font-semibold mt-0.5">Pedidos</p>
                                </div>
                                <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    <p class="text-xl font-black text-slate-800">{direcciones.length}</p>
                                    <p class="text-xs text-slate-500 font-semibold mt-0.5">Direcciones</p>
                                </div>
                            </div>
                        </div>

                        {/* Nav */}
                        <div class="bg-white rounded-3xl border border-slate-100 p-3 shadow-sm shadow-slate-200/50 space-y-1">
                            {navItems.map(({ key, icon: Icon, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setSeccion(key)}
                                    class={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${seccion === key
                                        ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon size={17} />
                                    <span class="flex-1 text-left">{label}</span>
                                    <ChevronRight size={15} class={seccion === key ? 'opacity-60' : 'opacity-25'} />
                                </button>
                            ))}

                            <div class="pt-1 border-t border-slate-100 mt-1">
                                <button
                                    onClick={handleCerrarSesion}
                                    disabled={cerrando}
                                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
                                >
                                    {cerrando ? <Loader size={17} class="animate-spin" /> : <LogOut size={17} />}
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* ── Contenido principal ─────────────────────────────────── */}
                    <main class="flex-1 min-w-0 space-y-4">

                        {/* ══════════ SECCIÓN: PEDIDOS ══════════ */}
                        {seccion === 'pedidos' && (
                            <div>
                                <div class="flex items-center gap-3 mb-5">
                                    <div class="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                                        <Package size={17} class="text-brand-600" />
                                    </div>
                                    <div>
                                        <h2 class="text-lg font-black text-slate-900">Mis pedidos</h2>
                                        <p class="text-xs text-slate-400 font-medium">
                                            {cargandoOrdenes ? 'Cargando...' : `${ordenes.length} ${ordenes.length === 1 ? 'orden' : 'órdenes'} en total`}
                                        </p>
                                    </div>
                                </div>

                                {cargandoOrdenes ? (
                                    <div class="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
                                        <Loader size={30} class="animate-spin text-brand-500 mx-auto mb-3" />
                                        <p class="text-sm font-medium text-slate-400">Cargando tus pedidos...</p>
                                    </div>
                                ) : ordenes.length === 0 ? (
                                    <div class="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
                                        <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <ShoppingBag size={26} class="text-slate-300" />
                                        </div>
                                        <h3 class="font-bold text-slate-800 mb-1">Aún no tienes pedidos</h3>
                                        <p class="text-sm text-slate-400 font-medium mb-5">¡Explora nuestras categorías y haz tu primera compra!</p>
                                        <button
                                            onClick={() => navigate('/')}
                                            class="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/20 hover:opacity-90 transition-all"
                                        >
                                            Ver productos
                                        </button>
                                    </div>
                                ) : (
                                    <div class="space-y-3">
                                        {ordenes.map((orden) => {
                                            const estadoPagoNorm = (orden.estado_pago || '').toUpperCase();
                                            const estadoEnvioNorm = (orden.estado_envio || '').toUpperCase();
                                            const estPago = estadoPagoConfig[estadoPagoNorm] ?? { color: 'bg-slate-50 text-slate-600 border-slate-200', label: orden.estado_pago || 'Sin estado', dot: 'bg-slate-300' };
                                            const estEnvio = estadoEnvioConfig[estadoEnvioNorm] ?? { color: 'bg-slate-50 text-slate-600 border-slate-200', label: orden.estado_envio || 'Sin envío', dot: 'bg-slate-300' };
                                            return (
                                                <div
                                                    key={orden.id}
                                                    class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-brand-200 transition-all cursor-pointer group"
                                                    onClick={() => abrirDetalle(orden.id)}
                                                >
                                                    <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
                                                        {/* Icono + info */}
                                                        <div class="flex items-start gap-4 flex-1 min-w-0">
                                                            <div class="w-11 h-11 bg-gradient-to-br from-brand-50 to-indigo-50 rounded-xl flex items-center justify-center shrink-0 border border-brand-100">
                                                                <Archive size={18} class="text-brand-500" />
                                                            </div>
                                                            <div class="flex-1 min-w-0">
                                                                {/* Badges */}
                                                                <div class="flex flex-wrap items-center gap-1.5 mb-2">
                                                                    <span class={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${estPago.color}`}>
                                                                        <span class={`w-1.5 h-1.5 rounded-full ${estPago.dot}`}></span>
                                                                        Transacción: {estPago.label}
                                                                    </span>
                                                                    {estadoPagoNorm === 'APPROVED' && orden.estado_envio && (
                                                                        <span class={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${estEnvio.color}`}>
                                                                            <span class={`w-1.5 h-1.5 rounded-full ${estEnvio.dot}`}></span>
                                                                            Envío: {estEnvio.label}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Fecha */}
                                                                <p class="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                                                    <Calendar size={11} />
                                                                    {formatearFecha(orden.created_at)}
                                                                    {orden.metodo_pago && <><span class="opacity-40">·</span><CreditCard size={11} />{orden.metodo_pago}</>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {/* Desglose y Total */}
                                                        <div class="sm:text-right shrink-0">
                                                            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 space-y-0.5">
                                                                <p class="flex justify-between sm:justify-end gap-3">
                                                                    <span>Subtotal:</span>
                                                                    <span class="text-slate-500">{formatearPrecio(orden.compra_total - (orden.precio_envio || 0))}</span>
                                                                </p>
                                                                <p class="flex justify-between sm:justify-end gap-3">
                                                                    <span>Envío:</span>
                                                                    <span class="text-slate-500">{formatearPrecio(orden.precio_envio || 0)}</span>
                                                                </p>
                                                            </div>
                                                            <div class="pt-1.5 border-t border-slate-100 sm:border-0 sm:pt-0">
                                                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5 mt-1">Total</p>
                                                                <p class="text-xl font-black text-slate-900">{formatearPrecio(orden.compra_total)}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer */}
                                                    <div class="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between">
                                                        <div class="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                            <Box size={11} />
                                                            <span>{orden.total_productos} {Number(orden.total_productos) === 1 ? 'producto' : 'productos'}</span>
                                                        </div>
                                                        <span class="text-xs text-brand-500 font-bold group-hover:text-brand-600 transition-colors flex items-center gap-1">
                                                            Ver detalle <ChevronRight size={12} />
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════ SECCIÓN: DIRECCIONES ══════════ */}
                        {seccion === 'direcciones' && (
                            <div>
                                <div class="flex items-center justify-between mb-5">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                                            <MapPin size={17} class="text-brand-600" />
                                        </div>
                                        <div>
                                            <h2 class="text-lg font-black text-slate-900">Mis direcciones</h2>
                                            <p class="text-xs text-slate-400 font-medium">{direcciones.length} {direcciones.length === 1 ? 'dirección guardada' : 'direcciones guardadas'}</p>
                                        </div>
                                    </div>
                                    {!mostrarForm && (
                                        <button
                                            onClick={abrirFormNuevaDir}
                                            class="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/20 hover:opacity-90 transition-all flex items-center gap-1.5"
                                        >
                                            <span class="text-base leading-none">+</span> Nueva
                                        </button>
                                    )}
                                </div>

                                {mostrarForm ? (
                                    <div class="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm">
                                        <h3 class="text-base font-black text-slate-800 mb-6 border-b border-slate-100 pb-4">
                                            {direccionEditando ? 'Editar dirección' : 'Nueva dirección de envío'}
                                        </h3>
                                        {errorDir && (
                                            <div class="mb-5 p-3.5 bg-rose-50 text-rose-600 rounded-xl text-sm font-semibold border border-rose-100 flex items-center gap-2">
                                                <AlertCircle size={16} /> {errorDir}
                                            </div>
                                        )}
                                        <form onSubmit={guardarDireccion} class="space-y-4">
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div class="space-y-1.5">
                                                    <label class="text-xs font-bold text-slate-500">Nombre de quien recibe *</label>
                                                    <input type="text" value={formDir.nombre_usuario || ''} onInput={(e) => setFormDir({ ...formDir, nombre_usuario: (e.target as HTMLInputElement).value })} class={inputClass} placeholder="Ej. Juan Pérez" />
                                                </div>
                                                <div class="space-y-1.5">
                                                    <label class="text-xs font-bold text-slate-500">Celular / Teléfono *</label>
                                                    <input type="tel" value={formDir.celular || ''} onInput={(e) => setFormDir({ ...formDir, celular: (e.target as HTMLInputElement).value })} class={inputClass} placeholder="Ej. 3001234567" />
                                                </div>
                                                <div class="space-y-1.5 md:col-span-2">
                                                    <label class="text-xs font-bold text-slate-500">Dirección completa *</label>
                                                    <input type="text" value={formDir.direccion_envio || ''} onInput={(e) => setFormDir({ ...formDir, direccion_envio: (e.target as HTMLInputElement).value })} class={inputClass} placeholder="Cll X # Y - Z, Apto..." />
                                                </div>
                                                <div class="space-y-1.5">
                                                    <label class="text-xs font-bold text-slate-500">Departamento *</label>
                                                    <select
                                                        required
                                                        value={formDir.departamento || ''}
                                                        onChange={(e) => setFormDir({ ...formDir, departamento: (e.currentTarget as HTMLSelectElement).value, ciudad: '' })}
                                                        class={inputClass}
                                                    >
                                                        <option value="" disabled>Selecciona un departamento...</option>
                                                        {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <div class="space-y-1.5">
                                                    <label class="text-xs font-bold text-slate-500">Ciudad *</label>
                                                    <select
                                                        required
                                                        disabled={!formDir.departamento}
                                                        value={formDir.ciudad || ''}
                                                        onChange={(e) => setFormDir({ ...formDir, ciudad: (e.currentTarget as HTMLSelectElement).value })}
                                                        class={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        <option value="" disabled>Selecciona una ciudad...</option>
                                                        {ciudadesList.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div class="space-y-1.5 md:col-span-2">
                                                    <label class="text-xs font-bold text-slate-500">Indicaciones adicionales <span class="text-slate-300 font-normal">(Opcional)</span></label>
                                                    <input type="text" value={formDir.descripcion || ''} onInput={(e) => setFormDir({ ...formDir, descripcion: (e.target as HTMLInputElement).value })} class={inputClass} placeholder="Dejar en recepción, casa de esquina roja..." />
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-3 pt-4 mt-2 border-t border-slate-100">
                                                <button type="button" onClick={() => setMostrarForm(false)} disabled={cargandoDir} class="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors disabled:opacity-50">
                                                    Cancelar
                                                </button>
                                                <button type="submit" disabled={cargandoDir} class="flex-1 px-4 py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                                    {cargandoDir && <Loader size={15} class="animate-spin" />}
                                                    {direccionEditando ? 'Actualizar' : 'Guardar dirección'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                ) : direcciones.length === 0 ? (
                                    <div class="bg-white rounded-3xl border border-slate-100 p-16 text-center shadow-sm">
                                        <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <MapPin size={26} class="text-slate-300" />
                                        </div>
                                        <h3 class="font-bold text-slate-800 mb-1">Sin direcciones guardadas</h3>
                                        <p class="text-sm text-slate-400 font-medium">Al completar tu primera compra se guardará tu dirección automáticamente.</p>
                                    </div>
                                ) : (
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {direcciones.map((dir) => (
                                            <div key={dir.id} class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
                                                <div class="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-brand-100/40 to-indigo-100/40 rounded-full pointer-events-none"></div>
                                                <div>
                                                    <div class="flex items-start gap-3 mb-4">
                                                        <div class="w-10 h-10 bg-gradient-to-br from-brand-100 to-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                                                            <MapPin size={17} class="text-brand-600" />
                                                        </div>
                                                        <div class="flex-1 min-w-0">
                                                            <p class="font-black text-slate-800 text-sm">{dir.nombre_usuario}</p>
                                                            <p class="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                                                                <Phone size={10} class="text-brand-400" /> {dir.celular}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4 space-y-1">
                                                        <p class="text-sm font-bold text-slate-700 leading-snug">{dir.direccion_envio}</p>
                                                        <p class="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />{dir.ciudad}, {dir.departamento}</p>
                                                        {dir.descripcion && <p class="text-xs text-slate-400 italic border-t border-slate-100 pt-1 mt-1">"{dir.descripcion}"</p>}
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <button onClick={() => abrirFormEditarDir(dir)} disabled={cargandoDir} class="flex-1 px-3 py-2 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors border border-brand-100">
                                                        Editar
                                                    </button>
                                                    <button onClick={() => borrarDireccion(dir.id)} disabled={cargandoDir} class="flex-1 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-100">
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════ SECCIÓN: PERFIL ══════════ */}
                        {seccion === 'perfil' && (
                            <div>
                                <div class="flex items-center gap-3 mb-5">
                                    <div class="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                                        <User size={17} class="text-brand-600" />
                                    </div>
                                    <div>
                                        <h2 class="text-lg font-black text-slate-900">Mi perfil</h2>
                                        <p class="text-xs text-slate-400 font-medium">Información de tu cuenta</p>
                                    </div>
                                </div>

                                <div class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                                    {/* Cabecera de perfil */}
                                    <div class="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
                                        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg shadow-brand-500/20">
                                            {iniciales}
                                        </div>
                                        <div>
                                            <h3 class="font-black text-slate-900 text-base">{usuario?.nombre}</h3>
                                            <p class="text-sm text-slate-500 font-medium">Cliente registrado</p>
                                            <p class="text-xs text-slate-400 font-medium mt-1 flex items-center gap-1">
                                                <Calendar size={10} /> Miembro desde {usuario?.created_at ? formatearFecha(usuario.created_at) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Grid de datos */}
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><User size={11} /> Nombre</p>
                                            <p class="font-bold text-slate-800 text-sm">{usuario?.nombre || '—'}</p>
                                        </div>
                                        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Mail size={11} /> Correo</p>
                                            <p class="font-bold text-slate-800 text-sm break-all line-clamp-2">{usuario?.correo || '—'}</p>
                                        </div>
                                        <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Phone size={11} /> Celular</p>
                                            <p class={`font-bold text-sm ${usuario?.celular ? 'text-slate-800' : 'text-slate-300'}`}>
                                                {usuario?.celular || 'Sin celular registrado'}
                                            </p>
                                        </div>
                                        <div class="bg-gradient-to-br from-brand-50 to-indigo-50 rounded-2xl p-4 border border-brand-100">
                                            <p class="text-xs font-bold text-brand-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Package size={11} /> Pedidos realizados</p>
                                            {cargandoOrdenes
                                                ? <Loader size={18} class="animate-spin text-brand-500" />
                                                : <p class="font-black text-slate-800 text-2xl">{ordenes.length}</p>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </main>
                </div>
            </div>

            {/* ══════════ MODAL DE DETALLE DE ORDEN ══════════ */}
            {(cargandoDetalle || ordenDetalle) && (
                <div
                    class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                    style="animation: fadeIn 0.2s ease-out forwards"
                    onClick={cerrarDetalle}
                >
                    <div
                        class="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden shadow-2xl border border-white/30 flex flex-col my-auto"
                        style="animation: scaleUp 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header modal */}
                        <div class="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                            <div>
                                <h3 class="text-base font-black text-slate-900">Detalle del pedido</h3>
                                {ordenDetalle && (
                                    <p class="text-xs text-slate-400 font-mono mt-0.5">#{ordenDetalle.id.split('-')[0].toUpperCase()}</p>
                                )}
                            </div>
                            <button
                                onClick={cerrarDetalle}
                                class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                            >
                                <X size={17} class="text-slate-500" />
                            </button>
                        </div>

                        {/* Cuerpo */}
                        <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5">

                            {cargandoDetalle && !ordenDetalle && (
                                <div class="flex flex-col items-center justify-center py-16 gap-3">
                                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                                        <Loader size={22} class="animate-spin text-white" />
                                    </div>
                                    <p class="text-sm font-medium text-slate-400">Cargando detalle...</p>
                                </div>
                            )}

                            {ordenDetalle && (() => {
                                const estadoPagoNorm = (ordenDetalle.estado_pago || '').toUpperCase();
                                const estadoEnvioNorm = (ordenDetalle.estado_envio || '').toUpperCase();
                                const estP = estadoPagoConfig[estadoPagoNorm] ?? { color: 'bg-slate-50 text-slate-600 border-slate-200', label: ordenDetalle.estado_pago || '—', dot: 'bg-slate-300' };
                                const estE = estadoEnvioConfig[estadoEnvioNorm] ?? { color: 'bg-slate-50 text-slate-600 border-slate-200', label: ordenDetalle.estado_envio || 'Pendiente envío', dot: 'bg-slate-300' };
                                const reqPagoAprobado = estadoPagoNorm === 'APPROVED';
                                return (
                                    <>
                                        {/* Badges de estado */}
                                        <div class="flex flex-wrap gap-2">
                                            <span class={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold ${estP.color}`}>
                                                <span class={`w-1.5 h-1.5 rounded-full ${estP.dot}`}></span>
                                                <CreditCard size={10} /> Estado de Transacción: {estP.label}
                                            </span>
                                            {reqPagoAprobado && (
                                                <span class={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold ${estE.color}`}>
                                                    <span class={`w-1.5 h-1.5 rounded-full ${estE.dot}`}></span>
                                                    <Truck size={10} /> Estado Envío: {estE.label}
                                                </span>
                                            )}
                                            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold bg-slate-50 text-slate-500 border-slate-200">
                                                <Calendar size={10} /> {formatearFecha(ordenDetalle.created_at)}
                                            </span>
                                        </div>

                                        {/* Productos */}
                                        <div>
                                            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Productos del pedido</p>
                                            <div class="space-y-2.5">
                                                {(ordenDetalle.productos ?? []).map((prod, i) => (
                                                    <div key={`${prod.id_producto}-${i}`} class="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                                        {/* Imagen */}
                                                        <div class="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                                            {prod.imagen
                                                                ? <img src={getMinioUrl(prod.imagen, 'productos')} alt={prod.nombre} class="w-full h-full object-cover" />
                                                                : <Package size={22} class="text-slate-300" />
                                                            }
                                                        </div>
                                                        {/* Info */}
                                                        <div class="flex-1 min-w-0">
                                                            <p class="font-bold text-slate-800 text-sm leading-tight line-clamp-2 select-text">{prod.nombre}</p>
                                                            {prod.marca && <p class="text-xs text-slate-400 font-medium mt-0.5">{prod.marca}</p>}
                                                            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                                <span class="text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                                                                    × {prod.cantidad}
                                                                </span>
                                                                <span class="text-xs text-slate-400 font-medium">{formatearPrecio(prod.precio)} c/u</span>
                                                                {prod.descuento != null && prod.descuento > 0 && (
                                                                    <span class="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                                                                        -{prod.descuento}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {/* Subtotal */}
                                                        <div class="text-right shrink-0">
                                                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Sub</p>
                                                            <p class="text-sm font-black text-slate-900">{formatearPrecio(prod.sub_total)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Total y envío */}
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div class="bg-gradient-to-br from-brand-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-brand-500/20 flex flex-col justify-between">
                                                <div class="space-y-1.5 mb-4">
                                                    <div class="flex justify-between text-sm opacity-80 font-medium">
                                                        <span>Subtotal</span>
                                                        <span>{formatearPrecio(ordenDetalle.compra_total - (ordenDetalle.precio_envio || 0))}</span>
                                                    </div>
                                                    <div class="flex justify-between text-sm opacity-80 font-medium">
                                                        <span>Envío</span>
                                                        <span>{formatearPrecio(ordenDetalle.precio_envio || 0)}</span>
                                                    </div>
                                                </div>
                                                <div class="pt-3 border-t border-white/20">
                                                    <p class="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Total pagado</p>
                                                    <p class="text-2xl font-black">{formatearPrecio(ordenDetalle.compra_total)}</p>
                                                    {ordenDetalle.metodo_pago && (
                                                        <p class="text-xs opacity-70 font-medium mt-1.5 flex items-center gap-1"><CreditCard size={10} /> {ordenDetalle.metodo_pago}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                                                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Envío a</p>
                                                <p class="text-sm font-bold text-slate-800 leading-snug">{ordenDetalle.direccion_envio}</p>
                                                <p class="text-xs text-slate-500 font-medium flex items-center gap-1"><MapPin size={10} /> {ordenDetalle.ciudad}, {ordenDetalle.departamento}</p>
                                                {ordenDetalle.numero_guia && (
                                                    <div class="pt-2 mt-1 border-t border-slate-100">
                                                        <p class="text-xs text-indigo-600 font-bold flex items-center gap-1.5"><Truck size={11} /> Guía: {ordenDetalle.numero_guia}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Footer modal */}
                        <div class="px-6 py-4 border-t border-slate-100 shrink-0">
                            <button
                                onClick={cerrarDetalle}
                                class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ TOAST ══════════ */}
            {toast.show && (
                <div class="fixed bottom-6 right-6 z-50" style="animation: fadeInUp 0.3s ease-out forwards">
                    <div class={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border font-bold text-sm ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                        toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                            'bg-white border-slate-200 text-slate-800'
                        }`}>
                        {toast.type === 'success' && <CheckCircle2 size={18} class="text-emerald-500 shrink-0" />}
                        {toast.type === 'error' && <AlertCircle size={18} class="text-rose-500 shrink-0" />}
                        {toast.type === 'loading' && <Loader size={18} class="text-brand-500 animate-spin shrink-0" />}
                        <span class="tracking-wide">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* ══════════ MODAL ELIMINAR DIRECCIÓN ══════════ */}
            {modalEliminar.show && (
                <div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" style="animation: fadeIn 0.2s ease-out forwards">
                    <div class="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100" style="animation: scaleUp 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards">
                        <div class="p-8">
                            <div class="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-100">
                                <Trash2 size={24} class="text-rose-500" />
                            </div>
                            <h3 class="text-lg font-black text-slate-900 text-center mb-2">¿Eliminar dirección?</h3>
                            <p class="text-sm text-slate-500 text-center font-medium mb-7">Esta acción no se puede deshacer. Perderás permanentemente los datos de esta dirección.</p>
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
                                    {cargandoDir && <Loader size={15} class="animate-spin" />}
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes scaleUp {
                    from { opacity: 0; transform: scale(0.94); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}} />
        </div>
    );
}
