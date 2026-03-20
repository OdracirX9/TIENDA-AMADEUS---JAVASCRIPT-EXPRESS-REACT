# Documentación Técnica y de Arquitectura: SERVIDOR-CORREOS

Este documento detalla la estructura, flujo de datos y dependencias del **SERVIDOR-CORREOS**. Este microservicio en Node.js funciona de manera aislada (Stateless) y tiene la responsabilidad única de gestionar, renderizar y despachar todas las notificaciones transaccionales vía Email de la plataforma E-commerce utilizando la API de **Brevo** y plantillas dinámicas en **Handlebars**.

---

## 1. Configuración del Entorno y Secretos (`.env`)

El microservicio no requiere conexión a base de datos ni a pasarelas de pago, su única conexión saliente estricta es hacia el proveedor SMTP/API de correos (Brevo) y su configuración de CORS para admitir peticiones de otros microservicios.

### Tabla de Variables de Entorno

| Variable | Tipo de Dato | Obligatorio | Propósito y Descripción |
|----------|--------------|-------------|-------------------------|
| `PORT` | Number | No | Puerto de escucha (Por defecto 4050). |
| `APIKEY_BREVO` | String | Sí | Credencial secreta de autenticación provista por Brevo. Vital para inyectar correos mediante su API REST pública (`v3/smtp/email`). |
| `ISLOCAL` | Boolean (0/1) | Sí | Define el conjunto de orígenes CORS permitidos. Si es `1`, admite `localhost` y `127.0.0.1`. Si es `0`, habilita los dominios de producción (`your-domain.com`). |
| `CORREO_ADMIN_A_NOTIFICAR` | String | Sí | Dirección de correo designada (Generalmente gerencia o staff de inventario) para recibir notificaciones cuando se concreta una nueva venta desde el Gateway de Pagos. |

### Ejemplo de Archivo `.env.example`

```env
PORT=4050
ISLOCAL=0

# Credenciales de API Transaccional de Correo
APIKEY_BREVO=[REDACTED_API_KEY]

# Destinatarios Globales
CORREO_ADMIN_A_NOTIFICAR=admin@[REDACTED_DOMAIN]
```

---

## 2. Mapa de Arquitectura y Conexiones

### 2.1 Análisis de Archivos y Responsabilidades (SRP)

El proyecto es compacto y enfocado. Separa claramente las plantillas base de la lógica de red:

*   **`src/index.ts`**:
    *   **Propósito**: Inicialización de Express y definición del firewall perimetral (CORS). Decide dinámicamente si acepta orígenes de desarrollo o producción garantizando que nadie externo al sistema pueda dispararle endpoints de SPAM.
*   **`src/utils/envioCorreos.ts`**:
    *   **Propósito**: Núcleo de la integración. Aquí reside la función `formulacionCorreoYenvio`.
    *   **Lógica**: Toma un archivo HTML plano (`.html` en la carpeta `/assets/layouts`), lo compila utilizando el motor `Handlebars`, reemplaza las variables dinámicas de entrada (como nombres, links o montos) y delega la ejecución final a Axios apuntando al Endpoint de Brevo.
*   **`src/controllers/`**:
    *   **Propósito**: Controladores ligeros cuya única función es desestructurar los `req.body` entrantes, validad que los campos obligatorios existan y luego invocar armónicamente a `formulacionCorreoYenvio` asistiéndole de los nombres de asunto (`subject`) e identificadores de layouts.

### 2.2 Dependencias Principales (`package.json`)

*   **`express`**: Estructura de red base para exponer las rutas POST.
*   **`axios`**: Empleado para realizar llamadas programáticas y controladas vía HTTP hacia `api.brevo.com`.
*   **`handlebars`**: Motor lógico de plantillas. Al inyectarle un HTML estático intercala y evalúa expresiones `{{ variable }}` transformando esqueletos genéricos de correos en facturas o mensajes hiper-personalizados en crudo.
*   **`cors`**: Indispensable para asegurar que sólo nuestros propios Frontends o Microservicios Backend puedan enviarle instrucciones.

### 2.3 Diagrama Lógico: Dispersión de Correos Asíncrona

Este servidor está diseñado para ser invocado sin necesidad de esperar respuesta en la arquitectura principal (Fire-and-forget).

