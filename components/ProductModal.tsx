import React, { useState } from 'react';
import { X, Minus, Plus, ShoppingBag, ChevronLeft, ChevronRight, Check, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, ProductOption, ProductOptionGroup } from '../types';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { formatCurrency, isRestaurantOpen } from '../utils/formatters';

interface ProductModalProps {
  item: MenuItem;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ item, onClose }) => {
  const { addToCart } = useCart();
  const { restaurantInfo } = useUI();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<{ [groupId: string]: ProductOption[] }>({});
  const [isAdded, setIsAdded] = useState(false);

  // ─── Conditional group visibility ───────────────────────────────────────────
  // A group with showOnlyWhenGroupId/showOnlyWhenOptionId is hidden until the
  // parent group has that specific option selected.
  const isGroupVisible = (group: ProductOptionGroup): boolean => {
    if (!group.showOnlyWhenGroupId || !group.showOnlyWhenOptionId) return true;
    const parentSelected = selectedOptions[group.showOnlyWhenGroupId] || [];
    return parentSelected.some(o => o.id === group.showOnlyWhenOptionId);
  };

  // ─── Extra cost guard for a group ───────────────────────────────────────────
  // Returns true if adding the given option would exceed the maxExtraCost cap.
  const wouldExceedMaxExtraCost = (group: ProductOptionGroup, option: ProductOption): boolean => {
    if (group.maxExtraCost === undefined) return false;
    const current = selectedOptions[group.id] || [];
    const alreadySelected = current.find(o => o.id === option.id);
    if (alreadySelected) return false; // toggling off is always allowed
    const currentExtraCost = current.reduce((sum, o) => sum + (o.price || 0), 0);
    return currentExtraCost + (option.price || 0) > group.maxExtraCost;
  };

  const handleOptionToggle = (groupId: string, option: ProductOption, max: number, isRadio: boolean, group: ProductOptionGroup) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      const isSelected = current.find(o => o.id === option.id);

      if (isSelected) {
        // If unchecking a parent option that controls a dependent group, clear the dependent group
        const dependentGroups = (item.optionGroups || []).filter(
          g => g.showOnlyWhenGroupId === groupId && g.showOnlyWhenOptionId === option.id
        );
        let next = { ...prev, [groupId]: current.filter(o => o.id !== option.id) };
        dependentGroups.forEach(dg => { next = { ...next, [dg.id]: [] }; });
        return next;
      } else {
        if (isRadio) {
          // Radio: replacing selection may hide dependent groups from old option
          const dependentGroups = (item.optionGroups || []).filter(
            g => g.showOnlyWhenGroupId === groupId
          );
          let next = { ...prev, [groupId]: [option] };
          dependentGroups.forEach(dg => { next = { ...next, [dg.id]: [] }; });
          return next;
        } else {
          if (current.length >= max) return prev;
          if (wouldExceedMaxExtraCost(group, option)) return prev;
          return { ...prev, [groupId]: [...current, option] };
        }
      }
    });
  };

  const handleOptionQuantityChange = (groupId: string, option: ProductOption, delta: number, maxGroup: number, group: ProductOptionGroup) => {
    setSelectedOptions(prev => {
      const current = prev[groupId] || [];
      const currentCount = current.filter(o => o.id === option.id).length;
      const totalInGroup = current.length;

      if (delta > 0) {
        if (totalInGroup >= maxGroup) return prev;
        if (wouldExceedMaxExtraCost(group, option)) return prev;
        return { ...prev, [groupId]: [...current, option] };
      } else {
        if (currentCount > 0) {
          const indexToRemove = current.findIndex(o => o.id === option.id);
          const newCurrent = [...current];
          if (indexToRemove !== -1) newCurrent.splice(indexToRemove, 1);
          return { ...prev, [groupId]: newCurrent };
        }
        return prev;
      }
    });
  };

  const validateSelection = () => {
    if (!item.optionGroups) return true;
    for (const group of item.optionGroups) {
      if (!isGroupVisible(group)) continue; // invisible groups are not required
      const availableOptionsInGroup = group.options.filter(o => o.available !== false);
      if (availableOptionsInGroup.length === 0 && group.required) continue;
      const selectedCount = (selectedOptions[group.id] || []).length;
      if (group.required && selectedCount < group.min) return false;
    }
    return true;
  };

  const getTotalPrice = () => {
    let addonsTotal = 0;
    if (item.optionGroups) {
      for (const group of item.optionGroups) {
        const selected = selectedOptions[group.id] || [];
        selected.forEach(opt => { addonsTotal += opt.price; });
      }
    }
    return (item.price + addonsTotal) * quantity;
  };

  const handleAddToCart = () => {
    if (validateSelection() && !isAdded) {
      setIsAdded(true);
      addToCart(item, quantity, selectedOptions);
      setTimeout(() => { onClose(); }, 800);
    }
  };

  const nextImage = () => {
    if (item.images.length > 1) setCurrentImageIndex(prev => (prev + 1) % item.images.length);
  };
  const prevImage = () => {
    if (item.images.length > 1) setCurrentImageIndex(prev => (prev - 1 + item.images.length) % item.images.length);
  };

  const isValid = validateSelection();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">

        <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors">
          <X size={20} />
        </button>

        <div className="h-64 relative bg-gray-100 shrink-0">
          <img src={item.images[currentImageIndex]} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
          {item.images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white text-gray-800"><ChevronLeft size={24} /></button>
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1 rounded-full shadow-sm hover:bg-white text-gray-800"><ChevronRight size={24} /></button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {item.images.map((_, idx) => (
                  <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{item.name}</h2>
            <p className="text-gray-500 text-sm">{item.description}</p>
            {item.price > 0 && <p className="text-primary font-bold text-xl mt-2">{formatCurrency(item.price)}</p>}
          </div>

          {item.optionGroups?.map(group => {
            const visible = isGroupVisible(group);
            const availableOptions = group.options.filter(opt => opt.available !== false);
            if (availableOptions.length === 0) return null;

            const currentGroupSelected = selectedOptions[group.id] || [];
            const currentExtraCost = currentGroupSelected.reduce((s, o) => s + (o.price || 0), 0);
            const budgetRemaining = group.maxExtraCost !== undefined
              ? group.maxExtraCost - currentExtraCost
              : null;

            return (
              <AnimatePresence key={group.id}>
                {visible && (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="flex justify-between items-start mb-3 bg-gray-50 p-3 rounded-xl">
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">{group.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(group.required === true || String(group.required) === 'true') ? 'Obrigatório' : 'Opcional'} •{' '}
                          {Number(group.max) === 1 ? 'Escolha 1' : `Escolha até ${group.max}`}
                        </p>
                        {/* Budget hint */}
                        {group.maxExtraCost !== undefined && (
                          <p className="text-xs mt-1 font-semibold" style={{ color: budgetRemaining === 0 ? '#ef4444' : '#f59e0b' }}>
                            {budgetRemaining === 0
                              ? '⚠️ Limite de adicionais atingido'
                              : `💰 Adicional máximo: ${formatCurrency(group.maxExtraCost)}`}
                          </p>
                        )}
                      </div>
                      {group.required && !(currentGroupSelected.length >= group.min) && (
                        <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full shrink-0 ml-2">Pendente</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {availableOptions.map(option => {
                        const isRadio = Number(group.max) === 1;
                        const optionCount = currentGroupSelected.filter(o => o.id === option.id).length;
                        const isSelected = optionCount > 0;
                        const isBlocked = !isSelected && !isRadio && wouldExceedMaxExtraCost(group, option);
                        const isMaxReached = !isSelected && !isRadio && currentGroupSelected.length >= group.max;
                        const isDisabled = isBlocked || isMaxReached;

                        if (isRadio) {
                          return (
                            <label
                              key={option.id}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-primary bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-gray-300'}`}>
                                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                                <span className={`text-sm ${isSelected ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{option.name}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-600">
                                {option.price > 0 ? (item.price === 0 ? formatCurrency(option.price) : `+${formatCurrency(option.price)}`) : 'Grátis'}
                              </span>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isSelected}
                                onChange={() => handleOptionToggle(group.id, option, group.max, true, group)}
                              />
                            </label>
                          );
                        } else {
                          return (
                            <div
                              key={option.id}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isSelected ? 'border-primary bg-red-50' :
                                isDisabled ? 'border-gray-100 bg-gray-50 opacity-60' :
                                'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${isSelected ? 'font-bold text-gray-900' : isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {option.name}
                                  </span>
                                  {isBlocked && (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                                      <Lock size={9} /> limite de preço
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-gray-500">
                                  {option.price > 0 ? `+${formatCurrency(option.price)}` : 'Grátis'}
                                </span>
                              </div>
                              <div className={`flex items-center gap-3 rounded-full p-1 shadow-sm border ${isDisabled && !isSelected ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
                                <button
                                  type="button"
                                  onClick={() => handleOptionQuantityChange(group.id, option, -1, group.max, group)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                                  disabled={optionCount === 0}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-bold w-4 text-center">{optionCount}</span>
                                <button
                                  type="button"
                                  onClick={() => handleOptionQuantityChange(group.id, option, 1, group.max, group)}
                                  className="w-7 h-7 flex items-center justify-center rounded-full text-primary hover:bg-red-50 disabled:opacity-30"
                                  disabled={isDisabled}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="font-bold text-gray-500 text-sm">Quantidade</span>
            <div className="flex items-center gap-4 bg-gray-100 rounded-full p-1">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600 disabled:opacity-50"><Minus size={16} /></button>
              <span className="font-bold w-4 text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm text-gray-600"><Plus size={16} /></button>
            </div>
          </div>

          {(() => {
            const openStatus = isRestaurantOpen(restaurantInfo);
            const canAdd = isValid && openStatus.isOpen && !isAdded;
            return (
              <button
                onClick={handleAddToCart}
                disabled={!canAdd}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                  isAdded ? 'bg-green-500 text-white active:scale-95'
                    : !openStatus.isOpen ? 'bg-gray-400 text-white cursor-not-allowed'
                    : isValid ? 'bg-primary text-white hover:bg-red-700 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={{
                  backgroundColor: isAdded ? '#22C55E' : !openStatus.isOpen ? '#9CA3AF' : isValid ? 'var(--color-primary)' : '#D1D5DB'
                }}
              >
                <AnimatePresence mode="wait">
                  {!openStatus.isOpen ? (
                    <motion.div key="closed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                      <span>Fechado no momento</span>
                    </motion.div>
                  ) : isAdded ? (
                    <motion.div key="check" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                      <Check size={24} strokeWidth={3} />
                      <span>Adicionado!</span>
                    </motion.div>
                  ) : (
                    <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <ShoppingBag size={20} />
                      <span>Adicionar • {formatCurrency(getTotalPrice())}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};