import axios, { AxiosResponse } from "axios";
import { PoolClient } from "pg"
import crypto from "crypto"
import dotenv from "dotenv"

import { POSTwebHookWompiI } from "../../utils/Interfaces"

dotenv.config()


export const crearPostWompiJSON = (totalCompra: number, ordenGrupo: { [key: string]: any }, fechaCop: string, ordenProductos: { [key: string]: any }[], tarifaEnvioCentavos: number) => {

    try {
        const expirarFecha = new Date(fechaCop)
        expirarFecha.setHours(expirarFecha.getHours() + 3)



        const firmaString = ordenGrupo.id + totalCompra + "COP" + process.env.LLAVE_INTEGRIDAD_WOMPI
        const firmaIntegridad = crypto.createHash("sha256")
            .update(firmaString)
            .digest("hex");

        // Construir descripción detallada
        const descripcionProductos = ordenProductos.map(p => `${p.cantidad}x ${p.nombre}`).join(", ");
        const descripcionEnvio = tarifaEnvioCentavos > 0 ? ` + Envío ($${tarifaEnvioCentavos / 100})` : "";
        const descripcionFinal = `Compra: ${descripcionProductos}${descripcionEnvio}`.substring(0, 255); // Wompi límite suele ser 255 chars

        const wompiPostJSON = {
            name: "Pago de productos Clínica Nieves",
            description: descripcionFinal,
            single_use: true,
            collect_shipping: false,
            amount_in_cents: totalCompra,
            currency: "COP",
            customer_email: ordenGrupo.correo,
            redirect_url: process.env.REDIRECCION_PAGO_FRONTEND,
            integrity_signature: firmaIntegridad,
            expires_at: expirarFecha.toISOString(),
            customer_data: {
                full_name: ordenGrupo.nombre_usuario,
                ...ordenGrupo
            }
        }

        return wompiPostJSON

    } catch (error) {
        throw Error(`Error en crearPostWompiJSON : [[[ ${JSON.stringify(error)} ]]]`)
    }
}



export const transaccionHTTPSWompi = async (wompiJSON: { [key: string]: any }) => {
    if (!process.env.LINK_POST_WOMPI) {
        throw new Error("Faltan las variables de entorno para realizar la transacción");
    }

    try {
        console.log(wompiJSON)
        const response: AxiosResponse = await axios.post(
            process.env.LINK_POST_WOMPI,
            wompiJSON,
            {
                headers: {
                    Authorization: `Bearer ${process.env.LLAVE_PRIVADA_WOMPI}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data;

    } catch (error: any) {
        const errorMessage = error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message;
        console.log(errorMessage)
        throw new Error(`Error al hacer la petición a Wompi: ${errorMessage}`);
    }
};


export const crearTransaccionPg = async (pgConexion: PoolClient, resWompiJSON: { [key: string]: any }, idOrden: string, idUsuario: string) => {

    try {
        // ESTADOS DE PAGO DE WOMPI EN LAS TRANSACCIONES 
        // "pending" - "aproved" - "declined" - "voided" - "error"

        const consultaTexto01 = "INSERT INTO transaccion(id_wompi, id_orden, id_usuario, nombre, descripcion, expiracion_link, estado, divisa, compra_total, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;";

        const valoresDeOrden: any[] = [resWompiJSON.id, idOrden, idUsuario, resWompiJSON.name, resWompiJSON.description, resWompiJSON.expires_at, "pending", resWompiJSON.currency, resWompiJSON.amount_in_cents, resWompiJSON.created_at]


        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la creacion de la transaccion")

    } catch (error) {
        throw Error(`Error en crearTransaccionPg : [[[ ${JSON.stringify(error)} ]]]`)
    }

}


export const verificarEventoPOST = async (resWompiJSON: POSTwebHookWompiI) => {
    try {
        let concatenatedValues = "";

        // La doc de Wompi dicta que signature.properties contiene los nombres de las llaves
        // (por ejemplo: ["transaction.id", "transaction.status", "transaction.amount_in_cents"])
        // cuyos respectivos valores se deben extraer de "data" más la timestamp.
        for (const clavePunto of resWompiJSON.signature.properties) {
            const llaves = clavePunto.split("."); // ej "transaction.id" -> ["transaction", "id"]
            let valorActual: any = resWompiJSON.data;

            // Navegamos por el objeto data para sacar el valor
            for (const key of llaves) {
                valorActual = valorActual[key];
            }
            concatenatedValues += valorActual;
        }

        const firmaString = concatenatedValues + resWompiJSON.timestamp + process.env.LLAVE_EVENTO_WOMPI
        const firmaEvento = crypto.createHash("sha256")
            .update(firmaString)
            .digest("hex");

        if (firmaEvento == resWompiJSON.signature.checksum) return true
        else throw Error("La informacion no es legitima en ningun sentido")

    } catch (error) {
        throw Error(`verificarEventoPOST : [[[ ${JSON.stringify(error)} ]]]`)
    }
}



export const actualizarTransaccionPg = async (pgConexion: PoolClient, resWompiJSON: POSTwebHookWompiI): Promise<any[]> => {

    try {
        // ESTADOS DE PAGO DE WOMPI EN LAS TRANSACCIONES 
        // "pending" - "aproved" - "declined" - "voided" - "error"

        const consultaTexto01 = "update transaccion set id_wompi = $1, estado = $2, metodo_pago = $3, updated_at = $4 where id_wompi = $5 returning *;";

        const valoresDeOrden: any[] = [resWompiJSON.data.transaction.id, String(resWompiJSON.data.transaction.status).toLowerCase(), resWompiJSON.data.transaction.payment_method_type, resWompiJSON.data.transaction.finalized_at, resWompiJSON.data.transaction.payment_link_id]

        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la actualizacion de la transaccion")

    } catch (error) {
        throw Error(`actualizarTransaccionPg : [[[ ${JSON.stringify(error)} ]]]`)
    }
}



export const actualizarProductoPg = async (pgConexion: PoolClient, resQueryPg01: any[]) => {
    try {

        // CORRECCION: Se elimina el JOIN orden_grupo op $1 = op.id_orden destructivo (CROSS JOIN) 
        // y se condiciona directamente contra la tabla orden_producto donde ocurre la coincidencia lógica
        const consultaTexto01 = `
            UPDATE variantes_producto v 
            SET ventas = v.ventas + op.cantidad, 
                stock = v.stock - op.cantidad
            FROM orden_producto op 
            WHERE op.id_orden = $1 AND v.id = op.id_producto;
        `;
        const valoresDeOrden01: any[] = [resQueryPg01[0].id_orden]
        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden01)

        if (resQuery01.rowCount != null && resQuery01.rowCount > 0) return resQuery01.rows
        else throw Error("Error en la actualizacion del stock en actualizarProductoPg")


    } catch (error) {
        throw Error(`actualizarProductoPg : [[[ ${JSON.stringify(error)} ]]]`)
    }
}