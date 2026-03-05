import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CollectionMap, CollectionItem, ScryfallCardLite } from "@/src/types/mtg";

const KEY = "mtg_collection_v1";

export async function loadCollection(): Promise<CollectionMap> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CollectionMap;
  } catch {
    return {};
  }
}

export async function saveCollection(map: CollectionMap): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(map));
}

export async function upsertToCollection(card: any, qtyToAdd: number): Promise<void> {
  const map = await loadCollection();
  const now = new Date().toISOString();

  const existing = map[card.id];
  if (existing) {
    existing.qty += qtyToAdd;
    existing.updatedAt = now;
    existing.prices = {
      eur: card.prices?.eur ?? existing.prices.eur ?? null,
      eur_foil: card.prices?.eur_foil ?? existing.prices.eur_foil ?? null,
      usd: card.prices?.usd ?? existing.prices.usd ?? null,
      usd_foil: card.prices?.usd_foil ?? existing.prices.usd_foil ?? null,
    };
    map[card.id] = existing;
  } else {
    const item: CollectionItem = {
      scryfallId: card.id,
      name: card.name,
      set: card.set,
      collectorNumber: card.collector_number,
      lang: card.lang,
      qty: qtyToAdd,
      prices: {
        eur: card.prices?.eur ?? null,
        eur_foil: card.prices?.eur_foil ?? null,
        usd: card.prices?.usd ?? null,
        usd_foil: card.prices?.usd_foil ?? null,
      },
      addedAt: now,
      updatedAt: now,
    };
    map[card.id] = item;
  }

  await saveCollection(map);
}

export async function updateQty(scryfallId: string, delta: number): Promise<void> {
  const map = await loadCollection();
  const it = map[scryfallId];
  if (!it) return;

  it.qty = Math.max(0, it.qty + delta);
  it.updatedAt = new Date().toISOString();

  if (it.qty === 0) delete map[scryfallId];
  else map[scryfallId] = it;

  await saveCollection(map);
}

export async function deleteFromCollection(scryfallId: string): Promise<void> {
  const map = await loadCollection();
  delete map[scryfallId];
  await saveCollection(map);
}

// Aplikuje nové ceny do mapy
export async function applyPriceRefresh(cards: ScryfallCardLite[]): Promise<void> {
  const map = await loadCollection();
  const now = new Date().toISOString();

  for (const c of cards) {
    const it = map[c.id];
    if (!it) continue;

    it.prices = {
      eur: c.prices?.eur ?? it.prices.eur ?? null,
      eur_foil: c.prices?.eur_foil ?? it.prices.eur_foil ?? null,
      usd: c.prices?.usd ?? it.prices.usd ?? null,
      usd_foil: c.prices?.usd_foil ?? it.prices.usd_foil ?? null,
    };
    it.updatedAt = now;
    map[c.id] = it;
  }

  await saveCollection(map);
}