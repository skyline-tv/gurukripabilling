-- Run in Supabase SQL Editor once.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  delivery_order_id uuid not null unique references public.delivery_orders(id),
  customer_id uuid not null references public.customers(id),
  invoice_date date not null default current_date,
  salesman_name text,
  taxable_amount numeric(12, 2) not null default 0,
  gst_percent numeric(5, 2) not null default 5,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'issued',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid not null references public.products(id),
  description text not null,
  mrp numeric(12, 2) not null default 0,
  rate numeric(12, 2) not null default 0,
  quantity numeric(12, 3) not null check (quantity > 0),
  amount numeric(12, 2) not null default 0,
  gst_percent numeric(5, 2) not null default 5,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0
);

create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists "Authenticated users can manage invoices" on public.invoices;
drop policy if exists "Authenticated users can manage invoice items" on public.invoice_items;
create policy "Authenticated users can manage invoices" on public.invoices for all to authenticated using (true) with check (true);
create policy "Authenticated users can manage invoice items" on public.invoice_items for all to authenticated using (true) with check (true);
