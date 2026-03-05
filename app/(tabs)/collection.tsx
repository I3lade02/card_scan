import React, { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, Alert, Image, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import type { CollectionItem } from "@/src/types/mtg";
import { deleteFromCollection, loadCollection, updateQty } from "@/src/lib/storage";
import { formatMoney, finishLabel, pickEurPrice } from "@/src/lib/format";
import { useDebouncedValue } from "@/src/lib/debounce";

type Row = { key: string; item: CollectionItem };

export default function CollectionScreen() {
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);

  async function refresh() {
    const map = await loadCollection();
    const arr: Row[] = Object.entries(map)
      .map(([key, item]) => ({ key, item }))
      .sort((a, b) => b.item.updatedAt.localeCompare(a.item.updatedAt));
    setRows(arr);
  }

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [])
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter(({ item }) => {
      const hay = [item.name, item.set, item.collectorNumber ?? "", finishLabel(item.finish)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, debouncedSearch]);

  const totalEur = filtered.reduce((sum, { item }) => {
    const p = pickEurPrice(item.prices, item.finish);
    return sum + p * item.qty;
  }, 0);

  async function onInc(key: string) {
    await updateQty(key, +1);
    refresh();
  }

  async function onDec(key: string) {
    await updateQty(key, -1);
    refresh();
  }

  async function onDelete(key: string) {
    Alert.alert("Smazat?", "Opravdu chceš odstranit kartu ze sbírky?", [
      { text: "Zrušit", style: "cancel" },
      {
        text: "Smazat",
        style: "destructive",
        onPress: async () => {
          await deleteFromCollection(key);
          refresh();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Sbírka</Text>

      {/* Search bar + X */}
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
          placeholder="Hledat (název, set, číslo, finish)…"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          style={{ flex: 1, paddingVertical: 10 }}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
            <Text style={{ fontSize: 18, opacity: 0.6, fontWeight: "700" }}>✕</Text>
          </Pressable>
        )}
      </View>

      <Text style={{ opacity: 0.7 }}>
        Zobrazeno: {filtered.length}/{rows.length} • Hodnota (EUR podle finish): {formatMoney(totalEur)}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingVertical: 6, gap: 10 }}
        renderItem={({ item: row }) => {
          const { item, key } = row;

          return (
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
                    style={{ width: 64, height: 90, borderRadius: 10, backgroundColor: "#f2f2f2" }}
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
                    {item.collectorNumber ? ` • #${item.collectorNumber}` : ""} • {finishLabel(item.finish)} • Qty:{" "}
                    {item.qty}
                  </Text>

                  <Text style={{ opacity: 0.85 }}>
                    EUR: {pickEurPrice(item.prices, item.finish).toFixed(2)}
                  </Text>

                  <Text style={{ opacity: 0.55 }}>Tapni pro detail</Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onDec(key);
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
                    onInc(key);
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
                    onDelete(key);
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
          );
        }}
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