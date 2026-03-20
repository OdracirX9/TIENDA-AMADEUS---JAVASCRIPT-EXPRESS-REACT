import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

//  IMPORTACION DE UTILIDADES 
import { generarClaveJWT } from "./generadorToken"

export const crearProxyConexion = (rutaAsignada: string, proxyTarget: string) => {
    return createProxyMiddleware({
        target: proxyTarget,
        changeOrigin: true,
        pathRewrite: { [`^${rutaAsignada}`]: "" },
        // Reescribir el dominio de las cookies para que el navegador las acepte
        // en el origen del Gateway (ej: localhost:4001) en lugar del microservicio interno.
        cookieDomainRewrite: { "*": "" },
        on: {
            proxyReq: (proxyReq, req, res) => {
                proxyReq.setHeader('imagine-dragons', generarClaveJWT());

                // IMPORTANTE: fixRequestBody destruye el stream de multipart/form-data (impidiendo subir imágenes)
                // Solo debemos fijar el body si NO es multipart.
                const contentType = req.headers['content-type'] || '';
                if (!contentType.includes('multipart/form-data')) {
                    fixRequestBody(proxyReq, req);
                }
            }
        }
    })
}