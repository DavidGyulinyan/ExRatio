import { UserDataService, RateAlert } from './userDataService';
import notificationService from './notificationService';
import { getAsyncStorage } from './storage';

const RATE_ALERT_DEBUG_LOGS = false;
function debugLog(...args: any[]) {
  if (!RATE_ALERT_DEBUG_LOGS) return;
  // eslint-disable-next-line no-console
  console.log(...args);
}

class AlertCheckerService {
  private static instance: AlertCheckerService;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isChecking = false;

  static getInstance(): AlertCheckerService {
    if (!AlertCheckerService.instance) {
      AlertCheckerService.instance = new AlertCheckerService();
    }
    return AlertCheckerService.instance;
  }

  async startChecking(intervalMinutes: number = 60): Promise<void> {
    if (this.checkInterval) {
      debugLog('🔔 Alert checker already running');
      return;
    }

    debugLog(`🔔 Starting alert checker with ${intervalMinutes} minute intervals`);

    // Check immediately on start
    await this.checkAlerts();

    // Set up periodic checking
    this.checkInterval = setInterval(async () => {
      await this.checkAlerts();
    }, intervalMinutes * 60 * 1000);
  }

  async stopChecking(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      debugLog('🔔 Alert checker stopped');
    }
  }

  private async checkAlerts(): Promise<void> {
    if (this.isChecking) {
      debugLog('🔔 Alert check already in progress, skipping');
      return;
    }

    this.isChecking = true;

    try {
      debugLog('🔔 Checking rate alerts...');

      // Get all active alerts that haven't been notified yet
      const alerts = await UserDataService.getRateAlerts();
      const activeAlerts = alerts.filter(alert => alert.is_active && !alert.notified);

      if (activeAlerts.length === 0) {
        debugLog('🔔 No active alerts to check');
        return;
      }

      debugLog(`🔔 Checking ${activeAlerts.length} active alerts`);

      // Get current exchange rates
      const cachedRates = await this.getCurrentRates();

      for (const alert of activeAlerts) {
        try {
          await this.checkSingleAlert(alert, cachedRates);
        } catch (error) {
          console.error(`❌ Error checking alert ${alert.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Error in alert checking:', error);
    } finally {
      this.isChecking = false;
    }
  }

  private async checkSingleAlert(alert: RateAlert, cachedRates: any): Promise<void> {
    // Double-check that alert hasn't been notified already (extra safeguard)
    if (alert.notified) {
      debugLog(`⚠️ Alert ${alert.id} already notified, skipping`);
      return;
    }

    const currentRate = this.getRateForAlert(alert, cachedRates);

    if (currentRate === null) {
      debugLog(`⚠️ No rate data available for ${alert.from_currency}/${alert.to_currency}`);
      return;
    }

    const isTriggered = this.evaluateAlertTrigger(alert, currentRate);

    if (isTriggered) {
      debugLog(
        `🚨 Alert triggered: ${alert.from_currency} → ${alert.to_currency} (${currentRate.toFixed(4)} ${alert.condition} ${alert.target_rate})`
      );

      // Send notification
      await this.sendAlertNotification(alert, currentRate);

      // Mark alert as notified and inactive with retry logic
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const success = await UserDataService.updateRateAlert(alert.id, {
            notified: true,
            is_active: false
          });
          if (success) {
            debugLog(`✅ Alert ${alert.id} marked as notified and deactivated (attempt ${retryCount + 1})`);
            break;
          } else {
            console.error(`❌ Failed to mark alert ${alert.id} as notified and deactivated (attempt ${retryCount + 1})`);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
          }
        } catch (error) {
          console.error(`❌ Error marking alert ${alert.id} as notified and deactivated (attempt ${retryCount + 1}):`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      if (retryCount >= maxRetries) {
        console.error(`❌ Failed to mark alert ${alert.id} as notified after ${maxRetries} attempts`);
      }
    }
  }

  private async getCurrentRates(): Promise<any> {
    try {
      const storage = getAsyncStorage();
      const cachedData = await storage.getItem('cachedExchangeRates');
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (error) {
      console.error('❌ Error getting cached rates:', error);
    }
    return null;
  }

  private getRateForAlert(alert: RateAlert, cachedRates: any): number | null {
    if (!cachedRates?.conversion_rates) {
      return null;
    }

    const fromRate = cachedRates.conversion_rates[alert.from_currency];
    const toRate = cachedRates.conversion_rates[alert.to_currency];

    if (!fromRate || !toRate) {
      return null;
    }

    // Calculate the exchange rate from from_currency to to_currency
    return toRate / fromRate;
  }

  private evaluateAlertTrigger(alert: RateAlert, currentRate: number): boolean {
    const threshold = alert.target_rate;
    const tolerance = 0.0001; // Small tolerance for floating point comparison

    switch (alert.condition) {
      case 'above':
        return currentRate > threshold + tolerance;
      case 'below':
        return currentRate < threshold - tolerance;
      default:
        return false;
    }
  }

  private async sendAlertNotification(alert: RateAlert, currentRate: number): Promise<void> {
    try {
      const message = `${alert.from_currency} → ${alert.to_currency} is now ${currentRate.toFixed(4)}!`;

      // Create a notification-compatible alert object
      const notificationAlert = {
        id: alert.id,
        fromCurrency: alert.from_currency,
        toCurrency: alert.to_currency,
        targetRate: alert.target_rate,
        direction: alert.condition,
        isActive: alert.is_active,
        triggered: true,
        message: message
      };

      await notificationService.sendImmediateAlert(notificationAlert);
    } catch (error) {
      console.error('❌ Error sending alert notification:', error);
    }
  }

  // Public method to manually trigger alert checking (for testing)
  async checkAlertsNow(): Promise<void> {
    await this.checkAlerts();
  }

  // Debug method to check a specific alert
  async debugAlert(alertId: string): Promise<void> {
    try {
      debugLog(`🔍 Debugging alert: ${alertId}`);

      const alerts = await UserDataService.getRateAlerts();
      const alert = alerts.find(a => a.id === alertId);

      if (!alert) {
        debugLog(`❌ Alert ${alertId} not found`);
        return;
      }

      debugLog(`📋 Alert details:`, {
        id: alert.id,
        from_currency: alert.from_currency,
        to_currency: alert.to_currency,
        target_rate: alert.target_rate,
        condition: alert.condition,
        is_active: alert.is_active,
        notified: alert.notified
      });

      // Check if alert should be processed
      if (!alert.is_active) {
        debugLog(`⚠️ Alert is not active`);
        return;
      }

      if (alert.notified) {
        debugLog(`⚠️ Alert has already been notified`);
        return;
      }

      // Get current rates
      const cachedRates = await this.getCurrentRates();
      if (!cachedRates) {
        debugLog(`❌ No cached rates available`);
        return;
      }

      const currentRate = this.getRateForAlert(alert, cachedRates);
      debugLog(`💱 Current rate for ${alert.from_currency}/${alert.to_currency}: ${currentRate}`);

      if (currentRate === null) {
        debugLog(`❌ Could not calculate rate for ${alert.from_currency}/${alert.to_currency}`);
        return;
      }

      const isTriggered = this.evaluateAlertTrigger(alert, currentRate);
      debugLog(`🎯 Alert evaluation: ${currentRate.toFixed(4)} ${alert.condition} ${alert.target_rate} = ${isTriggered}`);

      if (isTriggered) {
        debugLog(`🚨 Alert should trigger!`);
      } else {
        debugLog(`✅ Alert condition not met yet`);
      }

    } catch (error) {
      console.error(`❌ Error debugging alert ${alertId}:`, error);
    }
  }

  // Get status of the alert checker
  getStatus(): { isRunning: boolean; isChecking: boolean } {
    return {
      isRunning: this.checkInterval !== null,
      isChecking: this.isChecking
    };
  }

  // Get all alerts for debugging
  async getAllAlertsForDebug(): Promise<RateAlert[]> {
    try {
      return await UserDataService.getRateAlerts();
    } catch (error) {
      console.error('❌ Error getting alerts for debug:', error);
      return [];
    }
  }
}

export default AlertCheckerService.getInstance();