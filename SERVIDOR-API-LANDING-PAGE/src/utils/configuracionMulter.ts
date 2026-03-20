import { Response, Request  } from "express"
import multer, { FileFilterCallback } from "multer"
import fs from "fs"
import path, { dirname } from "path"


//CONFIGURACION DE ALMACENAMIENTO DEL MULTER
const storage = multer.diskStorage({
    destination:(req, file, cb)=>{
        const dir = "./assets/images/minio"
        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir)
    },
    filename:(req, file, cb)=>{
        const extension = path.extname(file.originalname)
        const newName = `${new Date().getTime()}-${Math.round(Math.random() * 1E9)}-producto${extension}`
        cb(null, newName);
    }
})


const fileFilter = (req: Request, file:Express.Multer.File, cb:FileFilterCallback)=>{
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imagenes"));
    }
}

export const uploadMulter = multer({storage, fileFilter})