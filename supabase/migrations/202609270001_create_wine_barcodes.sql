create function public.is_valid_ean(value text)
returns boolean
language sql
immutable
strict
as $$
  select value ~ '^([0-9]{8}|[0-9]{13})$'
    and (
      10 - (
        select sum(
          substring(value from position for 1)::integer
          * case when (length(value) - position) % 2 = 1 then 3 else 1 end
        ) % 10
        from generate_series(1, length(value) - 1) as position
      )
    ) % 10 = right(value, 1)::integer;
$$;

create table public.wine_barcodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wine_id uuid not null references public.wines(id) on delete cascade,
  barcode text not null check (public.is_valid_ean(barcode)),
  source text not null check (source in ('MANUAL', 'SYSTEMBOLAGET', 'OPEN_FOOD_FACTS')),
  created_at timestamptz not null default now(),
  unique (user_id, barcode)
);

create index wine_barcodes_user_wine_idx on public.wine_barcodes (user_id, wine_id);

alter table public.wine_barcodes enable row level security;

create policy "Users can read own wine barcodes"
  on public.wine_barcodes for select
  using (auth.uid() = user_id);

create policy "Users can insert own wine barcodes"
  on public.wine_barcodes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.wines
      where wines.id = wine_barcodes.wine_id
        and wines.user_id = auth.uid()
    )
  );

create policy "Users can update own wine barcodes"
  on public.wine_barcodes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.wines
      where wines.id = wine_barcodes.wine_id
        and wines.user_id = auth.uid()
    )
  );

create policy "Users can delete own wine barcodes"
  on public.wine_barcodes for delete
  using (auth.uid() = user_id);
