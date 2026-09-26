# Vinskåpet

Vinskåpet är en mobile-first webbapp för att hålla ordning på en privat vinsamling. MVP:n visar lager, inköpsvärde, lagringsråd och drickfönster samt hanterar önskelista och smaknoteringar. Kärnflödena är optimerade för att snabbt lägga till eller dricka en flaska.

## Teknisk stack

- Vue 3 med Composition API och `<script setup>`
- Vite och TypeScript i strict-läge
- Vue Router
- Vitest
- `vite-plugin-pwa` med Workbox-service worker
- Vanlig CSS med lokala design tokens
- LocalStorage för tillfällig lokal persistens

## Kom igång

Krav: Node.js 20.19 eller senare.

```bash
npm install
npm run dev
```

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
- `src/utils` innehåller rena och testbara domänfunktioner för status, statistik, filtrering, sortering och gruppering.
- `src/repositories` definierar persistensgränsen. UI:t använder aldrig LocalStorage direkt.
- `src/composables` exponerar reaktiv appdata och samordnar mutationer.
- `src/components` innehåller återanvändbara kort, badges, navigation och snabbformulär.
- `src/views` innehåller routade arbetsvyer.
- `src/data/seed.ts` laddas endast första gången lokal data saknas.
- `vite.config.ts` innehåller manifest, cache- och service worker-konfiguration för PWA:n.

LocalStorage är avsiktligt en temporär implementation bakom `WineRepository`. Den kan senare ersättas med ett backend-repository utan att vyerna behöver skrivas om.

## Inte implementerat ännu

MVP:n innehåller ingen backend, produktionsdatabas, autentisering, användarsynkning, extern bildlagring, Systembolaget-integration, OCR, streckkodsläsning, AI-funktioner eller pushnotiser. Domän- och repositorygränserna är förberedda för fortsatt utveckling av dessa områden.
