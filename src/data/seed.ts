import type { AppData, Inventory, Tasting, Wine, WineType } from '@/types/domain'

const now = '2026-09-20T12:00:00.000Z'

const wine = (
  id: string,
  producer: string,
  name: string,
  vintage: number | undefined,
  wineType: WineType,
  country: string,
  region: string,
  grapes: string[],
  extras: Partial<Wine> = {},
): Wine => ({
  id, producer, name, vintage, wineType, country, region, grapes,
  currency: 'SEK', foodPairings: [], status: 'COLLECTION', createdAt: now, updatedAt: now,
  ...extras,
})

export const seedWines: Wine[] = [
  wine('prunotto-barbaresco-2020', 'Prunotto', 'Barbaresco', 2020, 'RED', 'Italien', 'Piemonte', ['Nebbiolo'], { appellation: 'Barbaresco DOCG', referencePrice: 349, storagePotential: 'HIGH', drinkingWindowStart: 2027, drinkingWindowEnd: 2035, optimalDrinkingStart: 2029, optimalDrinkingEnd: 2033, servingTemperatureMin: 16, servingTemperatureMax: 18, foodPairings: ['Långkok', 'Vilt', 'Svamp'], description: 'Stramt och nyanserat med körsbär, rosor och kryddor.' }),
  wine('deaetna-rosso-2023', 'Terra Costantino', 'DeAetna Rosso', 2023, 'RED', 'Italien', 'Sicilien / Etna', ['Nerello Mascalese', 'Nerello Cappuccio'], { referencePrice: 199, storagePotential: 'MEDIUM', drinkingWindowStart: 2026, drinkingWindowEnd: 2031, optimalDrinkingStart: 2027, optimalDrinkingEnd: 2030, foodPairings: ['Pasta', 'Lamm'] }),
  wine('busije-barbera-2022', 'Virna Borgogno', "Barbera d'Alba Busije", 2022, 'RED', 'Italien', 'Piemonte', ['Barbera'], { referencePrice: 189, drinkingWindowStart: 2025, drinkingWindowEnd: 2029, optimalDrinkingStart: 2026, optimalDrinkingEnd: 2028, foodPairings: ['Pasta', 'Charkuterier'] }),
  wine('umani-ronchi-2022', 'Umani Ronchi', "Montepulciano d'Abruzzo", 2022, 'RED', 'Italien', 'Abruzzo', ['Montepulciano'], { referencePrice: 119, drinkingWindowStart: 2024, drinkingWindowEnd: 2027, optimalDrinkingStart: 2025, optimalDrinkingEnd: 2026, foodPairings: ['Pizza', 'Grillat'] }),
  wine('vieux-lazaret-2023', 'Domaine du Vieux Lazaret', 'Châteauneuf-du-Pape', 2023, 'RED', 'Frankrike', 'Rhône', ['Grenache', 'Syrah', 'Mourvèdre'], { referencePrice: 329, storagePotential: 'HIGH', drinkingWindowStart: 2028, drinkingWindowEnd: 2038, optimalDrinkingStart: 2030, optimalDrinkingEnd: 2036, foodPairings: ['Vilt', 'Lammstek'] }),
  wine('righetti-amarone-2022', 'Luigi Righetti', 'Amarone Classico', 2022, 'RED', 'Italien', 'Veneto', ['Corvina', 'Rondinella'], { referencePrice: 249, storagePotential: 'HIGH', drinkingWindowStart: 2027, drinkingWindowEnd: 2037, optimalDrinkingStart: 2029, optimalDrinkingEnd: 2034, foodPairings: ['Långkok', 'Lagrad ost'] }),
  wine('crocifere-etna-bianco-2024', 'Generazione Alessandro', 'Crocifere Etna Bianco', 2024, 'WHITE', 'Italien', 'Sicilien / Etna', ['Carricante'], { referencePrice: 239, storagePotential: 'MEDIUM', drinkingWindowStart: 2026, drinkingWindowEnd: 2032, optimalDrinkingStart: 2027, optimalDrinkingEnd: 2030, foodPairings: ['Skaldjur', 'Grillad fisk'] }),
  wine('susana-balbo-torrontes-2025', 'Susana Balbo', 'Signature Barrel Fermented Torrontés', 2025, 'WHITE', 'Argentina', 'Mendoza', ['Torrontés'], { referencePrice: 179, drinkingWindowStart: 2026, drinkingWindowEnd: 2029, optimalDrinkingStart: 2026, optimalDrinkingEnd: 2028, foodPairings: ['Kryddstarkt', 'Fisk'] }),
  wine('whispering-angel-2025', 'Château d’Esclans', 'Whispering Angel', 2025, 'ROSE', 'Frankrike', 'Provence', ['Grenache', 'Cinsault', 'Rolle'], { appellation: 'Côtes de Provence', referencePrice: 249, drinkingWindowStart: 2026, drinkingWindowEnd: 2027, optimalDrinkingStart: 2026, optimalDrinkingEnd: 2027, foodPairings: ['Sallad', 'Skaldjur'] }),
  wine('pierre-olivier-bdb', 'Pierre Olivier', 'Blanc de Blancs Organic Brut', undefined, 'SPARKLING_WHITE', 'Frankrike', 'Bourgogne', ['Chardonnay'], { referencePrice: 129, drinkingWindowStart: 2025, drinkingWindowEnd: 2028, optimalDrinkingStart: 2025, optimalDrinkingEnd: 2027, foodPairings: ['Aperitif', 'Skaldjur'] }),
  wine('cremant-loire-bdb', 'Langlois-Chateau', 'Crémant de Loire Blanc de Blancs Brut', undefined, 'SPARKLING_WHITE', 'Frankrike', 'Loire', ['Chenin Blanc', 'Chardonnay'], { referencePrice: 169, drinkingWindowStart: 2025, drinkingWindowEnd: 2029, optimalDrinkingStart: 2026, optimalDrinkingEnd: 2028, foodPairings: ['Aperitif', 'Fisk'] }),
  wine('gut-oggau-theodora-2023', 'Gut Oggau', 'Theodora', 2023, 'ORANGE', 'Österrike', 'Burgenland', ['Grüner Veltliner', 'Welschriesling'], { referencePrice: 319, drinkingWindowStart: 2025, drinkingWindowEnd: 2030, optimalDrinkingStart: 2026, optimalDrinkingEnd: 2029, foodPairings: ['Grönsaker', 'Ost'], status: 'WISHLIST' }),
  wine('chateau-suduiraut-2016', 'Château Suduiraut', 'Sauternes', 2016, 'DESSERT', 'Frankrike', 'Bordeaux', ['Sémillon', 'Sauvignon Blanc'], { referencePrice: 399, storagePotential: 'HIGH', drinkingWindowStart: 2024, drinkingWindowEnd: 2045, optimalDrinkingStart: 2028, optimalDrinkingEnd: 2040, foodPairings: ['Dessert', 'Foie gras'], status: 'WISHLIST' }),
  wine('history-riesling-2019', 'Dönnhoff', 'Tonschiefer Riesling Trocken', 2019, 'WHITE', 'Tyskland', 'Nahe', ['Riesling'], { referencePrice: 189, drinkingWindowStart: 2021, drinkingWindowEnd: 2026, status: 'HISTORY_ONLY', foodPairings: ['Fisk'] }),
]

