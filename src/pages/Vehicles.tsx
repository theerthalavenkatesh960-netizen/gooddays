import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Fuel, Wrench, AlertTriangle, Plus,
  Check, TrendingUp, Gauge, Calendar, ChevronDown,
  ChevronRight, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

type VehicleTab = 'Refills' | 'Services' | 'Issues';

interface Refill {
  id: number;
  date: string;
  litres: number;
  amount: number;
  odometer: number;
  mileage?: number;
}

interface Service {
  id: number;
  date: string;
  items: string[];
  cost: number;
  nextDue?: string;
  odometer?: number;
}

interface Issue {
  id: number;
  date: string;
  description: string;
  resolved: boolean;
}

interface Vehicle {
  id: number;
  name: string;
  make: string;
  model: string;
  year: number;
  regNo: string;
  fuelType: string;
  color: string;
  odometer: number;
  refills: Refill[];
  services: Service[];
  issues: Issue[];
}

const DEMO_VEHICLES: Vehicle[] = [
  {
    id: 1,
    name: 'Daily Driver',
    make: 'Maruti',
    model: 'Baleno',
    year: 2022,
    regNo: 'KA-01-AB-1234',
    fuelType: 'Petrol',
    color: '#6C63FF',
    odometer: 28450,
    refills: [
      { id: 1, date: '2026-05-05', litres: 35.2, amount: 3450, odometer: 28450, mileage: 16.2 },
      { id: 2, date: '2026-04-20', litres: 33.8, amount: 3310, odometer: 27880, mileage: 15.9 },
      { id: 3, date: '2026-04-08', litres: 36.0, amount: 3528, odometer: 27340, mileage: 16.4 },
      { id: 4, date: '2026-03-22', litres: 34.5, amount: 3381, odometer: 26750, mileage: 15.7 },
    ],
    services: [
      { id: 1, date: '2026-03-15', items: ['Engine Oil', 'Oil Filter', 'Air Filter', 'AC Service'], cost: 8500, nextDue: '2026-09-15', odometer: 26000 },
      { id: 2, date: '2025-09-10', items: ['Engine Oil', 'Oil Filter'], cost: 3800, nextDue: '2026-03-10', odometer: 20000 },
    ],
    issues: [
      { id: 1, date: '2026-04-28', description: 'Unusual noise from front left wheel at low speed', resolved: false },
      { id: 2, date: '2026-03-05', description: 'AC not cooling properly', resolved: true },
      { id: 3, date: '2026-02-10', description: 'Rear wiper not working', resolved: true },
    ],
  },
];

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

