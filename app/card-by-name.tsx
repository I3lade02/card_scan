import React, { useEffect } from "react";
import { View, ActivityIndicator, Alert } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";

const SCRYFALL = "https://api.scryfall.com";

const HEADERS = {
  "User-Agent": "MTG-Scanner-App/1.0 (Expo; Android)",
  "Accept": "application/json",
};

export default function CardByName() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const [cardId, setCardId] = React.useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const q = encodeURIComponent((name ?? "").trim());

        const res = await fetch(
          `${SCRYFALL}/cards/named?fuzzy=${q}`,
          { headers: HEADERS }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.details ?? `Scryfall chyba ${res.status}`);
        }

        if (alive) setCardId(json.id);
      } catch (e: any) {
        Alert.alert("Chyba", e?.message ?? "Nepodařilo se najít kartu.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [name]);

  if (cardId) return <Redirect href={`/card/${cardId}`} />;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}