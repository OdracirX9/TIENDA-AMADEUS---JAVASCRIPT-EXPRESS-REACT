import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { obtenerItemsCarrito } from "../utils/consultasCarrito"


const GETCarritoUsuario = async (req: Request, res: Response) => {
    try {
        //  Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            if (!req.session.usuario) throw Error("No se encontró ningún usuario")

            const idUsuario = req.session.usuario.id

            //  Obtener todos los items del carrito con info de variante y precio
            const items = await obtenerItemsCarrito(pgActive, idUsuario)

            res.status(200).json({
                success: true,
                items: items ?? []
            })

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


export default GETCarritoUsuario
