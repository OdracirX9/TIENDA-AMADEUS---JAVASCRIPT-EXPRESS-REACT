import { useEffect } from 'preact/hooks';
import { useLocation } from 'react-router-dom';

/**
 * Componente que reinicia el scroll a (0,0) cada vez que la ruta cambia.
 * Debe ser renderizado dentro del BrowserRouter pero fuera de las Rutas si se quiere global.
 */
export function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
