import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "mtg_prefs_v1";

export type Prefs = {
  quickAddStayOnDetail: boolean;
};

const DEFAULTS: Prefs = {
  quickAddStayOnDetail: false,
};

export async function loadPrefs(): Promise<Prefs> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULTS;

  try {
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}