import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

import { useDebouncedValue } from "@/src/lib/debounce";
import { autocompleteNames, searchCards, pickCardImage } from "@/src/lib/scryfall";
import type { ScryfallCardLite } from "@/src/types/mtg";
import { scanCardFromPhoto } from "@/src/lib/scanPipeline";

type Mode = "search" | "scan";

export default function ScanScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("scan");

  // ---- Search-as-you-type ----
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<ScryfallCardLite[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // X tlačítko
  const showX = query.length > 0;

  useEffect(() => {
    let alive = true;
    const ctrl = new AbortController();

    (async () => {
      const q = debounced.trim();
      if (!q) {
        setSuggestions([]);
        setResults([]);
        return;
      }

      try {
        setLoadingSearch(true);

        // 1) autocomplete
        const names = await autocompleteNames(q, { signal: ctrl.signal });
        if (!alive) return;
        setSuggestions(names);

        // 2) výsledky
        const cards = await searchCards(q, { signal: ctrl.signal });
        if (!alive) return;
        setResults(cards);
      } catch (e: any) {
        if (!alive) return;
        // ignore abort
      } finally {
        if (alive) setLoadingSearch(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [debounced]);

  // ---- Camera scan v1 ----
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [scanning, setScanning] = useState(false);
  const [lastThumb, setLastThumb] = useState<string | null>(null);

  async function ensurePerms() {
    if (!permission) return;
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Povolení", "Bez povolení kamery to nepůjde.");
      }
    }
  }

  useEffect(() => {
    ensurePerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  async function takeAndScan() {
    try {
      if (!permission?.granted) {
        await ensurePerms();
        if (!permission?.granted) return;
      }

      if (!cameraRef.current) {
        Alert.alert("Kamera", "Kamera není připravená.");
        return;
      }

      setScanning(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("Nepodařilo se vyfotit.");
      }

      setLastThumb(photo.uri);

      const res = await scanCardFromPhoto(photo.uri);

      // úspěch -> detail
      router.push(`/card/${res.scryfallId}`);
    } catch (e: any) {
      Alert.alert("Scan selhal", e?.message ?? "Něco se pokazilo.");
    } finally {
      setScanning(false);
    }
  }

  const tabs = useMemo(() => {
    const pill = (active: boolean) => ({
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: active ? "#111" : "#e5e5e5",
      backgroundColor: active ? "#f7f7f7" : "white",
    });

    return (
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={() => setMode("scan")} style={pill(mode === "scan")}>
          <Text style={{ fontWeight: "800" }}>Scan</Text>
        </Pressable>
        <Pressable onPress={() => setMode("search")} style={pill(mode === "search")}>
          <Text style={{ fontWeight: "800" }}>Search</Text>
        </Pressable>
      </View>
    );
  }, [mode]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Přidat kartu</Text>
      {tabs}

      {mode === "scan" ? (
        <View style={{ flex: 1, gap: 12 }}>
          {!permission?.granted ? (
            <Pressable
              onPress={ensurePerms}
              style={{ padding: 12, backgroundColor: "#111", borderRadius: 12, alignItems: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Povolit kameru</Text>
            </Pressable>
          ) : (
            <>
              <View style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e5e5e5" }}>
                <CameraView
                  ref={cameraRef}
                  style={{ width: "100%", height: 380 }}
                  facing="back"
                />
                {/* jednoduchý overlay “title bar” */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    top: 20,
                    height: 70,
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.85)",
                    borderRadius: 12,
                    backgroundColor: "rgba(0,0,0,0.12)",
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{ position: "absolute", left: 0, right: 0, top: 0, padding: 12 }}
                >
                  <Text style={{ color: "white", fontWeight: "800" }}>
                    Zaměř horní část (název) do rámečku
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={scanning}
                onPress={takeAndScan}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: scanning ? "#444" : "#111",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "800" }}>
                  {scanning ? "Skenuju…" : "Vyfotit a rozpoznat"}
                </Text>
              </Pressable>

              {scanning && <ActivityIndicator />}

              {lastThumb ? (
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <Image
                    source={{ uri: lastThumb }}
                    style={{ width: 54, height: 54, borderRadius: 10, backgroundColor: "#f2f2f2" }}
                  />
                  <Text style={{ opacity: 0.7, flex: 1 }}>
                    Tip: lepší světlo + klidná ruka = o dost vyšší úspěšnost.
                  </Text>
                </View>
              ) : (
                <Text style={{ opacity: 0.7 }}>
                  Scan v1 je OCR názvu. Když to ujede, přepni na Search.
                </Text>
              )}
            </>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, gap: 12 }}>
          {/* Search input + X */}
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
              style={{ flex: 1, paddingVertical: 10 }}
            />
            {showX && (
              <Pressable onPress={() => setQuery("")} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                <Text style={{ fontSize: 18, opacity: 0.6, fontWeight: "700" }}>✕</Text>
              </Pressable>
            )}
          </View>

          {loadingSearch && <ActivityIndicator />}

          {suggestions.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "800" }}>Návrhy</Text>
              <FlatList
                data={suggestions}
                keyExtractor={(s, idx) => `${s}-${idx}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => setQuery(item)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: "#e5e5e5",
                      backgroundColor: "white",
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>{item}</Text>
                  </Pressable>
                )}
              />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", marginBottom: 8 }}>Výsledky</Text>
            <FlatList
              data={results}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
              renderItem={({ item }) => {
                const thumb = pickCardImage(item, "small");
                return (
                  <Pressable
                    onPress={() => router.push(`/card/${item.id}`)}
                    style={{
                      borderWidth: 1,
                      borderColor: "#e5e5e5",
                      borderRadius: 16,
                      padding: 12,
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        style={{ width: 56, height: 78, borderRadius: 10, backgroundColor: "#f2f2f2" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 56, height: 78, borderRadius: 10, backgroundColor: "#f2f2f2" }} />
                    )}

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: "800" }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ opacity: 0.7 }} numberOfLines={1}>
                        {item.set.toUpperCase()} {item.collector_number ? `• #${item.collector_number}` : ""}
                      </Text>
                      <Text style={{ opacity: 0.85 }}>EUR: {item.prices?.eur ?? "—"}</Text>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                debounced.trim() ? (
                  <Text style={{ opacity: 0.7 }}>Nic nenalezeno.</Text>
                ) : (
                  <Text style={{ opacity: 0.7 }}>Začni psát název karty.</Text>
                )
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}