import { isRunningInExpoGo } from 'expo';
import { Alert, Platform } from 'react-native';

import { getAsyncStorage } from './storage';

// Keep notifications quiet in production.
const NOTIFICATIONS_DEBUG_LOGS = false;
function debugLog(...args: any[]) {
  if (!NOTIFICATIONS_DEBUG_LOGS) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

/** Importing `expo-notifications` on Expo Go + Android registers push listeners that `console.error` (SDK 53+). */
function isExpoGoAndroidSkipNativeNotifications(): boolean {
  return Platform.OS === 'android' && isRunningInExpoGo();
}

const NOTIFICATION_PREFS_KEY = 'notificationSettings';

export type NotificationUserSettings = {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  showPreview: boolean;
};

const DEFAULT_NOTIFICATION_PREFS: NotificationUserSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  showPreview: true,
};

/** Matches Settings → Notifications (AsyncStorage JSON). */
export async function getNotificationUserSettings(): Promise<NotificationUserSettings> {
  try {
    const raw = await getAsyncStorage().getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationUserSettings>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

// Dynamic imports to prevent Expo Go errors during module load
let Notifications: any = null;
let Device: any = null;
let notificationModuleRef: any = null;

const loadNotificationModules = async () => {
  if (isExpoGoAndroidSkipNativeNotifications()) {
    try {
      if (!Device) {
        Device = await import('expo-device');
      }
    } catch (error) {
      debugLog('⚠️ Failed to load expo-device:', error);
    }
    return { Notifications: null, Device };
  }

  if (!Notifications || !Device) {
    try {
      Notifications = await import('expo-notifications');
      notificationModuleRef = Notifications;
      Device = await import('expo-device');
      
      // Respect Settings → Notifications for foreground delivery
      Notifications.setNotificationHandler({
        handleNotification: async () => {
          const prefs = await getNotificationUserSettings();
          if (!prefs.enabled) {
            return {
              shouldShowAlert: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
              shouldShowBanner: false,
              shouldShowList: false,
            };
          }
          // Android: native builder gates vibration on this flag (see ExpoNotificationBuilder.shouldVibrate).
          // Keep actual audio off via content `sound: false` when the user disables sound.
          const behaviorSoundGate =
            prefs.sound || (Platform.OS === 'android' && prefs.vibration);
          return {
            shouldShowAlert: prefs.showPreview,
            shouldPlaySound: behaviorSoundGate,
            shouldSetBadge: true,
            shouldShowBanner: prefs.showPreview,
            shouldShowList: prefs.showPreview,
          };
        },
      });
    } catch (error) {
      debugLog('⚠️ Failed to load notification modules:', error);
    }
  }
  return { Notifications, Device };
};

/** Android: channel sound is fixed at creation; use separate IDs per sound × vibration. */
function androidRateAlertChannelId(prefs: NotificationUserSettings): string {
  return `ratesnap-rate-${prefs.sound ? 's1' : 's0'}-${prefs.vibration ? 'v1' : 'v0'}`;
}

async function ensureAndroidRateAlertChannel(
  notificationModule: any,
  prefs: NotificationUserSettings
): Promise<string | undefined> {
  if (Platform.OS !== 'android' || !notificationModule?.setNotificationChannelAsync) {
    return undefined;
  }
  const channelId = androidRateAlertChannelId(prefs);
  const { AndroidImportance } = notificationModule;
  await notificationModule.setNotificationChannelAsync(channelId, {
    name: 'Rate alerts',
    importance: AndroidImportance.HIGH,
    sound: prefs.sound ? 'default' : null,
    enableVibrate: prefs.vibration,
    vibrationPattern: prefs.vibration ? [0, 500, 250, 500, 250, 500] : null,
  });
  return channelId;
}

function rateAlertNotificationContent(
  prefs: NotificationUserSettings,
  base: { title: string; body: string; data: Record<string, unknown> }
) {
  const mod = notificationModuleRef;
  return {
    ...base,
    sound: prefs.sound ? 'default' : false,
    ...(Platform.OS === 'ios' && !prefs.sound ? { interruptionLevel: 'passive' as const } : {}),
    ...(Platform.OS === 'android' && mod
      ? {
          priority: prefs.vibration
            ? mod.AndroidNotificationPriority.HIGH
            : mod.AndroidNotificationPriority.LOW,
          // Explicit pattern so native `contentAllowsVibration` is true (undefined omits vibration intent).
          vibrate: prefs.vibration ? [0, 500, 250, 500, 250, 500] : [],
        }
      : {}),
  };
}

export interface RateAlert {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetRate: number;
  direction: 'above' | 'below' | 'equals';
  isActive: boolean;
  lastChecked?: number;
  triggered?: boolean;
  message?: string;
}

export interface NotificationSchedule {
  id: string;
  rateId: string;
  triggerTime: number;
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken?: string;
  private scheduledNotifications: Map<string, string> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Skip notifications on web platform
      if (Platform.OS === 'web') {
        debugLog('🌐 Web platform detected - using browser notifications if available');
        return true;
      }

      // Load notification modules dynamically
      const { Notifications: notificationModule, Device: deviceModule } = await loadNotificationModules();

      if (isExpoGoAndroidSkipNativeNotifications()) {
        debugLog(
          '📱 Expo Go (Android): skipping expo-notifications — rate alerts use in-app dialogs; use a dev build for system notifications.'
        );
        return true;
      }

      if (!notificationModule || !deviceModule) {
        debugLog('⚠️ Notifications module not available - using safe mode');
        return false;
      }

      // Additional safety check
      if (!deviceModule.isDevice) {
        debugLog('📱 Notifications are not available on a device. Please use a physical device.');
        return false;
      }

      try {
        // Use local notification permissions (works in Expo Go)
        const { status: existingStatus } = await notificationModule.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await notificationModule.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          debugLog('❌ Notification permissions not granted - continuing with safe mode');
          return false; // Allow app to continue without notifications
        }

        debugLog('✅ Local notification permissions granted');
        return true;
      } catch (notifError) {
        console.error('❌ Notification permission API error - using safe mode:', notifError);
        return false; // Allow app to continue without notifications
      }
    } catch (error) {
      console.error('❌ Error requesting notification permissions - using safe mode:', error);
      return false; // Allow app to continue without notifications
    }
  }

  async getPushToken(): Promise<string | undefined> {
    try {
      // Skip push token generation on web platform
      if (Platform.OS === 'web') {
        debugLog('🌐 Web platform detected - push tokens not needed');
        return undefined;
      }

      // Load notification modules dynamically
      const { Notifications: notificationModule } = await loadNotificationModules();
      if (!notificationModule) {
        debugLog('⚠️ Notifications module not available');
        return undefined;
      }

      // Check if we're in Expo Go (SDK 53+ where push tokens are removed)
      try {
        // This will throw in Expo Go SDK 53+ when trying to get push tokens
        const token = (await notificationModule.getExpoPushTokenAsync()).data;
        this.expoPushToken = token;
        debugLog('📱 Expo push token obtained (development build):', token);
        return token;
      } catch (pushTokenError) {
        debugLog('📱 Expo Go detected or push tokens unavailable - using local notifications only');
        return undefined; // Return undefined instead of throwing
      }
    } catch (error) {
      debugLog('⚠️ Push token generation failed - continuing without push notifications:', error);
      return undefined; // Return undefined instead of throwing
    }
  }

  async scheduleRateAlert(alert: RateAlert): Promise<string | null> {
    try {
      if (!await this.requestPermissions()) {
        return null;
      }

      // Skip scheduling on web platform
      if (Platform.OS === 'web') {
        debugLog('🌐 Web platform detected - skipping scheduled alerts for mobile app');
        return null;
      }

      const prefs = await getNotificationUserSettings();
      if (!prefs.enabled) {
        debugLog('🔕 Notifications disabled in settings — skipping schedule');
        return null;
      }

      // Check if the alert should trigger immediately
      const shouldTrigger = await this.checkAlertTrigger(alert);
      
      if (shouldTrigger) {
        await this.sendImmediateAlert(alert);
        return null; // No need to schedule since it's triggered
      }

      if (!Notifications) {
        debugLog('📱 Native notification scheduling unavailable — skipping (Expo Go Android)');
        return null;
      }

      // Schedule periodic check (every hour)
      const triggerTime = Date.now() + (60 * 60 * 1000); // 1 hour from now
      const channelId = await ensureAndroidRateAlertChannel(Notifications, prefs);
      const trigger =
        Platform.OS === 'android' && channelId
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 60 * 60,
              repeats: true,
              channelId,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 60 * 60,
              repeats: true,
            };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: rateAlertNotificationContent(prefs, {
          title: '💰 Capital Alert',
          body: `Monitoring ${alert.fromCurrency} to ${alert.toCurrency}`,
          data: {
            type: 'rate_check',
            alertId: alert.id,
            rateId: alert.id,
          },
        }),
        trigger,
      });

      this.scheduledNotifications.set(alert.id, notificationId);
      debugLog(`🔔 Scheduled rate alert: ${alert.fromCurrency} → ${alert.toCurrency} (ID: ${notificationId})`);
      
      // Save the scheduled notification to local storage for persistence
      const scheduledData = await this.getScheduledNotifications();
      scheduledData[alert.id] = {
        id: notificationId,
        rateId: alert.id,
        triggerTime: triggerTime,
      };
      await getAsyncStorage().setItem('scheduledRateAlerts', JSON.stringify(scheduledData));

      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling rate alert:', error);
      return null;
    }
  }

  async cancelRateAlert(alertId: string): Promise<void> {
    try {
      const notificationId = this.scheduledNotifications.get(alertId);
      
      if (notificationId) {
        if (Notifications) {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
        this.scheduledNotifications.delete(alertId);
        debugLog(`🚫 Cancelled rate alert: ${alertId}`);
      }

      // Remove from storage
      const scheduledData = await this.getScheduledNotifications();
      delete scheduledData[alertId];
      await getAsyncStorage().setItem('scheduledRateAlerts', JSON.stringify(scheduledData));
    } catch (error) {
      console.error('❌ Error cancelling rate alert:', error);
    }
  }

  async sendImmediateAlert(alert: RateAlert): Promise<void> {
    try {
      if (!await this.requestPermissions()) {
        return;
      }

      // Skip immediate alerts on web platform
      if (Platform.OS === 'web') {
        debugLog('🌐 Web platform detected - skipping immediate alerts for mobile app');
        return;
      }

      const prefs = await getNotificationUserSettings();
      if (!prefs.enabled) {
        debugLog('🔕 Notifications disabled in settings — skipping alert');
        return;
      }

      const currentRate = await this.getCurrentRate(alert.fromCurrency, alert.toCurrency);
      const isTriggered = this.evaluateAlertTrigger(alert, currentRate);

      if (isTriggered) {
        const message = `🎯 ${alert.fromCurrency} → ${alert.toCurrency} is now ${currentRate.toFixed(4)}!`;

        if (!Notifications) {
          Alert.alert('🚀 Rate Alert Triggered!', message, [{ text: 'OK' }]);
          debugLog(`🚨 In-app alert (Expo Go Android): ${message}`);
        } else {
          const channelId = await ensureAndroidRateAlertChannel(Notifications, prefs);

          await Notifications.scheduleNotificationAsync({
            content: rateAlertNotificationContent(prefs, {
              title: '🚀 Rate Alert Triggered!',
              body: message,
              data: {
                type: 'rate_triggered',
                alertId: alert.id,
                fromCurrency: alert.fromCurrency,
                toCurrency: alert.toCurrency,
                currentRate: currentRate,
                targetRate: alert.targetRate,
                direction: alert.direction,
              },
            }),
            trigger:
              Platform.OS === 'android' && channelId ? { channelId } : null,
          });

          debugLog(`🚨 Alert sent: ${message}`);
        }
        
        // Mark alert as triggered
        const updatedAlert = { ...alert, triggered: true, message };
        await this.saveAlert(updatedAlert);
      }
    } catch (error) {
      console.error('❌ Error sending immediate alert:', error);
    }
  }

  private async checkAlertTrigger(alert: RateAlert): Promise<boolean> {
    try {
      const currentRate = await this.getCurrentRate(alert.fromCurrency, alert.toCurrency);
      return this.evaluateAlertTrigger(alert, currentRate);
    } catch (error) {
      console.error('❌ Error checking alert trigger:', error);
      return false;
    }
  }

  private evaluateAlertTrigger(alert: RateAlert, currentRate: number): boolean {
    const threshold = alert.targetRate;
    const tolerance = 0.0001; // Small tolerance for floating point comparison

    switch (alert.direction) {
      case 'above':
        return currentRate > threshold + tolerance;
      case 'below':
        return currentRate < threshold - tolerance;
      case 'equals':
        return Math.abs(currentRate - threshold) <= tolerance;
      default:
        return false;
    }
  }

  // Public method for testing
  public testEvaluateAlertTrigger(alert: RateAlert, currentRate: number): boolean {
    return this.evaluateAlertTrigger(alert, currentRate);
  }

  private async getCurrentRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      const cachedData = await getAsyncStorage().getItem('cachedExchangeRates');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        const fromRate = data.conversion_rates[fromCurrency];
        const toRate = data.conversion_rates[toCurrency];
        
        if (fromRate && toRate) {
          return toRate / fromRate;
        }
      }

      // Fallback to API if no cache
      // This would require the exchange rate service to be called here
      throw new Error('No cached rates available');
    } catch (error) {
      console.error('❌ Error getting current rate:', error);
      throw error;
    }
  }

  private async getScheduledNotifications(): Promise<{[key: string]: NotificationSchedule}> {
    try {
      const stored = await getAsyncStorage().getItem('scheduledRateAlerts');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error getting scheduled notifications:', error);
      return {};
    }
  }

  // Public method for testing
  public async testSaveAlert(alert: RateAlert): Promise<void> {
    return this.saveAlert(alert);
  }

  private async saveAlert(alert: RateAlert): Promise<void> {
    try {
      const alerts = await this.getSavedAlerts();
      alerts[alert.id] = alert;
      await getAsyncStorage().setItem('rateAlerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('❌ Error saving alert:', error);
    }
  }

  // Public method for testing
  public async testGetSavedAlerts(): Promise<{[key: string]: RateAlert}> {
    return this.getSavedAlerts();
  }

  private async getSavedAlerts(): Promise<{[key: string]: RateAlert}> {
    try {
      const stored = await getAsyncStorage().getItem('rateAlerts');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Error getting saved alerts:', error);
      return {};
    }
  }

  async setupNotificationListeners(): Promise<void> {
    try {
      // Skip setup on web platform
      if (Platform.OS === 'web') {
        debugLog('🌐 Web platform detected - skipping notification listeners');
        return;
      }

      // Load notification modules dynamically
      const { Notifications: notificationModule } = await loadNotificationModules();
      if (!notificationModule) {
        debugLog('⚠️ Notifications module not available for listeners');
        return;
      }

      // Handle notification received while app is in foreground
      const receivedSubscription = notificationModule.addNotificationReceivedListener((notification: any) => {
        try {
          debugLog('📱 Notification received:', notification);
          const data = notification.request.content.data as any;
          
          if (data?.type === 'rate_check') {
            this.handleBackgroundRateCheck(data.alertId);
          }
        } catch (listenerError) {
          console.error('❌ Error in notification received listener:', listenerError);
        }
      });

      // Handle notification tapped
      const responseSubscription = notificationModule.addNotificationResponseReceivedListener((response: any) => {
        try {
          debugLog('👆 Notification response:', response);
          const data = response.notification.request.content.data as any;
          
          if (data?.type === 'rate_triggered') {
            this.handleRateAlertTapped(data);
          }
        } catch (listenerError) {
          console.error('❌ Error in notification response listener:', listenerError);
        }
      });

      debugLog('✅ Notification listeners setup completed');
    } catch (error) {
      console.error('❌ Error setting up notification listeners:', error);
    }
  }

  private async handleBackgroundRateCheck(alertId: string): Promise<void> {
    try {
      const alerts = await this.getSavedAlerts();
      const alert = alerts[alertId];
      
      if (alert && alert.isActive) {
        await this.sendImmediateAlert(alert);
      }
    } catch (error) {
      console.error('❌ Error handling background rate check:', error);
    }
  }

  private async handleRateAlertTapped(data: any): Promise<void> {
    try {
      // You could navigate to specific screens here
      debugLog('🔗 Rate alert tapped:', data);
      
      // Update alert to mark it as triggered
      const alerts = await this.getSavedAlerts();
      if (alerts[data.alertId]) {
        alerts[data.alertId].triggered = false; // Reset for future alerts
        await getAsyncStorage().setItem('rateAlerts', JSON.stringify(alerts));
      }
    } catch (error) {
      console.error('❌ Error handling rate alert tap:', error);
    }
  }

  private openNotificationSettings(): void {
    // This would open device notification settings
    debugLog('📱 Opening notification settings...');
  }

  // Load all scheduled notifications on app startup
  async loadScheduledNotifications(): Promise<void> {
    try {
      // Skip loading on web platform
      if (Platform.OS === 'web') {
        debugLog('🌐 Web platform detected - skipping scheduled notifications for mobile app');
        return;
      }

      const scheduledData = await this.getScheduledNotifications();
      debugLog(`📋 Loaded ${Object.keys(scheduledData).length} scheduled notifications`);
      
      // Note: Unfortunately, we can't reschedule notifications after app restart
      // This is a limitation of Expo's notification system
      // Users will need to reschedule alerts after app restart
    } catch (error) {
      console.error('❌ Error loading scheduled notifications:', error);
    }
  }

  // Clean up all notifications
  async cleanup(): Promise<void> {
    try {
      if (Notifications) {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      this.scheduledNotifications.clear();
      debugLog('🧹 Cleaned up all notifications');
    } catch (error) {
      console.error('❌ Error cleaning up notifications:', error);
    }
  }

  // Get notification statistics
  async getNotificationStats(): Promise<{
    scheduledCount: number;
    activeAlerts: number;
    triggeredAlerts: number;
  }> {
    try {
      const scheduledData = await this.getScheduledNotifications();
      const alerts = await this.getSavedAlerts();
      
      const activeAlerts = Object.values(alerts).filter(alert => alert.isActive).length;
      const triggeredAlerts = Object.values(alerts).filter(alert => alert.triggered).length;
      
      return {
        scheduledCount: Object.keys(scheduledData).length,
        activeAlerts,
        triggeredAlerts,
      };
    } catch (error) {
      console.error('❌ Error getting notification stats:', error);
      return { scheduledCount: 0, activeAlerts: 0, triggeredAlerts: 0 };
    }
  }
}

export default NotificationService.getInstance();