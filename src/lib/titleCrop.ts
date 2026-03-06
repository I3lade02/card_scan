import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export type OverlayRect01 = {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
};

/**
 * Cropne z obrázku přesně overlay oblast (v relativních souřadnicích 0..1),
 * nejdřív resize na fixní šířku pro stabilní OCR.
 */
export async function cropByOverlay(uri: string, overlay01: OverlayRect01): Promise<string> {
  const resized = await manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.9, format: SaveFormat.JPEG }
  );

  const W = resized.width ?? 1200;
  const H = resized.height ?? 1600;

  // clamp
  const x01 = clamp01(overlay01.x);
  const y01 = clamp01(overlay01.y);
  const w01 = clamp01(overlay01.w);
  const h01 = clamp01(overlay01.h);

  const originX = Math.round(W * x01);
  const originY = Math.round(H * y01);
  const cropW = Math.round(W * w01);
  const cropH = Math.round(H * h01);

  // extra safe: crop musí být v bounds
  const safe = clampCropRect({ originX, originY, width: cropW, height: cropH }, W, H);

  const cropped = await manipulateAsync(
    resized.uri,
    [{ crop: safe }],
    { compress: 0.95, format: SaveFormat.JPEG }
  );

  return cropped.uri;
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function clampCropRect(
  rect: { originX: number; originY: number; width: number; height: number },
  W: number,
  H: number
) {
  const originX = Math.max(0, Math.min(rect.originX, W - 1));
  const originY = Math.max(0, Math.min(rect.originY, H - 1));
  const width = Math.max(1, Math.min(rect.width, W - originX));
  const height = Math.max(1, Math.min(rect.height, H - originY));
  return { originX, originY, width, height };
}