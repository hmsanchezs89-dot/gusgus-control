create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  categoria text not null default 'General',
  precio_local numeric default 0,
  precio_whatsapp numeric default 0,
  precio_didi numeric default 0,
  precio_uber numeric default 0,
  costo_base numeric default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  fecha_operativa date not null default current_date,
  fecha_real timestamptz default now(),
  canal text not null,
  metodo_pago text not null,
  subtotal numeric default 0,
  descuento numeric default 0,
  motivo_descuento text,
  total_final numeric default 0,
  costo_total numeric default 0,
  iva numeric default 0,
  resico numeric default 0,
  comision numeric default 0,
  reinversion numeric default 0,
  utilidad_real numeric default 0,
  no_tocar numeric default 0,
  estado text default 'activa',
  notas text,
  created_at timestamptz default now()
);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references sales(id) on delete cascade,
  product_id uuid references products(id),
  cantidad numeric default 1,
  precio_unitario numeric default 0,
  costo_unitario numeric default 0,
  nombre_producto text,
  codigo_producto text,
  created_at timestamptz default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  monto numeric not null,
  descripcion text,
  fecha date default current_date,
  estado text default 'activo',
  created_at timestamptz default now()
);

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  unidad text not null default 'pza',
  stock_actual numeric default 0,
  stock_minimo numeric default 0,
  costo_unitario numeric default 0,
  proveedor text,
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  ingrediente text not null,
  cantidad numeric not null default 0,
  unidad text not null default 'pza',
  costo_total numeric not null default 0,
  proveedor text,
  fecha date default current_date,
  estado text default 'activo',
  created_at timestamptz default now()
);

create table if not exists waste (
  id uuid primary key default gen_random_uuid(),
  producto text not null,
  cantidad numeric not null default 0,
  unidad text not null default 'pza',
  motivo text,
  perdida numeric default 0,
  fecha date default current_date,
  estado text default 'activo',
  created_at timestamptz default now()
);

create table if not exists cash_sessions (
  id uuid primary key default gen_random_uuid(),
  fecha_operativa date not null default current_date,
  estado text default 'abierta',
  fondo_inicial numeric default 0,
  efectivo_esperado numeric default 0,
  efectivo_real numeric default 0,
  diferencia numeric default 0,
  apertura timestamptz default now(),
  cierre timestamptz,
  responsable text,
  created_at timestamptz default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  inventory_id uuid references inventory(id),
  cantidad numeric default 0,
  created_at timestamptz default now()
);

alter table products add column if not exists activo boolean default true;
alter table sales add column if not exists descuento numeric default 0;
alter table sales add column if not exists motivo_descuento text;
alter table sales add column if not exists total_final numeric default 0;
alter table sales add column if not exists reinversion numeric default 0;
alter table sales add column if not exists estado text default 'activa';
alter table sale_items add column if not exists created_at timestamptz default now();
alter table expenses add column if not exists estado text default 'activo';
alter table inventory add column if not exists activo boolean default true;
alter table purchases add column if not exists estado text default 'activo';
alter table waste add column if not exists estado text default 'activo';

alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expenses enable row level security;
alter table inventory enable row level security;
alter table purchases enable row level security;
alter table waste enable row level security;
alter table cash_sessions enable row level security;
alter table recipes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['products','sales','sale_items','expenses','inventory','purchases','waste','cash_sessions','recipes']
  loop
    execute format('drop policy if exists "anon read %s" on %I', t, t);
    execute format('drop policy if exists "anon insert %s" on %I', t, t);
    execute format('drop policy if exists "anon update %s" on %I', t, t);
    execute format('drop policy if exists "anon delete %s" on %I', t, t);
    execute format('create policy "anon read %s" on %I for select to anon using (true)', t, t);
    execute format('create policy "anon insert %s" on %I for insert to anon with check (true)', t, t);
    execute format('create policy "anon update %s" on %I for update to anon using (true) with check (true)', t, t);
    execute format('create policy "anon delete %s" on %I for delete to anon using (true)', t, t);
  end loop;
