import { Request, Response } from "express"

const POSTLogoutUsuario = async (req: Request, res: Response) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Error al destruir sesión:", err)
                return res.status(500).json({ success: false, message: "Error al cerrar sesión" })
            }
            res.clearCookie('connect.sid') // Nombre por defecto de la cookie de express-session
            res.status(200).json({ success: true, message: "Sesión cerrada correctamente" })
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Error interno al cerrar sesión" })
    }
}

export default POSTLogoutUsuario
