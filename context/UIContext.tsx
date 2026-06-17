import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { RestaurantInfo, Notification } from '../types';
import { INITIAL_RESTAURANT_INFO } from '../constants';
import { generateId } from '../utils/formatters';
import { supabase } from '../services/supabase';

interface UIContextType {
  restaurantInfo: RestaurantInfo;
  updateRestaurantInfo: (updates: Partial<RestaurantInfo>) => Promise<void>;
  notifications: Array<Notification & { type: 'success' | 'error' | 'info' }>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeNotification: (id: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  refreshSettings: () => Promise<void>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within UIProvider");
  return context;
};

const SETTINGS_CACHE_KEY = 'db_settings_v2';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null; // expirado
    return data as T;
  } catch { return null; }
}

function writeCache(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>(() => {
    // Lê o cache imediatamente para exibição instantânea
    const cached = readCache<RestaurantInfo>(SETTINGS_CACHE_KEY);
    if (cached) return cached;
    // Fallback para o formato antigo sem TTL
    try {
      const old = localStorage.getItem('db_settings');
      return old ? JSON.parse(old) : INITIAL_RESTAURANT_INFO;
    } catch { return INITIAL_RESTAURANT_INFO; }
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Initial Data com cache TTL de 10 minutos
  const fetchSettings = useCallback(async (force = false) => {
    if (!supabase) return;

    if (!force) {
      const cached = readCache<RestaurantInfo>(SETTINGS_CACHE_KEY);
      if (cached) return; // Ainda válido, não consome bandwidth
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('id, name, phone, whatsappNumber, address, logo, banner, instagramUrl, facebookUrl, pixKey, pixKeyType, pixName, pixCity, businessHours, delivery, style, notice, adminUsername, adminPassword')
        .eq('id', 'info')
        .single();
      if (data && !error) {
        setRestaurantInfo(data as RestaurantInfo);
        writeCache(SETTINGS_CACHE_KEY, data);
      }
    } catch (err) {
      console.error("Settings fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]); // Chama apenas uma vez

  // Apply Colors
  useEffect(() => {
    if (!restaurantInfo?.style) return;
    const root = document.documentElement;
    const style = restaurantInfo.style;
    root.style.setProperty('--color-primary', style.primaryColor || '#DC2626');
    root.style.setProperty('--color-price', style.priceColor || '#DC2626');
    root.style.setProperty('--color-bg', style.backgroundColor || '#F9FAFB');
    root.style.setProperty('--color-card', style.cardColor || '#FFFFFF');
    root.style.setProperty('--color-text', style.textColor || '#111827');
  }, [restaurantInfo]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = generateId();
    setNotifications(prev => {
      const updated = [...prev, { id, message, type }];
      return updated.length > 3 ? updated.slice(updated.length - 3) : updated;
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const updateRestaurantInfo = useCallback(async (updates: Partial<RestaurantInfo>) => {
    const next = { ...restaurantInfo, ...updates };
    setRestaurantInfo(next);
    writeCache(SETTINGS_CACHE_KEY, next); // Atualiza cache local imediatamente
    
    if (supabase) {
      try {
        const { error } = await supabase.from('settings').upsert({ id: 'info', ...next });
        if (error) {
          notify('Erro ao salvar info: ' + error.message, 'error');
        } else {
          notify('Informações atualizadas!');
        }
      } catch (err) {
        notify('Erro ao salvar informações', 'error');
      }
    } else {
      localStorage.setItem('db_settings', JSON.stringify(next));
    }
  }, [restaurantInfo, notify]);

  return (
    <UIContext.Provider value={{
      restaurantInfo,
      updateRestaurantInfo,
      notifications,
      notify,
      removeNotification,
      isLoading,
      setIsLoading,
      refreshSettings: () => fetchSettings(true)
    }}>
      {children}
    </UIContext.Provider>
  );
};
