import type { ComponentChildren } from 'preact';
import { ShoppingBag, User, Menu, X } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useNavigate } from 'react-router-dom';
import { NavbarSearch } from './NavbarSearch';
import { isAuthenticated, clienteUser } from '../signals';
import { ShoppingCartSidebar } from './ShoppingCartSidebar';
import { isCartOpen } from '../signals/ui';
import { cartSignal } from '../signals/cart';

interface PublicLayoutProps {
    children: ComponentChildren;
}

export function PublicLayout({ children }: PublicLayoutProps) {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const closeMobile = () => setIsMobileMenuOpen(false);

    return (
        <div class="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900 selection:bg-brand-200 selection:text-brand-900">

            {/* ── Navbar Glassmorfismo ──────────────────────────────────────── */}
            <header class="fixed top-0 inset-x-0 z-50 glass border-b border-white/20 transition-all">
                <div class="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between gap-8">

                    {/* Logo */}
                    <div
                        class="flex items-center gap-3 cursor-pointer group shrink-0"
                        onClick={() => navigate('/')}
                    >
                        <img src="/logo-completo-regenievex.webp" alt="RegeNievex Logo" class="h-10 object-contain group-hover:scale-105 transition-transform" />
                    </div>

                    {/* Buscador central (desktop) */}
                    <div class="hidden md:flex flex-1">
                        <NavbarSearch />
                    </div>

                    {/* Acciones derecha (desktop) */}
                    <div class="hidden md:flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => navigate(isAuthenticated.value ? '/dashboard' : '/login')}
                            class="flex items-center gap-2 p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                        >
                            <User size={22} />
                            <span class="hidden lg:block text-sm font-bold">
                                {isAuthenticated.value && clienteUser.value ? `Hola, ${clienteUser.value.nombre.split(' ')[0]}` : 'Iniciar Sesión'}
                            </span>
                        </button>
                        <button
                            onClick={() => isCartOpen.value = true}
                            class="relative p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
                        >
                            <ShoppingBag size={22} />
                            {cartSignal.value.length > 0 && (
                                <span class="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                                    {cartSignal.value.reduce((acc, current) => acc + current.cantidad, 0)}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Toggle menú móvil y carrito */}
                    <div class="flex items-center gap-2 md:hidden mr-1">
                        <button
                            onClick={() => isCartOpen.value = true}
                            class="relative p-2 text-slate-600 cursor-pointer"
                        >
                            <ShoppingBag size={24} />
                            {cartSignal.value.length > 0 && (
                                <span class="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                                    {cartSignal.value.reduce((acc, current) => acc + current.cantidad, 0)}
                                </span>
                            )}
                        </button>
                        <button
                            class="p-2 text-slate-600 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Menú móvil ───────────────────────────────────────────────── */}
            {isMobileMenuOpen && (
                <div class="md:hidden fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm pt-20">
                    <div class="bg-white h-full w-4/5 max-w-sm p-6 shadow-2xl flex flex-col gap-6">

                        {/* Buscador en menú móvil */}
                        <NavbarSearch fullWidth onNavigate={closeMobile} />

                        {/* Navegación */}
                        <nav class="space-y-1">
                            <button
                                onClick={() => { navigate('/'); closeMobile(); }}
                                class="w-full text-left px-3 py-3 rounded-xl font-bold text-lg text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                            >
                                Inicio
                            </button>
                            <button
                                onClick={() => { navigate('/tienda'); closeMobile(); }}
                                class="w-full text-left px-3 py-3 rounded-xl font-bold text-lg text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                            >
                                Catálogo
                            </button>
                            <button
                                onClick={() => { navigate(isAuthenticated.value ? '/dashboard' : '/login'); closeMobile(); }}
                                class="w-full text-left px-3 py-3 rounded-xl font-bold text-lg text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                            >
                                {isAuthenticated.value && clienteUser.value ? `Hola, ${clienteUser.value.nombre}` : 'Iniciar Sesión'}
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {/* ── Contenido principal ───────────────────────────────────────── */}
            <main class="flex-1 w-full pt-20">
                {children}
            </main>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <footer class="bg-white border-t border-slate-200 mt-auto">
                <div class="max-w-[1400px] mx-auto px-6 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div class="md:col-span-2">
                        <div class="flex items-center gap-2 mb-4">
                            <img src="/logo-completo-regenievex.webp" alt="RegeNievex Logo" class="h-8 object-contain" />
                        </div>
                        <p class="text-sm font-medium text-slate-500 max-w-sm leading-relaxed">
                            Diseñado para ofrecer la mejor experiencia de usuario en compras online. Rápido, seguro y estéticamente superior.
                        </p>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 mb-4 tracking-tight">Comprar</h4>
                        <ul class="space-y-3 text-sm font-medium text-slate-500">
                            <li><a href="#" class="hover:text-brand-600 transition-colors">Novedades</a></li>
                            <li><a href="#" class="hover:text-brand-600 transition-colors">Más Vendidos</a></li>
                            <li><a href="#" class="hover:text-brand-600 transition-colors">Ofertas</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="font-bold text-slate-800 mb-4 tracking-tight">Soporte</h4>
                        <ul class="space-y-3 text-sm font-medium text-slate-500">
                            <li><a href="#" class="hover:text-brand-600 transition-colors">Contacto</a></li>
                            <li><a href="#" class="hover:text-brand-600 transition-colors">Envíos y devoluciones</a></li>
                            <li><a href="#" class="hover:text-brand-600 transition-colors">Garantías</a></li>
                        </ul>
                    </div>
                </div>
            </footer>

            {/* ── Slidebar del Carrito ───────────────────────────────────────── */}
            <ShoppingCartSidebar
                isOpen={isCartOpen.value}
                onClose={() => isCartOpen.value = false}
            />
        </div>
    );
}
