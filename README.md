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

## Smart lägg till

Det globala `+`-flödet erbjuder streckkodsscanning, lokal vinsökning och ett
förenklat manuellt formulär. Scannern använder kameran först när användaren
öppnar scannervyn och läser EAN-8/EAN-13 lokalt i webbläsaren med
`@zxing/browser`. Kamera kräver HTTPS i produktion; `localhost` räknas som en
säker kontext under utveckling.

Sökningen kombinerar den inloggade användarens Supabase-samling med en privat,
on-demand-sökning på Systembolagets publika produktsidor. Artikelnummer och
textsökning går via den JWT-skyddade Supabase Edge Function
`systembolaget-search`; ingen extern API-nyckel exponeras i klienten. Funktionen
använder ett kompakt, lokalt URL-index från vin-sitemapen för att hitta kandidater
och läser strukturerad produktdata från högst åtta produktsidor per sökning. Om en
helt ny produkt saknas i indexet används live-sitemapen som fallback. Resultaten innehåller bland annat pris,
bild, årgång, ursprung, druvor, alkoholhalt, servering och matmatchning när fälten
finns på produktsidan.

Systembolagets pris sparas som referenspris. Inköpspriset är ett separat,
redigerbart fält i inventory-formuläret. Årgången måste bekräftas eftersom samma
artikelnummer kan byta årgång. En identifierad dubblett får en ny inventory-post
i stället för en ny wine-post.

Deploya Edge Function till samma Supabase-projekt som appen använder:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase functions deploy systembolaget-search
```

Funktionen behöver inga egna secrets. Supabase verifierar användarens JWT enligt
`supabase/config.toml`. Cachen är kortlivad och ligger i Edge Function-instansens
minne; ingen databas- eller RLS-ändring krävs.

Uppdatera det paketerade produktindexet före en ny funktionsdeploy med:

```bash
npm run systembolaget:index
```

Systembolagets produktsidor exponerar inte någon verifierad EAN-koppling.
Streckkodsläsaren fungerar därför fortsatt som läsare och leder vidare till sök
eller manuell registrering när koden är okänd. Kända EAN-koder slås först upp i den
egna `wine_barcodes`-relationen. En kostnadsfri Open Food Facts-läsning används som
sekundär fallback, och manuellt bekräftade kopplingar lärs in för nästa scanning.
Migration, RLS och källbedömning finns i
[`docs/smart-add-research.md`](docs/smart-add-research.md).

Wine-metadata kompletteras i bakgrunden efter att ett nytt vin sparats eller
manuellt från vindetaljen. `LocalWineEnrichmentProvider` använder lokala,
deterministiska regler och fyller bara tomma fält. Provider-arkitekturen, reglerna,
valideringen och batchflödet beskrivs i
[`docs/wine-enrichment.md`](docs/wine-enrichment.md). Enrichment kräver ingen
API-nyckel, gör inga externa enrichment-anrop och har 0 SEK i extern API-kostnad.

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
- `src/domain/enrichment` innehåller den lokala regelmotorn för vinmetadata.
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

MVP:n innehåller ingen extern bildlagring, verifierad barcode-till-produktkoppling,
OCR, extern AI-enrichment eller pushnotiser. Synkning sker via Supabase för den
inloggade användaren.
