import { Request, Response } from "express";
import { pgActive } from "../../index";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

export default async function POSTLoginAdmin(req: Request, res: Response) {
    console.log("Iniciando seccion con este controlador")
    try {
        const { correo, password } = req.body;
        console.log(req.body)

        if (!correo || !password) {
            return res.status(400).json({ error: "Faltan credenciales." });
        }

        const rutaJson = path.join(__dirname, "../../../assets/others/administradores.json");
        const administradoresJson = fs.readFileSync(rutaJson, 'utf-8');
        const administradores = JSON.parse(administradoresJson);

        const admin = administradores.find((adm: any) => adm.correo === correo);

        if (!admin) {
            return res.status(401).json({ error: "Credenciales incorrectas." });
        }

        // Verificar y desencriptar la contraseña con jsonwebtoken
        let esValido = false;
        try {
            const secret = process.env.CLAVE_DESENCRIPTACION_JWT || 'clave-secreta-por-defecto';
            const decoded: any = jwt.verify(admin.password, secret);

            if (decoded && decoded.password === password) {
                esValido = true;
            }
        } catch (error) {
            console.error("Error al decodificar la contraseña JWT almacenada:", error);
        }

        if (!esValido) {
            return res.status(401).json({ error: "Credenciales incorrectas." });
        }

        // Crear sesión en Redis
        (req.session as any).admin = {
            id: admin.id,
            nombre_usuario: admin.nombre_usuario,
            correo: admin.correo,
            nivel_acceso: admin.nivel_acceso
        };

        return res.status(200).json({
            mensaje: "Sesiòn de administrador iniciada correctamente.",
            admin: (req.session as any).admin
        });

    } catch (error) {
        console.error("Error en POSTLoginAdmin:", error);
        return res.status(500).json({ error: "Error interno del servidor al procesar el login de administrador." });
    }
}
