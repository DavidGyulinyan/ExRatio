import { Platform } from "react-native";
import { getAsyncStorage } from "@/lib/storage";

const KEY = "freelanceReminders.v1";

type Stored = {
  monthlyFinance?: string;
};

async function loadStored(): Promise<Stored> {
  try {
    const raw = await getAsyncStorage().getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

async function saveStored(next: Stored): Promise<void> {
  await getAsyncStorage().setItem(KEY, JSON.stringify(next));
}

async function getNotificationsModule(): Promise<any | null> {
  try {
    const mod = await import("expo-notifications");
    return mod;
  } catch {
    return null;
  }
}

export async function ensureNotificationsPermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  if (Platform.OS === "web") return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === "granted") return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  } catch {
    return false;
  }
}

export async function isMonthlyFinanceReminderEnabled(): Promise<boolean> {
  const stored = await loadStored();
  return Boolean(stored.monthlyFinance);
}

/**
 * Schedules a repeating monthly reminder (day-of-month).
 * Note: calendar triggers may behave differently across platforms; this is best-effort.
 */
export async function enableMonthlyFinanceReminder(input?: {
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
  title?: string;
  body?: string;
}): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  if (Platform.OS === "web") return false;

  const ok = await ensureNotificationsPermission();
  if (!ok) return false;

  const day = Math.min(28, Math.max(1, Math.floor(input?.dayOfMonth ?? 20)));
  const hour = Math.min(23, Math.max(0, Math.floor(input?.hour ?? 10)));
  const minute = Math.min(59, Math.max(0, Math.floor(input?.minute ?? 0)));
  const title = input?.title ?? "Finance reminder";
  const body = input?.body ?? "Review invoices, taxes, and cashflow for this month.";

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: "freelance_monthly_finance" },
      },
      trigger: { day, hour, minute, repeats: true },
    });
    const stored = await loadStored();
    await saveStored({ ...stored, monthlyFinance: notificationId });
    return true;
  } catch {
    return false;
  }
}

export async function disableMonthlyFinanceReminder(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  const stored = await loadStored();
  if (!stored.monthlyFinance) return true;
  try {
    if (Notifications) {
      await Notifications.cancelScheduledNotificationAsync(stored.monthlyFinance);
    }
    await saveStored({ ...stored, monthlyFinance: undefined });
    return true;
  } catch {
    return false;
  }
}

