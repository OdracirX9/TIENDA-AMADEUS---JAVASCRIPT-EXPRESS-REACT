import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const DELETEBorrarCliente = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            await pgActive.query("BEGIN");

            // 1. Desvincular Órdenes (Mantener registro contable de la orden pero desasociar cliente por seguridad)
            await pgActive.query(`
                UPDATE orden_grupo 
                SET id_usuario = NULL 
                WHERE id_usuario = $1
            `, [id]);

            // 2. Desvincular Transacciones Financieras de Wompi
            await pgActive.query(`
                UPDATE transaccion 
                SET id_usuario = NULL 
                WHERE id_usuario = $1
            `, [id]);

            // 3. Eliminar direcciones de envío del usuario
            await pgActive.query(`
                DELETE FROM direcciones_envio 
                WHERE id_usuario = $1
            `, [id]);

            // 4. El carrito y sus ítems se borran automáticamente en la BD por (ON DELETE CASCADE) de la tabla carrito.
            // Asi que finalmente procedemos a eliminar el registro principal del usuario.
            const queryDelete = await pgActive.query(`
                DELETE FROM usuario 
                WHERE id = $1 
                RETURNING id;
            `, [id]);

            if (queryDelete.rows.length === 0) {
                await pgActive.query('ROLLBACK');
                return res.status(404).json({ error: "Cliente no encontrado" });
            }

            await pgActive.query("COMMIT");
            res.status(200).json({ mensaje: "Cliente eliminado correctamente" });

        } catch (error) {
            await pgActive.query('ROLLBACK');
            console.log(error)
            res.status(500).json({ error: "Error interno al eliminar cliente" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }
}

export default DELETEBorrarCliente;
