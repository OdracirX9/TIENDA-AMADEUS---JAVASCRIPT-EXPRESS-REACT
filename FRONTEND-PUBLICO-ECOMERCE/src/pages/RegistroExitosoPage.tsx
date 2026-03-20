import { Link } from 'react-router-dom';

export function RegistroExitosoPage() {
    return (
        <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
                {/* Header Illustration / Accent */}
                <div class="bg-gradient-to-r from-brand-500 to-brand-600 h-32 flex items-center justify-center relative overflow-hidden">
                    {/* Decorative circles */}
                    <div class="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                    <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>

                    {/* Success Icon */}
                    <div class="bg-white p-4 rounded-full shadow-lg relative z-10 translate-y-8">
                        <svg class="w-12 h-12 text-brand-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <div class="pt-16 pb-10 px-8 text-center">
                    <h2 class="text-2xl font-bold tracking-tight text-slate-800 mb-2">¡Registro Exitoso!</h2>
                    <p class="text-slate-500 mb-8 leading-relaxed">
                        Gracias por unirte a Clínica Nieves. Hemos enviado un mensaje a tu correo electrónico.
                        <span class="block mt-2 font-medium text-slate-700">Por favor, ve a tu bandeja de entrada para confirmar tu registro.</span>
                    </p>

                    <Link
                        to="/"
                        class="inline-block w-full px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
                    >
                        Volver al Inicio
                    </Link>
                </div>
            </div>

            {/* Footer minimalista */}
            <div class="mt-8 text-sm text-slate-400">
                ¿No recibiste el correo? Revisa tu carpeta de Spam.
            </div>
        </div>
    );
}
