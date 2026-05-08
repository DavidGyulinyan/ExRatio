import { useState, useEffect, useCallback } from 'react';
import { UserDataService } from '@/lib/userDataService';
import { useAuth } from '@/contexts/AuthContext';
import { getAsyncStorage } from '@/lib/storage';

export interface UseSavedRatesReturn {
  savedRates: any[];
  loading: boolean;
  error: string | null;
  saveRate: (fromCurrency: string, toCurrency: string, rate: number) => Promise<boolean>;
  deleteRate: (id: string) => Promise<boolean>;
  deleteAllRates: () => Promise<boolean>;
  refreshRates: () => Promise<void>;
}

export interface UseRateAlertsReturn {
  rateAlerts: any[];
  loading: boolean;
  error: string | null;
  createAlert: (fromCurrency: string, toCurrency: string, targetRate: number, condition: 'above' | 'below') => Promise<boolean>;
  updateAlert: (id: string, updates: any) => Promise<boolean>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
}

export interface UseConverterHistoryReturn {
  converterHistory: any[];
  loading: boolean;
  error: string | null;
  saveConversion: (fromCurrency: string, amount: number, targetCurrencies: any[], results: any) => Promise<boolean>;
  deleteConversion: (id: string) => Promise<boolean>;
  refreshHistory: () => Promise<void>;
}

export interface UseCalculatorHistoryReturn {
  calculatorHistory: any[];
  loading: boolean;
  error: string | null;
  saveCalculation: (expression: string, result: number, type?: string, metadata?: any) => Promise<boolean>;
  deleteCalculation: (id: string) => Promise<boolean>;
  clearAllCalculations: () => Promise<boolean>;
  refreshHistory: () => Promise<void>;
}

export interface UsePickedRatesReturn {
  pickedRates: any[];
  loading: boolean;
  error: string | null;
  trackRate: (fromCurrency: string, toCurrency: string, rate: number, type?: 'viewed' | 'copied' | 'converted' | 'calculated', context?: any) => Promise<boolean>;
  deletePickedRate: (id: string) => Promise<boolean>;
  refreshPickedRates: () => Promise<void>;
}

