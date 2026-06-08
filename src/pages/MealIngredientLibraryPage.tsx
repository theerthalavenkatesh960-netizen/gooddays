import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import * as api from '../lib/api';

type Ingredient = {
  id: number;
  name: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  baseQty?: number;
  baseUnit?: string;
};

export default function MealIngredientLibraryPage() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [macroFocus, setMacroFocus] = useState<'all' | 'protein' | 'carbs' | 'fats'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState({ name: '', calories: '', protein: '', carbs: '', fats: '', defaultQty: '1', defaultUnit: 'unit' });
  const [form, setForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fats: '', defaultQty: '1', defaultUnit: 'unit',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api.getMealIngredients();
    const list: Ingredient[] = (Array.isArray(data) ? data : []).map((i: any) => ({
      ...i,
      baseQty: Number(i.defaultQty ?? i.baseQty ?? 1),
      baseUnit: i.defaultUnit ?? i.baseUnit ?? 'unit',
    }));
    setIngredients(list);
  }

  async function add() {
    if (!form.name.trim()) return;
    try {
      const item = await api.createMealIngredient({
        name: form.name.trim(),
        caloriesKcal: Math.max(0, Number(form.calories) || 0),
        proteinG: Math.max(0, Number(form.protein) || 0),
        carbsG: Math.max(0, Number(form.carbs) || 0),
        fatsG: Math.max(0, Number(form.fats) || 0),
        defaultQty: Math.max(0.01, Number(form.defaultQty) || 1),
        defaultUnit: form.defaultUnit.trim() || 'unit',
      });
      setIngredients(prev => [...prev, {
        ...item,
        baseQty: item.defaultQty ?? Math.max(1, Number(form.defaultQty) || 1),
        baseUnit: (item.defaultUnit ?? form.defaultUnit) || 'unit',
      }]);
      setForm({ name: '', calories: '', protein: '', carbs: '', fats: '', defaultQty: '1', defaultUnit: 'unit' });
    } catch (e: any) {
      setStatus(e?.message || 'Failed to add ingredient');
    }
  }

  async function remove(id: number) {
    await api.deleteMealIngredient(id);
    setIngredients(prev => prev.filter(i => i.id !== id));
  }

  function beginEdit(item: Ingredient) {
    setEditingId(item.id);
    setEditing({
      name: item.name,
      calories: String(item.caloriesKcal ?? 0),
      protein: String(item.proteinG ?? 0),
      carbs: String(item.carbsG ?? 0),
      fats: String(item.fatsG ?? 0),
      defaultQty: String(item.baseQty ?? 1),
      defaultUnit: item.baseUnit ?? 'unit',
    });
  }

  async function saveEdit(id: number) {
    if (!editing.name.trim()) return;
    try {
      const updated = await (api as any).updateMealIngredient(id, {
        name: editing.name.trim(),
        caloriesKcal: Math.max(0, Number(editing.calories) || 0),
        proteinG: Math.max(0, Number(editing.protein) || 0),
        carbsG: Math.max(0, Number(editing.carbs) || 0),
        fatsG: Math.max(0, Number(editing.fats) || 0),
        defaultQty: Math.max(0.01, Number(editing.defaultQty) || 1),
        defaultUnit: editing.defaultUnit.trim() || 'unit',
      });
      setIngredients(prev => prev.map(i => i.id === id
        ? {
            ...i,
            ...updated,
            baseQty: Number(updated?.defaultQty ?? updated?.baseQty ?? editing.defaultQty ?? i.baseQty ?? 1),
            baseUnit: updated?.defaultUnit ?? updated?.baseUnit ?? editing.defaultUnit ?? i.baseUnit ?? 'unit',
          }
        : i));
      setEditingId(null);
      setStatus('Ingredient updated');
      setTimeout(() => setStatus(''), 1200);
    } catch (e: any) {
      setStatus(e?.message || 'Failed to update ingredient');
    }
  }

  const filtered = useMemo(() => {
    let list = ingredients;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q));
    }
    if (macroFocus === 'protein') list = list.filter(i => i.proteinG >= i.carbsG && i.proteinG >= i.fatsG);
    if (macroFocus === 'carbs') list = list.filter(i => i.carbsG >= i.proteinG && i.carbsG >= i.fatsG);
    if (macroFocus === 'fats') list = list.filter(i => i.fatsG >= i.proteinG && i.fatsG >= i.carbsG);
    return list;
  }, [ingredients, search, macroFocus]);

  return (
    <div className="meal-ingredients-full-bleed pt-4 pb-nav px-4 flex flex-col" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings/meals', { state: { tab: 'library' } })} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Ingredient Library</h1>
      </div>

      {status && (
        <div className="mb-3 px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: 'rgba(255,107,107,0.1)', color: 'var(--accent-warm)' }}>
          {status}
        </div>
      )}

      <div className="rounded-2xl p-4 mb-4 space-y-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ingredient name"
          className="w-full px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />

        <div className="grid grid-cols-2 gap-2">
          {[{ key: 'calories', ph: 'Calories (kcal)' }, { key: 'protein', ph: 'Protein (g)' }, { key: 'carbs', ph: 'Carbs (g)' }, { key: 'fats', ph: 'Fats (g)' }].map(({ key, ph }) => (
            <input key={key} type="number" value={form[key as keyof typeof form]} placeholder={ph}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.defaultQty} onChange={e => setForm(p => ({ ...p, defaultQty: e.target.value }))}
            placeholder="Default qty (e.g. 1, 150)" className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
          <input value={form.defaultUnit} onChange={e => setForm(p => ({ ...p, defaultUnit: e.target.value }))}
            placeholder="Unit (egg, tbsp, g, ml...)" className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
        </div>

        <button onClick={add} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)' }}>
          <Plus size={14} /> Add Ingredient
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Ingredients</p>
          <button onClick={() => setShowFilters(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: showFilters ? 'var(--accent)' : 'var(--surface-elevated)', color: showFilters ? '#fff' : 'var(--text-secondary)' }}>
            <Filter size={14} />
          </button>
        </div>

        {showFilters && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ingredients..."
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'protein', label: 'Protein+' },
                { key: 'carbs', label: 'Carbs+' },
                { key: 'fats', label: 'Fats+' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setMacroFocus(opt.key as any)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: macroFocus === opt.key ? 'var(--accent)' : 'var(--surface-elevated)', color: macroFocus === opt.key ? '#fff' : 'var(--text-muted)' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pb-2">
          {filtered.map(i => (
            <div key={i.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              {editingId === i.id ? (
                <div className="space-y-2">
                  <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-2.5 py-2 text-sm rounded-lg outline-none" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={editing.calories} onChange={e => setEditing(p => ({ ...p, calories: e.target.value }))}
                      placeholder="kcal" className="px-2.5 py-2 text-xs rounded-lg outline-none" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }} />
                    <input type="number" value={editing.protein} onChange={e => setEditing(p => ({ ...p, protein: e.target.value }))}
                      placeholder="Protein" className="px-2.5 py-2 text-xs rounded-lg outline-none" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }} />
                    <input type="number" value={editing.carbs} onChange={e => setEditing(p => ({ ...p, carbs: e.target.value }))}
                      placeholder="Carbs" className="px-2.5 py-2 text-xs rounded-lg outline-none" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }} />
                    <input type="number" value={editing.fats} onChange={e => setEditing(p => ({ ...p, fats: e.target.value }))}
                      placeholder="Fats" className="px-2.5 py-2 text-xs rounded-lg outline-none" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }} />
                    <input type="number" value={editing.defaultQty} onChange={e => setEditing(p => ({ ...p, defaultQty: e.target.value }))}
                      placeholder="Default qty" className="px-2.5 py-2 text-xs rounded-lg outline-none" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }} />
                    <input value={editing.defaultUnit} onChange={e => setEditing(p => ({ ...p, defaultUnit: e.target.value }))}
                      placeholder="Unit (egg, tbsp, g...)" className="px-2.5 py-2 text-xs rounded-lg outline-none" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(i.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent-green)' }}>
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{i.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => beginEdit(i)} className="p-1 rounded-lg" style={{ color: 'var(--accent)' }}><Pencil size={14} /></button>
                      <button onClick={() => remove(i.id)} className="p-1 rounded-lg" style={{ color: 'var(--accent-warm)' }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>default: {Number(i.baseQty || 1)} {i.baseUnit || 'unit'}</p>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span style={{ color: '#B7791F' }}>{i.caloriesKcal} kcal</span>
                    <span style={{ color: '#DC2626' }}>{i.proteinG}g P</span>
                    <span style={{ color: '#D97706' }}>{i.carbsG}g C</span>
                    <span style={{ color: '#0F766E' }}>{i.fatsG}g F</span>
                  </div>
                </>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No ingredients match the current filters.</p>}
        </div>
      </div>
    </div>
  );
}
