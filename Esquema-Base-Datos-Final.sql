-- FORMATO GENERAL DE LA BASE DE DATOS
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;

-- EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLA: usuario (Actualizada con Password)
CREATE TABLE public.usuario (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre text NOT NULL,
    correo text NOT NULL,
    password text, -- Añadido en la Fase de Autenticación
    celular text,
    habilitacion boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT NULL,
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: administradores
CREATE TABLE public.administradores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre_usuario text NOT NULL,
    correo text NOT NULL UNIQUE,
    password text NOT NULL,
    nivel_acceso text DEFAULT 'root' NOT NULL,
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: direcciones_envio
CREATE TABLE public.direcciones_envio (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_usuario uuid REFERENCES public.usuario(id),
    nombre_usuario text NOT NULL,
    celular text NOT NULL,
    direccion_envio text NOT NULL,
    ciudad text NOT NULL,
    departamento text NOT NULL,
    descripcion text,
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: formulariopaginas
CREATE TABLE public.formulariopaginas (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre text,
    correo text,
    celular text,
    especialidad text,
    mensaje text,
    created_at timestamp with time zone,
    PRIMARY KEY (id)
);

-- TABLA: categorias_producto
CREATE TABLE public.categorias_producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre text NOT NULL,
    descripcion text NOT NULL,
    imagen text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: marcas_producto
CREATE TABLE public.marcas_producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre text NOT NULL,
    descripcion text NOT NULL,
    imagen text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: grupos_producto
CREATE TABLE public.grupos_producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_categoria uuid REFERENCES public.categorias_producto(id),
    id_marca uuid REFERENCES public.marcas_producto(id),
    visibilidad boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    PRIMARY KEY (id)
);

-- TABLA: variantes_producto
CREATE TABLE public.variantes_producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_grupo uuid REFERENCES public.grupos_producto(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    descripcion text NOT NULL,
    caracteristicas jsonb,
    imagenes text[],
    stock integer DEFAULT 0,
    ventas integer DEFAULT 0,
    posicion integer DEFAULT 0,
    visibilidad boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    PRIMARY KEY (id)
);

-- TABLA: historial_precios
CREATE TABLE public.historial_precios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_variante uuid REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    precio integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: actual_precio_producto
CREATE TABLE public.actual_precio_producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_precio_historia uuid REFERENCES public.historial_precios(id) ON DELETE CASCADE,
    id_variante uuid REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    precio integer DEFAULT 0,
    updated_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: tarifas_envio (NUEVA: Reglas de logística)
CREATE TABLE public.tarifas_envio (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    departamento text NOT NULL,
    ciudad text NOT NULL, -- Uso de "TODO" para representar a todas las ciudades no específicas del departamento
    precio integer NOT NULL DEFAULT 0,
    tiempo_estimado text, -- Ejemplo: "1 a 3 días hábiles"
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT uq_tarifa_localidad UNIQUE (departamento, ciudad),
    PRIMARY KEY (id)
);

-- TABLA: orden_grupo (Actualizada con Logística)
CREATE TABLE public.orden_grupo (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_usuario uuid REFERENCES public.usuario(id),
    nombre_usuario text NOT NULL,
    correo text NOT NULL,
    celular text NOT NULL,
    direccion_envio text NOT NULL,
    ciudad text NOT NULL,
    departamento text NOT NULL,
    estado_envio text DEFAULT 'Pendiente', -- NUEVO CAMPO: Pendiente, Procesando, Enviado, Entregado
    numero_guia text, -- NUEVO CAMPO: Tracking logístico (Ej: Servientrega)
    precio_envio integer DEFAULT 0, -- NUEVO CAMPO: Precio que costó el despacho en esta orden
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (id)
);

-- TABLA: orden_producto
CREATE TABLE public.orden_producto (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_orden uuid REFERENCES public.orden_grupo(id) ON DELETE CASCADE,
    id_producto uuid REFERENCES public.variantes_producto(id),
    nombre text NOT NULL,
    marca text NOT NULL,
    categoria text NOT NULL,
    imagen text NOT NULL,
    cantidad integer NOT NULL,
    id_precio uuid,
    precio integer DEFAULT 0,
    descuento integer DEFAULT 0,
    sub_total integer NOT NULL,
    CONSTRAINT orden_producto_cantidad_check CHECK ((cantidad > 0)),
    PRIMARY KEY (id)
);

-- TABLA: transaccion
CREATE TABLE public.transaccion (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_wompi text NOT NULL,
    id_orden uuid REFERENCES public.orden_grupo(id) ON DELETE CASCADE,
    id_usuario uuid REFERENCES public.usuario(id),
    nombre text NOT NULL,
    descripcion text NOT NULL,
    expiracion_link timestamp with time zone NOT NULL,
    estado text NOT NULL, -- pending, approved, declined, error
    divisa text,
    metodo_pago text,
    compra_total integer DEFAULT 0,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    PRIMARY KEY (id)
);

-- FUNCIÓN: Cancelar transacciones pendientes expiradas (> 1 hora)
CREATE OR REPLACE FUNCTION public.cancelar_transacciones_expiradas()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.transaccion
    SET estado = 'DECLINED', updated_at = NOW()
    WHERE UPPER(estado) = 'PENDING'
      AND created_at < NOW() - INTERVAL '1 hour';
    
    RETURN NEW;
END;
$$;

-- TRIGGER: limpiar transacciones expiradas al insertar nuevas (lazy sweep)
CREATE TRIGGER trg_limpiar_transacciones_expiradas
AFTER INSERT ON public.transaccion
FOR EACH STATEMENT
EXECUTE FUNCTION public.cancelar_transacciones_expiradas();

-- =============================================================================
-- CARRITO DE COMPRAS
-- =============================================================================

-- TABLA: carrito (cabecera — una por usuario)
-- Se elimina automáticamente si el usuario es eliminado (ON DELETE CASCADE).
CREATE TABLE public.carrito (
    id          uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_usuario  uuid NOT NULL UNIQUE
                     REFERENCES public.usuario(id) ON DELETE CASCADE,
    created_at  timestamp with time zone NOT NULL DEFAULT now(),
    updated_at  timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- TABLA: items_carrito (líneas del carrito)
-- Una fila por variante dentro del carrito.
-- • ON DELETE CASCADE desde carrito   → borrar usuario/carrito elimina sus items
-- • ON DELETE CASCADE desde variante  → borrar la variante la saca del carrito
-- • UNIQUE(id_carrito, id_variante)   → sin duplicados; el backend hace UPDATE en lugar de doble INSERT
-- • CHECK cantidad > 0                → no se permiten cantidades inválidas
CREATE TABLE public.items_carrito (
    id              uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    id_carrito      uuid NOT NULL
                         REFERENCES public.carrito(id) ON DELETE CASCADE,
    id_variante     uuid NOT NULL
                         REFERENCES public.variantes_producto(id) ON DELETE CASCADE,
    cantidad        integer NOT NULL DEFAULT 1,
    created_at      timestamp with time zone NOT NULL DEFAULT now(),
    updated_at      timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT uq_carrito_variante   UNIQUE (id_carrito, id_variante),
    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    PRIMARY KEY (id)
);

-- FUNCIÓN: elimina items del carrito cuando una variante queda sin stock o invisible
CREATE OR REPLACE FUNCTION public.limpiar_items_sin_disponibilidad()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.stock = 0 OR NEW.visibilidad = false THEN
        DELETE FROM public.items_carrito
        WHERE id_variante = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- TRIGGER: se ejecuta tras cada UPDATE en variantes_producto
CREATE TRIGGER trg_limpiar_carrito_por_variante
AFTER UPDATE ON public.variantes_producto
FOR EACH ROW
EXECUTE FUNCTION public.limpiar_items_sin_disponibilidad();

-- =============================================================================
-- LANDING PAGE FRONTEND
-- =============================================================================

-- TABLA: landing_page
CREATE TABLE public.landing_page (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    titulo text NOT NULL,
    descripcion text NOT NULL,
    array_variantes uuid[],
    posicion integer DEFAULT 0,
    visibilidad boolean DEFAULT false,
    PRIMARY KEY (id)
);

-- =============================================================================
-- DATOS INICIALES MIGRADOS
-- =============================================================================


-- ── Datos: administradores ────────────────


