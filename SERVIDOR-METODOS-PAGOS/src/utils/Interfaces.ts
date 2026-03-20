export interface POSTGenerarPagoI {
    variantes:{
        id: string;
        cantidad: number;

    }[];
    usuarioId: string;
    direccionEnvioId: string;
}



export interface POSTwebHookWompiI {
    event: string;
    data: { [key:string]: any };
    environment: string;
    signature: {
        properties: string[];
        checksum: string;
    };
    timestamp: number;
    sent_at: string;
}