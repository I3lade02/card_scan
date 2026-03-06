import { ocrFromImage } from "@/src/lib/ocr";
import { cropByOverlay, type OverlayRect01 } from "@/src/lib/titleCrop";
import { getCardByFuzzyName, searchCards } from "@/src/lib/scryfall";

function normalizeLine(line: string) {
    return line
        .replace(/\s+/g, " ")
        .replace(/[^A-Za-z0-9'’:\-., ]+/g, "")
        .trim();
}

export function pickBestNameCandidate(lines: string[]): string | null {
    const scored = lines
        .map((l) => normalizeLine(l))
        .filter(Boolean)
        .map((l) => {
            const letters = (l.match(/[A-Za-z]/g) ?? []).length;
            return { l, letters, len: l.length };
        })
        .filter((x) => x.letters >= 6)
        .sort((a, b) => {
            if (b.letters !== a.letters) return b.letters - a.letters;
            return a.len - b.len;
        });

    if (!scored.length) return null;
    return scored[0].l.length >= 3 ? scored[0].l : null;
}

export async function scanCardFromPhoto(
    photoUri: string,
    overlay01: OverlayRect01
): Promise<{
    scryfallId: string;
    guessedName: string;
    ocrLines: string[];
    croppedUri: string;
}> {
    const croppedUri = await cropByOverlay(photoUri, overlay01);

    const ocr = await ocrFromImage(croppedUri);
    const ocrLines = ocr.lines;

    const guessedName = pickBestNameCandidate(ocrLines) ?? "";

    if (!guessedName) {
        throw new Error(
            "OCR nic rozumného nenašlo"
        );
    }

    try {
        const card = await getCardByFuzzyName(guessedName);
        return { scryfallId: card.id, guessedName, ocrLines, croppedUri };
    } catch (e: any) {
        const msg = String(e?.message ?? "");
        if (msg.includes("404")) {
            const results = await searchCards(guessedName);
            if (results.length > 0) {
                return {scryfallId: results[0].id, guessedName, ocrLines, croppedUri };
            }
        }
        throw e;
    }
}