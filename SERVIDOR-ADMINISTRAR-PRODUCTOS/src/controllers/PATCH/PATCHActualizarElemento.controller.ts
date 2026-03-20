import { Request, Response } from "express"
import poolPg from "../../database"
import { PATCHActualizarElementoProductoI } from "../../utils/Interfaces"
import { crearCacheElemento } from "../utils/administracionCache"
import { actualizarTempoImagenes, limpiarNombreTempoSolo } from "../utils/minioFunciones"

const PATCHActualizarElemento = async (req: Request, res: Response) => {
    try {
        const pgActive = await poolPg.connect();
        try {
            const reqBody: PATCHActualizarElementoProductoI = req.body;

            const elementosBasicos = [
                { nombre: "marcas", tabla: "marcas_producto" },
                { nombre: "categorias", tabla: "categorias_producto" }
            ];

            const elementoBasico = elementosBasicos.find(itm => itm.nombre === reqBody.elemento);

            if (!elementoBasico) {
                return res.status(400).json({ error: "Elemento no válido" });
            }

            await pgActive.query("BEGIN");

            // Build update dynamic query
            const updates: string[] = [];
            const values: any[] = [];
            let idx = 1;

            if (reqBody.nombre !== undefined) {
                updates.push(`nombre = $${idx++}`);
                values.push(reqBody.nombre);
            }
            if (reqBody.descripcion !== undefined) {
                updates.push(`descripcion = $${idx++}`);
                values.push(reqBody.descripcion);
            }
            if (reqBody.imagen !== undefined) {
                updates.push(`imagen = $${idx++}`);
                values.push(limpiarNombreTempoSolo(reqBody.imagen));
            }

            if (updates.length === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(400).json({ error: "No fields to update" });
            }

            values.push(reqBody.id); // The WHERE predicate
            const consultaTexto = `UPDATE ${elementoBasico.tabla} SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *, '${reqBody.elemento}' AS elemento`;

            const resQuery01 = await pgActive.query(consultaTexto, values);

            if (resQuery01.rowCount === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(404).json({ error: "Elemento no encontrado" });
            }

            // Update Cache
            await crearCacheElemento(resQuery01.rows);

            // ACTUALIZAR INVENTARIO DE LAS IMAGENES QUE SE GUARDARON PREVIAMENTE ANTES
            if (reqBody.imagen && reqBody.carpetaImagenes) {
                await actualizarTempoImagenes([reqBody.imagen], reqBody.carpetaImagenes)
            }

            await pgActive.query("COMMIT");
            res.status(200).json({ mensaje: "Elemento modificado correctamente", data: resQuery01.rows[0] });

        } catch (error) {
            console.log(error);
            await pgActive.query('ROLLBACK');
            res.status(500).json({ error: "Error al actualizar el elemento" });

        } finally {
            pgActive.release();
        }
    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
}

export default PATCHActualizarElemento;