end $$;

insert into products (codigo, nombre, categoria, precio_local, precio_whatsapp, precio_didi, precio_uber, costo_base)
values
('A1', 'El Para Mí', 'Alitas', 99, 99, 159, 169, 36.79),
('A2', 'Combo Antojo', 'Alitas', 165, 165, 289, 299, 68.15),
('A3', 'Combo Compartir', 'Alitas', 299, 299, 499, 519, 126.09),
('B1', 'Obelisco Personal', 'Boneless', 109, 109, 179, 189, 50.79),
('B2', 'Obelisco Antojo', 'Boneless', 179, 179, 319, 329, 82.15),
('P1', 'Papas Francesa', 'Snacks', 65, 65, 99, 109, 29.29),
('R1', 'Refresco', 'Bebidas', 15, 15, 25, 25, 9.20)
on conflict (codigo) do nothing;

insert into inventory (nombre, unidad, stock_actual, stock_minimo, costo_unitario, proveedor)
values
('Pollo', 'g', 8000, 5000, 0.096, 'Proveedor pollo'),
('Papa', 'g', 4000, 3000, 0.032, 'Proveedor papa'),
('Ranch / Dip', 'pza', 25, 15, 4.5, 'Proveedor dips'),
('Charola', 'pza', 120, 40, 5.8, 'Proveedor empaque')
on conflict (nombre) do nothing;

select 'GUS GUS CONTROL PRO+ listo' as estado;


-- ============================================================
-- MEJORAS PROFESIONALES
-- ============================================================

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references inventory(id),
  tipo text not null,
  cantidad numeric not null default 0,
  motivo text,
  sale_id uuid references sales(id),
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  accion text not null,
  descripcion text,
  created_at timestamptz default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  iva numeric default 16,
  resico numeric default 6.25,
  reinversion numeric default 50,
  sueldo numeric default 30,
  gastos_fijos numeric default 10,
  reserva numeric default 10,
  comision_didi numeric default 30,
  comision_uber numeric default 35,
  created_at timestamptz default now()
);

alter table inventory_movements enable row level security;
alter table audit_logs enable row level security;
alter table settings enable row level security;

drop policy if exists "anon read inventory_movements" on inventory_movements;
drop policy if exists "anon insert inventory_movements" on inventory_movements;
drop policy if exists "anon read audit_logs" on audit_logs;
drop policy if exists "anon insert audit_logs" on audit_logs;
drop policy if exists "anon read settings" on settings;
drop policy if exists "anon insert settings" on settings;
drop policy if exists "anon update settings" on settings;

create policy "anon read inventory_movements" on inventory_movements for select to anon using (true);
create policy "anon insert inventory_movements" on inventory_movements for insert to anon with check (true);

create policy "anon read audit_logs" on audit_logs for select to anon using (true);
create policy "anon insert audit_logs" on audit_logs for insert to anon with check (true);

create policy "anon read settings" on settings for select to anon using (true);
create policy "anon insert settings" on settings for insert to anon with check (true);
create policy "anon update settings" on settings for update to anon using (true) with check (true);

create or replace function decrement_inventory_stock(item_id uuid, amount numeric)
returns void as $$
  update inventory
  set stock_actual = greatest(stock_actual - amount, 0)
  where id = item_id;
$$ language sql;

create or replace function increment_inventory_stock(item_id uuid, amount numeric)
returns void as $$
  update inventory
  set stock_actual = stock_actual + amount
  where id = item_id;
$$ language sql;

insert into settings (iva, resico, reinversion, sueldo, gastos_fijos, reserva, comision_didi, comision_uber)
select 16, 6.25, 50, 30, 10, 10, 30, 35
where not exists (select 1 from settings);

select 'Mejoras profesionales listas' as estado;
