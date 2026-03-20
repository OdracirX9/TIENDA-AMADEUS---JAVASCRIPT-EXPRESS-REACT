import { PoolClient } from "pg"
import { PATCHActualizarProductoI, ActualizarVarianteProductoI, CrearVarianteProductoI } from "../../utils/Interfaces"
import { limpiarNombreTempoSolo, limpiarNombreTempoArray } from "../utils/minioFunciones"
import { crearVarianteProductos, crearHistorialProductos, crearActualPrecioProductos } from "./crearProductoFunciones"


export const actualizarGrupoProducto = async (pgConexion: PoolClient, fechaActualizado: string, reqProductos: Omit<PATCHActualizarProductoI, "carpetaImagenes">) => {
    try {

        if (!reqProductos.id) throw Error("No se encontro ningun producto para editar");

        const { id: idGrupo, variantes: variantesFiltrados, ...reqProductosFiltrados } = reqProductos

        const clavesQuery = Object.keys(reqProductosFiltrados)
        const valoresQuery = Object.values(reqProductosFiltrados)
        clavesQuery.push("updated_at")
        const setClaves = clavesQuery.map((itm, idx) => `${itm} = $${idx + 1}`).join(", ");

        const consultaTexto01 = `UPDATE grupos_producto SET ${setClaves} WHERE id = $${clavesQuery.length + 1}`
        const resQuery01 = await pgConexion.query(consultaTexto01, [...valoresQuery, fechaActualizado, idGrupo])


    } catch (error) {
        throw Error(`Error en actualizarGrupoProducto : [[[ ${JSON.stringify(error)} ]]]`)
    }

}


export const actualizarPrecioVarianteProducto = async (pgConexion: PoolClient, nuevoPrecio: number, idVariante: string, fechaActualizado: string) => {
    try {

        const consultaTexto01 = "insert into historial_precios (id_variante, precio, created_at) values ($1, $2, $3) returning id;"
        const resQuery01 = await pgConexion.query(consultaTexto01, [idVariante, nuevoPrecio, fechaActualizado])

        const consultaTexto02 = "UPDATE actual_precio_producto SET id_precio_historia = $1, precio = $2, updated_at = $3 WHERE id_variante = $4 returning id;"
        const resQuery02 = await pgConexion.query(consultaTexto02, [resQuery01.rows[0].id, nuevoPrecio, fechaActualizado, idVariante])

    } catch (error) {
        throw Error(`Error en actualizarPrecioVarianteProducto : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const editarVariantesProducto = async (pgConexion: PoolClient, fechaActualizado: string, idGrupo: string, reqVariantes: ActualizarVarianteProductoI[]) => {
    try {

        const imagenesCargar: { subir: string[]; eliminar: string[] } = {
            subir: [],
            eliminar: []
        }

        for (const itm of reqVariantes) {

            //COMPROBAR Y VERIFICAR SI LAS VARIANTES Y SUS IMAEGENES EXISTEN EN LA CONSULTA
            const consultaTexto01 = `SELECT id, id_grupo, imagenes FROM variantes_producto WHERE id = $1 AND id_grupo = $2;`
            const resQuery01 = await pgConexion.query(consultaTexto01, [itm.id, idGrupo])

            if (resQuery01.rows.length == 0) throw Error("Error, no se encontro ninguna coincidencia en la variable con respecto al id");


            const { imagenes: imagenesFiltrados, precio: precioFiltrado, id: idVariante, ...itmFiltrado } = itm

            const clavesQuery = Object.keys(itmFiltrado)
            const valoresQuery: any[] = Object.values(itmFiltrado)


            let imagenesSubir: string[] = [];

            const dbImagenes = resQuery01.rows[0].imagenes || [];
            const reqImagenes = itm.imagenes;

            if (reqImagenes !== undefined) {
                // Determine which images are entirely new (e.g. tempo-xxx)
                const imagenesNuevas = reqImagenes.filter(img => !dbImagenes.includes(img));

                // Determine which images were previously in the DB but are no longer in the request payload
                const imagenesEliminadas = dbImagenes.filter((img: string) => !reqImagenes.includes(img));

                if (imagenesNuevas.length > 0) {
                    imagenesCargar.subir.push(...imagenesNuevas);
                }

                if (imagenesEliminadas.length > 0) {
                    imagenesCargar.eliminar.push(...imagenesEliminadas);
                }

                imagenesSubir = reqImagenes.map(img => limpiarNombreTempoSolo(img));

                clavesQuery.push("imagenes", "updated_at");
                valoresQuery.push(imagenesSubir, fechaActualizado);
            } else {
                // If imagenes were not sent in the payload at all
                clavesQuery.push("updated_at");
                valoresQuery.push(fechaActualizado);
            }



            // ACTUALIZAR LA VARIANTE CORRESPONDIENTE A LA CONSULTA





            const setClaves = clavesQuery.map((itm, idx) => `${itm} = $${idx + 1}`).join(", ");

            const consultaTexto02 = `UPDATE variantes_producto SET ${setClaves} WHERE id = $${clavesQuery.length + 1}`
            const resQuery02 = await pgConexion.query(consultaTexto02, [...valoresQuery, itm.id])


            // REGISTRAR UN NUEVO DATO EN EL HISTORIAL DE PRECIOS Y ACTUALIZAR EL PRECIO ACTUAL
            if (precioFiltrado && idVariante) {
                await actualizarPrecioVarianteProducto(pgConexion, precioFiltrado, idVariante, fechaActualizado)
            }


        }

        return imagenesCargar

    } catch (error) {
        throw Error(`Error en editarVariantesProducto : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const actualizarOCrearVariantesProducto = async (pgConexion: PoolClient, fechaActualizado: string, idGrupo: string, reqVariantes: ActualizarVarianteProductoI[]) => {
    try {

        const imagenesCargar: { subir: string[]; eliminar: string[] } = {
            subir: [],
            eliminar: []
        }

        const variantesEditar = reqVariantes.filter(itm => itm.id)
        const variantesCrear = reqVariantes.filter(itm => !itm.id) as CrearVarianteProductoI[]

        if (variantesEditar.length > 0) {
            const resFuncion01 = await editarVariantesProducto(pgConexion, fechaActualizado, idGrupo, variantesEditar)
            imagenesCargar.subir.push(...resFuncion01.subir)
            imagenesCargar.eliminar.push(...resFuncion01.eliminar)
        }

        if (variantesCrear.length > 0) {
            const variantesCrearParaBD = variantesCrear.map(v => ({
                ...v,
                imagenes: v.imagenes ? limpiarNombreTempoArray(v.imagenes) : []
            }));

            const resFuncion02 = await crearVarianteProductos(pgConexion, idGrupo, fechaActualizado, variantesCrearParaBD)
            const resQuery01 = await crearHistorialProductos(pgConexion, fechaActualizado, resFuncion02, variantesCrearParaBD)
            const resQuery02 = await crearActualPrecioProductos(pgConexion, fechaActualizado, resQuery01)
            const imagenesSubir = variantesCrear.flatMap(itm => itm.imagenes)
            imagenesCargar.subir.push(...imagenesSubir)

        }

        return imagenesCargar

    } catch (error) {
        throw Error(`Error en actualizarOCrearVariantesProducto : [[[ ${JSON.stringify(error)} ]]]`)
    }
}