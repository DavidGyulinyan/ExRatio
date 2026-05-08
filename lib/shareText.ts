import { Share } from "react-native";

/**
 * Opens the system share sheet with non-empty lines joined as plain text.
 */
export async function shareLines(
  lines: (string | undefined | null)[]
): Promise<void> {
  const message = lines
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean)
    .join("\n");
  if (!message) return;
  try {
    await Share.share({ message });
  } catch {
    /* user cancelled or share unavailable */
  }
}
