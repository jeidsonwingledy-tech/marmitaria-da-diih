import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MenuItem, Category } from '../types';
import { INITIAL_MENU, INITIAL_CATEGORIAS } from '../constants';
import { supabase } from '../services/supabase';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { generateId } from '../utils/formatters';

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
    const saved = localStorage.getItem('db_menuItems');
    return saved ? JSON.parse(saved) : INITIAL_MENU;
  });
  const [categorias, setCategorias] = useState<Category[]>(() => {
    const saved = localStorage.getItem('db_categorias');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIAS;
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    if (!supabase) return;
    
    // Verifica se já temos dados salvos e não ignora o cache
    const cachedCats = localStorage.getItem('db_categorias');
    const cachedItems = localStorage.getItem('db_menuItems');
    if (!force && cachedCats && cachedItems) {
      return; 
    }

    setIsLoadingProducts(true);
    try {
      const [catsRes, itemsRes] = await Promise.all([
        supabase.from('categorias').select('id, name, active, image'),
        supabase.from('menuItems').select('id, categoryId, name, description, price, available, images, optionGroups')
      ]);

      if (catsRes.data) {
        setCategorias(catsRes.data as Category[]);
        localStorage.setItem('db_categorias', JSON.stringify(catsRes.data));
      }
      if (itemsRes.data) {
        setMenuItems(itemsRes.data as MenuItem[]);
        localStorage.setItem('db_menuItems', JSON.stringify(itemsRes.data));
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
          localStorage.setItem('db_categorias', JSON.stringify(next));
          return next;
        });
        notify('Categoria criada!');
      }
    } else {
      setCategorias(prev => {
        const next = [...prev, { id: generateId(), ...newItem }];
        localStorage.setItem('db_categorias', JSON.stringify(next));
        return next;
      });
    }
  }, [notify]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    setCategorias(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
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
    setCategorias(prev => prev.filter(c => c.id !== id));
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
          localStorage.setItem('db_menuItems', JSON.stringify(next));
          return next;
        });
        notify('Produto criado!');
      }
    } else {
      setMenuItems(prev => {
        const next = [...prev, { id: generateId(), ...item }];
        localStorage.setItem('db_menuItems', JSON.stringify(next));
        return next;
      });
    }
  }, [notify]);

  const updateMenuItem = useCallback(async (id: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    if (supabase) {
      const { id: _, ...rest } = updates as any;
      await supabase.from('menuItems').update(rest).eq('id', id);
    }
  }, []);

  const removeMenuItem = useCallback(async (id: string) => {
    setMenuItems(prev => prev.filter(i => i.id !== id));
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
      refreshProducts: () => fetchData(true)
    }}>
      {children}
    </ProductContext.Provider>
  );
};
