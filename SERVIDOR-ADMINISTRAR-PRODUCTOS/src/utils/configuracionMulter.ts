import { Request } from "express"
import multer, { FileFilterCallback } from "multer"
import path from "path"


//CONFIGURACION DE ALMACENAMIENTO DEL MULTER
// Se usa memoryStorage para evitar escritura en disco (compatible con Railway sin volumen)
const storage = multer.memoryStorage()


const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imagenes"));
    }
}

export const uploadMulter = multer({ storage, fileFilter })