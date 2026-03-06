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
import type { OverlayRect01 } from "@/src/lib/titleCrop";

type Mode = "search" | "scan";

export default function ScanScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("scan");

  // Search-as-you-type
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 250);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<ScryfallCardLite[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

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

        const names = await autocompleteNames(q, { signal: ctrl.signal });
        if (!alive) return;
        setSuggestions(names);

        const cards = await searchCards(q, { signal: ctrl.signal });
        if (!alive) return;
        setResults(cards);
      } catch {
        // ignore abort / transient errors
      } finally {
        if (alive) setLoadingSearch(false);
      }
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [debounced]);

  // Camera scan
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [scanning, setScanning] = useState(false);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null);

  async function ensurePerms() {
    if (!permission) return;
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Permission", "Camera permission is required.");
      }
    }
  }

  useEffect(() => {
    ensurePerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  // These values MUST exactly match the visible overlay below
  const overlayBox = useMemo(() => {
    const left = 16;
    const right = 16;
    const top = 15;
    const height = 70;

    if (!previewSize) return null;

    return {
      x: left,
      y: top,
      w: previewSize.w - left - right,
      h: height,
    };
  }, [previewSize]);

  const overlay01: OverlayRect01 | null = useMemo(() => {
    if (!previewSize || !overlayBox) return null;

    return {
      x: overlayBox.x / previewSize.w,
      y: overlayBox.y / previewSize.h,
      w: overlayBox.w / previewSize.w,
      h: overlayBox.h / previewSize.h,
    };
  }, [previewSize, overlayBox]);

  async function takeAndScan() {
    try {
      if (!permission?.granted) {
        await ensurePerms();
        if (!permission?.granted) return;
      }

      if (!cameraRef.current) {
        Alert.alert("Camera", "Camera is not ready.");
        return;
      }

      if (!overlay01) {
        Alert.alert("Scan", "Overlay is not ready yet. Try again.");
        return;
      }

      setScanning(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error("Failed to capture photo.");
      }

      setLastThumb(photo.uri);

      const res = await scanCardFromPhoto(photo.uri, overlay01);

      router.push(`/card/${res.scryfallId}`);
    } catch (e: any) {
      Alert.alert("Scan failed", e?.message ?? "Something went wrong.");
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
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Add card</Text>
      {tabs}

      {mode === "scan" ? (
        <View style={{ flex: 1, gap: 12 }}>
          {!permission?.granted ? (
            <Pressable
              onPress={ensurePerms}
              style={{
                padding: 12,
                backgroundColor: "#111",
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Allow camera</Text>
            </Pressable>
          ) : (
            <>
              <View
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "#e5e5e5",
                }}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setPreviewSize({ w: width, h: height });
                }}
              >
                <CameraView
                  ref={cameraRef}
                  style={{ width: "100%", height: 380 }}
                  facing="back"
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 16,
                    right: 16,
                    top: 15,
                    height: 70,
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.85)",
                    borderRadius: 12,
                    backgroundColor: "rgba(0,0,0,0.12)",
                  }}
                />

                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "800" }}>
                    Align the card title inside the frame
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
                  {scanning ? "Scanning..." : "Capture and recognize"}
                </Text>
              </Pressable>

              {scanning && <ActivityIndicator />}

              {lastThumb ? (
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <Image
                    source={{ uri: lastThumb }}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 10,
                      backgroundColor: "#f2f2f2",
                    }}
                  />
                  <Text style={{ opacity: 0.7, flex: 1 }}>
                    Better light and a steady hand improve OCR a lot.
                  </Text>
                </View>
              ) : (
                <Text style={{ opacity: 0.7 }}>
                  Scan v1 uses OCR on the card title. If it misses, use Search mode.
                </Text>
              )}
            </>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, gap: 12 }}>
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
              placeholder="e.g. Sol Ring"
              autoCapitalize="words"
              autoCorrect={false}
              autoComplete="off"
              style={{ flex: 1, paddingVertical: 10 }}
            />
            {showX && (
              <Pressable
                onPress={() => setQuery("")}
                style={{ paddingHorizontal: 6, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 18, opacity: 0.6, fontWeight: "700" }}>✕</Text>
              </Pressable>
            )}
          </View>

          {loadingSearch && <ActivityIndicator />}

          {suggestions.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontWeight: "800" }}>Suggestions</Text>
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
            <Text style={{ fontWeight: "800", marginBottom: 8 }}>Results</Text>
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
                        style={{
                          width: 56,
                          height: 78,
                          borderRadius: 10,
                          backgroundColor: "#f2f2f2",
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 56,
                          height: 78,
                          borderRadius: 10,
                          backgroundColor: "#f2f2f2",
                        }}
                      />
                    )}

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontWeight: "800" }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ opacity: 0.7 }} numberOfLines={1}>
                        {item.set.toUpperCase()}{" "}
                        {item.collector_number ? `• #${item.collector_number}` : ""}
                      </Text>
                      <Text style={{ opacity: 0.85 }}>EUR: {item.prices?.eur ?? "—"}</Text>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                debounced.trim() ? (
                  <Text style={{ opacity: 0.7 }}>No results found.</Text>
                ) : (
                  <Text style={{ opacity: 0.7 }}>Start typing a card name.</Text>
                )
              }
            />
          </View>
        </View>
      )}
    </View>
  );
}