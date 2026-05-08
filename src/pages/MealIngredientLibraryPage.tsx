import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Plus, Search, Trash2 } from 'lucide-react';
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
  const [form, setForm] = useState({
    name: '', calories: '', protein: '', carbs: '', fats: '', baseQty: '100', baseUnit: 'g',
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api.getMealIngredients();
    const list: Ingredient[] = (Array.isArray(data) ? data : []).map((i: any) => ({
      ...i,
      baseQty: Number(i.baseQty || 100),
      baseUnit: i.baseUnit || 'g',
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
      });
      setIngredients(prev => [...prev, {
        ...item,
        baseQty: Math.max(1, Number(form.baseQty) || 100),
        baseUnit: form.baseUnit || 'g',
      }]);
      setForm({ name: '', calories: '', protein: '', carbs: '', fats: '', baseQty: '100', baseUnit: 'g' });
    } catch (e: any) {
      setStatus(e?.message || 'Failed to add ingredient');
    }
  }

  async function remove(id: number) {
    await api.deleteMealIngredient(id);
    setIngredients(prev => prev.filter(i => i.id !== id));
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
    <div className="pt-4 pb-nav px-4" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
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
          <input type="number" value={form.baseQty} onChange={e => setForm(p => ({ ...p, baseQty: e.target.value }))}
            placeholder="Base qty" className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
          <input value={form.baseUnit} onChange={e => setForm(p => ({ ...p, baseUnit: e.target.value }))}
            placeholder="Unit (g, ml, serving)" className="px-3 py-2 text-sm rounded-xl outline-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
        </div>

        <button onClick={add} className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent)' }}>
          <Plus size={14} /> Add Ingredient
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
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

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filtered.map(i => (
            <div key={i.id} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{i.name}</span>
                <button onClick={() => remove(i.id)} className="p-1 rounded-lg" style={{ color: 'var(--accent-warm)' }}><Trash2 size={14} /></button>
              </div>
              <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>per {Number(i.baseQty || 100)} {i.baseUnit || 'g'}</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span style={{ color: 'var(--accent-gold)' }}>{i.caloriesKcal} kcal</span>
                <span style={{ color: '#FF6B6B' }}>{i.proteinG}g P</span>
                <span style={{ color: '#FFD93D' }}>{i.carbsG}g C</span>
                <span style={{ color: '#4ECDC4' }}>{i.fatsG}g F</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No ingredients match the current filters.</p>}
        </div>
      </div>
    </div>
  );
}