export const seedInventory: Inventory[] = [
  ['inv-1', 'prunotto-barbaresco-2020', 2, 299, '2025-11-14', 'WINE_FRIDGE'],
  ['inv-2', 'deaetna-rosso-2023', 3, 189, '2026-05-03', 'WINE_FRIDGE'],
  ['inv-3', 'busije-barbera-2022', 2, 169, '2025-10-20', 'ROOM_STORAGE'],
  ['inv-4', 'umani-ronchi-2022', 1, 109, '2025-06-12', 'ROOM_STORAGE'],
  ['inv-5', 'vieux-lazaret-2023', 3, 309, '2026-02-11', 'WINE_FRIDGE'],
  ['inv-6', 'righetti-amarone-2022', 2, 239, '2026-01-18', 'WINE_FRIDGE'],
  ['inv-7', 'crocifere-etna-bianco-2024', 2, 219, '2026-04-22', 'WINE_FRIDGE'],
  ['inv-8', 'susana-balbo-torrontes-2025', 1, 169, '2026-07-01', 'ROOM_STORAGE'],
  ['inv-9', 'whispering-angel-2025', 2, 229, '2026-06-21', 'WINE_FRIDGE'],
  ['inv-10', 'pierre-olivier-bdb', 4, 119, '2026-03-01', 'ROOM_STORAGE'],
  ['inv-11', 'cremant-loire-bdb', 2, 159, '2026-08-12', 'WINE_FRIDGE'],
].map(([id, wineId, quantity, purchasePrice, purchaseDate, storageLocation]) => ({
  id: id as string,
  wineId: wineId as string,
  quantity: quantity as number,
  purchasePrice: purchasePrice as number,
  purchaseDate: purchaseDate as string,
  storageLocation: storageLocation as Inventory['storageLocation'],
  currency: 'SEK',
  purchaseLocation: 'Systembolaget',
}))

export const seedTastings: Tasting[] = [
  { id: 'taste-1', wineId: 'history-riesling-2019', date: '2025-08-16', rating: 4, review: 'Mineralisk och pigg, mycket fin till röding.', maturityAssessment: 'PERFECT', buyAgain: 'YES' },
  { id: 'taste-2', wineId: 'umani-ronchi-2022', date: '2026-04-10', rating: 3, review: 'Generöst och lättdrucket vardagsvin.', maturityAssessment: 'GOOD_NOW', buyAgain: 'MAYBE' },
  { id: 'taste-3', wineId: 'pierre-olivier-bdb', date: '2026-07-18', rating: 4, review: 'Friskt, torrt och klart prisvärt.', maturityAssessment: 'GOOD_NOW', buyAgain: 'YES' },
]

export const seedData: AppData = { version: 1, wines: seedWines, inventory: seedInventory, tastings: seedTastings }
