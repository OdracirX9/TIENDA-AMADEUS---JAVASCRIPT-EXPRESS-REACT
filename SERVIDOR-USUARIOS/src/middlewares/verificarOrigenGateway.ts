import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verificarOrigenGateway = (req: Request, res: Response, next: NextFunction) => {
    const headerValidacion = req.headers['imagine-dragons'] as string;

    if (!headerValidacion) {
        return res.status(403).json({ error: "Acceso denegado. Las peticiones deben pasar por el API Gateway." });
    }

    try {
        const claveSecreta = process.env.TOKEN_AUTORIZACION_ECOMCERCE || "Sin-Clave";
        const decodificado: any = jwt.verify(headerValidacion, claveSecreta);

        if (decodificado.origin !== "Api GateWay de E-comerce") {
            return res.status(403).json({ error: "Firma de Gateway inválida." });
        }

        next();
    } catch (error) {
        return res.status(403).json({ error: "Petición rechazada." });
    }
}
