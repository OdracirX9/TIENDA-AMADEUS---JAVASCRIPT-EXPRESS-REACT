import { Request, Response } from "express"
import axios from "axios"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../database"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 
import { POSTwebHookWompiI } from "../utils/Interfaces"
import { actualizarTransaccionPg, verificarEventoPOST, actualizarProductoPg } from "./utils/consultaWompi"


// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: Consultar orden y productos para armar los datos del correo
// ─────────────────────────────────────────────────────────────────────────────
const obtenerDatosOrdenParaCorreo = async (pgConexion: any, idOrden: string): Promise<{
    nombreUsuario: string;
    correo: string;
    descripcionCompra: string;
    subtotal: number;
    precioEnvio: number;
} | null> => {
    try {
        // 1. Datos del grupo de orden (cliente, envío)
        const resOrden = await pgConexion.query(
            `SELECT og.nombre_usuario, og.correo, og.precio_envio
             FROM orden_grupo og
             WHERE og.id = $1`,
            [idOrden]
        );
        if (!resOrden.rows.length) return null;

        const { nombre_usuario, correo, precio_envio } = resOrden.rows[0];

        // 2. Productos de la orden
        const resProductos = await pgConexion.query(
            `SELECT op.nombre, op.cantidad, op.sub_total
             FROM orden_producto op
             WHERE op.id_orden = $1`,
            [idOrden]
        );

        // 3. Armar descripción de productos y subtotal
        const productos: { nombre: string; cantidad: number; sub_total: number }[] = resProductos.rows;
        const descripcionCompra = productos
            .map(p => `${p.cantidad}x ${p.nombre}`)
            .join(', ');
        const subtotal = productos.reduce((acc, p) => acc + Number(p.sub_total), 0);

        return {
            nombreUsuario: nombre_usuario,
            correo,
            descripcionCompra,
            subtotal,
            precioEnvio: Number(precio_envio) || 0
        };

    } catch (error) {
        console.error("Error al obtener datos de la orden para el correo:", error);
        return null;
    }
};


// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: Enviar correos de notificación al cliente y al administrador
// ─────────────────────────────────────────────────────────────────────────────
const enviarCorreosAprobacion = async (datos: {
    nombreUsuario: string;
    correo: string;
    descripcionCompra: string;
    subtotal: number;
    precioEnvio: number;
}): Promise<void> => {
    const linkCorreos = process.env.LINK_SERVIDOR_CORREOS;
    if (!linkCorreos) {
        console.error("⚠️ LINK_SERVIDOR_CORREOS no está configurado");
        return;
    }

    // ── Correo al CLIENTE ──────────────────────────────────────────────────
    try {
        await axios.post(`${linkCorreos}/notificacion-orden`, {
            nombre: datos.nombreUsuario,
            correo: datos.correo,
            descripcionCompra: datos.descripcionCompra,
            subtotal: datos.subtotal / 100,
            envio: datos.precioEnvio / 100
        });
        console.log(`✅ Correo de orden enviado al cliente: ${datos.correo}`);
    } catch (errorCorreo) {
        console.error("⚠️ Error al enviar correo al cliente:", errorCorreo);
    }

    // ── Correo al ADMINISTRADOR ────────────────────────────────────────────
    try {
        await axios.post(`${linkCorreos}/notificacion-admin-nueva-orden`, {
            nombreCliente: datos.nombreUsuario,
            descripcionCompra: datos.descripcionCompra
        });
        console.log(`✅ Correo de nueva orden enviado al administrador`);
    } catch (errorCorreo) {
        console.error("⚠️ Error al enviar correo al administrador:", errorCorreo);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLADOR PRINCIPAL: Webhook de Wompi
// ─────────────────────────────────────────────────────────────────────────────
const POSTWebHookWompi = async (req: Request, res: Response) => {
    try {

        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();
            //  INICIAR CONSULTA
            await pgActive.query("BEGIN")
            console.log("Acto 1")

            const reqBody: POSTwebHookWompiI = req.body
            console.log("Acto 2")

            //  VERIFICACION DE LA INFORMACION PROPORCIONADA POR WOMPI
            console.log(reqBody)
            await verificarEventoPOST(reqBody)
            console.log("Acto 3")

            // ACTUALIZAR LA TRANSACCION INDEPENDIENTE DEL ESTADO DE PAGO
            const resQuery05 = await actualizarTransaccionPg(pgActive, reqBody)
            console.log("Acto 4")

            // ACTUALIZAR VALORES EN PRODUCTOS DISPONIBLES *SOLO SI FUE APROBADO*
            const estadoWompi = String(reqBody.data.transaction.status).toUpperCase();
            if (estadoWompi === 'APPROVED') {
                // 1. Actualizar stock de productos
                await actualizarProductoPg(pgActive, resQuery05)

                // 2. Confirmar la transacción en BD antes de consultar datos del correo
                await pgActive.query("COMMIT")
                console.log("Acto 5 - APPROVED: DB actualizada")

                // 3. Obtener datos de la orden para los correos
                const idOrden: string = resQuery05[0].id_orden;
                const datosCorreo = await obtenerDatosOrdenParaCorreo(pgActive, idOrden);

                // 4. Enviar correos (sin bloquear la respuesta al webhook)
                if (datosCorreo) {
                    enviarCorreosAprobacion(datosCorreo).catch(err =>
                        console.error("Error en envio de correos post-webhook:", err)
                    );
                } else {
                    console.warn(`⚠️ No se encontraron datos de la orden ${idOrden} para enviar correos`);
                }
            } else {
                await pgActive.query("COMMIT")
                console.log("Acto 5 - Estado:", estadoWompi)
            }

            console.log("Acto 6")

            res.status(200).json({ mensaje: "Webhook procesado correctamente" })
            console.log("Acto 7")

        } catch (error) {
            await pgActive.query('ROLLBACK');
            res.status(404).json(error)

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(404).json("Error conexion base de datos")
    }
}


export default POSTWebHookWompi;