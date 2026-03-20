import axios from "axios"
import dotenv from 'dotenv'
import fs from "fs"
import path from "path"
import Handlebars from "handlebars"

dotenv.config();

interface CorreosDestino {
    nombre: string;
    correo: string
}

const envioCorreosBrevo = async (correoSender: { nombre: string, correo: string }, correosDestino: CorreosDestino[], asunto: string, plantillaHtml: string) => {
    const data = {
        sender: {
            name: correoSender.nombre,
            email: correoSender.correo
        },
        to: correosDestino.map(itm => {
            const itmTempo = {
                name: itm.nombre,
                email: itm.correo
            }
            return itmTempo;
        }),
        subject: asunto,
        htmlContent: plantillaHtml
    }

    try {
        await axios.post("https://api.brevo.com/v3/smtp/email", data, {
            headers: {
                'accept': 'application/json',
                'api-key': process.env.APIKEY_BREVO,
                'content-type': 'application/json'
            }
        })
        console.log("CORREO ENVIADO A:", correosDestino[0]?.correo)
    } catch (error) {
        console.log(error)
        throw new Error("Error al enviar el CORREO a traves de Brevo")
    }
}
interface FormulacionCorreo {
    assetHtml: string;
    varsHtml: { [key: string]: string };
    correoSender: { nombre: string, correo: string };
    correosDestinados: { nombre: string, correo: string }[];
    asuntoCorreo: string;
}

export const formulacionCorreoYenvio = async (dataCorreo: FormulacionCorreo) => {
    const htmlPath01 = path.join(__dirname, "../../assets", "layouts", dataCorreo.assetHtml);
    const htmlSource01 = fs.readFileSync(htmlPath01, "utf-8");
    const htmlHandlebars01 = Handlebars.compile(htmlSource01);
    const htmlContent01 = htmlHandlebars01(dataCorreo.varsHtml);
    await envioCorreosBrevo(dataCorreo.correoSender, dataCorreo.correosDestinados, dataCorreo.asuntoCorreo, htmlContent01)
    return true
}