```text
 ┌──────────────────────┐        Petición POST (Aprobada)        ┌─────────────────────┐
 │ SERVIDOR PAGOS /     ├───────────────────────────────────────>│ SERVIDOR DE CORREOS │
 │ SERVIDOR USUARIOS    │        JSON: { nombre, monto, ...}     │ (Instancia Express) │
 └──────────────────────┘                                        └──────────┬──────────┘
                                                                            │
      ┌───────────────────────────┐ 1. Lee plantilla HTML Base              │
      │ /assets/layouts/*.html    │<────────────────────────────────────────┤
      └───────────────────────────┘                                         │
                                                                            ▼
                                     2. Interpola Variables con Handlebars  │
                                     `<h1>Hola {{nombre}}</h1>`             │
                                                                            ▼
                                     3. Envía Payload V3 al Proveedor SMTP  │
 ┌──────────────────────┐                                                   │
 │ BREVO API            │<────────────────────────── AXIOS ─────────────────┘
 │ (Entrega al Cliente) │
 └──────────────────────┘
```

---

## 3. Flujo de Datos y Lógica de Negocio

### 3.1 Eventos Críticos

#### A. Flujo Abierto de Ensamblaje y Despacho (`envioCorreos.ts`)
1.  **Recopilación**: Un controlador externo (Ej. `POSTConfirmacionRegistro.controller.ts`) recibe una orden desde el Servidor de Usuarios. Extrae el Nombre del cliente y el Token de Activación (`enlaceConfirmacion`).
2.  **Lectura FS**: El utilitario `formulacionCorreoYenvio` lee en Disco (con `fs.readFileSync`) la plantilla exigida (Ej. `correoConfirmacionRegistro.html`) ubicada bajo `/assets/layouts/`.
3.  **Inyección en caliente**: Pasa el HTML crudo por el compilador `Handlebars.compile()`. Luego, inyecta el `req.body` mapeado al constructor. La plantilla retorna un string enorme lleno de tablas y estilos CSS en línea (Inline), con los datos reales del cliente ya impregnados.
4.  **Despacho SMTP (Brevo)**: Construye la carga requerida por Brevo:
    *   `sender`: Nombre de la clínica y correo de no-responder corporativo.
    *   `to`: Colección parseada de `{ email, name }`.
    *   `subject`: Asunto pre-establecido en el controlador.
    *   `htmlContent`: El String compilado de Handlebars.
5.  Despacha a través de Axios adjuntando el encabezado secreto `api-key`.

### 3.2 Endpoints de API y Rutas Explotadas

*   **`GET /`**: Health Check devuelto, responde Status 200 con `Servidor de Correos E-commerce Activo`. Útil para chequeos Uptime.

*   **`POST /confirmar-registro`**:
    *   **Body Crítico**: `{ nombre: string, correo: string, enlaceConfirmacion: string }`
    *   **Propósito**: Dispara el correo Doble Opt-In. Plantilla: `correoConfirmacionRegistro.html`.

*   **`POST /restablecer-contrasena`**:
    *   **Body Crítico**: `{ nombre: string, correo: string, enlaceRestablecer: string }`
    *   **Propósito**: Dispara correo de Forgot Password (1h de vigencia). Plantilla: `correoRestablecer.html`.

*   **`POST /notificacion-orden`**:
    *   **Body Crítico**: `{ nombre, correo, descripcionCompra, subtotal, envio }`
    *   **Propósito**: Invocado por SERVIDOR-PAGOS inmediatamente recibe luz verde del Webhook de Wompi. Provee detalle básico de la transacción al cliente. Plantilla: `correoNotificacionOrdenCliente.html`.

*   **`POST /notificacion-admin-nueva-orden`**:
    *   **Body Crítico**: `{ nombreCliente: string, descripcionCompra: string }`
    *   **Propósito**: Notificar a Gerencia o Staff de Empaque. En lugar de sacar el correo del body, carga agresivamente el secreto interno `process.env.CORREO_ADMIN_A_NOTIFICAR`. Plantilla: `correoNotificacionAdminOrden.html`.

*   **`POST /notificacion-envio`**:
    *   **Body Crítico**: `{ nombre, correo, descripcionProducto, codigoSeguimiento }`
    *   **Propósito**: Actualizaciones logísticas emitidas por el staff desde el Dashboard Administrativo al entregar a paquetería (Coordinadora/Deprisa). Plantilla: `correoNotificacionEnvio.html`.

*   **`POST /notificacion-entrega`**:
    *   **Body Crítico**: `{ nombre, correo, descripcionProducto }`
    *   **Propósito**: Festeja la llegada del artículo al hogar del cliente y le agradece su compra. Activado desde Dashboard Administrativo. Plantilla: `correoNotificacionRecibido.html`.
