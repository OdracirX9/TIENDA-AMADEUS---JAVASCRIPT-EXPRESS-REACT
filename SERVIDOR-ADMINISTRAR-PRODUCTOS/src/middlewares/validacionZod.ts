import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodError } from "zod";

export const validarBody = (schema: ZodObject<any, any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const bodyParsed = await schema.parseAsync(req.body);
            req.body = bodyParsed;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            return res.status(500).json({ error: "Interal server error" });
        }
    };
};
