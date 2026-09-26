# Vinskåpet

Vinskåpet är en mobile-first webbapp för att hålla ordning på en privat vinsamling. MVP:n visar lager, inköpsvärde, lagringsråd och drickfönster samt hanterar önskelista och smaknoteringar. Kärnflödena är optimerade för att snabbt lägga till eller dricka en flaska.

## Teknisk stack

- Vue 3 med Composition API och `<script setup>`
- Vite och TypeScript i strict-läge
- Vue Router
- Vitest
- `vite-plugin-pwa` med Workbox-service worker
- Supabase Auth och Supabase Database
- Vanlig CSS med lokala design tokens
- Row Level Security för användarens data

## Kom igång

Krav: Node.js 20.19 eller senare.

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` ska innehålla projektets publika klientkonfiguration:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Filen ignoreras av Git och ska aldrig committas. Samma två variabler måste läggas
in som Vercel Environment Variables för Preview och Production.

Vite visar den lokala adressen i terminalen, normalt `http://localhost:5173`.

Produktionsbygget använder root-sökvägen `/` och är anpassat för publicering på Vercel.

## Installera som app

Produktionsversionen är en installerbar PWA med lokalt manifest, service worker och
appikoner. Nya deployer hämtas automatiskt när en uppdaterad service worker aktiveras.

På Android öppnar du appen i Chrome och väljer **Installera app** i webbläsarens meny
eller installationsprompt. På iPhone öppnar du appen i Safari, väljer **Dela** och
sedan **Lägg till på hemskärmen**. Appen startar därefter i standalone-läge utan
webbläsarens vanliga gränssnitt.

PWA-funktionerna genereras endast i produktionsbygget. Testa dem lokalt med:

```bash
npm run build
npm run preview
```

## Scripts

```bash
npm run dev         # Starta utvecklingsservern
npm run test        # Kör tester en gång
npm run test:watch  # Kör tester i watch-läge
npm run type-check  # Kör TypeScript/Vue-kontroll
npm run build       # Typkontroll och produktionsbygge
npm run preview     # Förhandsvisa produktionsbygget
```

## Arkitektur

- `src/types` innehåller domänmodeller för vin, lager och provningar.
- `src/types/database.ts` innehåller separata typer för databasens snake_case-rader.
- `src/utils` innehåller rena och testbara domänfunktioner för status, statistik, filtrering, sortering och gruppering.
- `src/repositories` mappar databasrader och kapslar alla Supabase-frågor.
- `src/composables` exponerar reaktiv appdata och samordnar mutationer.
- `src/services/supabase.ts` skapar appens enda Supabase-klient.
- `src/components` innehåller återanvändbara kort, badges, navigation och snabbformulär.
- `src/views` innehåller routade arbetsvyer.
- `src/data/seed.ts` laddas endast första gången lokal data saknas.
- `vite.config.ts` innehåller manifest, cache- och service worker-konfiguration för PWA:n.

Produktionsflödet använder Supabase som persistent datalager. `LocalStorageWineRepository`
finns kvar isolerat för legacytester och eventuell felsökning, men används inte av appens
store och laddar aldrig upp sin demo-data. Inga lokala data migreras automatiskt.

Inventory behåller separata inköpsrader. När en flaska dricks minskas den äldsta
inköpsraden med saldo först (FIFO). Historik och vinpost bevaras när saldot når noll.

## Authentication och säkerhet

Appen använder Supabase Auth med e-post och lösenord. Publik registrering finns inte.
Sessionen sparas och återställs av Supabase-klienten, även när PWA:n öppnas igen.
Alla app-routes kräver en giltig session.

Databasen skyddas av Row Level Security. Frontend använder endast Supabase publishable
key; `service_role`, secret key och databaslösenord får aldrig användas eller exponeras
i frontendmiljön. RLS är den faktiska säkerhetsgränsen för `wines`, `inventory` och
`tastings`.

## Inte implementerat ännu

MVP:n innehåller ingen extern bildlagring, Systembolaget-integration, OCR,
streckkodsläsning, AI-funktioner eller pushnotiser. Synkning sker via Supabase för den
inloggade användaren.
