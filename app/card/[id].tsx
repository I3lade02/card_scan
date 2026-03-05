import React, { useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getCardById } from "@/src/lib/scryfall";
import { upsertToCollection } from "@/src/lib/storage";
import type { ScryfallCardFull } from "@/src/types/mtg";

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [card, setCard] = useState<ScryfallCardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState("1");

  const qtyNum = useMemo(() => {
    const n = Number(qty);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }, [qty]);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          if (!id) return;
          const c = await getCardById(id);
          if (alive) setCard(c);
        } catch (e: any) {
          Alert.alert("Chyba", e?.message ?? "Nepodařilo se načíst detail karty.");
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id])
  );

  async function add() {
    if (!card) return;
    try {
      await upsertToCollection(card, qtyNum);
      Alert.alert("Přidáno", `${card.name} ×${qtyNum}`);
      router.back();
    } catch (e: any) {
      Alert.alert("Chyba", e?.message ?? "Nepodařilo se přidat do sbírky.");
    }
  }

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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{card.name}</Text>

      <Text style={{ opacity: 0.75 }}>
        {card.set.toUpperCase()} • #{card.collector_number ?? "?"} • {card.rarity ?? "?"} • {card.lang?.toUpperCase() ?? "EN"}
      </Text>

      {!!card.type_line && <Text style={{ fontWeight: "700" }}>{card.type_line}</Text>}
      {!!card.oracle_text && <Text style={{ opacity: 0.9 }}>{card.oracle_text}</Text>}

      <View style={{ borderWidth: 1, borderColor: "#e5e5e5", borderRadius: 14, padding: 12, gap: 6 }}>
        <Text style={{ fontWeight: "800" }}>Ceny (Scryfall)</Text>
        <Text>EUR: {card.prices?.eur ?? "—"}</Text>
        <Text>EUR Foil: {card.prices?.eur_foil ?? "—"}</Text>
        <Text>USD: {card.prices?.usd ?? "—"}</Text>
        <Text>USD Foil: {card.prices?.usd_foil ?? "—"}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
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
        <Pressable onPress={add} style={{ marginLeft: "auto", padding: 12, backgroundColor: "#111", borderRadius: 12 }}>
          <Text style={{ color: "white", fontWeight: "800" }}>Přidat</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}