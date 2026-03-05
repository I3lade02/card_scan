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
import {
  getCardById,
  getPrintsForCard,
  pickCardImage,
} from "@/src/lib/scryfall";
import { upsertToCollection } from "@/src/lib/storage";
import type { ScryfallCardFull, ScryfallCardLite } from "@/src/types/mtg";

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [card, setCard] = useState<ScryfallCardFull | null>(null);
  const [loading, setLoading] = useState(true);

  const [prints, setPrints] = useState<ScryfallCardLite[]>([]);
  const [printsLoading, setPrintsLoading] = useState(false);

  const [qty, setQty] = useState("1");

  const qtyNum = useMemo(() => {
    const n = Number(qty);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }, [qty]);

  async function loadCard(cardId: string) {
    setLoading(true);
    try {
      const c = await getCardById(cardId);
      setCard(c);

      // načti printy (neblokuj render)
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
        <Pressable
          onPress={() => router.back()}
          style={{ padding: 12, backgroundColor: "#111", borderRadius: 12 }}
        >
          <Text style={{ color: "white", fontWeight: "700", textAlign: "center" }}>
            Zpět
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Obrázek */}
      {imageNormal ? (
        <Image
          source={{ uri: imageNormal }}
          style={{
            width: "100%",
            aspectRatio: 0.72, // karta je “vyšší”
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

      {/* Titulek */}
      <Text style={{ fontSize: 22, fontWeight: "800" }}>{card.name}</Text>
      <Text style={{ opacity: 0.75 }}>
        {card.set.toUpperCase()} • {card.set_name ?? "?"} • #{card.collector_number ?? "?"} •{" "}
        {card.rarity ?? "?"}
      </Text>

      {!!card.type_line && <Text style={{ fontWeight: "700" }}>{card.type_line}</Text>}
      {!!card.oracle_text && <Text style={{ opacity: 0.9 }}>{card.oracle_text}</Text>}

      {/* Ceny */}
      <View
        style={{
          borderWidth: 1,
          borderColor: "#e5e5e5",
          borderRadius: 14,
          padding: 12,
          gap: 6,
        }}
      >
        <Text style={{ fontWeight: "800" }}>Ceny (Scryfall)</Text>
        <Text>EUR: {card.prices?.eur ?? "—"}</Text>
        <Text>EUR Foil: {card.prices?.eur_foil ?? "—"}</Text>
        <Text>USD: {card.prices?.usd ?? "—"}</Text>
        <Text>USD Foil: {card.prices?.usd_foil ?? "—"}</Text>
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
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => {
              const selected = item.id === card.id;
              const thumb = pickCardImage(item, "small");

              return (
                <Pressable
                  onPress={() => {
                    // Přepni detail na vybraný print
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
                      style={{
                        width: "100%",
                        height: 100,
                        borderRadius: 10,
                        backgroundColor: "#f2f2f2",
                      }}
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
          <Text style={{ opacity: 0.7 }}>
            Printy nejsou k dispozici (nebo zatím nenahrány).
          </Text>
        )}
      </View>

      {/* Přidání do sbírky */}
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
        <Pressable
          onPress={add}
          style={{ marginLeft: "auto", padding: 12, backgroundColor: "#111", borderRadius: 12 }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>Přidat</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}