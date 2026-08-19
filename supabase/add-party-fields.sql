-- Run in Supabase SQL Editor if the customers table already exists.
alter table public.customers add column if not exists gst_number text;
alter table public.customers add column if not exists fssai_number text;
alter table public.customers add column if not exists salesman_name text;
