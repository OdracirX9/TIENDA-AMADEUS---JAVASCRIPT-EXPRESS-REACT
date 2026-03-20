import { Request, Response } from "express"
import { z } from "zod"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES 
import { POSTLoginI } from "../../utils/esquemasZod"
import { consultarExistenciaUsuario } from "../utils/consultasUsuario"
import { verificarPassword } from "../../utils/hashPassword"

const POSTLoginUsuario = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            const reqBody: z.infer<typeof POSTLoginI> = req.body

            //  CONSULTAR SI EL USUARIO EXISTE
            const usuarioEncontrado = await consultarExistenciaUsuario(pgActive, reqBody.correo)

            if (!usuarioEncontrado) {
                res.status(400).json({ error: "Credenciales inválidas" }) // No decir que el correo no existe por seguridad
                return
            }

            //  VERIFICAR ESTADO DE HABILITACION DEL USUARIO
            if (usuarioEncontrado.habilitacion === false) {
                if (usuarioEncontrado.updated_at === null) {
                    res.status(400).json({ error: "Por favor valida tu registro de usuario desde el correo electrónico." })
                    return
                } else {
                    res.status(400).json({ error: "El usuario está suspendido." })
                    return
                }
            }

            //  VERIFICAR SI TIENE CONTRASEÑA (Puede ser usuario de Google sin clave)
            if (!usuarioEncontrado.password) {
                res.status(400).json({ error: "Este usuario se registró con una red social. Inicia sesión con ella." })
                return
            }

            //  COMPARAR CONTRASEÑA CON HMAC-SHA256
            const passwordValido = verificarPassword(reqBody.password, usuarioEncontrado.password)

            if (!passwordValido) {
                res.status(400).json({ error: "Credenciales inválidas" })
                return
            }

            //  CREAR SESION
            req.session.usuario = {
                id: usuarioEncontrado.id,
                nombre: usuarioEncontrado.nombre,
                correo: usuarioEncontrado.correo,
                celular: usuarioEncontrado.celular,
                created_at: usuarioEncontrado.created_at
            }

            res.status(200).json({ mensaje: "Inicio de sesión exitoso", usuario: req.session.usuario })

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Error en el servidor al iniciar sesión" })

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default POSTLoginUsuario;
