import dotenv from "dotenv"
import axios from "axios";
dotenv.config()

import jwt from "jsonwebtoken";

interface MicrosoftIDToken {
  email?: string;
  preferred_username?: string;
  name?: string;
  sub: string;
}


export const crearUrlAuthGoogle = ()=>{
    try {

        const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
            throw new Error("Error, falta GOOGLE_CLIENT_ID o GOOGLE_REDIRECT_URI en el archivo .env");
        }

        const options = {
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            response_type: "code",
            access_type: "offline",
            prompt: "consent",
            scope: [
                "openid",
                "email",
                "profile"
            ].join(" "),
        };

        const queryParams = new URLSearchParams(options);
        const url = `${rootUrl}?${queryParams.toString()}`;

        return url


    } catch (error) {
        throw new Error(`Error en crearUrlAuthGoogle: [[[ ${JSON.stringify(error)} ]]]`);
    }
}



export const endpointAuthGoogle = async (codeGoogle: string) => {
    try {

        if (!codeGoogle) {
            throw new Error(`Falta el parametro code en la URL`);
        }


        const tokenRes = await axios.post(
            "https://oauth2.googleapis.com/token",
            {
                code: codeGoogle,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code",
            },
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                transformRequest: [(data) => new URLSearchParams(data).toString()],
            }
        );

        const { access_token, id_token } = tokenRes.data;

        const userInfoRes = await axios.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
                headers: { Authorization: `Bearer ${access_token}` },
            }
        );

        const user = userInfoRes.data;

        const dataUsuario = {
            nombre: user.name as string,
            correo: user.email as string
        }

        return dataUsuario



    } catch (error) {
        throw new Error(`Error en endpointAuthGoogle: [[[ ${JSON.stringify(error)} ]]]`);
    }
}


export const crearUrlAuthMicrosoft = () => {

    try {
        if (!process.env.MS_TENANT_ID || !process.env.MS_CLIENT_ID || !process.env.MS_REDIRECT_URI) {
            throw new Error("Error, falta GOOGLE_CLIENT_ID o GOOGLE_REDIRECT_URI en el archivo .env");
        }
    
        const tenant = process.env.MS_TENANT_ID;
        const clientId = process.env.MS_CLIENT_ID;
        const redirectUri = process.env.MS_REDIRECT_URI;
        const scope = [
            "openid",
            "email",
            "profile",
            "offline_access", // refresh tokens
            "User.Read" // permiso básico para perfil
        ].join(" ");
    
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            redirect_uri: redirectUri,
            response_mode: "query",
            scope,
            state: "12345", // opcional
            prompt: "select_account",
        });
        
        const url = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
        return url
        
    } catch (error) {
        throw new Error(`Error en crearUrlAuthMicrosoft: [[[ ${JSON.stringify(error)} ]]]`);
    }
};


export const obtenerDatosDesdeIdToken = (id_token: string): MicrosoftIDToken => {
  const decoded = jwt.decode(id_token) as MicrosoftIDToken;
  return {
    email: decoded.email || decoded.preferred_username,
    name: decoded.name,
    sub: decoded.sub,
  };
};


export const endpointAuthMicrosoft = async (codeMicrosoft: string) => {

    try {
        if (!process.env.MS_TENANT_ID || !process.env.MS_CLIENT_ID || !process.env.MS_REDIRECT_URI || !process.env.MS_CLIENT_SECRET) {
            throw new Error("Error, falta GOOGLE_CLIENT_ID o GOOGLE_REDIRECT_URI en el archivo .env");
        }

        const tenant = process.env.MS_TENANT_ID;

        const tokenRes = await axios.post(
            `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
            new URLSearchParams({
                client_id: process.env.MS_CLIENT_ID,
                client_secret: process.env.MS_CLIENT_SECRET,
                redirect_uri: process.env.MS_REDIRECT_URI,
                grant_type: "authorization_code",
                code: codeMicrosoft,
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token, id_token } = tokenRes.data;

        const resultadoToken = obtenerDatosDesdeIdToken(id_token);

        const dataUsuario = {
            nombre: resultadoToken.name as string,
            correo: resultadoToken.email as string
        }

        return dataUsuario

    } catch (error) {
        throw new Error(`Error en endpointAuthMicrosoft: [[[ ${JSON.stringify(error)} ]]]`);
    }

};
