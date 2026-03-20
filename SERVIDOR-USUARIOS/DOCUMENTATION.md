# Documentación Técnica y de Arquitectura: SERVIDOR-USUARIOS

Este documento abarca el diseño arquitectónico, flujo de datos y dependencias del **SERVIDOR-USUARIOS**. Este microservicio en Node.js es el componente core de Gestión de Identidad y Accesos (IAM). Se encarga exclusivamente de la autenticación, autorización, encriptación de credenciales, y del ciclo de vida de la sesión (Cookies + Redis) de los clientes del e-commerce.

---

## 1. Configuración del Entorno y Secretos (`.env`)

El microservicio requiere acceso irrestricto a la base de datos central paralela a herramientas robustas de encriptado y cachés para manejar las credenciales y persistencia de usuarios.

### Tabla de Variables de Entorno

| Variable | Tipo de Dato | Obligatorio | Propósito y Descripción |
|----------|--------------|-------------|-------------------------|
| `PORT` | Number | No | Puerto de escucha (Por defecto 4002). |
| `HOST_POSTGRESQL`, `DB_POSTGRESQL`, `PORT_POSTGRESQL`, `USER_POSTGRESQL`, `PASS_POSTGRESQL`, `SSL_POSTGRESQL` | Strings/Numbers | Sí | Puntos de anclaje a la base de datos relacional para leer/escribir registros de usuarios, direcciones y roles. |
| `ISLOCAL` | Boolean (0/1) | Sí | Define si la aplicación corre localmente. Ajusta la permisividad de las cookies transaccionales (`Secure: false`, `SameSite: lax`) y reduce la agresividad del Rate Limiting (2000 vs 100 req/15min). |
| `REDIS_URL` | String (URI) | Sí | Ubicación del Cluster Redis, utilizado aquí como motor de almacenamiento duro para las Sesiones HTTP (`connect-redis`). |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Strings/Booleans | Sí | Credenciales de S3 para subir, recuperar o eliminar avatares y fotos de perfil de los usuarios. |
| `TOKEN_AUTORIZACION_ECOMCERCE` | String | Sí | Llave JWT con la que el Middleware verifica que la petición rebotó a través del API Gateway y no es un ataque directo. |
| `CLAVE_JWT_PASSWORD` | String | Sí | Llave secreta asimétrica (Firma) para generar tokens efímeros de recuperación de contraseñas u operaciones sensibles (OTP/Links al correo). |
| `SECRETO_SESION` | String | Sí | Sal secreta utilizada por `express-session` para firmar criptográficamente la Cookie en el navegador del usuario y prevenir su alteración manual. |
| `LINK_FRONTEND_PUBLICO_ECOMERCE`, `LINK_SERVIDOR_CORREOS` | Strings (URL) | Sí | Enlaces para comunicarse asíncronamente con el servicio de correos corporativos y armar redirecciones hacia el frontend en correos de confirmación. |

### Ejemplo de Archivo `.env.example`

```env
PORT=4002
ISLOCAL=0

# Base de Datos
HOST_POSTGRESQL=localhost
DB_POSTGRESQL=ecommercedb
PORT_POSTGRESQL=5432
SSL_POSTGRESQL=0
USER_POSTGRESQL=[REDACTED_USER]
PASS_POSTGRESQL=[REDACTED_PASSWORD]
REDIS_URL=redis://localhost:6379

# Object Storage
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=[REDACTED_KEY]
MINIO_SECRET_KEY=[REDACTED_SECRET]

# Seguridad
TOKEN_AUTORIZACION_ECOMCERCE=[REDACTED_TOKEN]
CLAVE_JWT_PASSWORD=[REDACTED_SECRET]
SECRETO_SESION=[REDACTED_SECRET]

# Cross-Microservices
LINK_FRONTEND_PUBLICO_ECOMERCE=https://your-domain.com
LINK_SERVIDOR_CORREOS=http://localhost:4006
```

---

## 2. Mapa de Arquitectura y Conexiones

### 2.1 Análisis de Archivos y Responsabilidades (SRP)

El proyecto mantiene a raya sus flujos agrupando todo lo relacionado al usuario:

*   **`src/index.ts`**:
    *   **Propósito**: Inicialización de Express y orquestación del `Store` en memoria mediante `express-session` acoplado a Redis. También impone el blindaje `rateLimit` y chequea que BD y Redis estén en línea.
*   **`src/routes/index.route.ts`**:
    *   **Propósito**: Diccionario de Endpoints. Separa las rutas **públicas** de Autenticación (`/auth/*`), de las rutas **privadas** agrupadas en `/sesion-usuario/*` que requieren una Cookie activa (`comprobarSesion`). Aplica a todas `verificarOrigenGateway`.
*   **`src/controllers/POST/POSTRegistroUsuario.controller.ts`** (y similares):
    *   **Propósito**: Controladores robustos que aplican `bcrypt` para crear de inmediato un Hash (Salting) al recolectar contraseñas. Operan con comandos SQL crudos para insertar la data e incluyen llamadas asíncronas HTTP a Servidor Correos para disparar verificaciones (Doble Opt-In).
*   **`src/middleware/comprobarSesionActiva.ts`**:
    *   **Propósito**: Peaje de validación para información delicada (editar perfil). Lee la cookie `cliente_ecomerce_regenievex`, extrae el Token, va a Redis, y si el usuario aún existe, la deja pasar inyectando la Data parseada en `req.session`.

