import { z } from "zod"


const variantesEsquema = z.object({
    id: z.string(),
    cantidad: z.number()
}).strict()


export const POSTGenerarPagoI = z.object({
    variantes: z.array(variantesEsquema),
    direccion_envio_id: z.string()

}).strict()