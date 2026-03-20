import { Request, Response, NextFunction } from "express";

export const comprobarSesionAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Verificar si existe una sesion de admin en req.session
    if (req.session && (req.session as any).admin) {
        next();
    } else {
        return res.status(401).json({ error: "No autorizado. Sesión de administrador requerida." });
    }
}