// Hook for managing saved rates
export function useSavedRates(): UseSavedRatesReturn {
  const { user } = useAuth();
  const [savedRates, setSavedRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const SAVED_RATES_CACHE_KEY = "savedRates.cache.v1";
  const SAVED_RATES_CACHE_TS_KEY = "savedRates.cache.ts.v1";
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  const refreshRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Always load from local storage first - check both possible keys
      const storage = getAsyncStorage();
      let localRatesData = await storage.getItem('savedRates');
      if (!localRatesData) {
        localRatesData = await storage.getItem('saved_rates'); // Check alternative key
      }

      let localRates: any[] = [];
      if (localRatesData) {
        try {
          const parsed = JSON.parse(localRatesData);
          // Convert local storage format to database format for consistency
          localRates = parsed.map((rate: any, index: number) => ({
            id: rate.id || `local-${index}`,
            from_currency: rate.fromCurrency || rate.from_currency,
            to_currency: rate.toCurrency || rate.to_currency,
            rate: rate.rate,
            created_at: rate.timestamp ? new Date(rate.timestamp).toISOString() : new Date().toISOString(),
            updated_at: rate.timestamp ? new Date(rate.timestamp).toISOString() : new Date().toISOString()
          }));
        } catch (parseError) {
          console.error('Error parsing local rates data:', parseError);
          localRates = [];
        }
      }

      if (user) {
        // Authenticated user - use only database data
        try {
          const dbRates = await UserDataService.getSavedRates();
          setSavedRates(dbRates);
          try {
            await storage.setItem(SAVED_RATES_CACHE_KEY, JSON.stringify(dbRates ?? []));
            await storage.setItem(SAVED_RATES_CACHE_TS_KEY, String(Date.now()));
          } catch {
            // ignore cache write errors
          }
        } catch (dbError) {
          // If database fails, show empty list (no fallback to local storage)
          console.warn('Database load failed for authenticated user:', dbError);
          setSavedRates([]);
        }
      } else {
        // Non-authenticated user - use only local storage
        setSavedRates(localRates);
        try {
          await storage.setItem(SAVED_RATES_CACHE_KEY, JSON.stringify(localRates ?? []));
          await storage.setItem(SAVED_RATES_CACHE_TS_KEY, String(Date.now()));
        } catch {
          // ignore cache write errors
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch saved rates');
      setSavedRates([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveRate = useCallback(async (fromCurrency: string, toCurrency: string, rate: number): Promise<boolean> => {
    try {
      if (user) {
        // Authenticated user - save to database
        const newRate = await UserDataService.saveRate(fromCurrency, toCurrency, rate);
        if (newRate) {
          setSavedRates(prev => [newRate, ...prev]);
          return true;
        }
        return false;
      } else {
        // Non-authenticated user - save to local storage
        const storage = getAsyncStorage();
        const currentRates = await storage.getItem('savedRates');
        const ratesArray = currentRates ? JSON.parse(currentRates) : [];

        const newLocalRate = {
          id: `local-${Date.now()}`,
          fromCurrency,
          toCurrency,
          rate,
          timestamp: Date.now()
        };

        const updatedRates = [newLocalRate, ...ratesArray].slice(0, 10); // Keep only 10 most recent
        await storage.setItem('savedRates', JSON.stringify(updatedRates));
        try {
          await storage.setItem(SAVED_RATES_CACHE_KEY, JSON.stringify(updatedRates ?? []));
          await storage.setItem(SAVED_RATES_CACHE_TS_KEY, String(Date.now()));
        } catch {
          // ignore cache write errors
        }

        // Update local state with formatted data
        const formattedRate = {
          id: newLocalRate.id,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          rate: rate,
          created_at: new Date(newLocalRate.timestamp).toISOString(),
          updated_at: new Date(newLocalRate.timestamp).toISOString()
        };

        setSavedRates(prev => [formattedRate, ...prev.slice(0, 9)]); // Keep only 10
        return true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rate');
      return false;
    }
  }, [user]);

  const deleteRate = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (user) {
        // Authenticated user - delete from database
        const success = await UserDataService.deleteSavedRate(id);
        if (success) {
          setSavedRates(prev => prev.filter(rate => rate.id !== id));
          return true;
        }
        return false;
      } else {
        // Non-authenticated user - delete from local storage
        const storage = getAsyncStorage();
        const currentRates = await storage.getItem('savedRates');
        if (currentRates) {
          const ratesArray = JSON.parse(currentRates);
          const updatedRates = ratesArray.filter((rate: any) => rate.id !== id);
          await storage.setItem('savedRates', JSON.stringify(updatedRates));
          try {
            await storage.setItem(SAVED_RATES_CACHE_KEY, JSON.stringify(updatedRates ?? []));
            await storage.setItem(SAVED_RATES_CACHE_TS_KEY, String(Date.now()));
          } catch {
            // ignore cache write errors
          }
          setSavedRates(prev => prev.filter(rate => rate.id !== id));
          return true;
        }
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rate');
      return false;
    }
  }, [user]);

  const deleteAllRates = useCallback(async (): Promise<boolean> => {
    try {
      if (user) {
        // Authenticated user - delete all from database
        const success = await UserDataService.deleteAllSavedRates();
        if (success) {
          setSavedRates([]);
          return true;
        }
        return false;
      } else {
        // Non-authenticated user - clear local storage
        const storage = getAsyncStorage();
        await storage.setItem('savedRates', JSON.stringify([]));
        try {
          await storage.setItem(SAVED_RATES_CACHE_KEY, JSON.stringify([]));
          await storage.setItem(SAVED_RATES_CACHE_TS_KEY, String(Date.now()));
        } catch {
          // ignore cache write errors
        }
        setSavedRates([]);
        return true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete all rates');
      return false;
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Load cached rates first, then refresh only if stale.
      try {
        const storage = getAsyncStorage();
        const [raw, tsRaw] = await Promise.all([
          storage.getItem(SAVED_RATES_CACHE_KEY),
          storage.getItem(SAVED_RATES_CACHE_TS_KEY),
        ]);
        if (!alive) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setSavedRates(parsed);
              setLoading(false);
            }
          } catch {
            // ignore parse errors
          }
        }

        const ts = tsRaw ? Number(tsRaw) : 0;
        const stale = !ts || !Number.isFinite(ts) || Date.now() - ts > CACHE_TTL_MS;
        if (stale) void refreshRates();
      } catch {
        void refreshRates();
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshRates]);

  return {
    savedRates,
    loading,
    error,
    saveRate,
    deleteRate,
    deleteAllRates,
    refreshRates
  };
}

// Hook for managing rate alerts
export function useRateAlerts(): UseRateAlertsReturn {
  const { user } = useAuth();
  const [rateAlerts, setRateAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ALERTS_CACHE_KEY = "rateAlerts.cache.v1";
  const ALERTS_CACHE_TS_KEY = "rateAlerts.cache.ts.v1";
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  const refreshAlerts = useCallback(async () => {
    if (!user) {
      setRateAlerts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const alerts = await UserDataService.getRateAlerts();
      setRateAlerts(alerts);
      try {
        const storage = getAsyncStorage();
        await storage.setItem(ALERTS_CACHE_KEY, JSON.stringify(alerts ?? []));
        await storage.setItem(ALERTS_CACHE_TS_KEY, String(Date.now()));
      } catch {
        // ignore cache write errors
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rate alerts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createAlert = useCallback(async (
    fromCurrency: string,
    toCurrency: string,
    targetRate: number,
    condition: 'above' | 'below'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const newAlert = await UserDataService.createRateAlert(fromCurrency, toCurrency, targetRate, condition);
      if (newAlert) {
        setRateAlerts(prev => [newAlert, ...prev]);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rate alert');
      return false;
    }
  }, [user]);

  const updateAlert = useCallback(async (id: string, updates: any): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await UserDataService.updateRateAlert(id, updates);
      if (success) {
        setRateAlerts(prev => prev.map(alert => 
          alert.id === id ? { ...alert, ...updates } : alert
        ));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate alert');
      return false;
    }
  }, [user]);

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await UserDataService.deleteRateAlert(id);
      if (success) {
        setRateAlerts(prev => prev.filter(alert => alert.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rate alert');
      return false;
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Load cached alerts first so opening the modal doesn't always fetch.
      try {
        const storage = getAsyncStorage();
        const [raw, tsRaw] = await Promise.all([
          storage.getItem(ALERTS_CACHE_KEY),
          storage.getItem(ALERTS_CACHE_TS_KEY),
        ]);
        if (!alive) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setRateAlerts(parsed);
              setLoading(false);
            }
          } catch {
            // ignore parse errors
          }
        }

        const ts = tsRaw ? Number(tsRaw) : 0;
        const stale = !ts || !Number.isFinite(ts) || Date.now() - ts > CACHE_TTL_MS;
        // Only auto-refresh if cache is stale (avoid refetch on every open).
        if (user && stale) {
          void refreshAlerts();
        } else if (!user) {
          setLoading(false);
        }
      } catch {
        // If cache read fails, fall back to one refresh for signed-in users.
        if (user) void refreshAlerts();
        else setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshAlerts]);

  return {
    rateAlerts,
    loading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts
  };
}

// Hook for managing converter history
export function useConverterHistory(): UseConverterHistoryReturn {
  const { user } = useAuth();
  const [converterHistory, setConverterHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    if (!user) {
      setConverterHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const history = await UserDataService.getConverterHistory();
      setConverterHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch converter history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveConversion = useCallback(async (
    fromCurrency: string,
    amount: number,
    targetCurrencies: any[],
    results: any
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const savedRecord = await UserDataService.saveConverterHistory(fromCurrency, amount, targetCurrencies, results);
      if (savedRecord) {
        setConverterHistory(prev => {
          // Replace existing record for this user, or add if not exists
          const existingIndex = prev.findIndex(record => record.user_id === user.id);
          if (existingIndex >= 0) {
            // Update existing record
            const updated = [...prev];
            updated[existingIndex] = savedRecord;
            return updated;
          } else {
            // Add new record
            return [savedRecord, ...prev];
          }
        });
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversion');
      return false;
    }
  }, [user]);

  const deleteConversion = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await UserDataService.deleteConverterHistory(id);
      if (success) {
        setConverterHistory(prev => prev.filter(record => record.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete conversion');
      return false;
    }
  }, [user]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  return {
    converterHistory,
    loading,
    error,
    saveConversion,
    deleteConversion,
    refreshHistory
  };
}

// Hook for managing calculator history
export function useCalculatorHistory(): UseCalculatorHistoryReturn {
  const { user } = useAuth();
  const [calculatorHistory, setCalculatorHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    if (!user) {
      setCalculatorHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const history = await UserDataService.getCalculatorHistory();
      setCalculatorHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calculator history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveCalculation = useCallback(async (
    expression: string,
    result: number,
    type: string = 'basic',
    metadata: any = null
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const newRecord = await UserDataService.saveCalculatorHistory(expression, result, type, metadata);
      if (newRecord) {
        setCalculatorHistory(prev => [newRecord, ...prev]);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save calculation');
      return false;
    }
  }, [user]);

  const deleteCalculation = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await UserDataService.deleteCalculatorHistory(id);
      if (success) {
        setCalculatorHistory(prev => prev.filter(record => record.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete calculation');
      return false;
    }
  }, [user]);

  const clearAllCalculations = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await UserDataService.clearAllCalculatorHistory();
      if (success) {
        setCalculatorHistory([]);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all calculations');
      return false;
    }
  }, [user]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  return {
    calculatorHistory,
    loading,
    error,
    saveCalculation,
    deleteCalculation,
    clearAllCalculations,
    refreshHistory
  };
}

// Hook for managing picked rates
export function usePickedRates(): UsePickedRatesReturn {
  const { user } = useAuth();
  const [pickedRates, setPickedRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPickedRates = useCallback(async () => {
    if (!user) {
      setPickedRates([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const rates = await UserDataService.getPickedRates();
      setPickedRates(rates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch picked rates');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const trackRate = useCallback(async (
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    type: 'viewed' | 'copied' | 'converted' | 'calculated' = 'viewed',
    context: any = null
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const newRecord = await UserDataService.trackPickedRate(fromCurrency, toCurrency, rate, type, context);
      if (newRecord) {
        setPickedRates(prev => {
          const updated = [newRecord, ...prev];
          // Keep only the most recent 20 items
          return updated.slice(0, 20);
        });
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track picked rate');
      return false;
    }
  }, [user]);

  const deletePickedRate = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await UserDataService.deletePickedRate(id);
      if (success) {
        setPickedRates(prev => prev.filter(rate => rate.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete picked rate');
      return false;
    }
  }, [user]);

  useEffect(() => {
    refreshPickedRates();
  }, [refreshPickedRates]);

  return {
    pickedRates,
    loading,
    error,
    trackRate,
    deletePickedRate,
    refreshPickedRates
  };
}

// Combined hook for all user data
export function useUserData() {
  const { user } = useAuth();
  const savedRates = useSavedRates();
  const rateAlerts = useRateAlerts();
  const converterHistory = useConverterHistory();
  const calculatorHistory = useCalculatorHistory();
  const pickedRates = usePickedRates();

  const clearAllData = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await UserDataService.clearAllUserData();
      if (success) {
        // Refresh all data
        await Promise.all([
          savedRates.refreshRates(),
          rateAlerts.refreshAlerts(),
          converterHistory.refreshHistory(),
          calculatorHistory.refreshHistory(),
          pickedRates.refreshPickedRates()
        ]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error clearing all user data:', err);
      return false;
    }
  }, [savedRates, rateAlerts, converterHistory, calculatorHistory, pickedRates, user]);

  return {
    savedRates,
    rateAlerts,
    converterHistory,
    calculatorHistory,
    pickedRates,
    clearAllData
  };
}