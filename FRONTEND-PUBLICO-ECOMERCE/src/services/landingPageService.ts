import apiClient from './apiClient';
import { mapVariantImages } from '../utils/minio';
import type { Producto } from './catalogoService';

export interface LandingPageSeccion {
    id: string;
    titulo: string;
    descripcion: string;
    array_variantes: string[];
    posicion: number;
    visibilidad: boolean;
    productos: Producto[];
}

/**
 * Obtiene la estructura completa de la Landing Page (secciones + productos).
 * Las imágenes de los productos se mapean automáticamente a URLs de MinIO.
 */
export async function getLandingPageFull(): Promise<LandingPageSeccion[]> {
    const response = await apiClient.get<LandingPageSeccion[]>('/landing-page/full');
    const data = response.data ?? [];

    return data.map(seccion => ({
        ...seccion,
        productos: (seccion.productos ?? []).map(p => ({
            ...p,
            variantes: (p.variantes ?? []).map(mapVariantImages)
        }))
    }));
}
