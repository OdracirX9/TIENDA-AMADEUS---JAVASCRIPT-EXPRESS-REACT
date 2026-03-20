import { Request, Response, NextFunction } from "express"





export const comprobarSesion = async (req: Request, res: Response, next:NextFunction) => {
    try {

        if (!req.session || !req.session.usuario) {
            return res.status(401).json({
                success: false,
            });
        }

        next();

    } catch (error) {
        console.log(error)
        res.status(404).json(error)
    }
}

