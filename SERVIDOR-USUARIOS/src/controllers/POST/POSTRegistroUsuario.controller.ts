import { Request, Response } from "express"
import { z } from "zod"
import jwt from "jsonwebtoken"
import axios from "axios"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES
import { POSTRegistroI } from "../../utils/esquemasZod"
import { consultarExistenciaUsuario, crearUsuarioPassword } from "../utils/consultasUsuario"
import { hashPassword } from "../../utils/hashPassword"
import clienteRedis from "../../redisCache"

const POSTRegistroUsuario = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const reqBody: z.infer<typeof POSTRegistroI> = req.body

            //  INICIAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("BEGIN")
            //*-------------------------------------------------------------------------------------------------------------- */

            //  CONSULTAR SI EL USUARIO YA EXISTE
            const existeUsuario = await consultarExistenciaUsuario(pgActive, reqBody.correo)

            if (existeUsuario) {
                res.status(400).json({ error: "El correo ya está registrado" })
                await pgActive.query("ROLLBACK")
                return
            }

            //  ENCRIPTAR CONTRASEÑA CON HMAC-SHA256 + CLAVE JWT
            const passwordHash = hashPassword(reqBody.password)

            //  CREAR USUARIO
            const nuevoUsuario = await crearUsuarioPassword(pgActive, [reqBody.nombre, reqBody.correo, passwordHash, creacionFecha])

            //*-------------------------------------------------------------------------------------------------------------- */
            //  FINALIZAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("COMMIT")

            // ─────────────────────────────────────────────────────────────────────
            //  GENERAR TOKEN JWT DE CONFIRMACIÓN DE REGISTRO
            // ─────────────────────────────────────────────────────────────────────
            const secretoSesion = process.env.SECRETO_SESION as string;
            const tokenConfirmacion = jwt.sign(
                { id: nuevoUsuario.id },
                secretoSesion,
                { expiresIn: "24h" }
            );

            // ─────────────────────────────────────────────────────────────────────
            //  GUARDAR TOKEN EN REDIS (TTL: 86400 segundos = 24 horas)
            //  Clave: confirmacion_registro:{userId}
            //  Accesible por cualquier servidor que tenga la misma conexión Redis
            // ─────────────────────────────────────────────────────────────────────
            const claveRedis = `confirmacion_registro:${nuevoUsuario.id}`;
            await clienteRedis.set(claveRedis, tokenConfirmacion, { EX: 86400 });

            // ─────────────────────────────────────────────────────────────────────
            //  CONSTRUIR ENLACE DE CONFIRMACIÓN (frontend + token)
            // ─────────────────────────────────────────────────────────────────────
            const linkFrontend = process.env.LINK_FRONTEND_PUBLICO_ECOMERCE;
            const enlaceConfirmacion = `${linkFrontend}/confirmacion-registro?token=${tokenConfirmacion}`;

            // ─────────────────────────────────────────────────────────────────────
            //  ENVIAR CORREO DE CONFIRMACIÓN VÍA SERVIDOR-CORREOS
            // ─────────────────────────────────────────────────────────────────────
            const linkServidorCorreos = process.env.LINK_SERVIDOR_CORREOS;
            try {
                await axios.post(`${linkServidorCorreos}/confirmar-registro`, {
                    nombre: nuevoUsuario.nombre,
                    correo: nuevoUsuario.correo,
                    enlaceConfirmacion
                });
                console.log(`✅ Correo de confirmación enviado a ${nuevoUsuario.correo}`);
            } catch (errorCorreo) {
                // El correo falla en silencio — el usuario ya fue creado, se puede reenviar después
                console.error("⚠️ Error al enviar correo de confirmación:", errorCorreo);
            }

            res.status(200).json({
                mensaje: "Usuario registrado correctamente. Revisa tu correo para confirmar tu cuenta."
            })

        } catch (error) {
            console.log(error)
            await pgActive.query('ROLLBACK');
            res.status(500).json({ error: "Error en el servidor al registrar usuario" })

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default POSTRegistroUsuario;
