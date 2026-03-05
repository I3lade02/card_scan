import { ocrLinesFromImage } from "@/src/lib/ocr";
import { cropTitleBar } from "@/src/lib/titleCrop";
import { getCardByFuzzyName } from "@/src/lib/scryfall";

/**
 * Z OCR výsledků vytáhne nejlepší kandidát na název karty.
 * Heuristika: upřednostnit řádky s nejvíc písmeny, zahodit krátké/šum.
 */
export function pickBestNameCandidate(lines: string[]): string | null {
  const cleaned = lines
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    // hodně OCR šumu jsou samé znaky, tak chceme dost písmen
    .map((l) => ({
      raw: l,
      letters: (l.match(/[A-Za-z]/g) ?? []).length,
    }))
    .filter((x) => x.letters >= 5)
    .sort((a, b) => b.letters - a.letters);

  if (cleaned.length === 0) return null;

  // odstraň hodně divné znaky, nech základní interpunkci pro názvy
  const best = cleaned[0].raw.replace(/[^A-Za-z0-9'’:\-., ]+/g, "").trim();
  return best.length >= 3 ? best : null;
}

/**
 * Scan v1: foto -> crop title baru -> OCR -> Scryfall fuzzy -> vrátí {id, guessedName}
 */
export async function scanCardFromPhoto(photoUri: string): Promise<{
  scryfallId: string;
  guessedName: string;
  ocrLines: string[];
  croppedUri: string;
}> {
  // 1) cropneme jen horní část (title bar) -> lepší OCR + rychlejší
  const croppedUri = await cropTitleBar(photoUri);

  // 2) OCR
  const ocrLines = await ocrLinesFromImage(croppedUri);
  const guessedName = pickBestNameCandidate(ocrLines) ?? "";

  if (!guessedName) {
    throw new Error("OCR nic rozumného nenašlo. Zkus lepší světlo / ostrost, nebo použij ruční hledání.");
  }

  // 3) Scryfall fuzzy lookup
  const card = await getCardByFuzzyName(guessedName);

  return {
    scryfallId: card.id,
    guessedName,
    ocrLines,
    croppedUri,
  };
}