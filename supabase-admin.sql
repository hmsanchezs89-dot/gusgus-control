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
  created_at timestamptz default now()
);

alter table products add column if not exists activo boolean default true;
alter table sales add column if not exists descuento numeric default 0;
alter table sales add column if not exists motivo_descuento text;
alter table sales add column if not exists total_final numeric default 0;
alter table sales add column if not exists reinversion numeric default 0;
alter table sale_items add column if not exists created_at timestamptz default now();

alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expenses enable row level security;
alter table inventory enable row level security;
alter table purchases enable row level security;
alter table waste enable row level security;

drop policy if exists "anon read products" on products;
drop policy if exists "anon insert products" on products;
drop policy if exists "anon update products" on products;
drop policy if exists "anon delete products" on products;
drop policy if exists "anon read sales" on sales;
drop policy if exists "anon insert sales" on sales;
drop policy if exists "anon read sale_items" on sale_items;
drop policy if exists "anon insert sale_items" on sale_items;
drop policy if exists "anon read expenses" on expenses;
drop policy if exists "anon insert expenses" on expenses;
drop policy if exists "anon update expenses" on expenses;
drop policy if exists "anon delete expenses" on expenses;
drop policy if exists "anon read inventory" on inventory;
drop policy if exists "anon insert inventory" on inventory;
drop policy if exists "anon update inventory" on inventory;
drop policy if exists "anon delete inventory" on inventory;
drop policy if exists "anon read purchases" on purchases;
drop policy if exists "anon insert purchases" on purchases;
drop policy if exists "anon update purchases" on purchases;
drop policy if exists "anon delete purchases" on purchases;
drop policy if exists "anon read waste" on waste;
drop policy if exists "anon insert waste" on waste;
drop policy if exists "anon update waste" on waste;
drop policy if exists "anon delete waste" on waste;

create policy "anon read products" on products for select to anon using (true);
create policy "anon insert products" on products for insert to anon with check (true);
create policy "anon update products" on products for update to anon using (true) with check (true);
create policy "anon delete products" on products for delete to anon using (true);

create policy "anon read sales" on sales for select to anon using (true);
create policy "anon insert sales" on sales for insert to anon with check (true);

create policy "anon read sale_items" on sale_items for select to anon using (true);
create policy "anon insert sale_items" on sale_items for insert to anon with check (true);

create policy "anon read expenses" on expenses for select to anon using (true);
create policy "anon insert expenses" on expenses for insert to anon with check (true);
create policy "anon update expenses" on expenses for update to anon using (true) with check (true);
create policy "anon delete expenses" on expenses for delete to anon using (true);

create policy "anon read inventory" on inventory for select to anon using (true);
create policy "anon insert inventory" on inventory for insert to anon with check (true);
create policy "anon update inventory" on inventory for update to anon using (true) with check (true);
create policy "anon delete inventory" on inventory for delete to anon using (true);

create policy "anon read purchases" on purchases for select to anon using (true);
create policy "anon insert purchases" on purchases for insert to anon with check (true);
create policy "anon update purchases" on purchases for update to anon using (true) with check (true);
create policy "anon delete purchases" on purchases for delete to anon using (true);

create policy "anon read waste" on waste for select to anon using (true);
create policy "anon insert waste" on waste for insert to anon with check (true);
create policy "anon update waste" on waste for update to anon using (true) with check (true);
create policy "anon delete waste" on waste for delete to anon using (true);

insert into products (codigo, nombre, categoria, precio_local, precio_whatsapp, precio_didi, precio_uber, costo_base)
values
('A1', 'El Para Mí', 'Alitas', 99, 99, 159, 169, 36.79),
('A2', 'Combo Antojo', 'Alitas', 165, 165, 289, 299, 68.15),
('A3', 'Combo Compartir', 'Alitas', 299, 299, 499, 519, 126.09),
('B1', 'Obelisco Personal', 'Boneless', 109, 109, 179, 189, 50.79),
('B2', 'Obelisco Antojo', 'Boneless', 179, 179, 319, 329, 82.15),
('B3', 'Obelisco Grande', 'Boneless', 329, 329, 549, 569, 149.09),
('P1', 'Papas Francesa', 'Snacks', 65, 65, 99, 109, 29.29),
('P2', 'Papas Gajo', 'Snacks', 75, 75, 109, 119, 29.54),
('D1', 'Dedos de Queso', 'Snacks', 85, 85, 149, 159, 49.29),
('C1', 'Aros de Cebolla', 'Snacks', 70, 70, 109, 119, 18.29),
('R1', 'Refresco', 'Bebidas', 15, 15, 25, 25, 9.20)
on conflict (codigo) do nothing;

insert into inventory (nombre, unidad, stock_actual, stock_minimo, costo_unitario, proveedor)
values
('Pollo', 'g', 8000, 5000, 0.096, 'Proveedor pollo'),
('Papa', 'g', 4000, 3000, 0.032, 'Proveedor papa'),
('Charola', 'pza', 120, 40, 5.8, 'Proveedor empaque')
on conflict (nombre) do nothing;

select 'GUS GUS ADMIN listo' as estado;
