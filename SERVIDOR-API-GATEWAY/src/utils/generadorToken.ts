import jwt from "jsonwebtoken"

export const generarClaveJWT =()=>{
    const claveSecreta = process.env.TOKEN_AUTORIZACION_ECOMCERCE || "Sin-Clave"
    const contenidoEnviado = {
        origin:"Api GateWay de E-comerce"
    }
    const tokem = jwt.sign(contenidoEnviado, claveSecreta, {expiresIn: "10s"})
    return tokem;
}