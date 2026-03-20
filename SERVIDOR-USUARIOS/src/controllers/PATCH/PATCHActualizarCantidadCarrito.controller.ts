import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { obtenerOCrearCarrito, actualizarCantidadItem } from "../utils/consultasCarrito"


const PATCHActualizarCantidadCarrito = async (req: Request, res: Response) => {
    try {
        //  Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            if (!req.session.usuario) throw Error("No se encontró ningún usuario")

            const idUsuario = req.session.usuario.id
            const idVariante = req.params.id_variante
            const { cantidad } = req.body

            if (!idVariante) throw Error("El parámetro id_variante es obligatorio")
            if (!cantidad || cantidad < 1) throw Error("La cantidad debe ser mayor a 0")

            await pgActive.query("BEGIN")

            //  Obtener el carrito del usuario (no crea uno nuevo si no existe)
            const resCarrito = await pgActive.query(
                "SELECT id FROM public.carrito WHERE id_usuario = $1",
                [idUsuario]
            )
            if (resCarrito.rows.length === 0) throw Error("El usuario no tiene un carrito activo")
            const idCarrito = resCarrito.rows[0].id

            //  Actualizar la cantidad del item
            const itemActualizado = await actualizarCantidadItem(pgActive, idCarrito, idVariante, cantidad)

            await pgActive.query("COMMIT")

            res.status(200).json({
                success: true,
                item: itemActualizado
            })

        } catch (error) {
            await pgActive.query("ROLLBACK").catch(() => { })
            console.log(error)
            res.status(404).json({ success: false, message: String(error) })
        } finally {
            pgActive.release()
        }

    } catch (error) {
        res.status(500).json({ success: false, message: "Error de conexión con la base de datos" })
    }
}


export default PATCHActualizarCantidadCarrito
