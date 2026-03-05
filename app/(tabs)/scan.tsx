import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useDebouncedValue } from "@/src/lib/debounce";
import { autocompleteNames } from "@/src/lib/scryfall"; 


export default function ScanScreen() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
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
        const names = await autocompleteNames(q, { signal: controller.signal });
        if (alive) setResults(names);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        if (alive) setError(e?.message ?? "Nepodařilo se načíst našeptávač.");
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
      <Text style={{ opacity: 0.7 }}>Začni psát název, vyber z našeptávače.</Text>

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
    value={query}
    onChangeText={setQuery}
    placeholder="Např. Sol Ring"
    autoCapitalize="words"
    autoCorrect={false}
    autoComplete="off"
    style={{
      flex: 1,
      paddingVertical: 10,
    }}
  />

  {query.length > 0 && (
    <Pressable
      onPress={() => setQuery("")}
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

      {loading && (
        <View style={{ paddingTop: 6 }}>
          <ActivityIndicator />
        </View>
      )}

      {!!error && <Text style={{ color: "crimson" }}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingVertical: 6, gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              // Otevřeme detail přes fuzzy name -> nejjednodušší:
              // Uděláme redirect přes named fuzzy: nejpraktičtější je vytvořit route, co si id zjistí,
              // ale rychlá varianta: použij search endpoint pro vybraný název a vezmi první id.
              // Ještě jednodušší: vytvoř si helper getCardByNameFuzzy a pushni /card/<id>.
              router.push({ pathname: "/card-by-name", params: { name: item } } as any);
            }}
            style={{
              borderWidth: 1,
              borderColor: "#e5e5e5",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{item}</Text>
            <Text style={{ opacity: 0.6 }}>Tapni pro detail</Text>
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