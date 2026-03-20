import { rateLimit } from 'express-rate-limit'

const isLocal = process.env.ISLOCAL === '1' || process.env.ISLOCAL === 'true';

// Limitador Global: 300 peticiones por ventana de 10 minutos por IP
export const limitadorGlobal = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isLocal,
    message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 10 minutos."
})

// Limitador Estricto para Login/Registro: 5 peticiones por ventana de 15 minutos por IP
export const limitadorFuerzaBrutaAutenticacion = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isLocal,
    message: "Demasiados intentos de autenticación fallidos. Por seguridad, esta IP ha sido bloqueada temporalmente. Intenta nuevamente en 15 minutos."
})
