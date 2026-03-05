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
};

export type ScryfallCardFull = ScryfallCardLite & {
  type_line?: string;
  oracle_text?: string;
  rarity?: string;
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

  imageUri?: string;
  addedAt: string;
  updatedAt: string;
};

export type CollectionMap = Record<string, CollectionItem>;