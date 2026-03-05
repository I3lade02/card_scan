import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CollectionItem, CollectionMap, Finish, ScryfallCardLite } from "@/src/types/mtg";
import { pickCardImage } from "@/src/lib/scryfall";

const KEY = "mtg_collection_v1";

// Key ve sbírce je kombinace: scryfallId + finish
export function makeCollectionKey(id: string, finish: Finish) {
  return `${id}::${finish}`;
}

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

export async function upsertToCollection(card: any, qtyToAdd: number, finish: Finish): Promise<void> {
  const map = await loadCollection();
  const now = new Date().toISOString();

  const key = makeCollectionKey(card.id, finish);
  const imageSmall = pickCardImage(card, "small");

  const existing = map[key];
  if (existing) {
    existing.qty += qtyToAdd;
    existing.updatedAt = now;

    existing.prices = {
      ...existing.prices,
      ...(card.prices ?? {}),
    };

    existing.imageSmall = imageSmall ?? existing.imageSmall ?? null;

    existing.set = card.set ?? existing.set;
    existing.set_name = card.set_name ?? existing.set_name;
    existing.collectorNumber = card.collector_number ?? existing.collectorNumber;
    existing.lang = card.lang ?? existing.lang;

    map[key] = existing;
  } else {
    const item: CollectionItem = {
      scryfallId: card.id,
      name: card.name,

      set: card.set,
      set_name: card.set_name,

      collectorNumber: card.collector_number,
      lang: card.lang,

      qty: qtyToAdd,
      finish,

      prices: {
        ...(card.prices ?? {}),
      },

      imageSmall: imageSmall ?? null,

      addedAt: now,
      updatedAt: now,
    };

    map[key] = item;
  }

  await saveCollection(map);
}

export async function updateQty(collectionKey: string, delta: number): Promise<void> {
  const map = await loadCollection();
  const it = map[collectionKey];
  if (!it) return;

  it.qty = Math.max(0, it.qty + delta);
  it.updatedAt = new Date().toISOString();

  if (it.qty === 0) delete map[collectionKey];
  else map[collectionKey] = it;

  await saveCollection(map);
}

export async function deleteFromCollection(collectionKey: string): Promise<void> {
  const map = await loadCollection();
  delete map[collectionKey];
  await saveCollection(map);
}

// Refresh cen (bulk) aktualizuje ceny + thumbnail pro všechny položky (včetně foil variants)
export async function applyPriceRefresh(cards: ScryfallCardLite[]): Promise<void> {
  const map = await loadCollection();
  const now = new Date().toISOString();

  // Rychlý lookup podle id
  const byId = new Map<string, ScryfallCardLite>();
  for (const c of cards) byId.set(c.id, c);

  for (const [k, it] of Object.entries(map)) {
    const updated = byId.get(it.scryfallId);
    if (!updated) continue;

    it.prices = { ...it.prices, ...(updated.prices ?? {}) };

    const imageSmall =
      (updated.image_uris?.small ?? updated.card_faces?.[0]?.image_uris?.small) ?? null;

    it.imageSmall = imageSmall ?? it.imageSmall ?? null;

    it.set = updated.set ?? it.set;
    it.set_name = updated.set_name ?? it.set_name;
    it.collectorNumber = updated.collector_number ?? it.collectorNumber;
    it.lang = updated.lang ?? it.lang;

    it.updatedAt = now;
    map[k] = it;
  }

  await saveCollection(map);
}

/* -----------------------------
   Export / Import
------------------------------*/

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  items: CollectionItem[];
};

export async function exportCollectionPayload(): Promise<ExportPayload> {
  const map = await loadCollection();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: Object.values(map),
  };
}

export async function replaceCollectionFromPayload(payload: ExportPayload): Promise<void> {
  const map: CollectionMap = {};
  for (const it of payload.items) {
    const key = makeCollectionKey(it.scryfallId, it.finish);
    map[key] = it;
  }
  await saveCollection(map);
}

export async function mergeCollectionFromPayload(payload: ExportPayload): Promise<void> {
  const map = await loadCollection();
  const now = new Date().toISOString();

  for (const it of payload.items) {
    const key = makeCollectionKey(it.scryfallId, it.finish);
    const existing = map[key];

    if (existing) {
      existing.qty += it.qty;
      existing.updatedAt = now;

      existing.prices = { ...existing.prices, ...it.prices };
      existing.imageSmall = it.imageSmall ?? existing.imageSmall ?? null;

      existing.set = it.set ?? existing.set;
      existing.set_name = it.set_name ?? existing.set_name;
      existing.collectorNumber = it.collectorNumber ?? existing.collectorNumber;
      existing.lang = it.lang ?? existing.lang;

      map[key] = existing;
    } else {
      map[key] = it;
    }
  }

  await saveCollection(map);
}