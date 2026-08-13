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

**Flujo principal — auto check-in (sin que recepción cree nada):**
1. Entra a `/admin`, abre la tarjeta **"Enlace de auto check-in"** y descarga el QR
2. Imprímelo **una sola vez** y pégalo en recepción — nunca cambia
3. El huésped llega, recepción le dice de palabra su número de habitación, el huésped escanea el QR
4. El huésped llena **solo sus propios datos** (nombre, teléfono; documento y foto son opcionales)
   y cuántas personas son en total, acepta el consentimiento, y envía
5. La reserva aparece automáticamente en el panel ya en estado `check-in` — nadie en recepción tuvo que crear nada

> Nota: en este flujo solo se registra el detalle del huésped titular. El número de
> acompañantes queda guardado como un conteo (`número de personas`), no con los datos
> individuales de cada uno — así el check-in es más rápido para el huésped.

**Flujo alterno — reserva anticipada (opcional, para reservas hechas con antelación):**
1. Desde `/admin`, botón **"+ Reserva anticipada"**
2. Llena los datos, se genera un link/QR **de un solo uso** para ese huésped específico
3. Compártelo con el huésped antes de que llegue
4. Si el huésped nunca completa el check-in con ese link, puedes reenviárselo o eliminar la reserva desde su detalle

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
- El huésped **solo** interactúa mediante funciones de Postgres
  (`buscar_reserva_por_codigo`, `registrar_checkin`, `autoregistrar_checkin`) que no
  exponen más datos de los necesarios.
- Los documentos de identidad se guardan en un **bucket privado** de Storage:
  el huésped puede subir, pero no puede leer ni listar archivos de otros.
  Solo el admin autenticado puede verlos (con URLs firmadas que expiran).
- Una reserva con estado distinto de `pendiente` no admite un segundo check-in
  (se valida en la función SQL con bloqueo de fila `for update`, evitando
  condiciones de carrera si dos personas envían el formulario a la vez).
- Las variables de entorno (`.env`) no se suben al repositorio (`.gitignore`).

⚠️ **Trade-off del auto check-in que debes conocer:** como el link `/checkin` es
fijo y público (no requiere código previo), cualquiera que lo encuentre puede
enviar registros. Es el mismo riesgo que tiene cualquier formulario público de
contacto. Si en algún momento ves registros falsos o spam, dos opciones simples:
mantener el QR solo impreso en papel (no publicado en redes/web), o pedirme que
agregue un PIN de acceso que el hotel cambie cada cierto tiempo.

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

## 8. Actualizando un proyecto ya desplegado (migración)

Si ya tienes Supabase configurado de una versión anterior, solo necesitas correr
esto en el **SQL Editor** antes de subir el código nuevo — agrega las funciones
del auto check-in sin tocar tus datos existentes:

```sql
-- Copia y pega desde "FUNCIÓN: generar_codigo_unico" hasta el final
-- del archivo database/schema.sql actualizado, y dale Run.
```

Es seguro correr todo el `schema.sql` de nuevo aunque ya lo hayas ejecutado antes:
usa `create or replace function` y `if not exists` en todos lados, así que no
duplica ni borra nada.

## 7. Posibles mejoras futuras (no incluidas, para no sobrecargar el MVP)

- Notificar por email al huésped cuando se genera la reserva (Supabase tiene
  integraciones gratuitas limitadas, o se puede usar Resend en su plan gratis).
- Reporte automático a Migración Ecuador para huéspedes extranjeros.
- Multi-hotel / multi-usuario admin con roles.
- Firma digital del huésped aceptando términos y condiciones.
