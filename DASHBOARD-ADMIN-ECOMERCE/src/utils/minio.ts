export type MinioFolder = 'productos' | 'marcas' | 'categorias';

export const getMinioUrl = (filename: string, folder: MinioFolder = 'productos'): string => {
    if (!filename) return '';
    // If it's already a full URL, return as is
    if (filename.startsWith('http')) return filename;

    const baseUrl = import.meta.env.VITE_MINIO_BROWSER_URL;
    if (!baseUrl) {
        console.warn("VITE_MINIO_BROWSER_URL no está configurada, las imágenes no cargarán correctamente.");
        return filename;
    }

    // Ensure no trailing slashes on base url and no leading slashes on filename
    const cleanBase = baseUrl.replace(/\/$/, "");
    const cleanFile = filename.replace(/^\//, "");

    return `${cleanBase}/ecomerce/${folder}/${cleanFile}`;
};

export const mapVariantImages = (variante: any) => {
    if (!variante.imagenes || !Array.isArray(variante.imagenes)) return variante;
    return {
        ...variante,
        imagenes: variante.imagenes.map((img: string) => getMinioUrl(img, 'productos'))
    };
};
