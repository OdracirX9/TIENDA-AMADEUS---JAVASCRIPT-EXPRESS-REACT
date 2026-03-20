import { useEffect, useState } from 'preact/hooks';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

type EstadoConfirmacion = 'cargando' | 'exito' | 'error';

export function ConfirmacionRegistroPage() {
    const [estado, setEstado] = useState<EstadoConfirmacion>('cargando');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');

        // Si no hay token en la URL, redirigir directamente a 404
        if (!token) {
            navigate('*', { replace: true });
            return;
        }

        const confirmarCuenta = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_GATEWAY_URL + "/ecomerce-regenievex-usuarios";
                const response = await fetch(
                    `${apiUrl}/auth/confirmar-registro?token=${encodeURIComponent(token)}`,
                    { method: 'GET' }
                );

                if (response.ok) {
                    setEstado('exito');
                } else {
                    // 404 u otro error → redirigir a página 404
                    navigate('*', { replace: true });
                }
            } catch {
                navigate('*', { replace: true });
            }
        };

        confirmarCuenta();
    }, []);

    // ─── Estado: Cargando ────────────────────────────────────────────────────
    if (estado === 'cargando') {
        return (
            <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center gap-6">
                    <div class="w-16 h-16 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin" />
                    <p class="text-slate-500 font-medium text-center">Verificando tu cuenta, por favor espera...</p>
                </div>
            </div>
        );
    }

    // ─── Estado: Éxito ───────────────────────────────────────────────────────
    return (
        <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div class="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
                {/* Glow effect */}
                <div class="absolute inset-0 bg-gradient-to-tr from-green-400/20 to-brand-500/20 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                <div class="p-10 text-center relative z-10">
                    {/* Animated Success Checkmark */}
                    <div class="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-8 border-4 border-white shadow-sm ring-4 ring-green-50/50">
                        <svg class="h-12 w-12 text-green-500 animate-[bounce_1s_infinite_alternate]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>

                    <h2 class="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">¡Cuenta Confirmada!</h2>

                    <p class="text-slate-500 text-lg mb-8 leading-relaxed">
                        Tu dirección de correo electrónico ha sido verificada con éxito. Ya puedes acceder a todas las funcionalidades de <span class="font-semibold text-slate-700">Clínica Nieves</span>.
                    </p>

                    <Link
                        to="/login"
                        class="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-brand-600 hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-300 ease-in-out shadow-lg hover:shadow-brand-500/30 overflow-hidden"
                    >
                        <span class="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black pointer-events-none"></span>
                        Iniciar Sesión Ahora
                        <span class="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                            &rarr;
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
