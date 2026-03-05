import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { searchCards } from "@/src/lib/scryfall";
import type { ScryfallCardLite } from "@/src/types/mtg";
import { useDebouncedValue } from "@/src/lib/debounce";

export default function ScanScreen() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 350);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScryfallCardLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = debounced.trim();
    let alive = true;
    const controller = new AbortController();

    (async () => {
      setError(null);

      if (q.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const cards = await searchCards(q);
        if (alive) setResults(cards);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (alive) setError(e?.message ?? "Nepodařilo se vyhledat kartu.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [debounced]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Přidat kartu</Text>
      <Text style={{ opacity: 0.7 }}>Začni psát název. Výsledky se doplňují automaticky.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Např. Sol Ring"
        autoCapitalize="words"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      />

      {loading && (
        <View style={{ paddingTop: 6 }}>
          <ActivityIndicator />
        </View>
      )}

      {!!error && <Text style={{ color: "crimson" }}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 6, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/card/${item.id}`)}
            style={{
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 14,
              padding: 12,
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.name}</Text>
            <Text style={{ opacity: 0.7 }}>
              {item.set.toUpperCase()} • #{item.collector_number ?? "?"} • {item.lang?.toUpperCase() ?? "EN"}
            </Text>
            <Text style={{ opacity: 0.85 }}>
              EUR: {item.prices?.eur ?? "—"} | EUR Foil: {item.prices?.eur_foil ?? "—"}
            </Text>
            <Text style={{ opacity: 0.6 }}>Tapnutím otevřeš detail</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          query.trim().length >= 2 ? (
            <Text style={{ opacity: 0.7, paddingTop: 10 }}>Nic nenalezeno.</Text>
          ) : (
            <Text style={{ opacity: 0.7, paddingTop: 10 }}>Napiš aspoň 2 znaky…</Text>
          )
        }
      />
    </View>
  );
}