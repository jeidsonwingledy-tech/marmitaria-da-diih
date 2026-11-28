import React, { useState, useMemo } from 'react';
import { 
  Power, 
  Search, 
  CheckCircle2, 
  XCircle, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  X, 
  Check, 
  AlertCircle,
  Sparkles,
  Layers,
  UtensilsCrossed,
  Filter,
  DollarSign
} from 'lucide-react';
import { useProducts } from '../../context/ProductContext';
import { useUI } from '../../context/UIContext';
import { MenuItem, ProductOption, ProductOptionGroup } from '../../types';
import { formatCurrency, generateId } from '../../utils/formatters';

interface OptionOccurrence {
  itemId: string;
  itemName: string;
  categoryName: string;
  groupId: string;
  groupTitle: string;
  option: ProductOption;
}

interface AggregatedOption {
  key: string;
  name: string;
  categoryType: 'feijao' | 'acompanhamento' | 'acrescimo' | 'mistura' | 'tamanho' | 'outro';
  categoryLabel: string;
  occurrences: OptionOccurrence[];
  totalCount: number;
  availableCount: number;
  allAvailable: boolean;
  noneAvailable: boolean;
  minPrice: number;
  maxPrice: number;
}

// Classifica o tipo de grupo / opção para organizar em categorias amigáveis
function detectCategoryType(groupTitle: string, optionName: string): { type: AggregatedOption['categoryType']; label: string } {
  const g = (groupTitle || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const o = (optionName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (g.includes('feijao') || o.includes('feijao')) {
    return { type: 'feijao', label: 'Tipo de Feijão' };
  }
  if (g.includes('acompanhamento') || g.includes('complemento') || o.includes('farofa') || o.includes('batata') || o.includes('polenta') || o.includes('mandioca') || o.includes('salada') || o.includes('arroz') || o.includes('vinagrete') || o.includes('pure')) {
    return { type: 'acompanhamento', label: 'Acompanhamentos' };
  }
  if (g.includes('acrescimo') || g.includes('adicional') || g.includes('extra') || o.includes('ovo') || o.includes('bacon') || o.includes('queijo') || o.includes('molho')) {
    return { type: 'acrescimo', label: 'Acréscimos & Extras' };
  }
  if (g.includes('proteina') || g.includes('carne') || g.includes('mistura') || g.includes('frango') || g.includes('bife') || g.includes('peixe')) {
    return { type: 'mistura', label: 'Carnes & Misturas' };
  }
  if (g.includes('tamanho') || g.includes('size')) {
    return { type: 'tamanho', label: 'Tamanhos' };
  }
  return { type: 'outro', label: 'Outras Opções' };
}

export const OpcoesGlobais: React.FC = () => {
  const { menuItems, categorias, updateMultipleMenuItems } = useProducts();
  const { notify } = useUI();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'todos' | 'feijao' | 'acompanhamento' | 'acrescimo' | 'mistura' | 'outro'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos' | 'parciais'>('todos');
  const [expandedOptionKey, setExpandedOptionKey] = useState<string | null>(null);

  // Armazena valores digitados em edição de preço global por opção (chave = agg.key)
  const [editingPrices, setEditingPrices] = useState<Record<string, number | string>>({});

  // Modal para adicionar nova opção em massa para múltiplos pratos
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState<number | ''>(0);
  const [targetGroupTitle, setTargetGroupTitle] = useState('Tipo de Feijão');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mapeia os nomes das categorias de prato
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categorias.forEach(c => map.set(c.id, c.name));
    return map;
  }, [categorias]);

  // Agrega todas as opções de todos os produtos do cardápio
  const aggregatedOptions = useMemo(() => {
    const map = new Map<string, AggregatedOption>();

    menuItems.forEach(item => {
      const catName = categoryNameMap.get(item.categoryId) || 'Geral';
      (item.optionGroups || []).forEach(group => {
        (group.options || []).forEach(opt => {
          const rawName = opt.name?.trim();
          if (!rawName) return;

          const { type, label } = detectCategoryType(group.title, rawName);
          // Chave composta pelo tipo de grupo e nome normalizado da opção
          const normalizedName = rawName.toLowerCase();
          const aggKey = `${type}::${normalizedName}`;

          const occurrence: OptionOccurrence = {
            itemId: item.id,
            itemName: item.name,
            categoryName: catName,
            groupId: group.id,
            groupTitle: group.title,
            option: opt
          };

          if (!map.has(aggKey)) {
            map.set(aggKey, {
              key: aggKey,
              name: rawName,
              categoryType: type,
              categoryLabel: label,
              occurrences: [occurrence],
              totalCount: 1,
              availableCount: opt.available !== false ? 1 : 0,
              allAvailable: opt.available !== false,
              noneAvailable: opt.available === false,
              minPrice: opt.price || 0,
              maxPrice: opt.price || 0
            });
          } else {
            const entry = map.get(aggKey)!;
            entry.occurrences.push(occurrence);
            entry.totalCount += 1;
            if (opt.available !== false) entry.availableCount += 1;
            entry.allAvailable = entry.availableCount === entry.totalCount;
            entry.noneAvailable = entry.availableCount === 0;
            entry.minPrice = Math.min(entry.minPrice, opt.price || 0);
            entry.maxPrice = Math.max(entry.maxPrice, opt.price || 0);
          }
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      // Ordenação: Feijões primeiro, depois Acompanhamentos, Acréscimos, Misturas, Outros
      const order: Record<string, number> = {
        feijao: 1,
        acompanhamento: 2,
        acrescimo: 3,
        mistura: 4,
        tamanho: 5,
        outro: 6
      };
      const diff = (order[a.categoryType] || 99) - (order[b.categoryType] || 99);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [menuItems, categoryNameMap]);

  // Filtra as opções agregadas com base na busca e nos filtros
  const filteredOptions = useMemo(() => {
    return aggregatedOptions.filter(agg => {
      if (selectedFilter !== 'todos' && agg.categoryType !== selectedFilter) {
        return false;
      }
      if (statusFilter === 'ativos' && !agg.allAvailable) return false;
      if (statusFilter === 'inativos' && !agg.noneAvailable) return false;
      if (statusFilter === 'parciais' && (agg.allAvailable || agg.noneAvailable)) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = agg.name.toLowerCase().includes(term);
        const matchCategory = agg.categoryLabel.toLowerCase().includes(term);
        const matchProduct = agg.occurrences.some(o => o.itemName.toLowerCase().includes(term));
        if (!matchName && !matchCategory && !matchProduct) return false;
      }

      return true;
    });
  }, [aggregatedOptions, selectedFilter, statusFilter, searchTerm]);

  // Contadores para os badges rápidos
  const stats = useMemo(() => {
    const totalDistinct = aggregatedOptions.length;
    const feijaoCount = aggregatedOptions.filter(o => o.categoryType === 'feijao').length;
    const acompCount = aggregatedOptions.filter(o => o.categoryType === 'acompanhamento').length;
    const acrescimoCount = aggregatedOptions.filter(o => o.categoryType === 'acrescimo').length;
    const misturaCount = aggregatedOptions.filter(o => o.categoryType === 'mistura').length;
    const allInactiveCount = aggregatedOptions.filter(o => o.noneAvailable).length;

    return { totalDistinct, feijaoCount, acompCount, acrescimoCount, misturaCount, allInactiveCount };
  }, [aggregatedOptions]);

  // ─── Ação Principal: Ativar ou Desativar uma Opção em TODOS os Pratos ───────────
  const handleToggleGlobalOption = async (agg: AggregatedOption, targetState?: boolean) => {
    const nextState = targetState !== undefined ? targetState : !agg.allAvailable;
    const affectedItemIds = new Set(agg.occurrences.map(o => o.itemId));

    // Monta a atualização para cada produto afetado
    const updatesList: { id: string; updates: Partial<MenuItem> }[] = [];

    menuItems.forEach(item => {
      if (!affectedItemIds.has(item.id)) return;

      let changed = false;
      const newOptionGroups = (item.optionGroups || []).map(group => {
        let groupChanged = false;
        const newOptions = (group.options || []).map(opt => {
          // Compara pelo nome normalizado e tipo de grupo compatível
          if (opt.name?.trim().toLowerCase() === agg.name.trim().toLowerCase()) {
            if (opt.available !== nextState) {
              groupChanged = true;
              return { ...opt, available: nextState };
            }
          }
          return opt;
        });

        if (groupChanged) {
          changed = true;
          return { ...group, options: newOptions };
        }
        return group;
      });

      if (changed) {
        updatesList.push({
          id: item.id,
          updates: { optionGroups: newOptionGroups }
        });
      }
    });

    if (updatesList.length === 0) return;

    try {
      await updateMultipleMenuItems(updatesList);
      notify(
        `${agg.name} foi ${nextState ? 'ATIVADO' : 'DESATIVADO'} em ${updatesList.length} prato(s)!`,
        nextState ? 'success' : 'info'
      );
    } catch (err) {
      console.error(err);
      notify('Erro ao atualizar opções em todos os pratos.', 'error');
    }
  };

  // ─── Ativar ou Desativar em Massa uma Categoria Inteira (Ex: todos os Feijões) ───
  const handleToggleCategoryInBulk = async (categoryType: AggregatedOption['categoryType'], targetState: boolean) => {
    const targetAggs = aggregatedOptions.filter(a => a.categoryType === categoryType);
    if (targetAggs.length === 0) return;

    const namesToUpdate = new Set(targetAggs.map(a => a.name.trim().toLowerCase()));
    const updatesList: { id: string; updates: Partial<MenuItem> }[] = [];

    menuItems.forEach(item => {
      let changed = false;
      const newOptionGroups = (item.optionGroups || []).map(group => {
        let groupChanged = false;
        const newOptions = (group.options || []).map(opt => {
          if (namesToUpdate.has(opt.name?.trim().toLowerCase())) {
            if (opt.available !== targetState) {
              groupChanged = true;
              return { ...opt, available: targetState };
            }
          }
          return opt;
        });

        if (groupChanged) {
          changed = true;
          return { ...group, options: newOptions };
        }
        return group;
      });

      if (changed) {
        updatesList.push({
          id: item.id,
          updates: { optionGroups: newOptionGroups }
        });
      }
    });

    if (updatesList.length === 0) {
      notify(`Todos os itens desta categoria já estão ${targetState ? 'ativos' : 'desativados'}.`, 'info');
      return;
    }

    try {
      await updateMultipleMenuItems(updatesList);
      notify(
        `Categoria atualizada: ${updatesList.length} pratos foram configurados como ${targetState ? 'ATIVOS' : 'DESATIVADOS'}!`,
        'success'
      );
    } catch (err) {
      console.error(err);
      notify('Erro na atualização em massa.', 'error');
    }
  };

  // ─── Toggle de uma Opção em um Prato Específico (dentro do detalhe expandido) ───
  const handleToggleSingleOccurrence = async (occurrence: OptionOccurrence) => {
    const item = menuItems.find(i => i.id === occurrence.itemId);
    if (!item) return;

    const currentOpt = occurrence.option;
    const nextState = !currentOpt.available;

    const newGroups = (item.optionGroups || []).map(group => {
      if (group.id !== occurrence.groupId) return group;
      return {
        ...group,
        options: group.options.map(o => o.id === currentOpt.id ? { ...o, available: nextState } : o)
      };
    });

    await updateMultipleMenuItems([{ id: item.id, updates: { optionGroups: newGroups } }]);
    notify(`${currentOpt.name} ${nextState ? 'ativado' : 'desativado'} em ${item.name}`, 'info');
  };

  // ─── Atualizar o Preço de uma Opção em TODOS os Pratos ──────────────────────────
  const handleUpdateGlobalPrice = async (agg: AggregatedOption) => {
    const rawVal = editingPrices[agg.key];
    const newPrice = rawVal !== undefined ? parseFloat(String(rawVal).replace(',', '.')) : agg.minPrice;

    if (isNaN(newPrice) || newPrice < 0) {
      notify('Digite um valor válido para o preço.', 'error');
      return;
    }

    const affectedItemIds = new Set(agg.occurrences.map(o => o.itemId));
    const updatesList: { id: string; updates: Partial<MenuItem> }[] = [];

    menuItems.forEach(item => {
      if (!affectedItemIds.has(item.id)) return;

      let changed = false;
      const newOptionGroups = (item.optionGroups || []).map(group => {
        let groupChanged = false;
        const newOptions = (group.options || []).map(opt => {
          if (opt.name?.trim().toLowerCase() === agg.name.trim().toLowerCase()) {
            if (Number(opt.price) !== newPrice) {
              groupChanged = true;
              return { ...opt, price: newPrice };
            }
          }
          return opt;
        });

        if (groupChanged) {
          changed = true;
          return { ...group, options: newOptions };
        }
        return group;
      });

      if (changed) {
        updatesList.push({
          id: item.id,
          updates: { optionGroups: newOptionGroups }
        });
      }
    });

    if (updatesList.length === 0) {
      notify(`O valor já é ${formatCurrency(newPrice)} em todos os pratos.`, 'info');
      return;
    }

    try {
      await updateMultipleMenuItems(updatesList);
      notify(`Preço de "${agg.name}" atualizado para ${formatCurrency(newPrice)} em ${updatesList.length} prato(s)!`, 'success');
      setEditingPrices(prev => {
        const next = { ...prev };
        delete next[agg.key];
        return next;
      });
    } catch (err) {
      console.error(err);
      notify('Erro ao atualizar preço nos pratos.', 'error');
    }
  };

  // ─── Atualizar o Preço de uma Opção em um Prato Específico ─────────────────────
  const handleUpdateSingleOccurrencePrice = async (occurrence: OptionOccurrence, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    if (Number(occurrence.option.price) === newPrice) return;

    const item = menuItems.find(i => i.id === occurrence.itemId);
    if (!item) return;

    const newGroups = (item.optionGroups || []).map(group => {
      if (group.id !== occurrence.groupId) return group;
      return {
        ...group,
        options: group.options.map(o => o.id === occurrence.option.id ? { ...o, price: newPrice } : o)
      };
    });

    try {
      await updateMultipleMenuItems([{ id: item.id, updates: { optionGroups: newGroups } }]);
      notify(`Preço de "${occurrence.option.name}" no prato ${item.name} alterado para ${formatCurrency(newPrice)}!`, 'success');
    } catch (err) {
      console.error(err);
      notify('Erro ao atualizar preço do prato.', 'error');
    }
  };

  // ─── Abrir Modal para Adicionar Opção em Massa ──────────────────────────────────
  const handleOpenAddModal = (defaultCategory = 'Tipo de Feijão') => {
    setTargetGroupTitle(defaultCategory);
    setNewOptionName('');
    setNewOptionPrice(0);
    // Pré-seleciona todos os pratos que têm categorias de marmitas/refeição
    const defaultIds = menuItems
      .filter(i => {
        const catName = (categoryNameMap.get(i.categoryId) || '').toLowerCase();
        return catName.includes('marmita') || catName.includes('prato') || catName.includes('fit') || catName.includes('monte');
      })
      .map(i => i.id);

    setSelectedProductIds(defaultIds.length > 0 ? defaultIds : menuItems.map(i => i.id));
    setShowAddModal(true);
  };

  // ─── Salvar Nova Opção em Múltiplos Pratos de uma Vez ──────────────────────────
  const handleSaveNewOptionBulk = async () => {
    const trimmedName = newOptionName.trim();
    if (!trimmedName) return notify('Digite o nome da nova opção.', 'error');
    if (selectedProductIds.length === 0) return notify('Selecione pelo menos um prato.', 'error');

    setIsSubmitting(true);
    const updatesList: { id: string; updates: Partial<MenuItem> }[] = [];
    const price = typeof newOptionPrice === 'number' ? newOptionPrice : 0;

    menuItems.forEach(item => {
      if (!selectedProductIds.includes(item.id)) return;

      const optionGroups = [...(item.optionGroups || [])];
      // Procura se já existe um grupo com título parecido
      const existingGroupIndex = optionGroups.findIndex(g => 
        g.title?.toLowerCase().trim() === targetGroupTitle.toLowerCase().trim()
      );

      const newOpt: ProductOption = {
        id: generateId(),
        name: trimmedName,
        price,
        available: true
      };

      if (existingGroupIndex >= 0) {
        // Se a opção já existir no grupo, apenas atualiza ou ignora
        const group = optionGroups[existingGroupIndex];
        const alreadyHasOpt = group.options.some(o => o.name?.toLowerCase().trim() === trimmedName.toLowerCase());
        if (!alreadyHasOpt) {
          optionGroups[existingGroupIndex] = {
            ...group,
            options: [...group.options, newOpt]
          };
        }
      } else {
        // Cria um novo grupo neste prato
        const isFeijao = targetGroupTitle.toLowerCase().includes('feijao');
        const newGroup: ProductOptionGroup = {
          id: generateId(),
          title: targetGroupTitle,
          required: isFeijao,
          min: isFeijao ? 1 : 0,
          max: isFeijao ? 1 : 3,
          options: [newOpt]
        };
        optionGroups.push(newGroup);
      }

      updatesList.push({
        id: item.id,
        updates: { optionGroups }
      });
    });

    try {
      await updateMultipleMenuItems(updatesList);
      notify(`"${trimmedName}" adicionado em ${updatesList.length} prato(s) com sucesso!`, 'success');
      setShowAddModal(false);
      setNewOptionName('');
    } catch (err) {
      console.error(err);
      notify('Erro ao adicionar opção aos pratos.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Header & Introdução ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1">
                <Sparkles size={12} /> Controle Centralizado
              </span>
              <h2 className="text-xl font-black">Acréscimos, Feijões & Opções</h2>
            </div>
            <button
              onClick={() => handleOpenAddModal()}
              className="bg-white text-red-600 hover:bg-red-50 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
            >
              <Plus size={15} /> Nova Opção Global
            </button>
          </div>
          <p className="text-xs text-red-100 mt-1 max-w-xl">
            Ative ou desative qualquer feijão, complemento, acréscimo ou mistura com <strong>1 clique</strong> em todos os pratos do seu cardápio de uma vez só!
          </p>
        </div>
        {/* Efeito decorativo de fundo */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
          <SlidersHorizontal size={140} />
        </div>
      </div>

      {/* ─── Cards Rápidos de Ação por Categoria ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
              🫘 Feijões
            </span>
            <span className="text-[10px] bg-red-50 text-primary font-black px-1.5 py-0.5 rounded-full">
              {stats.feijaoCount} tipos
            </span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => handleToggleCategoryInBulk('feijao', true)}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1 rounded-lg border border-green-200"
              title="Ativar todos os tipos de feijão em todos os pratos"
            >
              Ativar Todos
            </button>
            <button
              onClick={() => handleToggleCategoryInBulk('feijao', false)}
              className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-bold py-1 rounded-lg border border-gray-200"
              title="Desativar todos os tipos de feijão em todos os pratos"
            >
              Pausar Todos
            </button>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
              🥗 Acompanhamentos
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-600 font-black px-1.5 py-0.5 rounded-full">
              {stats.acompCount} tipos
            </span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => handleToggleCategoryInBulk('acompanhamento', true)}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1 rounded-lg border border-green-200"
            >
              Ativar Todos
            </button>
            <button
              onClick={() => handleToggleCategoryInBulk('acompanhamento', false)}
              className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-bold py-1 rounded-lg border border-gray-200"
            >
              Pausar Todos
            </button>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
              ➕ Acréscimos
            </span>
            <span className="text-[10px] bg-amber-50 text-amber-700 font-black px-1.5 py-0.5 rounded-full">
              {stats.acrescimoCount} tipos
            </span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => handleToggleCategoryInBulk('acrescimo', true)}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1 rounded-lg border border-green-200"
            >
              Ativar Todos
            </button>
            <button
              onClick={() => handleToggleCategoryInBulk('acrescimo', false)}
              className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-bold py-1 rounded-lg border border-gray-200"
            >
              Pausar Todos
            </button>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
              🥩 Misturas / Carnes
            </span>
            <span className="text-[10px] bg-purple-50 text-purple-700 font-black px-1.5 py-0.5 rounded-full">
              {stats.misturaCount} tipos
            </span>
          </div>
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => handleToggleCategoryInBulk('mistura', true)}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] font-bold py-1 rounded-lg border border-green-200"
            >
              Ativar Todos
            </button>
            <button
              onClick={() => handleToggleCategoryInBulk('mistura', false)}
              className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-[10px] font-bold py-1 rounded-lg border border-gray-200"
            >
              Pausar Todos
            </button>
          </div>
        </div>
      </div>

      {/* ─── Barra de Busca & Filtros Rápidos ───────────────────────── */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-100 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar opção (ex: feijão preto, farofa, batata, ovo, vinagrete)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categorias Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-semibold">
          <button
            onClick={() => setSelectedFilter('todos')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
              selectedFilter === 'todos' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({stats.totalDistinct})
          </button>
          <button
            onClick={() => setSelectedFilter('feijao')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedFilter === 'feijao' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🫘 Feijões ({stats.feijaoCount})
          </button>
          <button
            onClick={() => setSelectedFilter('acompanhamento')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedFilter === 'acompanhamento' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🥗 Acompanhamentos ({stats.acompCount})
          </button>
          <button
            onClick={() => setSelectedFilter('acrescimo')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedFilter === 'acrescimo' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ➕ Acréscimos ({stats.acrescimoCount})
          </button>
          <button
            onClick={() => setSelectedFilter('mistura')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1 ${
              selectedFilter === 'mistura' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🥩 Carnes / Misturas ({stats.misturaCount})
          </button>

          {/* Filtro por Status */}
          <div className="h-4 w-[1px] bg-gray-200 mx-1 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 outline-none"
          >
            <option value="todos">Status: Todos</option>
            <option value="ativos">Somente 100% Ativos</option>
            <option value="inativos">Somente Pausados/Esgotados</option>
            <option value="parciais">Parcialmente Ativos</option>
          </select>
        </div>
      </div>

      {/* ─── Lista de Opções Agregadas ──────────────────────────────── */}
      {filteredOptions.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
          <UtensilsCrossed size={36} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-bold text-gray-600">Nenhuma opção encontrada</p>
          <p className="text-xs text-gray-400 mt-1">Tente mudar o termo de busca ou o filtro acima.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOptions.map(agg => {
            const isExpanded = expandedOptionKey === agg.key;
            const isAllActive = agg.allAvailable;
            const isAllInactive = agg.noneAvailable;
            const isPartial = !isAllActive && !isAllInactive;

            return (
              <div
                key={agg.key}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs ${
                  isAllInactive 
                    ? 'border-gray-200 bg-gray-50/70 opacity-80' 
                    : isPartial
                    ? 'border-amber-200'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {/* Linha Principal do Item */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900 leading-tight">
                        {agg.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                        {agg.categoryLabel}
                      </span>

                      {/* Badge de Preço */}
                      <span className="text-xs font-semibold text-gray-500">
                        {agg.minPrice === 0 && agg.maxPrice === 0 ? (
                          <span className="text-green-600 font-bold">Grátis / Incluso</span>
                        ) : agg.minPrice === agg.maxPrice ? (
                          `+${formatCurrency(agg.minPrice)}`
                        ) : (
                          `+${formatCurrency(agg.minPrice)} ~ ${formatCurrency(agg.maxPrice)}`
                        )}
                      </span>
                    </div>

                    {/* Status de Presença nos Pratos */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isAllActive
                            ? 'bg-green-100 text-green-700'
                            : isAllInactive
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isAllActive && <CheckCircle2 size={12} />}
                        {isAllInactive && <XCircle size={12} />}
                        {isPartial && <AlertCircle size={12} />}
                        {isAllActive
                          ? `Ativo em todos os ${agg.totalCount} prato(s)`
                          : isAllInactive
                          ? `Pausado / Esgotado em todos (${agg.totalCount} pratos)`
                          : `Ativo em ${agg.availableCount} de ${agg.totalCount} pratos`}
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpandedOptionKey(isExpanded ? null : agg.key)}
                        className="text-[11px] font-semibold text-gray-500 hover:text-primary flex items-center gap-0.5 ml-1 transition-colors"
                      >
                        {isExpanded ? 'Ocultar pratos' : `Ver ${agg.totalCount} prato(s)`}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>

                    {/* ─── Campo de Edição do Valor em TODOS os Pratos ─── */}
                    <div className="flex items-center gap-1.5 mt-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-fit flex-wrap">
                      <span className="text-[11px] font-bold text-gray-600 flex items-center gap-0.5">
                        <DollarSign size={12} className="text-primary" /> Valor:
                      </span>
                      <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2 py-0.5 focus-within:border-primary">
                        <span className="text-[11px] text-gray-400 font-bold mr-1">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={editingPrices[agg.key] !== undefined ? editingPrices[agg.key] : agg.minPrice}
                          onChange={e => setEditingPrices(prev => ({ ...prev, [agg.key]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleUpdateGlobalPrice(agg);
                          }}
                          className="w-16 text-xs font-bold text-gray-800 outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateGlobalPrice(agg)}
                        className="bg-primary hover:bg-red-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
                        title="Salvar este valor em todos os pratos onde essa opção existe"
                      >
                        <Check size={12} /> Salvar Valor
                      </button>
                    </div>
                  </div>

                  {/* ── O SUPER TOGGLE GLOBAL ── */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleGlobalOption(agg)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer ${
                        isAllActive
                          ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-100'
                          : isAllInactive
                          ? 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      title={isAllActive ? 'Desativar de todos os pratos' : 'Ativar em todos os pratos'}
                    >
                      <Power size={14} />
                      <span className="hidden sm:inline">
                        {isAllActive ? 'Ativo em Todos' : isAllInactive ? 'Desativado' : 'Ativar em Todos'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* ── Detalhes Expandidos (Pratos Onde Esta Opção Aparece) ── */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-3.5 space-y-2 rounded-b-2xl animate-in slide-in-from-top-1">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-bold px-1">
                      <span>Pratos onde "{agg.name}" está cadastrado:</span>
                      <span className="text-[10px] text-gray-400">Você também pode alterar individualmente</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {agg.occurrences.map((occ, idx) => (
                        <div
                          key={`${occ.itemId}-${idx}`}
                          className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800 truncate leading-tight">
                              {occ.itemName}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {occ.categoryName} • Grupo: <span className="font-semibold text-gray-600">{occ.groupTitle}</span>
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-bold text-gray-400">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                key={`${occ.itemId}-${occ.option.id}-${occ.option.price}`}
                                defaultValue={occ.option.price !== undefined ? occ.option.price : 0}
                                onBlur={(e) => handleUpdateSingleOccurrencePrice(occ, parseFloat(e.target.value) || 0)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="w-16 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs font-bold text-gray-800 outline-none focus:border-primary"
                                title="Altere o valor e clique fora ou dê Enter para salvar neste prato"
                              />
                              <span className="text-[9px] text-gray-400">(neste prato)</span>
                            </div>
                          </div>

                          {/* Toggle Individual no Prato */}
                          <button
                            type="button"
                            onClick={() => handleToggleSingleOccurrence(occ)}
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              occ.option.available !== false
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={occ.option.available !== false ? 'Desativar neste prato' : 'Ativar neste prato'}
                          >
                            <Power size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal para Criar Nova Opção em Múltiplos Pratos ─────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-gray-800 text-lg">Adicionar Nova Opção Global</h3>
                <p className="text-xs text-gray-500">Adicione uma opção a vários pratos de uma única vez</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase">Nome da Opção</label>
                <input
                  type="text"
                  placeholder="Ex: Feijão Branco, Farofa de Bacon, Batata Rústica..."
                  value={newOptionName}
                  onChange={e => setNewOptionName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Preço Adicional (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newOptionPrice}
                    onChange={e => setNewOptionPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">0 = Incluso no prato</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Grupo de Destino</label>
                  <select
                    value={targetGroupTitle}
                    onChange={e => setTargetGroupTitle(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mt-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold"
                  >
                    <option value="Tipo de Feijão">Tipo de Feijão</option>
                    <option value="Acompanhamentos">Acompanhamentos</option>
                    <option value="Acréscimos">Acréscimos</option>
                    <option value="Escolha as Proteínas">Misturas / Proteínas</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase">
                    Aplicar nos seguintes pratos ({selectedProductIds.length}/{menuItems.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProductIds.length === menuItems.length) {
                        setSelectedProductIds([]);
                      } else {
                        setSelectedProductIds(menuItems.map(i => i.id));
                      }
                    }}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    {selectedProductIds.length === menuItems.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  {menuItems.map(item => {
                    const isChecked = selectedProductIds.includes(item.id);
                    const catName = categoryNameMap.get(item.categoryId) || '';
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                          isChecked ? 'bg-red-50 text-gray-900 font-bold border border-red-200' : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedProductIds(prev => 
                                prev.includes(item.id) 
                                  ? prev.filter(id => id !== item.id) 
                                  : [...prev, item.id]
                              );
                            }}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{catName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveNewOptionBulk}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-red-700 text-white text-sm font-bold shadow-md shadow-red-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Check size={16} /> Salvar em Todos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpcoesGlobais;
