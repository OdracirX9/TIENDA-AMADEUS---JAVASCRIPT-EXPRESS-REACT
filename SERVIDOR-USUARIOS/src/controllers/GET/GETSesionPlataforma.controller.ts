import { Request, Response } from "express"

//  IMPORTACION DE UTILIDADES 
import { crearUrlAuthGoogle, crearUrlAuthMicrosoft } from "../utils/crearUrlAuthSesion"



const GETSesionAuth = async (req: Request, res: Response) => {
    try {

        const plataformaAuth = req.query.plataforma

        //*-------------------------------------------------------------------------------------------------------------- */



        const resQuery01: Record<string, string> = {}

        
        if (plataformaAuth === "google") {
            resQuery01.url = crearUrlAuthGoogle();

        } else if (plataformaAuth === "microsoft") {
            resQuery01.url = crearUrlAuthMicrosoft()
        } else {
            throw Error("No existe ninguna plataforma conocida")
        }




        //*-------------------------------------------------------------------------------------------------------------- */


        res.status(200).json(resQuery01)

    } catch (error) {
        console.log(error)
        res.status(404).json(error)
    }
}


    export default GETSesionAuth;