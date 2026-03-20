import { Request, Response } from "express";

export default async function GETSesionAdmin(req: Request, res: Response) {
    const session = req.session as any;

    if (session && session.admin) {
        return res.status(200).json({
            activa: true,
            admin: session.admin
        });
    } else {
        return res.status(401).json({
            activa: false,
            admin: null
        });
    }
}
