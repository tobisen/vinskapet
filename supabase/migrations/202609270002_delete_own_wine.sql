create function public.delete_own_wine(target_wine_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.wines
    where id = target_wine_id and user_id = auth.uid()
  ) then
    raise exception 'Wine not found or not owned by current user';
  end if;

  delete from public.tastings where wine_id = target_wine_id and user_id = auth.uid();
  delete from public.inventory where wine_id = target_wine_id and user_id = auth.uid();
  delete from public.wine_barcodes where wine_id = target_wine_id and user_id = auth.uid();
  delete from public.wines where id = target_wine_id and user_id = auth.uid();
end;
$$;
