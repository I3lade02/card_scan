export type ScryfallCardLite = {
  id: string;
  name: string;
  set: string;
  collector_number?: string;
  lang?: string;
  prices?: {
    eur?: string | null;
    eur_foil?: string | null;
    usd?: string | null;
    usd_foil?: string | null;
  };

  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
  };
  card_faces?: Array<{
    image_uris?: {
      small?: string;
      normal?: string;
      large?: string;
    };
  }>;

  // ✅ nové: hezké popisky setu
  set_name?: string;
  released_at?: string;
};

export type ScryfallCardFull = ScryfallCardLite & {
  type_line?: string;
  oracle_text?: string;
  rarity?: string;

  // ✅ nové: link na všechny printy
  prints_search_uri?: string;
};

export type CollectionItem = {
  scryfallId: string;
  name: string;
  set: string;
  collectorNumber?: string;
  lang?: string;

  qty: number;

  prices: {
    eur?: string | null;
    eur_foil?: string | null;
    usd?: string | null;
    usd_foil?: string | null;
  };

  imageSmall?: string | null;

  addedAt: string;
  updatedAt: string;
};

export type CollectionMap = Record<string, CollectionItem>;