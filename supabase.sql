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
  costo_total numeric default 0,
  iva numeric default 0,
  resico numeric default 0,
  comision numeric default 0,
  utilidad_real numeric default 0,
  no_tocar numeric default 0,
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
  codigo_producto text
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  monto numeric not null,
  descripcion text,
  fecha date default current_date,
  created_at timestamptz default now()
);

alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expenses enable row level security;

drop policy if exists "public read products" on products;
drop policy if exists "public insert products" on products;
drop policy if exists "public update products" on products;
drop policy if exists "public read sales" on sales;
drop policy if exists "public insert sales" on sales;
drop policy if exists "public read sale_items" on sale_items;
drop policy if exists "public insert sale_items" on sale_items;
drop policy if exists "public read expenses" on expenses;
drop policy if exists "public insert expenses" on expenses;

create policy "public read products" on products for select using (true);
create policy "public insert products" on products for insert with check (true);
create policy "public update products" on products for update using (true) with check (true);

create policy "public read sales" on sales for select using (true);
create policy "public insert sales" on sales for insert with check (true);

create policy "public read sale_items" on sale_items for select using (true);
create policy "public insert sale_items" on sale_items for insert with check (true);

create policy "public read expenses" on expenses for select using (true);
create policy "public insert expenses" on expenses for insert with check (true);

insert into products (codigo, nombre, categoria, precio_local, precio_whatsapp, precio_didi, precio_uber, costo_base)
values
('A1', 'El Para Mí', 'Alitas', 99, 99, 159, 169, 36.79),
('A2', 'Combo Antojo', 'Alitas', 165, 165, 289, 299, 68.15),
('A3', 'Combo Compartir', 'Alitas', 299, 299, 499, 519, 126.09),
('B1', 'Obelisco Personal', 'Boneless', 109, 109, 179, 189, 50.79),
('B2', 'Obelisco Antojo', 'Boneless', 179, 179, 319, 329, 82.15),
('P1', 'Papas Francesa', 'Snacks', 65, 65, 99, 109, 24.50),
('E1', 'Dip Extra', 'Extras', 12, 12, 18, 20, 4.50),
('R1', 'Refresco', 'Bebidas', 15, 15, 25, 25, 9.20)
on conflict (codigo) do nothing;
