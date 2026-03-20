import { useState, useEffect } from 'preact/hooks';
import { getLandingPageFull } from '../services/landingPageService';
import type { LandingPageSeccion } from '../services/landingPageService';

export function useLandingPage() {
    const [data, setData] = useState<LandingPageSeccion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getLandingPageFull()
            .then(res => {
                setData(res);
                setError(null);
            })
            .catch(err => {
                console.error("Error al cargar landing page:", err);
                setError("No se pudieron cargar las secciones de la página.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return { data, loading, error };
}
