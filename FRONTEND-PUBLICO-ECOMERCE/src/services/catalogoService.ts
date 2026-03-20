import apiClient from './apiClient';
import { getMinioUrl, mapVariantImages } from '../utils/minio';

// ─────────────────────────────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface Variante {
    id: string;
    nombre: string;
    descripcion: string;
    precio: number;
    precio_descuento?: number | null;
    stock: number;
    visibilidad: boolean;
    /** URLs completas de MinIO (ya procesadas) */
    imagenes?: string[];
    [key: string]: any;
}

export interface Producto {
    id: string;
    id_marca: string;
    id_categoria: string;
    nombre_marca?: string;
    nombre_categoria?: string;
    visibilidad: boolean;
    variantes: Variante[];
    [key: string]: any;
}

export interface Marca {
    id: string;
    nombre: string;
    /** URL completa de MinIO de la imagen de la marca (ya procesada) */
    imagen_url?: string;
    [key: string]: any;
}

export interface Categoria {
    id: string;
    nombre: string;
    /** URL completa de MinIO de la imagen de la categoría (ya procesada) */
    imagen_url?: string;
    [key: string]: any;
}

export interface Elementos {
    marcas: Marca[];
    categorias: Categoria[];
}

export interface FiltrosProducto {
    search?: string;
    categoria?: string;
    marca?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS DE MAPEO DE IMÁGENES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte los nombres de archivo de imágenes de las variantes en URLs completas de MinIO.
 */
function mapearImagenesProducto(producto: any): Producto {
    return {
        ...producto,
        variantes: (producto.variantes ?? []).map(mapVariantImages),
    };
}

/**
 * Añade el campo `imagen_url` a marcas y categorías con la URL completa de MinIO.
 */
function mapearImagenElemento(elemento: any, folder: 'marcas' | 'categorias'): any {
    return {
        ...elemento,
        imagen_url: elemento.imagen ? getMinioUrl(elemento.imagen, folder) : '',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SERVICIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene la lista de productos del catálogo.
 * Las imágenes de las variantes se mapean automáticamente a URLs completas de MinIO.
 *
 * Ruta Gateway → Backend: GET /ecomerce-regenievex/conseguir-productos
 */
export async function getProductos(filtros: FiltrosProducto = {}): Promise<Producto[]> {
    const params: Record<string, string> = {};
    if (filtros.search) params.search = filtros.search;
    if (filtros.categoria) params.categoria = filtros.categoria;
    if (filtros.marca) params.marca = filtros.marca;

    const response = await apiClient.get<Producto[]>('/conseguir-productos', { params });
    return (response.data ?? []).map(mapearImagenesProducto);
}

/**
 * Obtiene las marcas y categorías disponibles.
 * Las imágenes de cada elemento se mapean automáticamente a URLs completas de MinIO.
 *
 * Ruta Gateway → Backend: GET /ecomerce-regenievex/conseguir-elementos
 */
export async function getElementos(): Promise<Elementos> {
    const response = await apiClient.get<Elementos>('/conseguir-elementos');
    const data = response.data;

    return {
        marcas: (data.marcas ?? []).map(m => mapearImagenElemento(m, 'marcas')),
        categorias: (data.categorias ?? []).map(c => mapearImagenElemento(c, 'categorias')),
    };
}

/**
 * Obtiene el detalle de un producto específico por su ID.
 * Las imágenes de las variantes se mapean automáticamente a URLs completas de MinIO.
 *
 * Ruta Gateway → Backend: GET /ecomerce-regenievex/conseguir-producto/:id
 */
export async function getProductoPorId(id: string): Promise<Producto> {
    const response = await apiClient.get<Producto>(`/conseguir-producto/${id}`);
    return mapearImagenesProducto(response.data);
}
