import type { ComponentChildren } from 'preact';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-preact';

interface CheckoutLayoutProps {
    children: ComponentChildren;
}

export function CheckoutLayout({ children }: CheckoutLayoutProps) {
    const navigate = useNavigate();

    return (
        <div class="min-h-screen flex flex-col bg-[#F8F9FA] font-sans text-slate-900 selection:bg-brand-200 selection:text-brand-900">
            {/* Simple Header */}
            <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div class="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
                    {/* Logo & Go Back */}
                    <div
                        class="flex items-center gap-4 group cursor-pointer"
                        onClick={() => navigate('/')}
                    >
                        <button class="p-2 text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100 rounded-full transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <div class="flex items-center gap-3">
                            <img src="/logo-completo-regenievex.webp" alt="RegeNievex Logo" class="h-10 object-contain group-hover:scale-105 transition-transform" />
                        </div>
                    </div>

                    <div class="text-sm font-semibold text-slate-500 md:text-base bg-slate-100 py-2 px-4 rounded-full flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Pago Seguro
                    </div>
                </div>
            </header>

            <main class="flex-1 w-full flex flex-col relative">
                {children}
            </main>
        </div>
    );
}
