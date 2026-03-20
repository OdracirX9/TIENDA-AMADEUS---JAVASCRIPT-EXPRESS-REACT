import "express-session";

declare module "express-session" {
    interface SessionData {
        usuario?: {
            id: string;
            nombre: string;
            correo: string;
            celular: string | null;
            created_at: string;
        };
    }
}
