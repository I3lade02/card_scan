import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { loadCollection } from "@/src/lib/storage";
import { getCardsByIdsBulk } from "@/src/lib/scryfall";
import { applyPriceRefresh } from "@/src/lib/storage";

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function SettingsScreen() {
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const label = useMemo(() => {
    if (!progress) return "";
    return `${progress.done}/${progress.total}`;
  }, [progress]);

  async function refreshPrices() {
    try {
      setWorking(true);
      setProgress(null);

      const map = await loadCollection();
      const ids = Object.keys(map);
      if (ids.length === 0) {
        Alert.alert("Info", "Sbírka je prázdná.");
        return;
      }

      const batches = chunk(ids, 75);
      setProgress({ done: 0, total: batches.length });

      for (let i = 0; i < batches.length; i++) {
        const cards = await getCardsByIdsBulk(batches[i]);
        await applyPriceRefresh(cards);

        setProgress({ done: i + 1, total: batches.length });

        // Jemná pauza kvůli rate-limitům (Scryfall bývá v pohodě, ale tohle je slušné chování)
        await sleep(120);
      }

      Alert.alert("Hotovo", "Ceny byly aktualizovány.");
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodařilo se aktualizovat ceny.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Nastavení</Text>
      <Text style={{ opacity: 0.7 }}>
        Zde můžeš spustit refresh cen pro celou sbírku (Scryfall bulk).
      </Text>

      <Pressable
        disabled={working}
        onPress={refreshPrices}
        style={{
          backgroundColor: working ? "#444" : "#111",
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>
          Refresh cen {progress ? `(${label})` : ""}
        </Text>
      </Pressable>

      {working && (
        <View style={{ paddingTop: 6 }}>
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
}