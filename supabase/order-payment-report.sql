-- Run this once in Supabase SQL Editor for an existing database.
-- Payment totals stay on their original delivery order; no report-specific
-- payment or billing records are created.
alter table public.delivery_orders
  add column if not exists cash_amount numeric(12, 2) not null default 0,
  add column if not exists gpay_amount numeric(12, 2) not null default 0;
