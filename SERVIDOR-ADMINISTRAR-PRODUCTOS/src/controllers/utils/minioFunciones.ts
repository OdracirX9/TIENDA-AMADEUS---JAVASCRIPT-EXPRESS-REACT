import path from "path"
import MinioClient from "../../minIo"



export const cargarImagenes = async (namesImgs: Express.Multer.File[], carpetaPath: string) => {
    try {
        console.log("ACTO 1")
        const bucketTempo = `ecomerce`;

        const nombreImagenes: string[] = []

        console.log("ACTO 2")
        for (const itm of namesImgs) {
            // Con memoryStorage, el archivo está en itm.buffer (RAM), no en disco
            if (!itm.buffer || itm.buffer.length === 0) {
                console.warn(`Imagen vacía o sin buffer: ${itm.originalname}`)
                continue
            }

            const extension = path.extname(itm.originalname)
            const nombreGenerado = `${new Date().getTime()}-${Math.round(Math.random() * 1E9)}-producto${extension}`
            const nombreImg = `tempo-${nombreGenerado}`

            // putObject recibe: bucket, objectName, buffer, size, contentType
            await MinioClient.putObject(
                bucketTempo,
                `${carpetaPath}/${nombreImg}`,
                itm.buffer,
                itm.size,
                { 'Content-Type': itm.mimetype }
            )

            nombreImagenes.push(nombreImg)
        }

        console.log("ACTO 3")
        return nombreImagenes

    } catch (error) {
        throw Error(`Error al subir la imagen: [[[ ${error} ]]]`)
    }
}



export const limpiarNombreTempoSolo = (imagenSucia: string) => {

    if (imagenSucia.includes("tempo")) {
        const imagenSplit = imagenSucia.split("-")
        imagenSplit.shift()
        const imagenLimpia = imagenSplit.join("-")
        return imagenLimpia
    } else {
        return imagenSucia
    }
}


export const limpiarNombreTempoArray = (imagenesSucias: string[]) => {
    const imagenesLimpias = imagenesSucias.map((itm) => {
        if (itm.includes("tempo")) {
            const imagenSplit = itm.split("-")
            imagenSplit.shift()
            const imagenLimpia = imagenSplit.join("-")
            return imagenLimpia
        } else {
            return itm
        }
    })
    return imagenesLimpias
}


export const actualizarTempoImagenes = async (imagenesSucias: string[], carpetaPath: string) => {
    try {
        const bucketTempo = `ecomerce`;
        for (const itm of imagenesSucias) {
            await MinioClient.copyObject(bucketTempo, `${carpetaPath}/${limpiarNombreTempoSolo(itm)}`, `/${bucketTempo}/${carpetaPath}/${itm}`)
            await MinioClient.removeObject(bucketTempo, `${carpetaPath}/${itm}`)
        }

    } catch (error) {
        throw Error(`Error al actualizar las imagenes temporales: [[[ ${error} ]]]`)
    }
}


export const eliminarImagenes = async (eliminarImagenes: string[], carpetaPath: string) => {
    try {
        const bucketTempo = `ecomerce`;
        for (const itm of eliminarImagenes) {
            await MinioClient.removeObject(bucketTempo, `${carpetaPath}/${itm}`)
        }

    } catch (error) {
        throw Error(`Error al eliminar las imagenes: [[[ ${error} ]]]`)
    }

}