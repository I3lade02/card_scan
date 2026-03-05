export type Finish = "nonfoil" | "foil" | "etched";

export type ScryfallPrices = {
  eur?: string | null;
  eur_foil?: string | null;
  eur_etched?: string | null;
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
};

export type ScryfallCardLite = {
  id: string;
  name: string;
  set: string;

  set_name?: string;
  released_at?: string;

  collector_number?: string;
  lang?: string;

  prices?: ScryfallPrices;

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
};

export type ScryfallCardFull = ScryfallCardLite & {
  type_line?: string;
  oracle_text?: string;
  rarity?: string;

  prints_search_uri?: string;

  finishes?: Finish[];
};

export type CollectionItem = {
  scryfallId: string;
  name: string;

  set: string;
  set_name?: string;

  collectorNumber?: string;
  lang?: string;

  qty: number;
  finish: Finish;

  prices: ScryfallPrices;

  imageSmall?: string | null;

  addedAt: string;
  updatedAt: string;
};

export type CollectionMap = Record<string, CollectionItem>;