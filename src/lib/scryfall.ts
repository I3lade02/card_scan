import type { ScryfallCardLite, ScryfallCardFull } from "@/src/types/mtg";

const SCRYFALL = "https://api.scryfall.com";

const HEADERS = {
  "User-Agent": "MTG-Scanner-App/1.0 (Expo; Android)",
  "Accept": "application/json",
};

async function ensureOk(res: Response) {
  if (res.ok) return;

  let msg = `Scryfall chyba: ${res.status}`;
  try {
    const j = await res.json();
    if (j?.details) msg = `Scryfall ${res.status}: ${j.details}`;
  } catch {}
  throw new Error(msg);
}

export function pickCardImage(c: any, size: "small" | "normal" | "large" = "small"): string | null {
  const direct = c?.image_uris?.[size];
  if (direct) return direct;

  const face0 = c?.card_faces?.[0]?.image_uris?.[size];
  if (face0) return face0;

  return null;
}

export async function autocompleteNames(
  text: string,
  opts?: { signal?: AbortSignal }
): Promise<string[]> {
  const q = encodeURIComponent(text.trim());
  const url = `${SCRYFALL}/cards/autocomplete?q=${q}`;

  const res = await fetch(url, { headers: HEADERS, signal: opts?.signal });
  await ensureOk(res);

  const json = await res.json();
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.slice(0, 20);
}

export async function searchCards(
  query: string,
  opts?: { signal?: AbortSignal }
): Promise<ScryfallCardLite[]> {
  const q = encodeURIComponent(query.trim());
  const url = `${SCRYFALL}/cards/search?q=${q}&unique=cards`;

  const res = await fetch(url, { headers: HEADERS, signal: opts?.signal });
  await ensureOk(res);

  const json = await res.json();
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.slice(0, 15).map(toCardLite);
}

export async function getCardById(id: string): Promise<ScryfallCardFull> {
  const url = `${SCRYFALL}/cards/${encodeURIComponent(id)}`;

  const res = await fetch(url, { headers: HEADERS });
  await ensureOk(res);

  const c = await res.json();
  return toCardFull(c);
}

export async function getCardsByIdsBulk(ids: string[]): Promise<ScryfallCardLite[]> {
  const url = `${SCRYFALL}/cards/collection`;

  const body = { identifiers: ids.map((id) => ({ id })) };

  const res = await fetch(url, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  await ensureOk(res);

  const json = await res.json();
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.map(toCardLite);
}

function toCardLite(c: any): ScryfallCardLite {
  return {
    id: c.id,
    name: c.name,
    set: c.set,
    set_name: c.set_name,
    released_at: c.released_at,
    collector_number: c.collector_number,
    lang: c.lang,
    prices: c.prices,
    image_uris: c.image_uris,
    card_faces: c.card_faces,
  };
}

function toCardFull(c: any): ScryfallCardFull {
  return {
    ...toCardLite(c),
    type_line: c.type_line,
    oracle_text: c.oracle_text,
    rarity: c.rarity,
    prints_search_uri: c.prints_search_uri,
  };
}

export async function getPrintsForCard(printsSearchUri: string): Promise<ScryfallCardLite[]> {
    const out: ScryfallCardLite[] = [];

    let url: string | null = printsSearchUri;

    while (url) {
        const res = await fetch(url, { headers: HEADERS });
        await ensureOk(res);

        const json: any = await res.json();
        const data: any[] = Array.isArray(json?.data) ? json.data : [];
        out.push(...data.map(toCardLite));

        url = json?.has_more ? (json?.next_page ?? null) : null;
    }

    return out;
}