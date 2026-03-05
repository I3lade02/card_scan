import type { ScryfallCardLite, ScryfallCardFull } from "@/src/types/mtg";

const SCRYFALL = "https://api.scryfall.com";

function ensureOk(res: Response) {
  if (!res.ok) throw new Error(`Scryfall chyba: ${res.status}`);
}

export async function searchCards(
  query: string,
  opts?: { signal?: AbortSignal }
): Promise<ScryfallCardLite[]> {
  const q = encodeURIComponent(query.trim());
  const url = `${SCRYFALL}/cards/search?q=${q}&unique=cards&order=released`;

  const res = await fetch(url, { signal: opts?.signal });
  ensureOk(res);
  const json = await res.json();

  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.slice(0, 15).map(toCardLite);
}

export async function getCardById(id: string): Promise<ScryfallCardFull> {
  const url = `${SCRYFALL}/cards/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  ensureOk(res);
  const c = await res.json();
  return toCardFull(c);
}

// Bulk endpoint: POST /cards/collection (max 75 identifiers per call)
export async function getCardsByIdsBulk(ids: string[]): Promise<ScryfallCardLite[]> {
  const url = `${SCRYFALL}/cards/collection`;

  const body = {
    identifiers: ids.map((id) => ({ id })),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  ensureOk(res);

  const json = await res.json();
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.map(toCardLite);
}

function toCardLite(c: any): ScryfallCardLite {
  return {
    id: c.id,
    name: c.name,
    set: c.set,
    collector_number: c.collector_number,
    lang: c.lang,
    prices: c.prices,
  };
}

function toCardFull(c: any): ScryfallCardFull {
  return {
    ...toCardLite(c),
    type_line: c.type_line,
    oracle_text: c.oracle_text,
    rarity: c.rarity,
  };
}