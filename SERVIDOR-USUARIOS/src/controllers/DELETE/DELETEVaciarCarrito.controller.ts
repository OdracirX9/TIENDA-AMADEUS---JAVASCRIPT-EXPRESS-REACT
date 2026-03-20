import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { vaciarCarrito } from "../utils/consultasCarrito"


const DELETEVaciarCarrito = async (req: Request, res: Response) => {
    try {
        //  Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            if (!req.session.usuario) throw Error("No se encontró ningún usuario")

            const idUsuario = req.session.usuario.id

            //  Verificar que el usuario tenga carrito
            const resCarrito = await pgActive.query(
                "SELECT id FROM public.carrito WHERE id_usuario = $1",
                [idUsuario]
            )
            if (resCarrito.rows.length === 0) {
                // Si no tiene carrito, ya está vacío — responder OK igual
                return res.status(200).json({ success: true, message: "El carrito ya estaba vacío" })
            }
            const idCarrito = resCarrito.rows[0].id

            //  Vaciar todos los items del carrito
            await vaciarCarrito(pgActive, idCarrito)

            res.status(200).json({ success: true, message: "Carrito vaciado correctamente" })

        } catch (error) {
            console.log(error)
            res.status(404).json({ success: false, message: String(error) })
        } finally {
            pgActive.release()
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "Error de conexión con la base de datos" })
    }
}


export default DELETEVaciarCarrito
