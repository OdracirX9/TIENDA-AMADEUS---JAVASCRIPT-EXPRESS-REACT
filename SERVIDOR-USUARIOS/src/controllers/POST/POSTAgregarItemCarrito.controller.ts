import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { obtenerOCrearCarrito, upsertItemCarrito } from "../utils/consultasCarrito"


const POSTAgregarItemCarrito = async (req: Request, res: Response) => {
    try {
        //  Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            if (!req.session.usuario) throw Error("No se encontró ningún usuario")

            const idUsuario = req.session.usuario.id
            const { id_variante, cantidad } = req.body

            if (!id_variante) throw Error("El campo id_variante es obligatorio")
            if (!cantidad || cantidad < 1) throw Error("La cantidad debe ser mayor a 0")

            await pgActive.query("BEGIN")

            //  Obtener o crear el carrito del usuario
            const idCarrito = await obtenerOCrearCarrito(pgActive, idUsuario)

            //  Upsert del item (si ya existe, actualiza; si no, inserta)
            const itemResultado = await upsertItemCarrito(pgActive, idCarrito, id_variante, cantidad)

            await pgActive.query("COMMIT")

            res.status(200).json({
                success: true,
                item: itemResultado
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


export default POSTAgregarItemCarrito