function RefillsTab({ vehicle }: { vehicle: Vehicle }) {
  const [showAdd, setShowAdd] = useState(false);
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [odo, setOdo] = useState('');

  const avgMileage = vehicle.refills.filter(r => r.mileage).reduce((s, r, _, a) => s + (r.mileage ?? 0) / a.length, 0);
  const lastOdo = vehicle.refills[0]?.odometer ?? vehicle.odometer;
  const lastRefillAgo = vehicle.refills[0]
    ? Math.round((new Date().getTime() - new Date(vehicle.refills[0].date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="px-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Gauge size={16} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{avgMileage.toFixed(1)}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>km/L avg</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <MapPin size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-green)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{lastOdo.toLocaleString()}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>km total</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Fuel size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-warm)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{lastRefillAgo ?? '--'}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>days since fill</p>
        </div>
      </div>

      {/* Mileage mini chart */}
      <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="section-label mb-3">Mileage Trend</p>
        <div className="flex items-end gap-2 h-16">
          {vehicle.refills.slice().reverse().map((r, i) => {
            const m = r.mileage ?? 0;
            const h = ((m - 14) / 4) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${Math.max(10, h)}%`,
                    backgroundColor: m >= avgMileage ? 'var(--accent-green)' : 'var(--accent-warm)',
                    opacity: i === vehicle.refills.length - 1 ? 1 : 0.6,
                  }}
                />
                <span className="text-[9px] num" style={{ color: 'var(--text-muted)' }}>{m.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1 mt-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-green)' }} />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Above avg</span>
          <div className="w-2 h-2 rounded-full ml-3" style={{ backgroundColor: 'var(--accent-warm)' }} />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Below avg</span>
        </div>
      </div>

      {/* Refill log */}
      <div className="section-header px-0 mb-2">
        <span className="section-label">Fill-up Log</span>
        <button onClick={() => setShowAdd(v => !v)} className="press" style={{ color: 'var(--accent)' }}>
          <Plus size={18} />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Log Refill</p>
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
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cost per litre: </span>
                  <span className="text-xs font-bold num" style={{ color: 'var(--accent-gold)' }}>₹{(parseFloat(amount)/parseFloat(litres)).toFixed(2)}/L</span>
                </div>
              )}
              <button onClick={() => setShowAdd(false)} className="w-full h-10 rounded-xl text-sm font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        {vehicle.refills.map((r, i) => (
          <div key={r.id} className="p-4" style={{ borderBottom: i < vehicle.refills.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Fuel size={14} style={{ color: 'var(--accent)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {format(new Date(r.date), 'd MMM yyyy')}
                </span>
              </div>
              <span className="text-sm font-bold num" style={{ color: 'var(--accent-warm)' }}>₹{r.amount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-xs num" style={{ color: 'var(--text-secondary)' }}>{r.litres}L</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
                <span className="text-xs num" style={{ color: 'var(--text-secondary)' }}>{r.odometer.toLocaleString()} km</span>
              </div>
              {r.mileage && (
                <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: r.mileage >= avgMileage ? 'var(--accent-green)22' : 'var(--accent-warm)22' }}>
                  <span className="text-[10px] font-bold num" style={{ color: r.mileage >= avgMileage ? 'var(--accent-green)' : 'var(--accent-warm)' }}>
                    {r.mileage} km/L
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesTab({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="px-4">
      <div className="section-header px-0 mb-3">
        <span className="section-label">Service History</span>
        <button className="press" style={{ color: 'var(--accent)' }}><Plus size={18} /></button>
      </div>

      {/* Next service alert */}
      {vehicle.services[0]?.nextDue && (
        <div className="p-4 rounded-2xl mb-4 flex items-center gap-3" style={{ backgroundColor: 'var(--accent-gold)11', border: '1px solid var(--accent-gold)44' }}>
          <Calendar size={18} style={{ color: 'var(--accent-gold)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Next Service Due</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {format(new Date(vehicle.services[0].nextDue), 'd MMMM yyyy')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {vehicle.services.map(s => (
          <div key={s.id} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wrench size={14} style={{ color: 'var(--accent-green)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {format(new Date(s.date), 'd MMM yyyy')}
                </span>
              </div>
              <span className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>₹{s.cost.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {s.items.map(item => (
                <span key={item} className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                  {item}
                </span>
              ))}
            </div>
            {s.odometer && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.odometer.toLocaleString()} km</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function IssuesTab({ vehicle }: { vehicle: Vehicle }) {
  const [issues, setIssues] = useState(vehicle.issues);
  const [showAdd, setShowAdd] = useState(false);
  const [newIssue, setNewIssue] = useState('');

  const open = issues.filter(i => !i.resolved);
  const closed = issues.filter(i => i.resolved);

  const addIssue = () => {
    if (!newIssue.trim()) return;
    setIssues(prev => [{
      id: Date.now(), date: format(new Date(), 'yyyy-MM-dd'),
      description: newIssue.trim(), resolved: false
    }, ...prev]);
    setNewIssue('');
    setShowAdd(false);
  };

  const toggle = (id: number) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, resolved: !i.resolved } : i));
    if ('vibrate' in navigator) navigator.vibrate(30);
  };

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
              <textarea
                value={newIssue}
                onChange={e => setNewIssue(e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="w-full p-3 rounded-xl text-sm outline-none resize-none"
                style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                autoFocus
              />
              <button onClick={addIssue} className="w-full h-10 rounded-xl text-sm font-semibold text-white press" style={{ backgroundColor: 'var(--accent)' }}>Add Issue</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open.length > 0 && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-warm)' }}>Open ({open.length})</p>
          <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--accent-warm)44` }}>
            {open.map((issue, i) => (
              <div key={issue.id} className="flex items-start gap-3 p-4" style={{ borderBottom: i < open.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <button onClick={() => toggle(issue.id)} className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center border-2 press" style={{ borderColor: 'var(--accent-warm)' }}>
                </button>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{issue.description}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(issue.date), 'd MMM yyyy')}</p>
                </div>
                <AlertTriangle size={14} style={{ color: 'var(--accent-warm)' }} className="flex-shrink-0 mt-1" />
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
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ backgroundColor: 'var(--accent-green)' }}>
                  <Check size={12} color="#fff" />
                </div>
                <div className="flex-1">
                  <p className="text-sm line-through" style={{ color: 'var(--text-secondary)' }}>{issue.description}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{format(new Date(issue.date), 'd MMM yyyy')}</p>
                </div>
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<VehicleTab>('Refills');

  const selected = DEMO_VEHICLES.find(v => v.id === selectedId);

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <button onClick={() => selectedId ? setSelectedId(null) : navigate('/finance')} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {selected ? selected.name : 'Vehicles'}
          </h1>
          {selected && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {selected.make} {selected.model} · {selected.year}
            </p>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="px-4">
          {DEMO_VEHICLES.map(v => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className="w-full p-4 rounded-2xl mb-3 press"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-4">
                {/* Car silhouette */}
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
                      <span className="text-[11px] num" style={{ color: 'var(--text-muted)' }}>{v.odometer.toLocaleString()} km</span>
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{v.regNo}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {v.issues.some(i => !i.resolved) && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-warm)22' }}>
                      <AlertTriangle size={10} style={{ color: 'var(--accent-warm)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--accent-warm)' }}>
                        {v.issues.filter(i => !i.resolved).length} issue
                      </span>
                    </div>
                  )}
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            </button>
          ))}

          <button className="w-full h-12 rounded-2xl text-sm font-medium press flex items-center justify-center gap-2" style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      ) : (
        <>
          {/* Vehicle header card */}
          <div className="mx-4 mb-3 p-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${selected.color}33, var(--surface))`, border: `1px solid ${selected.color}55` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.fuelType} · {selected.regNo}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Gauge size={14} style={{ color: selected.color }} />
                    <span className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>
                      {selected.odometer.toLocaleString()} km
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fuel size={14} style={{ color: 'var(--accent-green)' }} />
                    <span className="text-sm num" style={{ color: 'var(--text-secondary)' }}>
                      {(selected.refills.filter(r => r.mileage).reduce((s,r,_,a) => s+(r.mileage??0)/a.length,0)).toFixed(1)} km/L
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
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="mt-2"
            >
              {tab === 'Refills'  && <RefillsTab vehicle={selected} />}
              {tab === 'Services' && <ServicesTab vehicle={selected} />}
              {tab === 'Issues'   && <IssuesTab vehicle={selected} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
