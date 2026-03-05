import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  Image,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { getCardById, getPrintsForCard, pickCardImage } from "@/src/lib/scryfall";
import { upsertToCollection } from "@/src/lib/storage";
import { loadPrefs } from "@/src/lib/prefs";
import type { Finish, ScryfallCardFull, ScryfallCardLite } from "@/src/types/mtg";
import { finishLabel } from "@/src/lib/format";

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [card, setCard] = useState<ScryfallCardFull | null>(null);
  const [loading, setLoading] = useState(true);

  const [prints, setPrints] = useState<ScryfallCardLite[]>([]);
  const [printsLoading, setPrintsLoading] = useState(false);

  const [qty, setQty] = useState("1");
  const [finish, setFinish] = useState<Finish>("nonfoil");

  const [stayOnDetail, setStayOnDetail] = useState(false);

  const qtyNum = useMemo(() => {
    const n = Number(qty);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }, [qty]);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const p = await loadPrefs();
        setStayOnDetail(p.quickAddStayOnDetail);
      })();
    }, [])
  );

  async function loadCard(cardId: string) {
    setLoading(true);
    try {
      const c = await getCardById(cardId);
      setCard(c);

      // nastav default finish, pokud karta neobsahuje nonfoil (vzácné, ale stát se může)
      const finishes = c.finishes ?? ["nonfoil", "foil", "etched"];
      if (!finishes.includes(finish)) {
        setFinish(finishes[0] as Finish);
      }

      // printy
      setPrints([]);
      if (c.prints_search_uri) {
        setPrintsLoading(true);
        try {
          const p = await getPrintsForCard(c.prints_search_uri);
          setPrints(p);
        } finally {
          setPrintsLoading(false);
        }
      }
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodařilo se načíst detail karty.");
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      if (!id) return;
      loadCard(id);
    }, [id])
  );

  async function addAndMaybeBack(goBack: boolean) {
    if (!card) return;

    try {
      await upsertToCollection(card, qtyNum, finish);
      Alert.alert("Přidáno", `${card.name} (${finishLabel(finish)}) ×${qtyNum}`);
      if (goBack) router.back();
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodařilo se přidat do sbírky.");
    }
  }

  const imageNormal = card ? pickCardImage(card, "normal") : null;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!card) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Karta nenalezena</Text>
        <Pressable onPress={() => router.back()} style={{ padding: 12, backgroundColor: "#111", borderRadius: 12 }}>
          <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>Zpět</Text>
        </Pressable>
      </View>
    );
  }

  const availableFinishes = (card.finishes ?? ["nonfoil", "foil", "etched"]) as Finish[];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Obrázek */}
      {imageNormal ? (
        <Image
          source={{ uri: imageNormal }}
          style={{
            width: "100%",
            aspectRatio: 0.72,
            borderRadius: 16,
            backgroundColor: "#f2f2f2",
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: "100%",
            aspectRatio: 0.72,
            borderRadius: 16,
            backgroundColor: "#f2f2f2",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ opacity: 0.6 }}>Bez obrázku</Text>
        </View>
      )}

      <Text style={{ fontSize: 22, fontWeight: "800" }}>{card.name}</Text>
      <Text style={{ opacity: 0.75 }}>
        {card.set.toUpperCase()} • {card.set_name ?? "?"} • #{card.collector_number ?? "?"} • {card.rarity ?? "?"}
      </Text>

      {!!card.type_line && <Text style={{ fontWeight: "700" }}>{card.type_line}</Text>}
      {!!card.oracle_text && <Text style={{ opacity: 0.9 }}>{card.oracle_text}</Text>}

      {/* Ceny */}
      <View style={{ borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 14, padding: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>Ceny (Scryfall)</Text>
        <Text>EUR: {card.prices?.eur ?? "—"}</Text>
        <Text>EUR Foil: {card.prices?.eur_foil ?? "—"}</Text>
        <Text>EUR Etched: {card.prices?.eur_etched ?? "—"}</Text>
        <Text>USD: {card.prices?.usd ?? "—"}</Text>
      </View>

      {/* Finish výběr */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: "800" }}>Varianta</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["nonfoil", "foil", "etched"] as Finish[]).map((f) => {
            const enabled = availableFinishes.includes(f);
            const selected = finish === f;

            return (
              <Pressable
                key={f}
                disabled={!enabled}
                onPress={() => setFinish(f)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  borderWidth: 2,
                  borderColor: selected ? "#111" : "#e5e5e5",
                  opacity: enabled ? 1 : 0.35,
                  backgroundColor: selected ? "#f7f7f7" : "white",
                }}
              >
                <Text style={{ fontWeight: "800" }}>{finishLabel(f)}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Print selection */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "800" }}>
            Print verze {prints.length ? `(${prints.length})` : ""}
          </Text>
          {printsLoading && <ActivityIndicator />}
        </View>

        {prints.length > 0 ? (
          <FlatList
            data={prints}
            keyExtractor={(p) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            initialNumToRender={8}
            windowSize={5}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            renderItem={({ item }) => {
              const selected = item.id === card.id;
              const thumb = pickCardImage(item, "small");

              return (
                <Pressable
                  onPress={() => {
                    if (item.id !== card.id) loadCard(item.id);
                  }}
                  style={{
                    borderWidth: 2,
                    borderColor: selected ? "#111" : "#e5e5e5",
                    borderRadius: 14,
                    padding: 8,
                    width: 140,
                    gap: 6,
                    backgroundColor: selected ? "#f7f7f7" : "white",
                  }}
                >
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={{ width: "100%", height: 100, borderRadius: 10, backgroundColor: "#f2f2f2" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: "100%",
                        height: 100,
                        borderRadius: 10,
                        backgroundColor: "#f2f2f2",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ opacity: 0.6 }}>—</Text>
                    </View>
                  )}

                  <Text style={{ fontWeight: "800" }} numberOfLines={1}>
                    {item.set.toUpperCase()}
                    {item.collector_number ? ` • #${item.collector_number}` : ""}
                  </Text>
                  <Text style={{ opacity: 0.7 }} numberOfLines={1}>
                    {item.set_name ?? "Unknown set"}
                  </Text>
                  <Text style={{ opacity: 0.85 }} numberOfLines={1}>
                    EUR: {item.prices?.eur ?? "—"}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <Text style={{ opacity: 0.7 }}>Printy nejsou k dispozici (nebo se ještě načítají).</Text>
        )}
      </View>

      {/* Přidání */}
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Text style={{ fontWeight: "700" }}>Množství</Text>
        <TextInput
          value={qty}
          onChangeText={setQty}
          keyboardType="number-pad"
          style={{
            width: 90,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            textAlign: "center",
          }}
        />

        <Pressable
          onPress={() => addAndMaybeBack(!stayOnDetail)}
          style={{ marginLeft: "auto", padding: 12, backgroundColor: "#111", borderRadius: 12 }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {stayOnDetail ? "Přidat" : "Přidat"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => addAndMaybeBack(false)}
          style={{ padding: 12, borderWidth: 2, borderColor: "#111", borderRadius: 12 }}
        >
          <Text style={{ fontWeight: "800" }}>Přidat a pokračovat</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}