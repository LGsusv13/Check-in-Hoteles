# Hotel Check-In Digital

Sistema completo de check-in digital para hoteles: el hotel crea una reserva,
genera un link único para el huésped, el huésped llena sus datos y sube foto
de su cédula/pasaporte, y el hotel gestiona todo desde un panel administrativo.

Construido **100% con herramientas gratuitas**:

- **React + Vite + Tailwind** — frontend
- **Supabase** (plan gratis) — base de datos, autenticación y almacenamiento de archivos
- **Vercel o Netlify** (plan gratis) — hosting

---

## 1. Crear el proyecto en Supabase (gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta / proyecto nuevo.
2. Abre **SQL Editor** en el menú lateral.
3. Copia y pega **todo** el contenido de [`database/schema.sql`](./database/schema.sql) y dale **Run**.
   Esto crea las tablas, las políticas de seguridad (RLS), las funciones y el bucket de Storage.
4. Ve a **Authentication → Users → Add user** y crea el usuario admin del hotel
   (correo y contraseña). Con eso ya puede iniciar sesión en el panel.
5. Ve a **Project Settings → API** y copia:
   - `Project URL`
   - `anon public key`

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
```

Abre `.env` y pega los dos valores del paso anterior:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
```

> La `anon key` es pública por diseño (Supabase la expone al navegador). La seguridad
> real la dan las políticas RLS y las funciones `SECURITY DEFINER` del `schema.sql`,
> que ya están configuradas para que el huésped **nunca** pueda leer datos de otras
> reservas ni de otros huéspedes.

```bash
npm run dev
```

## 3. Cómo se usa

**Como administrador:**
1. Entra a `/admin/login` e inicia sesión con el usuario que creaste en Supabase.
2. Click en "+ Nueva reserva", llena los datos, y se genera un link único
   (`tudominio.com/checkin/AB3XK9`) **junto con un código QR** descargable.
3. Comparte el link por WhatsApp/email, o imprime el QR y pégalo en la puerta
   de la habitación o en recepción para que el huésped lo escanee.
4. Cuando el huésped complete el check-in, aparece en la tabla con estado `check-in`.
   Click en la fila para ver sus datos y su documento de identidad.
5. Al salir, marca "check-out" desde el detalle de la reserva.

**Como huésped:**
1. Abre el link o escanea el QR que le compartió el hotel.
2. Llena sus datos (y los de sus acompañantes si son varios).
3. Sube una foto de su cédula o pasaporte.
4. Acepta el tratamiento de datos personales (checkbox obligatorio).
5. Envía. Recibe un comprobante en pantalla que puede imprimir. Ya no puede
   volver a hacer check-in con el mismo link (evita duplicados).

## 4. Publicarlo gratis (hosting)

### Opción A — Vercel
1. Sube este proyecto a un repositorio de GitHub.
2. Entra a [vercel.com](https://vercel.com), "Add New Project", conecta el repo.
3. En "Environment Variables" agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Listo, tienes una URL pública gratis (`tuproyecto.vercel.app`).

### Opción B — Netlify
Mismo proceso: conectar el repo, agregar las variables de entorno, deploy.
Build command: `npm run build` — Publish directory: `dist`.

Ambas opciones son gratis para este nivel de tráfico (un hotel pequeño/mediano).

## 5. Seguridad — qué se protegió y por qué

- **RLS activado** en `reservas` y `huespedes`: sin sesión de admin, nadie puede
  hacer `SELECT` directo sobre esas tablas desde el navegador.
- El huésped **solo** interactúa mediante dos funciones de Postgres
  (`buscar_reserva_por_codigo`, `registrar_checkin`) que validan el código
  de reserva y no exponen más datos de los necesarios.
- Los documentos de identidad se guardan en un **bucket privado** de Storage:
  el huésped puede subir, pero no puede leer ni listar archivos de otros.
  Solo el admin autenticado puede verlos (con URLs firmadas que expiran).
- Una reserva con estado distinto de `pendiente` no admite un segundo check-in
  (se valida en la función SQL con bloqueo de fila `for update`, evitando
  condiciones de carrera si dos personas envían el formulario a la vez).
- Las variables de entorno (`.env`) no se suben al repositorio (`.gitignore`).

## 6. Estructura del proyecto

```
database/schema.sql        → todo el esquema SQL para pegar en Supabase
src/lib/supabaseClient.js  → cliente de Supabase
src/lib/validators.js      → validaciones (cédula ecuatoriana, email, teléfono)
src/components/            → piezas reutilizables (formulario de huésped, modales)
src/pages/CheckIn.jsx      → página pública de check-in
src/pages/AdminLogin.jsx   → login del panel
src/pages/AdminDashboard.jsx → panel: lista, filtros, crear reserva, exportar CSV
```

## 7. Posibles mejoras futuras (no incluidas, para no sobrecargar el MVP)

- Notificar por email al huésped cuando se genera la reserva (Supabase tiene
  integraciones gratuitas limitadas, o se puede usar Resend en su plan gratis).
- Reporte automático a Migración Ecuador para huéspedes extranjeros.
- Multi-hotel / multi-usuario admin con roles.
- Firma digital del huésped aceptando términos y condiciones.
