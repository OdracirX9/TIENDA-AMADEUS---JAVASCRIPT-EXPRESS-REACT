import validator from 'validator'



export const inputNombre = (nombre:string)=>{
    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]{2,60}$/;
    if(nombreRegex.test(nombre)){
        return nombre.trim().replace(/\s+/gm, " ");
    } else {
        return false
    }
}

export const inputCelular = (telefono:string)=>{
    const telefonoRegex = /^\+?[0-9\s\-]{7,20}$/;
    if(telefonoRegex.test(telefono)){
        return telefono.trim().replace(/\s+/gm, " ");
    } else {
        return false
    }
}


export const inputEmail = (email:string)=>{
    if(validator.isEmail(email)){
        return email.trim().replace(/\s+/gm, " ");
    } else {
        return false
    }
}


export const inputMensaje = (descripcion:string)=>{
    const parrafoRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ.,;:()'"¿?¡!\-\n\r ]{1,500}$/;
    if (parrafoRegex.test(descripcion)) {
        return descripcion.trim().replace(/\s+/gm, " ");
    } else {
        return false
    }
}

