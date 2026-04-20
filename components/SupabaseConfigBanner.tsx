import React from 'react';
import { isSupabaseConfigured } from '../services/supabase';

const SupabaseConfigBanner: React.FC = () => {
  if (isSupabaseConfigured) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
      <p className="text-yellow-800 text-xs font-medium">
        ⚠️ Modo Offline — Supabase não configurado. Os dados são salvos localmente.
      </p>
    </div>
  );
};

export default SupabaseConfigBanner;
