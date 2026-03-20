import { z } from "zod"


export const PATCHDireccionEnvion = z.object({
    id: z.string(),
    nombre_usuario: z.string().optional().nullable(),
    descripcion: z.string().optional().nullable(),
    celular: z.string().optional().nullable(),
    direccion_envio: z.string().optional().nullable(),
    ciudad: z.string().optional().nullable(),
    departamento: z.string().optional().nullable()
})

export const PATCHUsuario = z.object({
    nombre: z.string().optional(),
    celular: z.string().optional(),
})

export const POSTDireccionEnvioI = z.object({
    nombre_usuario: z.string(),
    descripcion: z.string().optional().nullable(),
    celular: z.string(),
    direccion_envio: z.string(),
    ciudad: z.string(),
    departamento: z.string()
})

export const POSTRegistroI = z.object({
    nombre: z.string().min(2, "El nombre es requerido"),
    correo: z.string().email("Correo invalido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
}).strict()

export const POSTLoginI = z.object({
    correo: z.string().email("Correo invalido"),
    password: z.string().min(1, "La contraseña es requerida")
}).strict()