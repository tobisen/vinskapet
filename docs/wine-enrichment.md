# Wine metadata enrichment

No external enrichment provider or AI call is enabled yet.

## Recommended architecture

1. The signed-in Vue client invokes a Supabase Edge Function named `enrich-wine`.
2. The request contains a `WineCandidate`, never inventory or tasting data.
3. Supabase validates the user's JWT. The function should also use user-scoped auth
   and rate limiting.
4. The external provider key is stored as an Edge Function secret and is never
   returned to or bundled with the Vue application.
5. The function validates the provider's structured JSON and returns only the
   fields defined by `WineEnrichment`.
6. `mergeWineEnrichment` fills empty fields only. The repository persists the
   resulting Wine; metadata is never copied into tasting rows.

Supabase's current guidance is to keep JWT verification enabled for functions
invoked by signed-in users. `supabase.functions.invoke` sends the session JWT.
Project-wide provider credentials belong in Edge Function secrets.

- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/functions/secrets

## Function contract

Request:

```json
{ "wine": { "source": "COLLECTION", "name": "Barbaresco", "vintage": 2020 } }
```

Response:

```json
{
  "enrichment": {
    "grapes": ["Nebbiolo"],
    "storagePotential": "HIGH",
    "optimalDrinkingStart": 2028,
    "optimalDrinkingEnd": 2032,
    "servingTemperatureMin": 16,
    "servingTemperatureMax": 18,
    "foodPairings": ["Nötkött", "lamm", "svamp", "lagrade ostar"],
    "description": "..."
  }
}
```

The function should return evidence/source metadata in a later contract revision
before automated writes are approved. Responses must be schema validated, bounded
to sensible years and temperatures, and rejected when product identity is uncertain.

## Existing collection

`npm run metadata:audit` authenticates as the current user, reads only `wines` and
reports missing fields. It does not call the Edge Function.

`npm run metadata:enrich` is prepared for a later approved run. It calls
`enrich-wine`, patches only fields that were empty, and reports before/completed/after
for every Wine. It never reads or writes `inventory` or `tastings`.

Both commands use temporary `IMPORT_USER_EMAIL` and `IMPORT_USER_PASSWORD` values
from the ignored `.env.local`, following the same one-off authentication pattern as
the collection import.
