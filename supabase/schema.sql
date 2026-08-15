-- Gurukripa Trading: Supabase database schema
-- Run in Supabase Dashboard → SQL Editor after creating your project.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'staff');
create type public.order_status as enum ('draft', 'delivered', 'cancelled');
create type public.inventory_movement_type as enum ('opening', 'stock_in', 'stock_out', 'adjustment', 'return');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  mobile text,
  address text,
  city text,
  gst_number text,
  opening_balance numeric(12, 2) not null default 0,
  outstanding_balance numeric(12, 2) not null default 0,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  category text,
  unit text not null default 'pcs',
  purchase_rate numeric(12, 2) not null default 0,
  selling_rate numeric(12, 2) not null default 0,
  mrp numeric(12, 2) not null default 0,
  gst_percent numeric(5, 2) not null default 0,
  hsn_code text,
  current_stock numeric(12, 3) not null default 0,
  minimum_stock numeric(12, 3) not null default 0,
  status boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers(id),
  order_date date not null default current_date,
  salesman_name text,
  taxable_amount numeric(12, 2) not null default 0,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  status public.order_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_order_items (
  id uuid primary key default gen_random_uuid(),
  delivery_order_id uuid not null references public.delivery_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  description text not null,
  mrp numeric(12, 2) not null default 0,
  rate numeric(12, 2) not null default 0,
  quantity numeric(12, 3) not null check (quantity > 0),
  amount numeric(12, 2) not null default 0
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type public.inventory_movement_type not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index customers_name_idx on public.customers using gin (to_tsvector('simple', name));
create index products_name_idx on public.products using gin (to_tsvector('simple', name));
create index delivery_orders_customer_id_idx on public.delivery_orders(customer_id);
create index delivery_order_items_order_id_idx on public.delivery_order_items(delivery_order_id);
create index inventory_movements_product_id_idx on public.inventory_movements(product_id, created_at desc);

-- Creates a matching profile for every Supabase Auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Applies delivered order stock deductions once, and records an audit movement.
create or replace function public.finalize_delivery_order(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  order_item record;
begin
  if (select status from public.delivery_orders where id = p_order_id) <> 'draft' then
    raise exception 'Only draft delivery orders can be finalized';
  end if;

  for order_item in select * from public.delivery_order_items where delivery_order_id = p_order_id loop
    update public.products
      set current_stock = current_stock - order_item.quantity,
          updated_at = now()
      where id = order_item.product_id and current_stock >= order_item.quantity;

    if not found then
      raise exception 'Insufficient stock for product %', order_item.product_id;
    end if;

    insert into public.inventory_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by)
    values (order_item.product_id, 'stock_out', order_item.quantity, 'delivery_order', p_order_id, auth.uid());
  end loop;

  update public.delivery_orders
    set status = 'delivered', updated_at = now()
    where id = p_order_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.delivery_orders enable row level security;
alter table public.delivery_order_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Authenticated staff can use the business app. Tighten these policies later for tenant-level access.
create policy "Authenticated users can read profiles" on public.profiles for select to authenticated using (true);
create policy "Authenticated users can read customers" on public.customers for select to authenticated using (true);
create policy "Authenticated users can manage customers" on public.customers for all to authenticated using (true) with check (true);
create policy "Authenticated users can read products" on public.products for select to authenticated using (true);
create policy "Authenticated users can manage products" on public.products for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage delivery orders" on public.delivery_orders for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage delivery items" on public.delivery_order_items for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage inventory movements" on public.inventory_movements for all to authenticated using (true) with check (true);

-- Updates a delivered bill atomically: restores its old stock, replaces lines, then deducts new stock.
create or replace function public.update_delivery_order(p_order_id uuid, p_customer_id uuid, p_items jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  old_item record;
  new_item record;
  new_total numeric(12, 2) := 0;
begin
  if not exists (select 1 from public.delivery_orders where id = p_order_id) then
    raise exception 'Delivery order not found';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A delivery order needs at least one item';
  end if;

  for old_item in select * from public.delivery_order_items where delivery_order_id = p_order_id loop
    update public.products set current_stock = current_stock + old_item.quantity, updated_at = now() where id = old_item.product_id;
  end loop;
  delete from public.inventory_movements where reference_type = 'delivery_order' and reference_id = p_order_id;
  delete from public.delivery_order_items where delivery_order_id = p_order_id;

  for new_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, description text, rate numeric, mrp numeric, quantity numeric, amount numeric) loop
    if new_item.product_id is null or new_item.quantity is null or new_item.quantity <= 0 then
      raise exception 'Each item needs a product and a positive quantity';
    end if;
    update public.products set current_stock = current_stock - new_item.quantity, updated_at = now()
      where id = new_item.product_id and current_stock >= new_item.quantity;
    if not found then
      raise exception 'Insufficient stock for product %', new_item.product_id;
    end if;
    insert into public.delivery_order_items (delivery_order_id, product_id, description, rate, mrp, quantity, amount)
      values (p_order_id, new_item.product_id, new_item.description, new_item.rate, new_item.mrp, new_item.quantity, new_item.amount);
    insert into public.inventory_movements (product_id, movement_type, quantity, reference_type, reference_id, created_by)
      values (new_item.product_id, 'stock_out', new_item.quantity, 'delivery_order', p_order_id, auth.uid());
    new_total := new_total + new_item.amount;
  end loop;

  update public.delivery_orders set customer_id = p_customer_id, taxable_amount = new_total, total_amount = new_total, status = 'delivered', updated_at = now() where id = p_order_id;
end;
$$;
