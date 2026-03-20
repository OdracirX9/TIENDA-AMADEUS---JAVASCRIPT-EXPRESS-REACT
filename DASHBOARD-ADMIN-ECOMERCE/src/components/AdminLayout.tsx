import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { LogOut, Package, ShoppingCart, TrendingUp, Users, LayoutDashboard, Settings, Tag, Layers, Truck, Monitor, Menu, X } from 'lucide-preact';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { adminUser, showToast } from '../signals';
import { authApi } from '../api';

interface AdminLayoutProps {
    children: ComponentChildren;
    title?: string;
}

export function AdminLayout({ children, title = 'Panel de Control' }: AdminLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await authApi.logout();
            adminUser.value = null;
            showToast('Sesión cerrada correctamente', 'success');
        } catch {
            showToast('Error al cerrar sesión', 'error');
        }
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Resumen', path: '/' },
        { icon: Package, label: 'Productos', path: '/productos' },
        { icon: Tag, label: 'Categorías', path: '/categorias' },
        { icon: Layers, label: 'Marcas', path: '/marcas' },
        { icon: ShoppingCart, label: 'Órdenes', path: '/ordenes' },
        { icon: Users, label: 'Clientes', path: '/clientes' },
        { icon: Truck, label: 'Logística de Envío', path: '/shipping' },
        { icon: Monitor, label: 'Landing Page', path: '/landing-page' },
        { icon: Settings, label: 'Opciones', path: '/opciones' },
    ];

    return (
        <div class="h-screen bg-slate-50 flex overflow-hidden font-sans">
            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div
                    class="fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm md:hidden animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside class={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col h-screen z-[70] shadow-xl md:shadow-sm transition-transform duration-300 transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div class="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 mr-3">
                            <Package size={16} class="text-white" />
                        </div>
                        <span class="font-bold text-slate-800 tracking-tight">Regenievex UI</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        class="md:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav class="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item, i) => {
                        const active = location.pathname === item.path;
                        return (
                            <Link
                                key={i}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                class={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-sm font-medium ${active
                                    ? 'bg-brand-50 text-brand-600 border border-brand-200 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
                                    }`}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div class="p-4 border-t border-slate-100 shrink-0">
                    <div class="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div class="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
                            {adminUser.value?.correo?.substring(0, 2).toUpperCase() || 'AD'}
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <p class="text-xs font-semibold text-slate-800 truncate">{adminUser.value?.correo || 'Administrador'}</p>
                            <p class="text-[10px] text-slate-500">Super Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-sm font-medium cursor-pointer"
                    >
                        <LogOut size={16} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main class="flex-1 flex flex-col min-h-0 w-full relative bg-slate-50/50 overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-64 bg-brand-50 pointer-events-none z-0" />

                {/* Topbar */}
                <header class="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 shrink-0">
                    <div class="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            class="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 class="text-base md:text-lg font-semibold text-slate-800 truncate max-w-[200px] md:max-w-none">{title}</h2>
                    </div>
                    <div class="hidden sm:block text-sm text-slate-500 font-medium">Panel de Control</div>
                </header>

                {/* Content Area */}
                <div class="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
}
