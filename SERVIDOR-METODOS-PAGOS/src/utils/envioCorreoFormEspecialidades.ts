import axios from "axios"
import dotenv from 'dotenv'
import fs from "fs"
import path from "path"
import Handlebars from "handlebars"

dotenv.config();

interface CorreosDestino {
    nombre:string;
    correo:string
}

const envioCorreosBrevo = async(correoEspecialidad: { nombre:string, subdominio:string }, correosDestino: CorreosDestino[], asunto:string, plantillaHtml: string)=>{

    const data = {
        sender: {
            name: correoEspecialidad.nombre,
            email: `${correoEspecialidad.subdominio}@notificaciones.clinicanieves.co`
        },
        to: correosDestino.map(itm=>{
            const itmTempo ={
                name: itm.nombre,
                email: itm.correo
            } 
            return itmTempo;
        }),
        subject: asunto,
        htmlContent: plantillaHtml
    }

    await axios.post("https://api.brevo.com/v3/smtp/email", data, {
        headers: {
            'accept': 'application/json',
            'api-key': process.env.APIKEY_BREVO,
            'content-type': 'application/json'
        }
    })
    .then(res => {
        console.log("CORREO ENVIADO CLIENTE")
    })
    .catch(error => {
        console.log("")
        throw new Error("Error al enviar el CORREO")
    })

}

interface FormulacionCorreo {
    assetHtml: string;
    varsHtml: {[key:string]:string};
    correoEspecialidad: { nombre:string, subdominio:string };
    correosDestinados: { nombre:string, correo:string }[];
    asuntoCorreo: string;
}


export const formulacionCorreoYenvio = async (dataCorreo: FormulacionCorreo) => {
    console.log(__dirname)
    const htmlPath01 = path.join(__dirname, "../../assets", "layouts", dataCorreo.assetHtml);
    const htmlSource01 = fs.readFileSync(htmlPath01, "utf-8");
    const htmlHandlebars01 = Handlebars.compile(htmlSource01);
    const htmlContent01 = htmlHandlebars01(dataCorreo.varsHtml);
    await envioCorreosBrevo(dataCorreo.correoEspecialidad, dataCorreo.correosDestinados, dataCorreo.asuntoCorreo, htmlContent01)
    return true
}