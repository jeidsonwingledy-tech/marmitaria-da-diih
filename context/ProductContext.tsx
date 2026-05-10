import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MenuItem, Category } from '../types';
import { INITIAL_MENU, INITIAL_CATEGORIAS } from '../constants';
import { supabase } from '../services/supabase';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { generateId } from '../utils/formatters';

const PRODUCTS_CACHE_KEY = 'db_menuItems_v3';
const CATS_CACHE_KEY = 'db_categorias_v3';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data as T;
  } catch { return null; }
}

function writeCache(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function bustProductsCache() {
  localStorage.removeItem(PRODUCTS_CACHE_KEY);
  localStorage.removeItem(CATS_CACHE_KEY);
}

interface ProductContextType {
  menuItems: MenuItem[];
  categorias: Category[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  removeMenuItem: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  isLoadingProducts: boolean;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProducts must be used within ProductProvider");
  return context;
};

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { notify } = useUI();
  const { isAdminMode } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const cached = readCache<MenuItem[]>(PRODUCTS_CACHE_KEY);
    if (cached) return cached;
    try { const old = localStorage.getItem('db_menuItems'); return old ? JSON.parse(old) : INITIAL_MENU; } catch { return INITIAL_MENU; }
  });
  const [categorias, setCategorias] = useState<Category[]>(() => {
    const cached = readCache<Category[]>(CATS_CACHE_KEY);
    if (cached) return cached;
    try { const old = localStorage.getItem('db_categorias'); return old ? JSON.parse(old) : INITIAL_CATEGORIAS; } catch { return INITIAL_CATEGORIAS; }
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    if (!supabase) return;

    if (!force) {
      const cachedItems = readCache<MenuItem[]>(PRODUCTS_CACHE_KEY);
      const cachedCats = readCache<Category[]>(CATS_CACHE_KEY);
      if (cachedItems && cachedCats) return; // Cache válido, sem consumo de bandwidth
    }

    setIsLoadingProducts(true);
    try {
      const [catsRes, itemsRes] = await Promise.all([
        supabase.from('categorias').select('id, name, active, image'),
        supabase.from('menuItems').select('id, categoryId, name, description, price, available, images, optionGroups')
      ]);

      if (catsRes.data) {
        setCategorias(catsRes.data as Category[]);
        writeCache(CATS_CACHE_KEY, catsRes.data);
      }
      if (itemsRes.data) {
        setMenuItems(itemsRes.data as MenuItem[]);
        writeCache(PRODUCTS_CACHE_KEY, itemsRes.data);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    // Apenas a 1ª carga, lendo cache se existir
    fetchData();
  }, [fetchData]);

  // Realtime removido completamente conforme solicitado (economia de banda/consumo)

  const addCategory = useCallback(async (name: string) => {
    const newItem = { name, active: true };
    if (supabase) {
      const { data, error } = await supabase.from('categorias').insert(newItem).select('id, name, active, image').single();
      if (error) {
        notify('Erro: ' + error.message, 'error');
      } else if (data) {
        setCategorias(prev => {
          const next = [...prev, data as Category];
          writeCache(CATS_CACHE_KEY, next);
          return next;
        });
        notify('Categoria criada!');
      }
    } else {
      setCategorias(prev => {
        const next = [...prev, { id: generateId(), ...newItem }];
        writeCache(CATS_CACHE_KEY, next);
        return next;
      });
    }
  }, [notify]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    setCategorias(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      writeCache(CATS_CACHE_KEY, next);
      return next;
    });
    if (supabase) {
      const { id: _, ...rest } = updates as any;
      await supabase.from('categorias').update(rest).eq('id', id);
    }
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    if (menuItems.some(i => i.categoryId === id)) {
      notify('Não é possível excluir categoria com produtos.', 'error');
      return;
    }
    setCategorias(prev => {
      const next = prev.filter(c => c.id !== id);
      writeCache(CATS_CACHE_KEY, next);
      return next;
    });
    if (supabase) {
      await supabase.from('categorias').delete().eq('id', id);
    }
  }, [menuItems, notify]);

  const addMenuItem = useCallback(async (item: Omit<MenuItem, 'id'>) => {
    if (supabase) {
      const { data, error } = await supabase.from('menuItems').insert(item).select('id, categoryId, name, description, price, available, images, optionGroups').single();
      if (error) {
        notify('Erro: ' + error.message, 'error');
      } else if (data) {
        setMenuItems(prev => {
          const next = [...prev, data as MenuItem];
          writeCache(PRODUCTS_CACHE_KEY, next);
          return next;
        });
        notify('Produto criado!');
      }
    } else {
      setMenuItems(prev => {
        const next = [...prev, { id: generateId(), ...item }];
        writeCache(PRODUCTS_CACHE_KEY, next);
        return next;
      });
    }
  }, [notify]);

  const updateMenuItem = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, ...updates } : i);
      writeCache(PRODUCTS_CACHE_KEY, next); // Atualiza cache com novo valor
      return next;
    });
    if (supabase) {
      const { id: _, ...rest } = updates as any;
      await supabase.from('menuItems').update(rest).eq('id', id);
    }
  }, []);

  const removeMenuItem = useCallback(async (id: string) => {
    setMenuItems(prev => {
      const next = prev.filter(i => i.id !== id);
      writeCache(PRODUCTS_CACHE_KEY, next);
      return next;
    });
    if (supabase) {
      await supabase.from('menuItems').delete().eq('id', id);
    }
  }, []);

  return (
    <ProductContext.Provider value={{
      menuItems,
      categorias,
      addMenuItem,
      updateMenuItem,
      removeMenuItem,
      addCategory,
      updateCategory,
      removeCategory,
      isLoadingProducts,
      refreshProducts: fetchData
    }}>
      {children}
    </ProductContext.Provider>
  );
};
