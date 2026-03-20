import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 
import { POSTCrearProductoI } from "../../utils/Interfaces"
import { endpointAuthGoogle, endpointAuthMicrosoft } from "../utils/crearUrlAuthSesion"
import { consultarExistenciaUsuario, crearUsuario } from "../utils/consultasUsuario"



const GETSesionAuth = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const params = req.params.plataforma as string
            const code = req.query.code as string;

            //  INICIAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("BEGIN")
            //*-------------------------------------------------------------------------------------------------------------- */

            

            //  OBTENCION DE DATOS DEL USUARIO AL LOGUEARSE EN ALGUNA DE LAS PLATAFORMAS
            let resQuery01: {nombre:string; correo:string}
            if(params === "google"){
                resQuery01 = await endpointAuthGoogle(code);

            } else if(params === "microsoft"){
                resQuery01 = await endpointAuthMicrosoft(code)
            } else {
                throw Error("No existe ninguna plataforma conocida")
            }
            console.log("Acto 1")

            
            // FUNCION EN DONDE SE GUARDARA EL TOKEN DE SESION 
            const crearTokenDeSesion = (resQuery:{[key:string]:any})=>{
                req.session.usuario = {
                    id:resQuery.id,
                    nombre:resQuery.nombre,
                    correo:resQuery.correo,
                    celular:resQuery.celular,
                    created_at:resQuery.created_at
                }
            }
            
            //  CONSULTAR EXISTENCIA DEL USUARIO EN LA BASE DE DATOS 
            const resQuery02 = await consultarExistenciaUsuario(pgActive, resQuery01.correo)
            let isExisting = false

            //  CREAR EL TOKEN O ID SE SESION DEPENDIENDO DEL CASO DE SI EL USUARIO EXISTE O NO
            if(resQuery02){
                crearTokenDeSesion(resQuery02)
                isExisting=true
            } else {
                const resQuery03 = await crearUsuario(pgActive, [resQuery01.nombre, resQuery01.correo, creacionFecha])
                crearTokenDeSesion(resQuery03)
            }



            //*-------------------------------------------------------------------------------------------------------------- */
            //  FINALIZAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("COMMIT")
    
            //  REDIRECCION AL FRONTEND CON COOKIE DE SESION CARGADA
            res.redirect(`${process.env.FRONTEND_URL}/perfil?steps=${isExisting}`)

        } catch (error) {
            console.log(error)
            await pgActive.query('ROLLBACK');
            res.redirect(`${process.env.FRONTEND_URL}/login?error=fallo-login`);

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=fallo-servidor`);
    }



}


export default GETSesionAuth;