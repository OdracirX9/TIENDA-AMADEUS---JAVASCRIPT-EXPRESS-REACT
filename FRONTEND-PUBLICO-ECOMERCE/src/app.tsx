import { useEffect } from 'preact/hooks';
import { Routes, Route, Outlet } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { CheckoutLayout } from './components/CheckoutLayout';
import { obtenerSesionUsuario } from './services/usuarioService';
import { clienteUser, authLoading } from './signals';
import { ScrollToTop } from './components/ScrollToTop';

// Pages
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { LoginPage } from './pages/LoginPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { ProcesarCompraPage } from './pages/ProcesarCompraPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { WaitingConfirmationPage } from './pages/WaitingConfirmationPage';
import { RegistroExitosoPage } from './pages/RegistroExitosoPage';
import { ConfirmacionRegistroPage } from './pages/ConfirmacionRegistroPage';
import { RestablecerContrasenaPage } from './pages/RestablecerContrasenaPage';
import { ConfirmacionRestablecerContrasenaPage } from './pages/ConfirmacionRestablecerContrasenaPage';

const PublicLayoutWrapper = () => (
  <PublicLayout>
    <Outlet />
  </PublicLayout>
);

const CheckoutLayoutWrapper = () => (
  <CheckoutLayout>
    <Outlet />
  </CheckoutLayout>
);

export function App() {
  // Check the session when the app loads
  useEffect(() => {
    obtenerSesionUsuario()
      .then(response => {
        clienteUser.value = response.usuario || null;
      })
      .catch(() => {
        clienteUser.value = null;
      })
      .finally(() => {
        authLoading.value = false;
      });
  }, []);

  if (authLoading.value) {
    return (
      <div class="min-h-screen bg-slate-50 flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayoutWrapper />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tienda" element={<CatalogPage />} />
          <Route path="/producto/:id" element={<ProductPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<UserDashboardPage />} />
          <Route path="/registro-exitoso" element={<RegistroExitosoPage />} />
          <Route path="/confirmacion-registro" element={<ConfirmacionRegistroPage />} />
          <Route path="/restablecer-contrasena" element={<RestablecerContrasenaPage />} />
          <Route path="/confirmacion-restablecer-contrasena" element={<ConfirmacionRestablecerContrasenaPage />} />
        </Route>

        <Route element={<CheckoutLayoutWrapper />}>
          <Route path="/procesar-compra" element={<ProcesarCompraPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/esperando-confirmacion" element={<WaitingConfirmationPage />} />
          <Route path="/confirmacion" element={<ConfirmationPage />} />
        </Route>

        <Route path="*" element={<div class="p-20 text-center font-bold text-2xl text-slate-500">404: Página no encontrada</div>} />
      </Routes>
    </>
  )
}
