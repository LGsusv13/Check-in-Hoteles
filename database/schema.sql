-- ============================================================================
-- HOTEL CHECK-IN — ESQUEMA DE BASE DE DATOS
-- ============================================================================
-- Cómo usarlo:
-- 1. Crea un proyecto gratis en https://supabase.com
-- 2. Ve a "SQL Editor" en el panel de Supabase
-- 3. Pega TODO este archivo y dale "Run"
-- 4. Luego ve a "Storage" y confirma que se creó el bucket "documentos-identidad"
-- ============================================================================

-- Extensión para generar UUIDs
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- TABLA: reservas
-- Creada por el hotel (desde el panel admin). El huésped nunca la crea.
-- ----------------------------------------------------------------------------
create table if not exists reservas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,               -- código corto para el link de check-in, ej: "AB3XK9"
  nombre_titular text not null,
  habitacion text,
  fecha_entrada date not null,
  fecha_salida date not null,
  num_personas int not null default 1 check (num_personas >= 1),
  estado text not null default 'pendiente'   -- pendiente | check-in | check-out
    check (estado in ('pendiente', 'check-in', 'check-out')),
  notas text,
  creado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  checkin_at timestamptz,
  checkout_at timestamptz
);

-- ----------------------------------------------------------------------------
-- TABLA: huespedes
-- Cada persona registrada durante el check-in, ligada a una reserva.
-- ----------------------------------------------------------------------------
create table if not exists huespedes (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references reservas(id) on delete cascade,
  es_titular boolean not null default false,
  nombres text not null,
  apellidos text not null,
  ci_pasaporte text not null,
  nacionalidad text not null,
  email text,
  telefono text,
  direccion text,
  ciudad text,
  documento_path text,                       -- ruta del archivo en Storage (privado)
  datos_facturacion jsonb,
  acepto_terminos boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_huespedes_reserva on huespedes(reserva_id);
create index if not exists idx_reservas_codigo on reservas(codigo);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Regla general: el rol "anon" (huésped desde el navegador) NUNCA puede
-- hacer SELECT directo sobre reservas ni huespedes. Solo interactúa a
-- través de las funciones RPC de abajo, que validan el código de reserva.
-- El rol "authenticated" (admin logueado) sí puede ver y gestionar todo.
-- ----------------------------------------------------------------------------
alter table reservas enable row level security;
alter table huespedes enable row level security;

-- Admin (usuario logueado con Supabase Auth) puede hacer todo
create policy "admin_full_access_reservas" on reservas
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "admin_full_access_huespedes" on huespedes
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- No se crean policies para "anon": por defecto, sin policy, el acceso
-- directo queda bloqueado. El huésped solo entra por las funciones RPC.

-- ----------------------------------------------------------------------------
-- FUNCIÓN: buscar_reserva_por_codigo
-- El huésped la llama desde el link /checkin/:codigo. Devuelve SOLO los
-- campos necesarios para mostrar el formulario (no expone toda la tabla).
-- ----------------------------------------------------------------------------
create or replace function buscar_reserva_por_codigo(p_codigo text)
returns table (
  id uuid,
  nombre_titular text,
  habitacion text,
  fecha_entrada date,
  fecha_salida date,
  num_personas int,
  estado text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select r.id, r.nombre_titular, r.habitacion, r.fecha_entrada,
           r.fecha_salida, r.num_personas, r.estado
    from reservas r
    where r.codigo = upper(trim(p_codigo));
end;
$$;

grant execute on function buscar_reserva_por_codigo(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- FUNCIÓN: registrar_checkin
-- El huésped la llama al enviar el formulario. Inserta los huéspedes y
-- marca la reserva como "check-in", todo en una sola transacción atómica.
-- Recibe un array JSON de huéspedes.
-- ----------------------------------------------------------------------------
create or replace function registrar_checkin(p_codigo text, p_huespedes jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserva_id uuid;
  v_estado text;
  v_huesped jsonb;
begin
  select id, estado into v_reserva_id, v_estado
  from reservas
  where codigo = upper(trim(p_codigo))
  for update;

  if v_reserva_id is null then
    raise exception 'Código de reserva no encontrado';
  end if;

  if v_estado <> 'pendiente' then
    raise exception 'Esta reserva ya tiene un check-in registrado';
  end if;

  -- El titular (primer huésped del array) debe haber aceptado el
  -- tratamiento de datos; si no, se rechaza todo el check-in.
  if coalesce((p_huespedes->0->>'acepto_terminos')::boolean, false) is not true then
    raise exception 'El titular debe aceptar el tratamiento de datos para completar el check-in';
  end if;

  for v_huesped in select * from jsonb_array_elements(p_huespedes)
  loop
    insert into huespedes (
      reserva_id, es_titular, nombres, apellidos, ci_pasaporte,
      nacionalidad, email, telefono, direccion, ciudad,
      documento_path, datos_facturacion, acepto_terminos
    ) values (
      v_reserva_id,
      coalesce((v_huesped->>'es_titular')::boolean, false),
      v_huesped->>'nombres',
      v_huesped->>'apellidos',
      v_huesped->>'ci_pasaporte',
      v_huesped->>'nacionalidad',
      nullif(v_huesped->>'email', ''),
      nullif(v_huesped->>'telefono', ''),
      nullif(v_huesped->>'direccion', ''),
      nullif(v_huesped->>'ciudad', ''),
      nullif(v_huesped->>'documento_path', ''),
      v_huesped->'datos_facturacion',
      coalesce((v_huesped->>'acepto_terminos')::boolean, false)
    );
  end loop;

  update reservas
    set estado = 'check-in', checkin_at = now()
    where id = v_reserva_id;

  return v_reserva_id;
end;
$$;

grant execute on function registrar_checkin(text, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- FUNCIÓN: generar_codigo_unico
-- Genera un código corto de reserva garantizando que no choque con uno
-- existente. Uso interno de autoregistrar_checkin.
-- ----------------------------------------------------------------------------
create or replace function generar_codigo_unico()
returns text
language plpgsql
set search_path = public
as $$
declare
  v_codigo text;
  v_existe boolean;
begin
  loop
    select string_agg(
      substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random() * 32)::int + 1, 1), ''
    ) into v_codigo
    from generate_series(1, 6);

    select exists(select 1 from reservas where codigo = v_codigo) into v_existe;
    exit when not v_existe;
  end loop;
  return v_codigo;
end;
$$;

-- ----------------------------------------------------------------------------
-- FUNCIÓN: autoregistrar_checkin
-- El huésped la llama desde /checkin (sin código previo). Crea la reserva
-- Y los huéspedes en un solo paso, sin que el hotel tenga que preparar
-- nada de antemano. La reserva nace directamente en estado "check-in".
-- ----------------------------------------------------------------------------
create or replace function autoregistrar_checkin(p_reserva jsonb, p_huespedes jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text;
  v_reserva_id uuid;
  v_huesped jsonb;
  v_titular jsonb;
begin
  if p_huespedes is null or jsonb_array_length(p_huespedes) < 1 then
    raise exception 'Debe registrar al menos un huésped';
  end if;

  v_titular := p_huespedes->0;
  if coalesce((v_titular->>'acepto_terminos')::boolean, false) is not true then
    raise exception 'El titular debe aceptar el tratamiento de datos para completar el check-in';
  end if;

  if nullif(p_reserva->>'fecha_salida', '') is null then
    raise exception 'La fecha de salida es obligatoria';
  end if;

  v_codigo := generar_codigo_unico();

  insert into reservas (
    codigo, nombre_titular, habitacion, fecha_entrada, fecha_salida,
    num_personas, estado, checkin_at
  ) values (
    v_codigo,
    trim(coalesce(v_titular->>'nombres', '') || ' ' || coalesce(v_titular->>'apellidos', '')),
    nullif(p_reserva->>'habitacion', ''),
    coalesce(nullif(p_reserva->>'fecha_entrada', '')::date, current_date),
    (p_reserva->>'fecha_salida')::date,
    coalesce(nullif(p_reserva->>'num_personas', '')::int, jsonb_array_length(p_huespedes)),
    'check-in',
    now()
  )
  returning id into v_reserva_id;

  for v_huesped in select * from jsonb_array_elements(p_huespedes)
  loop
    insert into huespedes (
      reserva_id, es_titular, nombres, apellidos, ci_pasaporte,
      nacionalidad, email, telefono, direccion, ciudad,
      documento_path, datos_facturacion, acepto_terminos
    ) values (
      v_reserva_id,
      coalesce((v_huesped->>'es_titular')::boolean, false),
      v_huesped->>'nombres',
      v_huesped->>'apellidos',
      v_huesped->>'ci_pasaporte',
      v_huesped->>'nacionalidad',
      nullif(v_huesped->>'email', ''),
      nullif(v_huesped->>'telefono', ''),
      nullif(v_huesped->>'direccion', ''),
      nullif(v_huesped->>'ciudad', ''),
      nullif(v_huesped->>'documento_path', ''),
      v_huesped->'datos_facturacion',
      coalesce((v_huesped->>'acepto_terminos')::boolean, false)
    );
  end loop;

  return v_codigo;
end;
$$;

grant execute on function autoregistrar_checkin(jsonb, jsonb) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- STORAGE: bucket privado para fotos de cédula/pasaporte
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documentos-identidad', 'documentos-identidad', false)
on conflict (id) do nothing;

-- El huésped (anon) puede SUBIR un archivo, pero nunca leer ni listar
create policy "anon_puede_subir_documento" on storage.objects
  for insert
  with check (bucket_id = 'documentos-identidad');

-- Solo el admin logueado puede ver/descargar los documentos
create policy "admin_puede_leer_documentos" on storage.objects
  for select
  using (bucket_id = 'documentos-identidad' and auth.role() = 'authenticated');

create policy "admin_puede_borrar_documentos" on storage.objects
  for delete
  using (bucket_id = 'documentos-identidad' and auth.role() = 'authenticated');

-- ============================================================================
-- LISTO. Siguiente paso: crea tu usuario admin en
-- Authentication > Users > Add User (dentro del panel de Supabase)
-- ============================================================================
