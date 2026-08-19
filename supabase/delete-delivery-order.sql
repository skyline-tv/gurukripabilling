-- Run in Supabase SQL Editor once.
create or replace function public.delete_delivery_order(p_order_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  old_item record;
begin
  if not exists (select 1 from public.delivery_orders where id = p_order_id) then
    raise exception 'Delivery order not found';
  end if;

  for old_item in select * from public.delivery_order_items where delivery_order_id = p_order_id loop
    update public.products set current_stock = current_stock + old_item.quantity, updated_at = now() where id = old_item.product_id;
  end loop;

  delete from public.inventory_movements where reference_type = 'delivery_order' and reference_id = p_order_id;
  delete from public.delivery_orders where id = p_order_id;
end;
$$;
