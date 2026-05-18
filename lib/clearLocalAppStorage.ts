import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAsyncStorage } from "@/lib/storage";

/**
 * Wipes persisted app data on this device (preferences, caches, drafts, Supabase session keys, etc.).
 * Used after account deletion; sign-out handlers may use narrower key lists.
 */
export async function clearAllLocalAppStorage(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.warn("AsyncStorage.clear failed:", e);
  }
  try {
    const storage = getAsyncStorage();
    if (typeof storage.clear === "function") {
      await storage.clear();
    }
  } catch (e) {
    console.warn("getAsyncStorage().clear failed:", e);
  }
}
