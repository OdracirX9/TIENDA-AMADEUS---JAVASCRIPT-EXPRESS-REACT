import { Request, Response } from "express"

//  IMPORTACION DE ELEMENTOS
import { cargarImagenes } from "../utils/minioFunciones"




const POSTGuardarImagenes = async (req: Request, res: Response) => {


    try {

        //*-------------------------------------------------------------------------------------------------------------- */

        console.log("ACTO 1 PRINCIPAL")

        const archivos = req.files as Express.Multer.File[]
        const carpetaDestino = String(req.query.carpeta) ?? ""

        console.log("ACTO 2 PRINCIPAL")

        if (!archivos || archivos.length === 0) {
            return res.status(400).json({ mensaje: "no se encontro ninguna imagen" })
        }

        console.log("ACTO 3 PRINCIPAL")

        const resMinio01 = await cargarImagenes(archivos, carpetaDestino)

        console.log("ACTO 4 PRINCIPAL")

        //console.log(resMinio01)

        res.status(200).json(resMinio01)



        //*-------------------------------------------------------------------------------------------------------------- */

    } catch (error) {
        console.log(error)
        res.status(404).json(error)

    }





}


export default POSTGuardarImagenes;