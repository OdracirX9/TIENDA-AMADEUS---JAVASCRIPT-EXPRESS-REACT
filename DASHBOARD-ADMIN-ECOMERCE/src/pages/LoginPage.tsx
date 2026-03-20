import { useState } from 'preact/hooks';
import { Store, Eye, EyeOff, LogIn } from 'lucide-preact';
import { authApi } from '../api';
import { adminUser, showToast } from '../signals';

export function LoginPage() {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!correo || !password) {
            setError('Por favor, completa todos los campos requeridos.');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const res = await authApi.login(correo, password);
            adminUser.value = res.data.admin || { correo };
            showToast('Bienvenido al panel de administración', 'success');
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Credenciales inválidas, intenta nuevamente.';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class="min-h-screen bg-bg-dark flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative background glows */}
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
            <div class="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

            <div class="relative w-full max-w-[400px] animate-fade-in">
                {/* Main Card */}
                <div class="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden glass-panel">

                    <div class="px-8 pt-10 pb-6 text-center border-b border-slate-100">
                        <div class="w-14 h-14 rounded-2xl bg-brand-500 mx-auto mb-5 flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <Store size={26} class="text-white" />
                        </div>
                        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Admin Dashboard</h1>
                        <p class="text-sm text-slate-500 mt-2">Acceso exclusivo para gestores</p>
                    </div>

                    <form onSubmit={handleSubmit} class="px-8 py-8 flex flex-col gap-5">
                        {error && (
                            <div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 animate-fade-in font-medium">
                                {error}
                            </div>
                        )}

                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                            <input
                                type="email"
                                value={correo}
                                onInput={(e) => setCorreo((e.target as HTMLInputElement).value)}
                                placeholder="ej: admin@clinicanieves.com"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
                                required
                            />
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <label class="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Contraseña</label>
                            <div class="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                                    placeholder="••••••••"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            class="mt-4 w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-brand-500/30 hover:shadow-lg hover:shadow-brand-500/40 cursor-pointer"
                        >
                            {loading ? (
                                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Ingresar al sistema
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p class="text-center text-xs text-slate-500 mt-6 font-medium">
                    Sistema Seguro Clínicas Nieves &copy; 2026
                </p>
            </div>
        </div>
    );
}
