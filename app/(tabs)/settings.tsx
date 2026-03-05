import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, Switch } from "react-native";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";

import { loadPrefs, savePrefs } from "@/src/lib/prefs";
import {
  exportCollectionPayload,
  mergeCollectionFromPayload,
  replaceCollectionFromPayload,
  loadCollection,
  applyPriceRefresh,
} from "@/src/lib/storage";
import { getCardsByIdsBulk } from "@/src/lib/scryfall";

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
  const [quickAdd, setQuickAdd] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadPrefs();
      setQuickAdd(p.quickAddStayOnDetail);
    })();
  }, []);

  async function toggleQuickAdd(v: boolean) {
    setQuickAdd(v);
    const p = await loadPrefs();
    await savePrefs({ ...p, quickAddStayOnDetail: v });
  }

  async function refreshPrices() {
    try {
      setWorking(true);
      setProgress(null);

      const map = await loadCollection();
      const ids = Array.from(new Set(Object.values(map).map((it) => it.scryfallId)));

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
        await sleep(120);
      }

      Alert.alert("Hotovo", "Ceny byly aktualizovány.");
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodařilo se aktualizovat ceny.");
    } finally {
      setWorking(false);
    }
  }

  async function exportJson() {
    try {
      const payload = await exportCollectionPayload();
      const json = JSON.stringify(payload, null, 2);

      const filename = `mtg-collection-${new Date().toISOString().slice(0, 10)}.json`;

     const file = new File(Paths.document, filename);

     if (file.exists) {
        file.delete();
     }

     file.create();

     file.write(json);

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Hotovo", `Soubor uložen: ${file.uri}`);
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Export sbírky",
      });
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodařilo se exportovat sbírku.");
    }
  }

  async function importJson(mode: "merge" | "replace") {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/json"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      // ✅ Moderní API: File(uri).text()
      const file = new File(uri);
      const raw = await file.text();
      const payload = JSON.parse(raw);

      if (!payload || payload.version !== 1 || !Array.isArray(payload.items)) {
        throw new Error("Neplatný export soubor (čekám version=1 a items[]).");
      }

      if (mode === "replace") await replaceCollectionFromPayload(payload);
      else await mergeCollectionFromPayload(payload);

      Alert.alert("Hotovo", mode === "replace" ? "Sbírka byla nahrazena." : "Sbírka byla sloučena.");
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodařilo se importovat sbírku.");
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Nastavení</Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: "#e5e5e5",
          borderRadius: 14,
          padding: 12,
          gap: 8,
        }}
      >
        <Text style={{ fontWeight: "800" }}>Quick add</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ opacity: 0.8 }}>Po přidání zůstat na detailu</Text>
          <Switch value={quickAdd} onValueChange={toggleQuickAdd} />
        </View>
        <Text style={{ opacity: 0.6 }}>
          Hodí se při přidávání binderu. Tlačítko “Přidat a pokračovat” funguje vždy.
        </Text>
      </View>

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
          Refresh cen {progress ? `(${progress.done}/${progress.total})` : ""}
        </Text>
      </Pressable>

      {working && <ActivityIndicator />}

      <View style={{ height: 10 }} />

      <Text style={{ fontWeight: "800" }}>Export / Import</Text>

      <Pressable
        onPress={exportJson}
        style={{ backgroundColor: "#111", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>Export sbírky (JSON)</Text>
      </Pressable>

      <Pressable
        onPress={() => importJson("merge")}
        style={{ borderWidth: 2, borderColor: "#111", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "800" }}>Import (Merge)</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          Alert.alert("Pozor", "Tím přepíšeš aktuální sbírku. Pokračovat?", [
            { text: "Zrušit", style: "cancel" },
            { text: "Přepsat", style: "destructive", onPress: () => importJson("replace") },
          ])
        }
        style={{ borderWidth: 2, borderColor: "#b00020", borderRadius: 12, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "800", color: "#b00020" }}>Import (Replace)</Text>
      </Pressable>
    </View>
  );
}