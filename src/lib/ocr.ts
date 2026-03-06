import { recognizeText } from "@infinitered/react-native-mlkit-text-recognition";

export type OcrResult = {
    fullText: string;
    lines: string[];
};

export async function ocrFromImage(uri: string): Promise<OcrResult> {
    const res = await recognizeText(uri);

    const fullText = (res?.text ?? "").toString();

    const lines: string[] = [];
    for (const block of res?.blocks ?? []) {
        for (const line of block?.lines ?? []) {
            const t = (line?.text ?? "").toString().trim();
            if (t) lines.push(t);
        }
    }

    const fallbackLines =
        lines.length > 0
            ? lines
            : fullText
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean);

    return { fullText, lines: fallbackLines };
}