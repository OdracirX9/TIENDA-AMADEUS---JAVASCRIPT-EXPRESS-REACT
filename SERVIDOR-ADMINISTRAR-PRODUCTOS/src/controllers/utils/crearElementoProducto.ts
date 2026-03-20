import { PoolClient } from "pg"
import { POSTCrearElementoProductoI } from "../../utils/Interfaces"
import {  } from "./minioFunciones"


export const crearElementoProducto = async(pgConexion:PoolClient, fechaCreacion:string, reqBody:POSTCrearElementoProductoI)=>{

    try {

        const elementosBasicos = [ 
            { nombre:"marcas", tabla:"marcas_producto" },
            { nombre:"categorias", tabla:"categorias_producto" }
        ]

        const elementoBasico = elementosBasicos.find(itm=>itm.nombre === reqBody.elemento)

        if(!elementoBasico) throw Error(`Error en crearElementoProducto, no existe ese elemento`)

        const consultaTexto01 = `insert into ${elementoBasico.tabla} (nombre, descripcion, imagen, created_at) values ($1, $2, $3, $4) RETURNING *, $5 AS elemento`
        const valoresDeOrden01 = [ reqBody.nombre, reqBody.descripcion, reqBody.imagen, fechaCreacion, elementoBasico.nombre ]
        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden01)
        return resQuery01.rows

    } catch (error) {
        throw Error(`Error en crearElementoProducto : [[[ ${JSON.stringify(error)} ]]]`)
    }

}