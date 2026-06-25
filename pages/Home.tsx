import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star, Clock, ChevronRight, Search } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { isRestaurantOpen } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { ImageEditable } from '../components/ui/ImageEditable';
import { ProductCard } from '../components/ProductCard';
import { Category, MenuItem } from '../types';

const Home = () => {
  const { restaurantInfo, updateRestaurantInfo } = useUI();
  const { isAdminMode } = useAuth();
  const { menuItems, categorias } = useProducts();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on selected category or show all highlights
  const displayedCategories = categorias.filter(c => c.active);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Restaurant Header Section */}
      <div className="relative h-48 w-full">
        <ImageEditable 
          src={restaurantInfo.banner} 
          alt="Banner" 
          onUpdate={(img) => updateRestaurantInfo({ banner: img })}
          className="w-full h-full object-cover"
          editable={false}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Restaurant Info Card */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col gap-3 border border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-white overflow-hidden bg-white shadow-md -mt-10">
               <ImageEditable 
                src={restaurantInfo.logo} 
                alt="Logo" 
                onUpdate={(img) => updateRestaurantInfo({ logo: img })}
                className="w-full h-full object-cover"
                editable={false}
              />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800">{restaurantInfo.name}</h1>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-yellow-600">4.8</span>
                <span className="mx-1">•</span>
                <span>Marmitaria</span>
                <span className="mx-1">•</span>
                <span>1.2km</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{restaurantInfo.businessHours || "10:30 - 14:30"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(() => {
                const openStatus = isRestaurantOpen(restaurantInfo);
                return openStatus.isOpen ? (
                  <span className="text-green-600 font-bold uppercase">Aberto</span>
                ) : (
                  <span className="text-red-500 font-bold uppercase">Fechado</span>
                );
              })()}
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* iFood-style Search Bar Padding */}
      <div className="px-4 mt-6">
        <div className="bg-gray-100 rounded-xl p-3 flex items-center gap-3 text-gray-500 focus-within:ring-2 focus-within:ring-primary focus-within:bg-white border border-transparent focus-within:border-primary transition-all shadow-sm">
          <Search size={20} className="shrink-0" />
          <input 
            type="text" 
            placeholder="O que você quer comer hoje?" 
            className="bg-transparent border-none outline-none w-full text-sm text-gray-800 placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* iFood-style Circular Categories */}
      <div className="mt-8">
        <div className="px-4 mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Categorias</h2>
          <span className="text-[11px] text-primary font-semibold flex items-center gap-1 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
            Toque para ver os itens!
          </span>
        </div>
        <div className="flex overflow-x-auto no-scrollbar px-4 gap-6 pb-4">
          {displayedCategories.map((cat, idx) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                className="flex flex-col items-center gap-2 min-w-[70px] transition-transform active:scale-90 focus:outline-none group"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="relative">
                  {/* Pulsing ring to attract attention */}
                  {(!selectedCategoryId && idx === 0) || cat.id === 'pratododia' ? (
                    <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-60" />
                  ) : null}
                  <div className={`w-16 h-16 rounded-full overflow-hidden border-[3px] transition-all duration-200 shadow-md ${
                    isSelected
                      ? 'border-primary scale-110 shadow-primary/30'
                      : cat.id === 'pratododia'
                        ? 'border-yellow-400 group-hover:border-yellow-500 group-hover:scale-105 shadow-yellow-100'
                        : 'border-gray-200 group-hover:border-primary/60 group-hover:scale-105'
                  }`}>
                    <img 
                      src={cat.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} 
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <span className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow">
                      ✓
                    </span>
                  )}
                </div>
                <span className={`text-[11px] text-center font-semibold leading-tight flex flex-col items-center gap-0.5 mt-1 ${
                  isSelected ? 'text-primary' : 'text-gray-600 group-hover:text-primary'
                }`}>
                  {cat.id === 'pratododia' && (
                    <span className="bg-yellow-400 text-yellow-900 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">Destaque</span>
                  )}
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured / Menu Sections */}
      <div className="mt-6 px-4 space-y-10 pb-20">
        {searchQuery.trim() ? (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-800">Resultados da Busca</h3>
            <div className="grid grid-cols-1 gap-4">
              {menuItems
                .filter(i => i.available && i.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              {menuItems.filter(i => i.available && i.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Nenhum produto encontrado.</p>
              )}
            </div>
          </div>
        ) : (
          displayedCategories
            .filter(cat => !selectedCategoryId || cat.id === selectedCategoryId)
            .map((cat) => {
              const items = menuItems.filter(i => i.categoryId === cat.id && i.available);
              if (items.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      {cat.name}
                      {cat.id === 'pratododia' && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-yellow-200">
                          ⭐ Destaque
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {items.map((item) => (
                      <ProductCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

export default Home;