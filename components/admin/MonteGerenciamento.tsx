import React, { useState } from 'react';
import { Plus, Trash2, Power, Edit3, Check, X, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { MenuItem, ProductOption } from '../../types';
import { useProducts } from '../../context/ProductContext';
import { useUI } from '../../context/UIContext';
import { ImageEditable } from '../ui/ImageEditable';
import { formatCurrency, generateId } from '../../utils/formatters';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface MixtureOption extends ProductOption {
  // inherited: id, name, price, available
}

// ──────────────────────────────────────────────────────────────
// Inline editable text cell
// ──────────────────────────────────────────────────────────────
const InlineEdit: React.FC<{
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
}> = ({ value, onChange, type = 'text', className = '', placeholder }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    step={type === 'number' ? '0.01' : undefined}
    min={type === 'number' ? '0' : undefined}
    className={`border-b border-dashed border-gray-300 focus:border-primary outline-none bg-transparent text-sm ${className}`}
  />
);

// ──────────────────────────────────────────────────────────────
// Row for a single mixture option inside the table
// ──────────────────────────────────────────────────────────────
const MixtureRow: React.FC<{
  option: MixtureOption;
  groupId: string;
  monteItemId: string;
  onUpdate: (groupId: string, optId: string, field: keyof MixtureOption, val: any) => void;
  onDelete: (groupId: string, optId: string) => void;
}> = ({ option, groupId, monteItemId, onUpdate, onDelete }) => (
  <div className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${option.available ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
    {/* Name */}
    <input
      className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-primary min-w-0"
      value={option.name}
      onChange={e => onUpdate(groupId, option.id, 'name', e.target.value)}
      placeholder="Nome da mistura"
    />
    {/* Price */}
    <div className="flex items-center gap-1 shrink-0">
      <span className="text-xs text-gray-400">+R$</span>
      <input
        type="number"
        step="0.01"
        min="0"
        className="w-14 text-sm text-right bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-primary"
        value={option.price}
        onChange={e => onUpdate(groupId, option.id, 'price', parseFloat(e.target.value) || 0)}
      />
    </div>
    {/* Toggle available */}
    <button
      type="button"
      onClick={() => onUpdate(groupId, option.id, 'available', !option.available)}
      title={option.available ? 'Desativar' : 'Ativar'}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${option.available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
    >
      <Power size={14} />
    </button>
    {/* Delete */}
    <button
      type="button"
      onClick={() => onDelete(groupId, option.id)}
      className="w-8 h-8 rounded-full bg-red-50 text-red-400 hover:text-red-600 flex items-center justify-center shrink-0"
    >
      <Trash2 size={14} />
    </button>
  </div>
);

// ──────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────
const MONTE_CAT_ID = 'montemarmita';

const MonteGerenciamento: React.FC = () => {
  const { menuItems, addMenuItem, updateMenuItem, removeMenuItem, categorias } = useProducts();
  const { notify } = useUI();

  // All items in this category
  const monteItems = menuItems.filter(i => i.categoryId === MONTE_CAT_ID);

  // Expanded accordion
  const [expandedId, setExpandedId] = useState<string | null>(monteItems[0]?.id ?? null);

  // Draft state per item for inline editing (keyed by item id)
  const [drafts, setDrafts] = useState<Record<string, Partial<MenuItem>>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  // New item form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    categoryId: MONTE_CAT_ID,
    name: '',
    description: '',
    price: 18.9,
    images: [],
    available: true,
    optionGroups: [],
  });

  // ── Draft helpers ────────────────────────────────────────────

  const getDraft = (item: MenuItem): MenuItem => (drafts[item.id] ? { ...item, ...drafts[item.id] } as MenuItem : item);

  const patchDraft = (id: string, patch: Partial<MenuItem>) => {
    setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
    setDirty(prev => ({ ...prev, [id]: true }));
  };

  // ── Option mutation helpers ──────────────────────────────────

  const updateOption = (itemId: string, groupId: string, optId: string, field: keyof MixtureOption, val: any) => {
    const item = menuItems.find(i => i.id === itemId)!;
    const draft = getDraft(item);
    const newGroups = draft.optionGroups.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.map(o => o.id === optId ? { ...o, [field]: val } : o) }
        : g
    );
    patchDraft(itemId, { optionGroups: newGroups });
  };

  const deleteOption = (itemId: string, groupId: string, optId: string) => {
    const item = menuItems.find(i => i.id === itemId)!;
    const draft = getDraft(item);
    const newGroups = draft.optionGroups.map(g =>
      g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optId) } : g
    );
    patchDraft(itemId, { optionGroups: newGroups });
  };

  const addOption = (itemId: string, groupId: string) => {
    const item = menuItems.find(i => i.id === itemId)!;
    const draft = getDraft(item);
    const newOpt: MixtureOption = { id: generateId(), name: '', price: 0, available: true };
    const newGroups = draft.optionGroups.map(g =>
      g.id === groupId ? { ...g, options: [...g.options, newOpt] } : g
    );
    patchDraft(itemId, { optionGroups: newGroups });
  };

  const addGroup = (itemId: string) => {
    const item = menuItems.find(i => i.id === itemId)!;
    const draft = getDraft(item);
    const newGroup = {
      id: generateId(),
      title: 'Novo Grupo (Ex: Acompanhamentos)',
      required: false,
      min: 0,
      max: 3,
      options: []
    };
    patchDraft(itemId, { optionGroups: [...draft.optionGroups, newGroup] });
  };

  const removeGroup = (itemId: string, groupId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo inteiro?')) return;
    const item = menuItems.find(i => i.id === itemId)!;
    const draft = getDraft(item);
    const newGroups = draft.optionGroups.filter(g => g.id !== groupId);
    patchDraft(itemId, { optionGroups: newGroups });
  };

  const updateGroup = (itemId: string, groupId: string, patch: any) => {
    const item = menuItems.find(i => i.id === itemId)!;
    const draft = getDraft(item);
    const newGroups = draft.optionGroups.map(g => g.id === groupId ? { ...g, ...patch } : g);
    patchDraft(itemId, { optionGroups: newGroups });
  };

  // ── Save / discard ──────────────────────────────────────────

  const handleSave = async (item: MenuItem) => {
    const patch = drafts[item.id];
    if (!patch) return;
    try {
      await updateMenuItem(item.id, patch);
      setDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      setDirty(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      notify('Produto salvo!', 'success');
    } catch {
      notify('Erro ao salvar. Tente novamente.', 'error');
    }
  };

  const handleDiscard = (item: MenuItem) => {
    setDrafts(prev => { const n = { ...prev }; delete n[item.id]; return n; });
    setDirty(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  };

  // ── Toggle available ────────────────────────────────────────

  const toggleAvailable = async (item: MenuItem) => {
    await updateMenuItem(item.id, { available: !item.available });
    notify(item.available ? 'Produto desativado.' : 'Produto ativado!', 'info');
  };

  // ── Delete item ─────────────────────────────────────────────

  const handleDelete = (item: MenuItem) => {
    if (window.confirm(`Excluir "${item.name}"? Esta ação não pode ser desfeita.`)) {
      removeMenuItem(item.id);
      notify('Produto excluído.', 'info');
    }
  };

  // ── New item ────────────────────────────────────────────────

  const handleCreateItem = async () => {
    if (!newItem.name?.trim()) return notify('Digite o nome do produto.', 'error');
    const images = newItem.images && newItem.images.length > 0
      ? newItem.images
      : ['https://placehold.co/300x300?text=Monte+Marmita'];
    try {
      await addMenuItem({ ...newItem, images, categoryId: MONTE_CAT_ID } as Omit<MenuItem, 'id'>);
      setNewItem({ categoryId: MONTE_CAT_ID, name: '', description: '', price: 18.9, images: [], available: true, optionGroups: [] });
      setShowNewForm(false);
      notify('Produto criado!', 'success');
    } catch {
      notify('Erro ao criar produto.', 'error');
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">🍱 Monte sua Marmita</h2>
          <p className="text-xs text-gray-500">Gerencie os produtos e misturas desta categoria</p>
        </div>
        <button
          onClick={() => setShowNewForm(v => !v)}
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm shadow-red-200 active:scale-95 transition-transform"
        >
          {showNewForm ? <><X size={15} /> Cancelar</> : <><Plus size={15} /> Novo Produto</>}
        </button>
      </div>

      {/* ── New item form ───────────────────────────────────── */}
      {showNewForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Novo Produto</p>

          {/* Image picker */}
          <div className="flex gap-3 items-center">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-amber-300 relative flex items-center justify-center bg-white shrink-0">
              {newItem.images && newItem.images[0]
                ? <img src={newItem.images[0]} className="w-full h-full object-cover" />
                : <Camera size={24} className="text-amber-300" />}
              <ImageEditable
                src={newItem.images?.[0] || ''}
                alt=""
                onUpdate={img => setNewItem(p => ({ ...p, images: [img] }))}
                className="absolute inset-0 opacity-0"
              />
            </div>
            <div className="flex-1 space-y-2">
              <input
                placeholder="Nome do produto"
                value={newItem.name || ''}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                className="w-full p-2.5 border border-amber-200 rounded-xl bg-white outline-none text-sm font-bold focus:ring-2 focus:ring-amber-300"
              />
              <input
                placeholder="Descrição breve"
                value={newItem.description || ''}
                onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))}
                className="w-full p-2.5 border border-amber-200 rounded-xl bg-white outline-none text-sm focus:ring-2 focus:ring-amber-300"
              />
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-xs font-bold text-amber-700">Preço base (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newItem.price || ''}
              onChange={e => setNewItem(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
              className="w-28 p-2 border border-amber-200 rounded-xl bg-white outline-none text-sm focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <button
            onClick={handleCreateItem}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Check size={16} /> Criar Produto
          </button>
        </div>
      )}

      {/* ── Existing items ──────────────────────────────────── */}
      {monteItems.length === 0 && !showNewForm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🍱</p>
          <p className="text-sm">Nenhum produto nesta categoria.</p>
          <p className="text-xs">Clique em "Novo Produto" para criar.</p>
        </div>
      )}

      {monteItems.map(item => {
        const d = getDraft(item);
        const isDirty = dirty[item.id];
        const isExpanded = expandedId === item.id;

        return (
          <div
            key={item.id}
            className={`bg-white rounded-2xl shadow-sm border transition-all ${!item.available ? 'opacity-70' : ''} ${isDirty ? 'border-amber-300' : 'border-gray-100'}`}
          >
            {/* ── Item header ─────────────────────────────── */}
            <div className="flex items-center gap-3 p-3">
              {/* Image */}
              <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0 border border-gray-100">
                <img src={d.images?.[0] || 'https://placehold.co/64'} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0">
                  <ImageEditable
                    src={d.images?.[0] || ''}
                    alt=""
                    onUpdate={img => patchDraft(item.id, { images: [img, ...(d.images?.slice(1) || [])] })}
                    overlayText="📷"
                    className="absolute inset-0 opacity-0"
                    editable
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <input
                  className="font-bold text-gray-800 text-sm w-full outline-none bg-transparent border-b border-dashed border-transparent focus:border-gray-300"
                  value={d.name || ''}
                  onChange={e => patchDraft(item.id, { name: e.target.value })}
                />
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-gray-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="text-xs font-bold text-primary w-16 outline-none bg-transparent border-b border-dashed border-transparent focus:border-primary"
                    value={d.price ?? ''}
                    onChange={e => patchDraft(item.id, { price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <p className={`text-[10px] mt-0.5 font-semibold ${item.available ? 'text-green-500' : 'text-gray-400'}`}>
                  {item.available ? '● Ativo' : '○ Inativo'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => toggleAvailable(item)}
                  title={item.available ? 'Desativar' : 'Ativar'}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${item.available ? 'bg-green-50 text-green-500 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                >
                  <Power size={16} />
                </button>
                <button
                  onClick={() => { if (window.confirm(`Excluir "${item.name}"?`)) removeMenuItem(item.id); }}
                  className="w-9 h-9 rounded-full bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-9 h-9 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {/* ── Expanded: description + misturas ────────── */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-50 pt-3">

                {/* Description */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Descrição</label>
                  <textarea
                    value={d.description || ''}
                    onChange={e => patchDraft(item.id, { description: e.target.value })}
                    rows={2}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
                  />
                </div>

                {/* Option Groups (Tamanho + Misturas) */}
                {d.optionGroups?.map(group => (
                  <div key={group.id} className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <input 
                          value={group.title} 
                          onChange={e => updateGroup(item.id, group.id, { title: e.target.value })}
                          className="text-xs font-bold text-gray-700 uppercase tracking-wide bg-transparent outline-none border-b border-dashed border-gray-300 focus:border-primary w-full"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => updateGroup(item.id, group.id, { required: !group.required, min: !group.required ? 1 : 0 })}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${group.required ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                          >
                            {group.required ? 'Obrigatório' : 'Opcional'}
                          </button>
                          <span className="text-[10px] text-gray-500">Max:</span>
                          <input 
                            type="number" min="1" 
                            value={group.max} 
                            onChange={e => updateGroup(item.id, group.id, { max: parseInt(e.target.value) || 1 })}
                            className="w-10 text-[10px] p-0.5 border border-gray-200 rounded text-center"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addOption(item.id, group.id)}
                          className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                        >
                          <Plus size={12} /> Adicionar Item
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(item.id, group.id)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {group.options.map(opt => (
                        <MixtureRow
                          key={opt.id}
                          option={opt}
                          groupId={group.id}
                          monteItemId={item.id}
                          onUpdate={(gid, oid, field, val) => updateOption(item.id, gid, oid, field, val)}
                          onDelete={(gid, oid) => deleteOption(item.id, gid, oid)}
                        />
                      ))}
                      {group.options.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">Nenhuma opção. Clique em "Adicionar" acima.</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add new group button */}
                <button
                  onClick={() => addGroup(item.id)}
                  className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 text-sm font-bold hover:bg-gray-50 hover:text-primary transition-colors flex items-center justify-center gap-1 mt-2"
                >
                  <Plus size={16} /> Adicionar Novo Grupo (Ex: Acompanhamentos)
                </button>

                {/* Save / Discard */}
                {isDirty && (
                  <div className="flex gap-2 pt-2 border-t border-amber-100">
                    <button
                      onClick={() => handleDiscard(item)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      <X size={14} /> Descartar
                    </button>
                    <button
                      onClick={() => handleSave(item)}
                      className="flex-1 py-2 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Check size={14} /> Salvar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MonteGerenciamento;
