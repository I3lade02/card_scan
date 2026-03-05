import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * MTG title bar je nahoře. Cropneme cca horních ~20–22% obrázku.
 * To funguje překvapivě dobře jako Scan v1 bez manuálního výřezu.
 */
export async function cropTitleBar(uri: string): Promise<string> {
  // Nejdřív si vezmeme originál a uděláme “safe crop” relativně
  // ImageManipulator crop bere px, takže uděláme resize na fixní šířku kvůli prediktabilitě.

  const resized = await manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.9, format: SaveFormat.JPEG }
  );

  // Po resize neznáme výšku, ale manipulateAsync ji drží v souboru.
  // Uděláme ještě jeden průchod: crop top část 22% výšky.
  // Expo Image Manipulator bohužel nevrací rozměry ve všech verzích konzistentně,
  // takže zvolíme jednoduchý kompromis: crop dle předpokladu poměru karty (cca 0.72).
  // Po resize width=1200 => height bude cca 1667 (1200 / 0.72).
  const approxHeight = Math.round(1200 / 0.72);
  const cropHeight = Math.round(approxHeight * 0.22);

  const cropped = await manipulateAsync(
    resized.uri,
    [
      {
        crop: {
          originX: 0,
          originY: 0,
          width: 1200,
          height: cropHeight,
        },
      },
    ],
    { compress: 0.95, format: SaveFormat.JPEG }
  );

  return cropped.uri;
}