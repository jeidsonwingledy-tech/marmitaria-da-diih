import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Order } from '../types';
import { supabase } from '../services/supabase';
import { useUI } from './UIContext';
import { useAuth } from './AuthContext';
import { generateId } from '../utils/formatters';

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<string>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  clearOrders: () => Promise<void>;
  isLoadingOrders: boolean;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used within OrderProvider");
  return context;
};

export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { notify } = useUI();
  const { isAdminMode } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('db_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Fetch and Realtime Subscriptions
  const fetchOrders = useCallback(async () => {
    if (!supabase || !isAdminMode) return; // Clientes nunca buscam pedidos

    setIsLoadingOrders(true);
    try {
      const { data } = await supabase.from('orders').select('id, customerName, items, total, status, createdAt, paymentMethod, address, neighborhood, number, changeFor, notes, needCutlery, deliveryFee').order('createdAt', { ascending: false }).limit(50);
      if (data) {
        setOrders(data as Order[]);
        localStorage.setItem('db_orders', JSON.stringify(data));
      }
    } catch (err) {
      console.error("Order Fetch Error:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isAdminMode]);

  useEffect(() => {
    // Pedidos só são carregados quando o admin faz login
    if (isAdminMode) fetchOrders();
  }, [isAdminMode, fetchOrders]);

  // Realtime removido para não consumir tráfego contínuo

  const addOrder = useCallback(async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> => {
    if (supabase) {
      const { data, error } = await supabase.from('orders').insert({
        ...orderData,
        status: 'pending',
        createdAt: new Date().toISOString()
      }).select().single();

      if (error) throw new Error(error.message);
      return data.id;
    }

    const newOrder: Order = {
      ...orderData,
      id: generateId(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setOrders(prev => [newOrder, ...prev]);
    return newOrder.id;
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (supabase) {
      await supabase.from('orders').update({ status }).eq('id', id);
      notify(`Status do pedido atualizado!`);
    }
  }, [notify]);

  const clearOrders = useCallback(async () => {
    if (window.confirm("Apagar todos os pedidos?")) {
      setOrders([]);
      if (supabase) {
        await supabase.from('orders').delete().neq('id', '0');
      } else {
        localStorage.removeItem('db_orders');
      }
      notify('Pedidos apagados!');
    }
  }, [notify]);

  return (
    <OrderContext.Provider value={{
      orders,
      addOrder,
      updateOrderStatus,
      clearOrders,
      isLoadingOrders,
      refreshOrders: fetchOrders
    }}>
      {children}
    </OrderContext.Provider>
  );
};
