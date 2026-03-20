CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS formularioPaginas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT,
    correo TEXT,
    celular TEXT,
    especialidad TEXT,
    mensaje TEXT,
    created_at TIMESTAMPTZ
);