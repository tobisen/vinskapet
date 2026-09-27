# Smart add: external data and barcode persistence

Research date: 2026-09-26.

## Systembolaget product data

The project now contains an explicitly approved private, low-volume Systembolaget
integration. It does not use the undocumented e-commerce API or an extracted API
key. A JWT-protected Supabase Edge Function uses a generated compact index of the
public wine sitemap, selects at most eight candidate product URLs and parses each page's structured
`__NEXT_DATA__` payload on demand.

| Option | Status | Cost/auth | Browser/CORS | Barcode | Assessment |
| --- | --- | --- | --- | --- | --- |
| Systembolaget API portal | Official portal exists, but no documented public product API was verified | Account/key may be required | Unknown until access is granted; a backend is recommended | Not verified | Contact Systembolaget and request documented product-data access before implementation |
| Systembolaget web/e-commerce endpoints | Undocumented internal API used by their own site | Internal subscription key | Not a supported frontend contract; CORS and keys may change | No verified EAN field | Do not use |
| `C4illin/systembolaget-data` | Unofficial, self-hostable mirror/workaround | Open source; hosting/storage cost | Backend or a large local dataset is required | Not documented | Technically possible, but provenance, terms and long-term stability require approval |
| `AlexGustafsson/systembolaget-api` | Unofficial client for open and closed endpoints | Self-hosted client | Backend required | Not documented | Useful for research, not a production contract |
| Open Food Facts API | Official open-data API for its community dataset, not a Systembolaget source | Free; identify the app with `User-Agent` | Public read API; a backend is still preferable for policy/rate control | Yes, direct GTIN lookup and community images | Viable secondary barcode fallback, but wine coverage and metadata quality are not guaranteed |
| GS1 Sweden / Validoo | Official GS1 product and image data | Customer account and OAuth token; commercial terms apply | Secret-bearing integration requires backend | Yes, verified GTIN; product/image depth depends on service | Strong barcode authority, but does not provide Systembolaget price or assortment identity |

Systembolaget's current user terms explicitly prohibit agents, robots, crawlers and
similar automated tools used to collect information from the website or app for
services about alcoholic products. The owner has explicitly accepted that terms and
stability risk for this private, low-volume implementation. The app still avoids the
undocumented e-commerce endpoint, bulk collection and extracted API keys.

Sources:

- https://www.systembolaget.se/allmanna-anvandarvillkor/
- https://api-portal.systembolaget.se/
- https://github.com/C4illin/systembolaget-data
- https://github.com/AlexGustafsson/systembolaget-api
- https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/index.md
- https://developer.gs1.se/api-implementation
- https://productsearch.gs1.se/

The undocumented Systembolaget endpoint and unofficial mirrors expose useful fields
such as product names, producer, vintage, origin, alcohol, article/product numbers,
price and sometimes images. No reviewed source demonstrated a reliable EAN field.
Systembolaget also warns that vintage information may be wrong around vintage changes,
so the implemented provider always asks the user to confirm vintage. The integration
is isolated in `supabase/functions/systembolaget-search` because the page format may
change and direct browser requests are unsuitable. Product data is cached in memory
for 24 hours and the sitemap for six hours while an Edge Function instance remains
warm. Barcode lookup remains disabled because no verified EAN field was found.

## Barcode implementation

The currently parsed Systembolaget `__NEXT_DATA__` product object contains product
identity, article number, packaging, origin, price, image and wine metadata, but no
verified EAN, GTIN or barcode field. `SystembolagetWineSearchProvider.lookupBarcode`
therefore deliberately returns no result instead of treating an article number as
an EAN.

Open Food Facts is used as a secondary barcode fallback through the JWT-protected
`barcode-lookup` Edge Function. Its official read endpoint is free, needs no API
key and documents a 15 product reads/minute/IP limit. The function identifies
itself with a custom User-Agent, rate-limits callers and only returns products whose
category explicitly identifies them as wine. Community data is always presented
for user confirmation and never silently linked.

Lookup order:

1. User-owned `wine_barcodes`, including the local device cache.
2. `SystembolagetWineSearchProvider.lookupBarcode` if EAN becomes available later.
3. Open Food Facts barcode read.
4. Text search/manual Wine selection followed by a confirmed local mapping.

The migration in `supabase/migrations/202609270001_create_wine_barcodes.sql`
creates the one-to-many relation, validates EAN length and check digit in the
database, adds a per-user unique constraint and enables owner-only RLS policies.
It replaces the earlier proposal below.

Sources:

- https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/

## Original migration sketch

The current schema has no barcode column or relation. A separate relation avoids
treating EAN as a wine/vintage identity and allows multiple codes per wine.

```sql
create table public.wine_barcodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wine_id uuid not null references public.wines(id) on delete cascade,
  barcode text not null check (barcode ~ '^(\\d{8}|\\d{13})$'),
  source text not null default 'USER_CONFIRMED',
  created_at timestamptz not null default now(),
  unique (user_id, wine_id, barcode)
);

create index wine_barcodes_user_barcode_idx
  on public.wine_barcodes (user_id, barcode);

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
      where wines.id = wine_id and wines.user_id = auth.uid()
    )
  );

create policy "Users can delete own wine barcodes"
  on public.wine_barcodes for delete
  using (auth.uid() = user_id);
```

The sketch above is retained for historical context. The implemented migration is
stricter and is the source of truth.
