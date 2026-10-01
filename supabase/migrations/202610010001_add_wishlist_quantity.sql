alter table public.wines
  add column if not exists wishlist_quantity integer not null default 1;

alter table public.wines
  add constraint wines_wishlist_quantity_positive
  check (wishlist_quantity >= 1);
