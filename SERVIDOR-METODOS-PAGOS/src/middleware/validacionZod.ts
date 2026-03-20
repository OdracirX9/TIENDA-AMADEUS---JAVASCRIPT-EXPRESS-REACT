import { z, ZodSchema } from "zod"
import { Request, Response, NextFunction } from "express";


const limpiarUndefined = <T extends Record<string, any>>(objeto: T): Partial<T>=>{
    return Object.fromEntries(
        Object.entries(objeto).filter(([_clave, valor])=> valor !== undefined)
    ) as Partial<T>
}


export const validarBody = <T extends ZodSchema>(schema:T)=>{
    return (req: Request, res:Response, next:NextFunction)=>{
        const resultado = schema.safeParse(req.body)


        if(!resultado.success){
            return res.status(400).json("Datos invalidos para procesar")
        }

        req.body = limpiarUndefined(resultado.data as Record<string, any>);
        next();

    }
}