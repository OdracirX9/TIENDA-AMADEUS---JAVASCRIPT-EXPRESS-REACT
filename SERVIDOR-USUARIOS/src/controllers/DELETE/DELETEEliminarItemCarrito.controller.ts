import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { eliminarItemCarrito } from "../utils/consultasCarrito"


const DELETEEliminarItemCarrito = async (req: Request, res: Response) => {
    try {
        //  Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            if (!req.session.usuario) throw Error("No se encontró ningún usuario")

            const idUsuario = req.session.usuario.id
            const idVariante = req.params.id_variante

            if (!idVariante) throw Error("El parámetro id_variante es obligatorio")

            //  Verificar que el usuario tenga carrito
            const resCarrito = await pgActive.query(
                "SELECT id FROM public.carrito WHERE id_usuario = $1",
                [idUsuario]
            )
            if (resCarrito.rows.length === 0) throw Error("El usuario no tiene un carrito activo")
            const idCarrito = resCarrito.rows[0].id

            //  Eliminar el item específico
            await eliminarItemCarrito(pgActive, idCarrito, idVariante)

            res.status(200).json({ success: true })

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


export default DELETEEliminarItemCarrito
