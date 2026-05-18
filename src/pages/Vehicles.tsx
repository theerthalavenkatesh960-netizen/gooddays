import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Fuel, Wrench, AlertTriangle, Plus,
  Check, TrendingUp, Gauge, Calendar, ChevronDown,
  ChevronRight, MapPin, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import type { Vehicle, Refill, ServiceLog, IssueLog } from '../lib/api';

type VehicleTab = 'Refills' | 'Services' | 'Issues';

function PillTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="h-scroll px-4 py-3 gap-2">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} className={`pill-tab ${active === t ? 'pill-tab-active' : 'pill-tab-inactive'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

const formatMoney = (value: number) => `₹${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0)}`;
const formatNum = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0);

function RefillsTab({ vehicle, onUpdate }: { vehicle: Vehicle; onUpdate: (v: Vehicle) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [odo, setOdo] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const refills = vehicle.refills ?? [];
  const avgMileage = refills.filter(r => r.mileage).reduce((s, r, _, a) => s + (r.mileage ?? 0) / a.length, 0);
  const lastOdo = refills[0]?.odometer ?? vehicle.odometer;
  const lastRefillAgo = refills[0]
    ? Math.round((new Date().getTime() - new Date(refills[0].date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  async function handleSave() {
    if (!litres || !amount || !odo) return;
    const r = await api.addRefill(vehicle.id, { date, litres: parseFloat(litres), amount: parseFloat(amount), odometer: parseInt(odo) });
    const updated = { ...vehicle, refills: [r, ...refills], odometer: Math.max(vehicle.odometer, parseInt(odo)) };
    onUpdate(updated);
    setLitres(''); setAmount(''); setOdo(''); setShowAdd(false);
  }

  async function handleDeleteRefill(refillId: number) {
    await api.deleteRefill(vehicle.id, refillId);
    onUpdate({ ...vehicle, refills: refills.filter(r => r.id !== refillId) });
  }

  return (
    <div className="px-4">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Gauge size={16} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{avgMileage.toFixed(1)}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>km/L avg</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <MapPin size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-green)' }} />
              <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{formatNum(lastOdo)}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>km total</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Fuel size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-warm)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{lastRefillAgo ?? '--'}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>days since fill</p>
        </div>
      </div>

      {refills.length > 1 && (
        <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="section-label mb-3">Mileage Trend</p>
          <div className="flex items-end gap-2 h-16">
            {refills.slice().reverse().map((r, i) => {
              const m = r.mileage ?? 0;
              const h = m > 0 ? ((m - 12) / 8) * 100 : 20;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm" style={{ height: `${Math.max(10, Math.min(100, h))}%`, backgroundColor: m >= avgMileage ? 'var(--accent-green)' : 'var(--accent-warm)', opacity: 0.8 }} />
                  <span className="text-[9px] num" style={{ color: 'var(--text-muted)' }}>{m.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="section-header px-0 mb-2">
        <span className="section-label">Fill-up Log</span>
        <button onClick={() => setShowAdd(v => !v)} className="press" style={{ color: 'var(--accent)' }}><Plus size={18} /></button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
            <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Log Refill</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 rounded-lg outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Litres</p>
                  <input type="number" inputMode="decimal" value={litres} onChange={e => setLitres(e.target.value)} placeholder="35.0" className="w-full p-2 rounded-lg outline-none text-sm num font-semibold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Amount ₹</p>
                  <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="3400" className="w-full p-2 rounded-lg outline-none text-sm num font-semibold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Odometer</p>
                  <input type="number" inputMode="numeric" value={odo} onChange={e => setOdo(e.target.value)} placeholder="28500" className="w-full p-2 rounded-lg outline-none text-sm num font-semibold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              {litres && amount && (
                <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <TrendingUp size={14} style={{ color: 'var(--accent-gold)' }} />
                  <span className="text-xs font-bold num" style={{ color: 'var(--accent-gold)' }}>{formatMoney(parseFloat(amount)/parseFloat(litres))}/L</span>
                </div>
              )}
              <button onClick={handleSave} className="w-full h-10 rounded-xl text-sm font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {refills.length === 0 && <p className="p-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No refills logged yet.</p>}
        {refills.map((r, i) => (
          <div key={r.id} className="p-4 flex items-center gap-3" style={{ borderBottom: i < refills.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <Fuel size={14} style={{ color: 'var(--accent)' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{format(new Date(r.date), 'd MMM yyyy')}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.litres}L · {formatNum(r.odometer)} km{r.mileage ? ` · ${r.mileage} km/L` : ''}</p>
            </div>
            <span className="text-sm font-bold num" style={{ color: 'var(--accent-warm)' }}>{formatMoney(r.amount)}</span>
            <button onClick={() => handleDeleteRefill(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center press" style={{ color: '#ef4444' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesTab({ vehicle, onUpdate }: { vehicle: Vehicle; onUpdate: (v: Vehicle) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), items: '', cost: '', nextDue: '', odometer: '' });

  const services = vehicle.services ?? [];

  async function handleSave() {
    if (!form.cost) return;
    const s = await api.addService(vehicle.id, {
      date: form.date,
      items: form.items.split(',').map(s => s.trim()).filter(Boolean),
      cost: parseFloat(form.cost),
      nextDue: form.nextDue || undefined,
      odometer: form.odometer ? parseInt(form.odometer) : undefined,
    });
    onUpdate({ ...vehicle, services: [s, ...services] });
    setForm({ date: format(new Date(), 'yyyy-MM-dd'), items: '', cost: '', nextDue: '', odometer: '' });
    setShowAdd(false);
  }

  async function handleDelete(serviceId: number) {
    await api.deleteService(vehicle.id, serviceId);
    onUpdate({ ...vehicle, services: services.filter(s => s.id !== serviceId) });
  }

  return (
    <div className="px-4">
      <div className="section-header px-0 mb-3">
        <span className="section-label">Service History</span>
        <button onClick={() => setShowAdd(v => !v)} className="press" style={{ color: 'var(--accent)' }}><Plus size={18} /></button>
      </div>

      {services[0]?.nextDue && (
        <div className="p-4 rounded-2xl mb-4 flex items-center gap-3" style={{ backgroundColor: 'var(--accent-gold)11', border: '1px solid var(--accent-gold)44' }}>
          <Calendar size={18} style={{ color: 'var(--accent-gold)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Next Service Due</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{format(new Date(services[0].nextDue!), 'd MMMM yyyy')}</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
            <div className="p-4 rounded-2xl space-y-2" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Log Service</p>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full p-2 rounded-lg outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <input value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))} placeholder="Items (comma separated)" className="w-full p-2 rounded-lg outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="Cost ₹" className="p-2 rounded-lg outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <input type="number" value={form.odometer} onChange={e => setForm(p => ({ ...p, odometer: e.target.value }))} placeholder="Odometer km" className="p-2 rounded-lg outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              </div>
              <input type="date" value={form.nextDue} onChange={e => setForm(p => ({ ...p, nextDue: e.target.value }))} className="w-full p-2 rounded-lg outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
              <button onClick={handleSave} className="w-full h-10 rounded-xl text-sm font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {services.length === 0 && <p className="py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No services logged yet.</p>}
        {services.map(s => (
          <div key={s.id} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wrench size={14} style={{ color: 'var(--accent-green)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{format(new Date(s.date), 'd MMM yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{formatMoney(s.cost)}</span>
                <button onClick={() => handleDelete(s.id)} className="w-7 h-7 rounded-lg flex items-center justify-center press" style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(s.items ?? []).map(item => (
                <span key={item} className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>{item}</span>
              ))}
            </div>
            {s.odometer && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatNum(s.odometer)} km</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function IssuesTab({ vehicle, onUpdate }: { vehicle: Vehicle; onUpdate: (v: Vehicle) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newIssue, setNewIssue] = useState('');

  const issues = vehicle.issues ?? [];
  const open = issues.filter(i => !i.resolved);
  const closed = issues.filter(i => i.resolved);

  async function addIssue() {
    if (!newIssue.trim()) return;
    const issue = await api.addIssue(vehicle.id, { date: format(new Date(), 'yyyy-MM-dd'), description: newIssue.trim(), resolved: false });
    onUpdate({ ...vehicle, issues: [issue, ...issues] });
    setNewIssue(''); setShowAdd(false);
  }

  async function toggle(id: number, resolved: boolean) {
    const updated = await api.resolveIssue(vehicle.id, id, !resolved);
    onUpdate({ ...vehicle, issues: issues.map(i => i.id === id ? updated : i) });
    if ('vibrate' in navigator) navigator.vibrate(30);
  }

  async function handleDeleteIssue(id: number) {
    await api.deleteIssue(vehicle.id, id);
    onUpdate({ ...vehicle, issues: issues.filter(i => i.id !== id) });
  }

  return (
    <div className="px-4">
      <div className="section-header px-0 mb-3">
        <span className="section-label">Issues</span>
        <button onClick={() => setShowAdd(v => !v)} className="press" style={{ color: 'var(--accent)' }}><Plus size={18} /></button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
            <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
              <textarea value={newIssue} onChange={e => setNewIssue(e.target.value)} placeholder="Describe the issue..." rows={3} className="w-full p-3 rounded-xl text-sm outline-none resize-none" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} autoFocus />
              <button onClick={addIssue} className="w-full h-10 rounded-xl text-sm font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>Add Issue</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-warm)' }}>Open ({open.length})</p>
          <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent-warm)44' }}>
            {open.map((issue, i) => (
              <div key={issue.id} className="flex items-start gap-3 p-4" style={{ borderBottom: i < open.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <button onClick={() => toggle(issue.id, issue.resolved)} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center border-2 press" style={{ borderColor: 'var(--accent-warm)' }} />
                <div className="flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{issue.description}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(issue.date), 'd MMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={14} style={{ color: 'var(--accent-warm)' }} />
                  <button onClick={() => handleDeleteIssue(issue.id)} className="w-7 h-7 rounded-lg flex items-center justify-center press" style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {closed.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-green)' }}>Resolved ({closed.length})</p>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            {closed.map((issue, i) => (
              <div key={issue.id} className="flex items-start gap-3 p-4" style={{ borderBottom: i < closed.length - 1 ? '1px solid var(--border)' : 'none', opacity: 0.6 }}>
                <button onClick={() => toggle(issue.id, issue.resolved)} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center press" style={{ backgroundColor: 'var(--accent-green)' }}>
                  <Check size={12} color="#fff" />
                </button>
                <div className="flex-1">
                  <p className="text-sm line-through" style={{ color: 'var(--text-secondary)' }}>{issue.description}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(issue.date), 'd MMM yyyy')}</p>
                </div>
                <button onClick={() => handleDeleteIssue(issue.id)} className="w-7 h-7 rounded-lg flex items-center justify-center press" style={{ color: '#ef4444' }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {open.length === 0 && closed.length === 0 && (
        <div className="py-12 text-center">
          <Check size={36} className="mx-auto mb-3" style={{ color: 'var(--accent-green)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>All clear!</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No issues logged</p>
        </div>
      )}
    </div>
  );
}

export default function Vehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<VehicleTab>('Refills');
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', make: '', model: '', year: new Date().getFullYear().toString(),
    regNo: '', fuelType: 'Petrol', color: '#6C63FF', odometer: ''
  });

  useEffect(() => {
    api.getVehicles().then((data: any) => setVehicles(Array.isArray(data) ? data : [])).finally(() => setLoading(false));
  }, []);

  async function handleAddVehicle() {
    if (!addForm.name.trim() || !addForm.make.trim() || !addForm.odometer) return;
    const created = await api.createVehicle({
      name: addForm.name,
      make: addForm.make,
      model: addForm.model,
      year: parseInt(addForm.year),
      regNo: addForm.regNo,
      fuelType: addForm.fuelType,
      color: addForm.color,
      odometer: parseInt(addForm.odometer),
    });
    setVehicles(prev => [...prev, created]);
    setAddForm({ name: '', make: '', model: '', year: new Date().getFullYear().toString(), regNo: '', fuelType: 'Petrol', color: '#6C63FF', odometer: '' });
    setShowAddVehicle(false);
  }

  function handleVehicleUpdate(updated: Vehicle) {
    setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
  }

  const selected = vehicles.find(v => v.id === selectedId) ?? null;

  if (loading) return (
    <div className="pt-16 flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} />
    </div>
  );

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="flex items-center gap-3 px-4 mb-4">
        <button onClick={() => selectedId ? setSelectedId(null) : navigate('/finance')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selected ? selected.name : 'Vehicles'}</h1>
          {selected && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.make} {selected.model} · {selected.year}</p>}
        </div>
      </div>

      {!selected ? (
        <div className="px-4">
          {vehicles.map(v => (
            <button key={v.id} onClick={() => setSelectedId(v.id)} className="w-full p-4 rounded-2xl mb-3 press" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: v.color + '22' }}>
                  <svg viewBox="0 0 64 32" width="48" height="24">
                    <path d="M6 20 L10 10 L22 8 L42 8 L54 10 L58 20 Z" fill={v.color} opacity="0.8" rx="2"/>
                    <circle cx="16" cy="22" r="5" fill="#333" stroke={v.color} strokeWidth="2"/>
                    <circle cx="48" cy="22" r="5" fill="#333" stroke={v.color} strokeWidth="2"/>
                    <path d="M20 10 L24 8 L40 8 L44 10 L36 10 Z" fill={v.color} opacity="0.5"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{v.name}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{v.make} {v.model} {v.year}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <Gauge size={11} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[11px] num" style={{ color: 'var(--text-muted)' }}>{formatNum(v.odometer)} km</span>
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{v.regNo}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {(v.issues ?? []).some(i => !i.resolved) && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-warm)22' }}>
                      <AlertTriangle size={10} style={{ color: 'var(--accent-warm)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--accent-warm)' }}>{(v.issues ?? []).filter(i => !i.resolved).length} issue</span>
                    </div>
                  )}
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </button>
          ))}

          <AnimatePresence>
            {showAddVehicle && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Vehicle</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Nickname *</p>
                      <input
                        value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. My Swift" autoFocus
                        className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Make *</p>
                      <input
                        value={addForm.make} onChange={e => setAddForm(p => ({ ...p, make: e.target.value }))}
                        placeholder="e.g. Maruti"
                        className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Model</p>
                      <input
                        value={addForm.model} onChange={e => setAddForm(p => ({ ...p, model: e.target.value }))}
                        placeholder="e.g. Swift"
                        className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Year</p>
                      <input
                        type="number" value={addForm.year} onChange={e => setAddForm(p => ({ ...p, year: e.target.value }))}
                        placeholder="2022"
                        className="w-full h-10 px-3 rounded-xl outline-none text-sm num"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Reg. No</p>
                      <input
                        value={addForm.regNo} onChange={e => setAddForm(p => ({ ...p, regNo: e.target.value }))}
                        placeholder="KA-01 AB 1234"
                        className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Fuel Type</p>
                      <select
                        value={addForm.fuelType} onChange={e => setAddForm(p => ({ ...p, fuelType: e.target.value }))}
                        className="w-full h-10 px-3 rounded-xl outline-none text-sm"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      >
                        {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Odometer (km) *</p>
                      <input
                        type="number" value={addForm.odometer} onChange={e => setAddForm(p => ({ ...p, odometer: e.target.value }))}
                        placeholder="15000"
                        className="w-full h-10 px-3 rounded-xl outline-none text-sm num"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>Color</p>
                      <div className="flex items-center gap-2 h-10 px-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                        <input type="color" value={addForm.color} onChange={e => setAddForm(p => ({ ...p, color: e.target.value }))} className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{addForm.color}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowAddVehicle(false)} className="flex-1 h-10 rounded-xl text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
                    <button onClick={handleAddVehicle} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>Add Vehicle</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowAddVehicle(v => !v)}
            className="w-full h-12 rounded-2xl text-sm font-medium press flex items-center justify-center gap-2"
            style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      ) : (
        <>
          <div className="mx-4 mb-3 p-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${selected.color}33, var(--surface))`, border: `1px solid ${selected.color}55` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.fuelType} · {selected.regNo}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Gauge size={14} style={{ color: selected.color }} />
                    <span className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{formatNum(selected.odometer)} km</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fuel size={14} style={{ color: 'var(--accent-green)' }} />
                    <span className="text-sm num" style={{ color: 'var(--text-secondary)' }}>
                      {((selected.refills ?? []).filter(r => r.mileage).reduce((s, r, _, a) => s + (r.mileage ?? 0) / a.length, 0)).toFixed(1)} km/L
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-20 h-14 flex items-center justify-center">
                <svg viewBox="0 0 64 32" width="80" height="40">
                  <path d="M6 20 L10 10 L22 8 L42 8 L54 10 L58 20 Z" fill={selected.color} opacity="0.8" rx="2"/>
                  <circle cx="16" cy="22" r="5" fill="#111" stroke={selected.color} strokeWidth="2"/>
                  <circle cx="48" cy="22" r="5" fill="#111" stroke={selected.color} strokeWidth="2"/>
                  <path d="M20 10 L24 8 L40 8 L44 10 L36 10 Z" fill={selected.color} opacity="0.4"/>
                </svg>
              </div>
            </div>
          </div>

          <PillTabs tabs={['Refills', 'Services', 'Issues']} active={tab} onChange={t => setTab(t as VehicleTab)} />

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }} className="mt-2">
              {tab === 'Refills'  && <RefillsTab vehicle={selected} onUpdate={handleVehicleUpdate} />}
              {tab === 'Services' && <ServicesTab vehicle={selected} onUpdate={handleVehicleUpdate} />}
              {tab === 'Issues'   && <IssuesTab vehicle={selected} onUpdate={handleVehicleUpdate} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

