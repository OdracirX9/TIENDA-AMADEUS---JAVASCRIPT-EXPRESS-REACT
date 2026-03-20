
export interface CrearVarianteProductoI {
    id?: string;
    nombre: string;
    descripcion: string;
    caracteristicas?: {[key:string]:string};
    imagenes: string[];
    stock: number;
    precio: number;
    visibilidad: boolean;
    posicion: number;
}

export interface POSTCrearProductoI {
    id?:string;
    id_marca:  string | null;
    id_categoria: string | null;
    visibilidad: boolean;
    variantes: CrearVarianteProductoI[];
    carpetaImagenes:string
}


export type PATCHActualizarProductoI = Partial<POSTCrearProductoI>
export type ActualizarVarianteProductoI = Partial<CrearVarianteProductoI> 