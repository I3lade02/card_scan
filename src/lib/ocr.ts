import { extractTextFromImage, isSupported } from "expo-text-extractor";

export async function ocrLinesFromImage(uri: string): Promise<string[]> {
    if (!isSupported) return [];
    try {
        const lines = await extractTextFromImage(uri);
        return Array.isArray(lines) ? lines : [];
    } catch {
        return [];
    }
}