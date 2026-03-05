import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Alert, Image, TextInput } from "react-native";
import { useRouter } from "expo-router";
import type { CollectionItem } from "@/src/types/mtg";
import { useFocusEffect } from "@react-navigation/native";
import { deleteFromCollection, loadCollection, updateQty } from "@/src/lib/storage";
import { formatMoney } from "@/src/lib/format";
import { useDebouncedValue } from "@/src/lib/debounce";

export default function CollectionScreen() {
  const router = useRouter();

  const [items, setItems] = useState<CollectionItem[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  async function refresh() {
    const map = await loadCollection();
    const arr = Object.values(map).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setItems(arr);
  }

 useFocusEffect(
    React.useCallback(() => {
        refresh();
    }, [])
 );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const hay = [
        it.name,
        it.set,
        it.collectorNumber ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, debouncedSearch]);

  const totalEur = filtered.reduce((sum, it) => {
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

      <View
  style={{
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 12,
  }}
>
  <TextInput
    value={search}
    onChangeText={setSearch}
    placeholder="Hledat ve sbírce (název, set, číslo)…"
    autoCapitalize="none"
    autoCorrect={false}
    autoComplete="off"
    style={{
      flex: 1,
      paddingVertical: 10,
    }}
  />

  {search.length > 0 && (
    <Pressable
      onPress={() => setSearch("")}
      style={{
        paddingHorizontal: 6,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          opacity: 0.6,
          fontWeight: "700",
        }}
      >
        ✕
      </Text>
    </Pressable>
  )}
</View>

      <Text style={{ opacity: 0.7 }}>
        Zobrazeno: {filtered.length}/{items.length} • Hodnota (EUR, non-foil): {formatMoney(totalEur)}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.scryfallId}
        contentContainerStyle={{ paddingVertical: 6, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/card/${item.scryfallId}`)}
            style={{
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 16,
              padding: 12,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", gap: 12 }}>
              {item.imageSmall ? (
                <Image
                  source={{ uri: item.imageSmall }}
                  style={{
                    width: 64,
                    height: 90,
                    borderRadius: 10,
                    backgroundColor: "#f2f2f2",
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 90,
                    borderRadius: 10,
                    backgroundColor: "#f2f2f2",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ opacity: 0.5 }}>—</Text>
                </View>
              )}

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: "800" }} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={{ opacity: 0.7 }}>
                  {item.set.toUpperCase()}
                  {item.collectorNumber ? ` • #${item.collectorNumber}` : ""} • Qty: {item.qty}
                </Text>
                <Text style={{ opacity: 0.85 }}>EUR: {item.prices.eur ?? "—"}</Text>
                <Text style={{ opacity: 0.55 }}>Tapni pro detail</Text>
              </View>
            </View>

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
                <Text style={{ fontWeight: "800" }}>-1</Text>
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
                <Text style={{ fontWeight: "800" }}>+1</Text>
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
                <Text style={{ color: "white", fontWeight: "800" }}>Smazat</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          debouncedSearch.trim() ? (
            <Text style={{ opacity: 0.7, paddingTop: 10 }}>
              Nic nenalezeno pro “{debouncedSearch.trim()}”.
            </Text>
          ) : (
            <Text style={{ opacity: 0.7, paddingTop: 10 }}>
              Sbírka je prázdná. Přidej první kartu ve Scan tabu.
            </Text>
          )
        }
      />
    </View>
  );
}