// ─────────────────────────────────────────────────────────────────────────────
//  UTILIDAD  MinIO  —  FRONTEND-PUBLICO-ECOMERCE
//  Réplica exacta del dashboard (DASHBOARD-ADMIN-ECOMERCE/src/utils/minio.ts)
//  Las imágenes se guardan como nombres de archivo en la BD y se construye la
//  URL completa usando la variable de entorno VITE_MINIO_BROWSER_URL.
// ─────────────────────────────────────────────────────────────────────────────

export type MinioFolder = 'productos' | 'marcas' | 'categorias';

const BASE_URL = import.meta.env.VITE_MINIO_BROWSER_URL ?? '';

/**
 * Convierte un nombre de archivo almacenado en la BD en una URL pública de MinIO.
 *
 * @example
 * getMinioUrl('tempo-abc123.jpg', 'productos')
 * // → "https://bucket-production-757f.up.railway.app/ecomerce/productos/tempo-abc123.jpg"
 */
export const getMinioUrl = (filename: string, folder: MinioFolder = 'productos'): string => {
    if (!filename) return '';
    // Si ya es una URL completa (http/https), devolverla tal cual
    if (filename.startsWith('http')) return filename;

    if (!BASE_URL) {
        console.warn('[MinIO] VITE_MINIO_BROWSER_URL no configurada — las imágenes no cargarán.');
        return filename;
    }

    const cleanBase = BASE_URL.replace(/\/$/, '');
    const cleanFile = filename.replace(/^\//, '');

    return `${cleanBase}/ecomerce/${folder}/${cleanFile}`;
};

/**
 * Mapea todas las imágenes de una variante de nombres de archivo a URLs completas.
 */
export const mapVariantImages = (variante: any): any => {
    if (!variante?.imagenes || !Array.isArray(variante.imagenes)) return variante;
    return {
        ...variante,
        imagenes: variante.imagenes.map((img: string) => getMinioUrl(img, 'productos')),
    };
};

/**
 * Devuelve la imagen de miniatura de un elemento (marca o categoría).
 * El campo `imagen` en la BD es un nombre de archivo.
 */
export const getElementoImagen = (elemento: any, folder: MinioFolder = 'marcas'): string => {
    if (!elemento?.imagen) return '';
    return getMinioUrl(elemento.imagen, folder);
};

/**
 * Imagen principal de un producto (primera imagen de la primera variante visible).
 * Retorna un fallback de Unsplash si no hay imagen.
 */
export const getProductoImagenPrincipal = (producto: any): string => {
    const variantes = producto?.variantes ?? [];
    for (const v of variantes) {
        const imgs = v?.imagenes ?? [];
        if (imgs.length > 0) {
            return getMinioUrl(imgs[0], 'productos');
        }
    }
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop';
};