### 2.2 Dependencias Principales (`package.json`)

*   **`bcrypt`**: Core criptográfico. Implementa el algoritmo Blowfish para cifrar permanentemente (de una vía) las contraseñas antes de que toquen la Base de Datos.
*   **`express-session`** + **`connect-redis`**: Combinación imbatible para guardar el estado del usuario (Login) de manera segura y escalable. En lugar de generar JWT y meterlos en `localStorage` (Vulnerable a XSS), emite Cookies `HttpOnly` imposibles de leer mediante JavaScript en el Frontend.
*   **`jsonwebtoken`**: Utilizado para firmas unilaterales y temporales (Como la creación de un Link de Recuperación de contraseña que enviará por correo con vigencia de 1h).
*   **`zod`**: Para defender la entrada (Input Validation) durante el alta/registro de usuarios evitando inyecciones de código.
*   **`multer`** + **`minio`**: Middleware nativo para interpretar imágenes form-data y el Driver para cargar el avatar al S3 Storage.

### 2.3 Diagrama Lógico: Arquitectura Stateless de Sesión

```text
 ┌─────────────┐       Login / Register       ┌──────────────────────┐
 │ FrontEnd    ├─────────────────────────────>│ SERVIDOR DE USUARIOS │
 │ (Navegador) │◄────── HTTPOnly Cookie ──────┤ (Genera Sesión)      │
 └──────┬──────┘                              └──────────┬───────────┘
        │   (Inmune a XSS)                               │ Guarda estado temporal
        │                                                ▼
 ┌──────▼──────┐       Añadir Dirección       ┌──────────────────────┐
 │ Petición al │─────────────────────────────>│ MEMORIA REDIS        │
 │ Área Privada│                              │ {id_user: 15, role: 1}
 └─────────────┘  (Express lee Redis auto.)   └──────────────────────┘
```

---

## 3. Flujo de Datos y Lógica de Negocio

### 3.1 Eventos Críticos

#### A. Flujo de Registro y Confirmación (Double Opt-In)
1.  **Petición Web**: El Frontend envía `{ nombre, apellidos, correo, password }` al Endpoint `/auth/registro`.
2.  **Encriptación Crítica**: El controlador llama a `bcrypt.hash()` cost = 12, transformando `pa$$w0rd` en una amalgama `$2b$12...`.
3.  **Persistencia Inactiva**: Se inserta en PostgreSQL pero con una bandera `habilitacion = false`. El usuario **no puede iniciar sesión**.
4.  **Generación de Eslabón Fuerte**: El servidor genera un JWT temporal firmado con `CLAVE_JWT_PASSWORD` inyectándole el `id` del usuario recién creado.
5.  **Orquestación**: Se concatena una URL de callback a sí mismo y se le hace un POST a `SERVIDOR-CORREOS`. El Gateway devuelve `Res 200` al frontend pidiendo que revisen la bandeja.
6.  **Punto de Activación**: Cuando el cliente hace click en el correo, navega (GET) a `/auth/confirmar-registro?tokenXYZ`. El servidor parsea el JWT, comprueba su veracidad, y si la firma coincide; hace un `UPDATE usuario SET habilitacion = true`, redirigiéndolo a `/login` al Frontend Público.

#### B. Flujo Estricto de Login Persistente
1.  **Validación Básica**: Posteado `{ correo, password }` en `/auth/login`, el controlador busca por email en PostgreSQL.
2.  **Revisión en frío (`bcrypt.compare`)**: Toma la amalgama de Postgres y la compara con la contraseña plana en memoria.
3.  **Anclaje a Sesión Redis**: Si es correcta, extrae la data vital (ID, Nombre, ROL) y se le asigna a `req.session.usuario`.
4.  Express-session muta esto automáticamente, deposita el caché en Redis asignándole un ID encriptado efímero e inyecta la cabecera mágica (ej. `Set-Cookie: cliente_ecomerce_regenievex=s%253xyz... HttpOnly; Secure; SameSite=None`) en el Response HTTP devuelto al cliente.

### 3.2 Endpoints Externos Consumidos

**Rutas Públicas (Enrutador Raíz):**
*   **`POST /auth/registro`**: Alta de clientes. Oculta contraseñas y dispara el flujo de emails automatizados.
*   **`POST /auth/login`**: Inicia y autoriza el nacimiento unánime de las cookies y la memoria en Redis.
*   **`POST /auth/logout`**: Punto de finalización de accesos. Caza la petición y purga `req.session.destroy`, limpiando a Redis y expirando forzosamente la cookie en el navegador remitente.
*   **`POST /auth/restablecer-contrasena`**: Emisión del Token JWT enviado como Link por correo.
*   **`PATCH /auth/restablecer-contrasena`**: Recibe Token y nueva clave plana. Actualiza y regenera el Hash del DB.

**Rutas Privadas (Sub-enrutador `/sesion-usuario/`):**
Estas rutas atraviesan `comprobarSesion`. Si el Frontend no inyecta la Cookie, o si Redis indica que está expirada, devuelve un `HTTP 401 Unauthorized` bloqueando consultas a datos personales del actor.
*   **`GET /`**: Permite al Front autodescubrir de manera segura quién está logueado leyendo a Redis (Ideal para que Preact mantenga sus Signals hidratados).
*   Se encarga además de las actualizaciones de perfil (PATCH) y del manejo/eliminación de Direcciones de Envío con endpoints adheridos a este sub-nivel seguro.
