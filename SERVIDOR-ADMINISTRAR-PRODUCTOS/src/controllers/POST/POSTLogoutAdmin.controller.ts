import { Request, Response } from "express";

export default async function POSTLogoutAdmin(req: Request, res: Response) {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destruyendo la sesion admin", err);
            return res.status(500).json({ error: "No se pudo cerrar la sesión de administrador." });
        }
        res.clearCookie('admin_ecomerce_regenievex');
        return res.status(200).json({ mensaje: "Sesión de administrador cerrada correctamente." });
    });
}
