import { useEffect } from 'preact/hooks';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { authApi } from './api';
import { adminUser, authLoading, isAuthenticated } from './signals';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { CreateProductPage } from './pages/CreateProductPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { EditProductPage } from './pages/EditProductPage';
import { ElementsPage } from './pages/ElementsPage';
import { ElementFormPage } from './pages/ElementFormPage';
import { OrdersPage } from './pages/OrdersPage';
import { OptionsPage } from './pages/OptionsPage';
import { ClientsPage } from './pages/ClientsPage';
import { ShippingPage } from './pages/ShippingPage';
import { LandingPageSettings } from './pages/LandingPageSettings';

export function App() {
  // Check the session when the app loads
  useEffect(() => {
    authApi.sesion()
      .then(response => {
        adminUser.value = response.data?.admin || response.data || null;
      })
      .catch(() => {
        adminUser.value = null;
      })
      .finally(() => {
        authLoading.value = false;
      });
  }, []);

  // Show a full-screen loading spinner while checking the session
  if (authLoading.value) {
    return (
      <div class="min-h-screen bg-bg-dark flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-brand-500/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated, force them to the LoginPage
  if (!isAuthenticated.value) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  // If authenticated, render the router with the protected Dashboard
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/productos" element={<ProductsPage />} />
        <Route path="/productos/nuevo" element={<CreateProductPage />} />
        <Route path="/productos/editar/:id" element={<EditProductPage />} />
        <Route path="/productos/:id" element={<ProductDetailsPage />} />

        {/* Categories */}
        <Route path="/categorias" element={<ElementsPage titulo="Categorías" tipoData="categorias" tipoTabla="categorias_producto" />} />
        <Route path="/categorias/nuevo" element={<ElementFormPage endpointTipo="categorias" titulo="Categoría" />} />
        <Route path="/categorias/editar/:id" element={<ElementFormPage endpointTipo="categorias" titulo="Categoría" />} />

        {/* Brands */}
        <Route path="/marcas" element={<ElementsPage titulo="Marcas" tipoData="marcas" tipoTabla="marcas_producto" />} />
        <Route path="/marcas/nuevo" element={<ElementFormPage endpointTipo="marcas" titulo="Marca" />} />
        <Route path="/marcas/editar/:id" element={<ElementFormPage endpointTipo="marcas" titulo="Marca" />} />

        {/* Orders */}
        <Route path="/ordenes" element={<OrdersPage />} />

        {/* Clients */}
        <Route path="/clientes" element={<ClientsPage />} />

        {/* Shipping / Logística */}
        <Route path="/shipping" element={<ShippingPage />} />

        {/* Opciones */}
        <Route path="/opciones" element={<OptionsPage />} />


        {/* Landing Page */}
        <Route path="/landing-page" element={<LandingPageSettings />} />

        <Route
          path="*"
          element={
            <div class="min-h-screen bg-bg-dark flex items-center justify-center flex-col gap-4">
              <h1 class="text-4xl font-bold text-slate-800">404</h1>
              <p class="text-slate-500 font-medium">Página no encontrada</p>
              <a href="/" class="text-brand-600 hover:text-brand-700 font-semibold transition-colors">Volver al inicio</a>
            </div>
          }
        />
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
}
