import { useState } from 'preact/hooks';
import { Link } from 'react-router-dom';

type Estado = 'formulario' | 'cargando' | 'exito';

export function RestablecerContrasenaPage() {
    const [estado, setEstado] = useState<Estado>('formulario');
    const [correo, setCorreo] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError(null);

        if (!correo) {
            setError('Por favor ingresa tu correo electrónico.');
            return;
        }

        setEstado('cargando');
        try {
            const apiUrl = import.meta.env.VITE_API_GATEWAY_URL + '/ecomerce-regenievex-usuarios';
            const response = await fetch(`${apiUrl}/auth/restablecer-contrasena`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo })
            });

            // Siempre muestra éxito (el backend responde 200 tanto si el correo
            // existe como si no, por seguridad)
            if (response.ok || response.status === 200) {
                setEstado('exito');
            } else {
                setError('Ocurrió un error. Por favor intenta de nuevo.');
                setEstado('formulario');
            }
        } catch {
            setError('Error de conexión. Por favor intenta de nuevo.');
            setEstado('formulario');
        }
    };

    return (
        <div class="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full animate-fade-in-up">
                <div class="text-center mb-8">
                    <Link to="/" class="inline-block transition-transform hover:scale-105">
                        <div class="h-14 w-auto mx-auto aspect-square bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-brand-500/30">
                            CN
                        </div>
                    </Link>
                    <h2 class="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
                        {estado === 'exito' ? '¡Solicitud enviada!' : 'Restablecer Contraseña'}
                    </h2>
                    <p class="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                        {estado === 'exito'
                            ? 'Revisa tu bandeja de entrada para continuar con el cambio.'
                            : 'Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.'}
                    </p>
                </div>

                <div class="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100 relative overflow-hidden group">
                    {/* Background glow */}
                    <div class="absolute -top-24 -right-24 w-48 h-48 bg-brand-100 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                    {/* ── Estado: Éxito ── */}
                    {estado === 'exito' && (
                        <div
                            class="relative z-10 flex flex-col items-center gap-6 py-4"
                            style={{ animation: 'fadeSlideIn 0.5s ease forwards' }}
                        >
                            <style>{`
                                @keyframes fadeSlideIn {
                                    from { opacity: 0; transform: translateY(20px); }
                                    to   { opacity: 1; transform: translateY(0); }
                                }
                            `}</style>

                            {/* Icono de sobre animado */}
                            <div class="flex items-center justify-center h-20 w-20 rounded-full bg-brand-50 border-4 border-white shadow-sm ring-4 ring-brand-100">
                                <svg class="h-10 w-10 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>

                            <p class="text-slate-500 text-center leading-relaxed text-sm">
                                Si el correo <span class="font-semibold text-slate-700">{correo}</span> está registrado en nuestra plataforma, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
                            </p>

                            <Link
                                to="/login"
                                class="group w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/25 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                            >
                                Volver al inicio de sesión
                                <span class="ml-2 transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                            </Link>
                        </div>
                    )}

                    {/* ── Estado: Formulario / Cargando ── */}
                    {estado !== 'exito' && (
                        <form class="space-y-6 relative z-10" onSubmit={handleSubmit}>

                            {/* Error */}
                            {error && (
                                <div class="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-sm font-medium">
                                    <svg class="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" class="block text-sm font-medium text-slate-700">
                                    Correo Electrónico
                                </label>
                                <div class="mt-2 relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                        </svg>
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        disabled={estado === 'cargando'}
                                        placeholder="ejemplo@correo.com"
                                        value={correo}
                                        onInput={(e) => setCorreo((e.target as HTMLInputElement).value)}
                                        class="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={estado === 'cargando'}
                                    class="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                >
                                    {estado === 'cargando'
                                        ? <><svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Enviando...</>
                                        : 'Enviar Enlace de Recuperación'
                                    }
                                </button>
                            </div>

                            <div class="text-center text-sm">
                                <span class="text-slate-500">¿Recordaste tu contraseña? </span>
                                <Link to="/login" class="font-medium text-brand-600 hover:text-brand-500 transition-colors">
                                    Inicia sesión aquí
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
