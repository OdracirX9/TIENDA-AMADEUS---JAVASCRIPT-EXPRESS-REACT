import { Express } from "express";
import jwt from "jsonwebtoken"


export const comprobarTokenAutorizado = (appIndex: Express) => {
    appIndex.use((req, res, next) => {
        const tokenRes = req.headers['imagine-dragons'] as string
        if (!tokenRes) {
            return res.status(403).send("Sin token de autorizacion")
        }

        jwt.verify(tokenRes, process.env.TOKEN_AUTORIZACION_ECOMCERCE || "Sin-clave", (err, decode) => {
            if (err) {
                return res.status(403).send("token no valido")

            } else {
                console.log(decode)
                next()
            }
        })
    })
}