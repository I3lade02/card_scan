import type { Finish, ScryfallPrices } from "@/src/types/mtg";

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} €`;
}

export function finishLabel(f: Finish): string {
  if (f === "foil") return "Foil";
  if (f === "etched") return "Etched";
  return "Non-foil";
}

export function pickEurPrice(prices: ScryfallPrices, finish: Finish): number {
  const raw =
    finish === "foil"
      ? prices.eur_foil
      : finish === "etched"
      ? prices.eur_etched
      : prices.eur;

  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}