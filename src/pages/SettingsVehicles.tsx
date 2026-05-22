import { useState, useEffect } from 'react';
import {
  ChevronLeft, Fuel, Gauge, MapPin, Wrench, AlertTriangle, Plus, Calendar, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import type { Vehicle } from '../lib/api';

type VehicleTab = 'Refills' | 'Services' | 'Issues';

function RefillsTab({ vehicle, onUpdate }: { vehicle: Vehicle; onUpdate: (v: Vehicle) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [litres, setLitres] = useState('');
  const [amount, setAmount] = useState('');
  const [odo, setOdo] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const refills = vehicle.refills ?? [];
  const avgMileage = refills.filter(r => r.mileage).reduce((s, r, _, a) => s + (r.mileage ?? 0) / (a.length || 1), 0);
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
    <div className="px-4 pb-nav">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Gauge size={16} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{avgMileage.toFixed(1)}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>km/L avg</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <MapPin size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-green)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{lastOdo}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>km total</p>
        </div>
        <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Fuel size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-warm)' }} />
          <p className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>{lastRefillAgo ?? '--'}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>days ago</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Refills</span>
        <button onClick={() => setShowAdd(!showAdd)} className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          <Plus size={14} /> Add Refill
        </button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-2xl space-y-2 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Litres"
              value={litres}
              onChange={(e) => setLitres(e.target.value)}
              className="h-10 px-3 rounded-xl outline-none text-sm num"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              placeholder="Amount ₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 px-3 rounded-xl outline-none text-sm num"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              placeholder="Odometer"
              value={odo}
              onChange={(e) => setOdo(e.target.value)}
              className="h-10 px-3 rounded-xl outline-none text-sm num"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleSave} className="flex-1 h-9 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>Save</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {refills.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No refills recorded</p>
        ) : (
          refills.map((r: any, i) => (
            <div key={r.id ?? i} className="p-3 rounded-2xl flex items-center justify-between" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>₹{r.amount} · {r.litres}L</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {r.mileage ? `${r.mileage.toFixed(1)} km/L · ` : ''}{r.odometer} km · {format(new Date(r.date), 'd MMM')}
                </p>
              </div>
              <button onClick={() => handleDeleteRefill(r.id)} className="press p-2" style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ServicesTab({ vehicle, onUpdate }: { vehicle: Vehicle; onUpdate: (v: Vehicle) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const services = vehicle.serviceLogs ?? [];

  async function handleSave() {
    if (!type || !date) return;
    const s = await api.addServiceLog(vehicle.id, { type, notes, cost: cost ? parseFloat(cost) : 0, date });
    onUpdate({ ...vehicle, serviceLogs: [s, ...services] });
    setType(''); setNotes(''); setCost(''); setShowAdd(false);
  }

  async function handleDelete(serviceId: number) {
    await api.deleteServiceLog(vehicle.id, serviceId);
    onUpdate({ ...vehicle, serviceLogs: services.filter(s => s.id !== serviceId) });
  }

  return (
    <div className="px-4 pb-nav">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Services</span>
        <button onClick={() => setShowAdd(!showAdd)} className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          <Plus size={14} /> Add Service
        </button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-2xl space-y-2 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
          <input
            type="text"
            placeholder="Service type (e.g. Oil Change)"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-10 px-3 rounded-xl outline-none text-sm"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-20 px-3 py-2 rounded-xl outline-none text-sm resize-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Cost ₹"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="h-10 px-3 rounded-xl outline-none text-sm num"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleSave} className="flex-1 h-9 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>Save</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {services.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No services recorded</p>
        ) : (
          services.map((s: any, i) => (
            <div key={s.id ?? i} className="p-3 rounded-2xl flex items-center justify-between" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.type}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {s.cost ? `₹${s.cost} · ` : ''}{format(new Date(s.date), 'd MMM yyyy')}
                </p>
                {s.notes && <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.notes}</p>}
              </div>
              <button onClick={() => handleDelete(s.id)} className="press p-2" style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function IssuesTab({ vehicle, onUpdate }: { vehicle: Vehicle; onUpdate: (v: Vehicle) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const issues = vehicle.issueLogs ?? [];

  async function handleSave() {
    if (!description) return;
    const iss = await api.addIssueLog(vehicle.id, { description, severity, date });
    onUpdate({ ...vehicle, issueLogs: [iss, ...issues] });
    setDescription(''); setSeverity('medium'); setShowAdd(false);
  }

  async function handleDelete(issueId: number) {
    await api.deleteIssueLog(vehicle.id, issueId);
    onUpdate({ ...vehicle, issueLogs: issues.filter(iss => iss.id !== issueId) });
  }

  const severityColors: Record<string, string> = {
    low: '#10B981', medium: '#FFD93D', high: '#FF6B6B'
  };

  return (
    <div className="px-4 pb-nav">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Issues</span>
        <button onClick={() => setShowAdd(!showAdd)} className="press flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
          <Plus size={14} /> Add Issue
        </button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-2xl space-y-2 mb-4" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
          <textarea
            placeholder="Describe the issue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-20 px-3 py-2 rounded-xl outline-none text-sm resize-none"
            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 px-3 rounded-xl outline-none text-sm"
              style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="flex-1 h-9 rounded-xl text-xs" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleSave} className="flex-1 h-9 rounded-xl text-xs font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>Save</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {issues.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No issues recorded</p>
        ) : (
          issues.map((iss: any, i) => (
            <div key={iss.id ?? i} className="p-3 rounded-2xl flex items-center justify-between" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{iss.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: severityColors[iss.severity] + '22', color: severityColors[iss.severity] }}>
                    {iss.severity}
                  </span>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{format(new Date(iss.date), 'd MMM')}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(iss.id)} className="press p-2" style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SettingsVehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [tab, setTab] = useState<VehicleTab>('Refills');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVehicles().then((data: any) => {
      const vList = Array.isArray(data) ? data : [];
      setVehicles(vList);
      if (vList.length > 0) setSelectedVehicle(vList[0]);
    }).catch(() => setVehicles([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} /></div>;

  if (vehicles.length === 0 || !selectedVehicle) {
    return (
      <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex items-center gap-3 px-4 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Vehicles</h1>
        </div>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center px-4">
            <Fuel size={48} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>No vehicles yet</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>Add your first vehicle to track refills, services, and issues</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Vehicles</h1>
      </div>

      {/* Vehicle Selector */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto pb-2">
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => (setSelectedVehicle(v), setTab('Refills'))}
            className="px-3 py-2 rounded-xl text-sm font-semibold press whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: selectedVehicle?.id === v.id ? 'var(--accent)' : 'var(--surface)',
              color: selectedVehicle?.id === v.id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${selectedVehicle?.id === v.id ? 'var(--accent)' : 'var(--border)'}`
            }}
          >
            {v.make?.split(' ')[0] ?? 'Vehicle'} {v.licensePlate?.slice(-3) ?? ''}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="px-4 mb-4 flex gap-2 rounded-2xl p-1" style={{ backgroundColor: 'var(--surface)' }}>
        {['Refills', 'Services', 'Issues'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t as VehicleTab)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold press"
            style={{
              backgroundColor: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--text-muted)'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Refills' && <RefillsTab vehicle={selectedVehicle} onUpdate={setSelectedVehicle} />}
      {tab === 'Services' && <ServicesTab vehicle={selectedVehicle} onUpdate={setSelectedVehicle} />}
      {tab === 'Issues' && <IssuesTab vehicle={selectedVehicle} onUpdate={setSelectedVehicle} />}
    </div>
  );
}
