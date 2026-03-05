import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import type { CollectionItem } from "@/src/types/mtg";
import { deleteFromCollection, loadCollection, updateQty } from "@/src/lib/storage";
import { formatMoney } from "@/src/lib/format";

export default function CollectionScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CollectionItem[]>([]);

  async function refresh() {
    const map = await loadCollection();
    const arr = Object.values(map).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setItems(arr);
  }

  useEffect(() => {
    refresh();
  }, []);

  const totalEur = items.reduce((sum, it) => {
    const p = it.prices.eur ? Number(it.prices.eur) : 0;
    return sum + p * it.qty;
  }, 0);

  async function onInc(id: string) {
    await updateQty(id, +1);
    refresh();
  }

  async function onDec(id: string) {
    await updateQty(id, -1);
    refresh();
  }

  async function onDelete(id: string) {
    Alert.alert("Smazat?", "Opravdu chceš odstranit kartu ze sbírky?", [
      { text: "Zrušit", style: "cancel" },
      {
        text: "Smazat",
        style: "destructive",
        onPress: async () => {
          await deleteFromCollection(id);
          refresh();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Sbírka</Text>
      <Text style={{ opacity: 0.7 }}>
        Položek: {items.length} • Hodnota (EUR, non-foil): {formatMoney(totalEur)}
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.scryfallId}
        contentContainerStyle={{ paddingVertical: 6, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/card/${item.scryfallId}`)}
            style={{
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 14,
              padding: 12,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.name}</Text>
            <Text style={{ opacity: 0.7 }}>
              {item.set.toUpperCase()} • Qty: {item.qty} • EUR: {item.prices.eur ?? "—"}
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDec(item.scryfallId);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#ccc",
                }}
              >
                <Text style={{ fontWeight: "700" }}>-1</Text>
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onInc(item.scryfallId);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#ccc",
                }}
              >
                <Text style={{ fontWeight: "700" }}>+1</Text>
              </Pressable>

              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(item.scryfallId);
                }}
                style={{
                  marginLeft: "auto",
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: "#111",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Smazat</Text>
              </Pressable>
            </View>

            <Text style={{ opacity: 0.55 }}>Tapni pro detail</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={{ opacity: 0.7, paddingTop: 10 }}>
            Sbírka je prázdná. Přidej první kartu ve Scan tabu.
          </Text>
        }
      />
    </View>
  );
}