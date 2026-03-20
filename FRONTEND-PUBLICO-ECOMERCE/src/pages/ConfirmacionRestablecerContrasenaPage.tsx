import { useState, useEffect } from 'preact/hooks';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

type Estado = 'formulario' | 'cargando' | 'exito';

export function ConfirmacionRestablecerContrasenaPage() {
    const [estado, setEstado] = useState<Estado>('formulario');
    const [nuevaContrasena, setNuevaContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const tokenUrl = searchParams.get('token');
        if (!tokenUrl) {
            navigate('*', { replace: true });
            return;
        }
        setToken(tokenUrl);
    }, []);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setError(null);

        if (nuevaContrasena.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (nuevaContrasena !== confirmarContrasena) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setEstado('cargando');
        try {
            const apiUrl = import.meta.env.VITE_API_GATEWAY_URL + '/ecomerce-regenievex-usuarios';
            const response = await fetch(`${apiUrl}/auth/restablecer-contrasena`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, nuevaContrasena })
            });

            if (response.ok) {
                setEstado('exito');
            } else {
                navigate('*', { replace: true });
            }
        } catch {
            navigate('*', { replace: true });
        }
    };

    return (
        <div class="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full">

                {/* ── Logo header ─────────────────────────────────────────── */}
                <div class="text-center mb-8">
                    <Link to="/" class="inline-block transition-transform hover:scale-105">
                        <div class="h-14 w-auto mx-auto aspect-square bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-brand-500/30">
                            CN
                        </div>
                    </Link>
                    <h2 class="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
                        {estado === 'exito' ? '¡Contraseña actualizada!' : 'Crea una nueva contraseña'}
                    </h2>
                    <p class="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                        {estado === 'exito'
                            ? 'Tu contraseña fue cambiada exitosamente.'
                            : 'Asegúrate de que tu nueva contraseña sea segura.'}
                    </p>
                </div>

                <div class="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100 relative overflow-hidden group">
                    {/* Background glow */}
                    <div class="absolute -bottom-24 -left-24 w-60 h-60 bg-brand-100 rounded-full blur-3xl opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

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

                            {/* Checkmark animado */}
                            <div class="flex items-center justify-center h-20 w-20 rounded-full bg-green-100 border-4 border-white shadow-sm ring-4 ring-green-50">
                                <svg class="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>

                            <p class="text-slate-500 text-center leading-relaxed">
                                Ya puedes iniciar sesión en tu cuenta con tu nueva contraseña.
                            </p>

                            <Link
                                to="/login"
                                class="group w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/25 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                            >
                                Ir a Iniciar Sesión
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

                            {/* Nueva contraseña */}
                            <div>
                                <label htmlFor="new-password" class="block text-sm font-medium text-slate-700">
                                    Nueva Contraseña
                                </label>
                                <div class="mt-2 relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        id="new-password"
                                        type="password"
                                        required
                                        disabled={estado === 'cargando'}
                                        placeholder="••••••••"
                                        value={nuevaContrasena}
                                        onInput={(e) => setNuevaContrasena((e.target as HTMLInputElement).value)}
                                        class="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 disabled:opacity-60"
                                    />
                                </div>
                            </div>

                            {/* Confirmar contraseña */}
                            <div>
                                <label htmlFor="confirm-password" class="block text-sm font-medium text-slate-700">
                                    Confirmar Nueva Contraseña
                                </label>
                                <div class="mt-2 relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg class="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-1.998A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        required
                                        disabled={estado === 'cargando'}
                                        placeholder="••••••••"
                                        value={confirmarContrasena}
                                        onInput={(e) => setConfirmarContrasena((e.target as HTMLInputElement).value)}
                                        class="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 disabled:opacity-60"
                                    />
                                </div>
                                <p class="mt-2 text-xs text-slate-400">Mínimo 6 caracteres.</p>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={estado === 'cargando'}
                                    class="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                >
                                    {estado === 'cargando'
                                        ? <><svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Guardando...</>
                                        : 'Guardar Nueva Contraseña'
                                    }
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
