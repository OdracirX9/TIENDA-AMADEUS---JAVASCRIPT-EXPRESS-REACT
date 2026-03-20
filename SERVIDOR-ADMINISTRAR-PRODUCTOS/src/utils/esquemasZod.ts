import { z } from "zod";

export const CrearVarianteProductoZI = z.object({
    id: z.string().optional(),
    nombre: z.string().min(1, "El nombre es requerido"),
    descripcion: z.string().optional(),
    caracteristicas: z.record(z.string(), z.string()).optional(),
    imagenes: z.array(z.string()),
    stock: z.number().int().min(0, "El stock no puede ser negativo"),
    precio: z.number().min(0, "El precio no puede ser negativo"),
    visibilidad: z.boolean(),
    posicion: z.number().int()
}).strict();

export const POSTCrearProductoZI = z.object({
    id: z.string().optional(),
    id_marca: z.string().nullable(),
    id_categoria: z.string().nullable(),
    visibilidad: z.boolean(),
    variantes: z.array(CrearVarianteProductoZI).min(1, "Debe incluir al menos una variante"),
    carpetaImagenes: z.string()
}).strict();

export const POSTCrearElementoProductoZI = z.object({
    id: z.string().optional(),
    elemento: z.string().min(1, "El tipo de elemento es requerido"),
    carpetaImagenes: z.string(),
    nombre: z.string().min(1, "El nombre es requerido"),
    descripcion: z.string(),
    imagen: z.string()
}).strict();

export const PATCHActualizarProductoZI = POSTCrearProductoZI.partial();
export const ActualizarVarianteProductoZI = CrearVarianteProductoZI.partial();

export const PATCHActualizarElementoProductoZI = z.object({
    id: z.string().min(1, "El ID es requerido"),
    elemento: z.string().min(1, "El tipo de elemento es requerido"),
    carpetaImagenes: z.string().optional(),
    nombre: z.string().optional(),
    descripcion: z.string().optional(),
    imagen: z.string().optional()
}).strict();

const BaseLandingPageSchema = z.object({
    titulo: z.string().min(1, "El título es requerido"),
    descripcion: z.string().optional(),
    array_variantes: z.array(z.string()).optional(),
    posicion: z.number().int().optional(),
    visibilidad: z.boolean().optional()
});

export const POSTCrearLandingPageZI = BaseLandingPageSchema.extend({
    descripcion: z.string().optional().default(""),
    array_variantes: z.array(z.string()).optional().default([]),
    posicion: z.number().int().optional().default(0),
    visibilidad: z.boolean().optional().default(false)
}).strict();

export const PATCHActualizarLandingPageZI = BaseLandingPageSchema.partial().extend({
    id: z.string().uuid("Formato de UUID de Landing Page inválido").optional()
}).strict();
