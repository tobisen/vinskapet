# Lokal Wine Enrichment

Vinskåpet kompletterar vinmetadata med en lokal, deterministisk regelmotor. Den
kräver ingen API-nyckel, gör inga anrop till AI- eller vin-API:er och har ingen
usage-baserad kostnad. Systembolaget-sökningen är en separat integration.

## Prioritet och säkerhet

Datakällor prioriteras i denna ordning:

1. manuellt angivna värden
2. verifierade Systembolaget-värden
3. importerade värden
4. lokala regler

`LocalWineEnrichmentProvider` returnerar bara metadata som saknas.
`mergeWineEnrichment` gör samma kontroll en andra gång före lagring och validerar
att drickfönster, optimal period och temperaturintervall är rimliga. Inventory och
tastings läses eller ändras aldrig av enrichment-flödet.

När lokala regler faktiskt fyller minst ett fält sätts
`assessment_source = "Local rules"` om posten saknar källa, samt
`assessment_updated_at`. Befintlig provenance skrivs inte över. Regel-ID:n som
`NEBBIOLO_SERVING`, `NEBBIOLO_APPELLATION_GRAPE` och
`DRINKING_WINDOW_OPTIMAL_VERY_LONG` används för tester och felsökning men sparas
inte i databasen.

## Regelstruktur

Reglerna ligger i `src/domain/enrichment`:

- `grapeRules.ts` gör endast konservativa druvslutsatser från tydliga namn eller appellationer.
- `servingTemperatureRules.ts` väljer intervall från druva, appellation, stil och vintyp.
- `foodPairingRules.ts` ger korta, generella matkategorier.
- `drinkingWindowRules.ts` använder `DRINK_YOUNG`, `SHORT`, `MEDIUM`, `LONG` och `VERY_LONG`.
- `LocalWineEnrichmentProvider.ts` samordnar reglerna och returnerar strukturerad `WineEnrichment`.

Ett dokumenterat drickfönster behålls alltid. Om optimal period saknas beräknas
den inom det dokumenterade drickfönstret. Om hela fönstret saknas används en bred,
konservativ uppskattning från årgång och stil. Osäkra druvor lämnas tomma och
reglerna skapar aldrig en beskrivning.

## Nya viner

När ett vin läggs till via Systembolaget sparas först all verifierad produktdata.
Därefter kör Vue-klienten den lokala providern och uppdaterar endast tomma Wine-fält.
Det kräver inget nätverksanrop utöver den vanliga Supabase-lagringen.

Provider-gränssnittet finns kvar för framtida alternativ. Edge Function
`enrich-wine` använder samma lokala regler, har ingen extern provider och behöver
inga secrets. Batchscriptet kör regelmotorn direkt lokalt och använder Supabase
endast för användarautentiserad läsning och lagring.

## Befintlig samling

```bash
npm run metadata:audit
npm run metadata:enrich
```

Båda kommandona autentiserar den aktuella användaren med tillfälliga
`IMPORT_USER_EMAIL` och `IMPORT_USER_PASSWORD` i ignorerade `.env.local`.
Audit-läget visar antal viner och saknade fält utan att ändra data. Enrichment
kräver den uttryckliga bekräftelsen i npm-scriptet, läser om varje post före
uppdatering och fyller bara fält som fortfarande är tomma. Scriptet rör inte
inventory eller tastings och rapporterar före/efter för druvor, optimal period,
servering och matmatchning.

## Kostnad

Enrichment använder inte OpenAI, betald AI, betalt wine API eller någon API-nyckel.
Den gör inga externa enrichment-anrop. Extern API-kostnad för enrichment är
**0 SEK**.
