import { useState, useEffect } from 'react';
import {
  ChevronLeft, Fuel, Gauge, MapPin, Plus, Trash2, AlertTriangle, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import type { Vehicle } from '../lib/api';

type VehicleTab = 'Refills' | 'Services' | 'Issues';

const formatNum = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0);

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

  const services = vehicle.services ?? [];

  async function handleSave() {
    if (!type || !date) return;
    const s = await api.addServiceLog(vehicle.id, { type, notes, cost: cost ? parseFloat(cost) : 0, date });
    onUpdate({ ...vehicle, services: [s, ...services] });
    setType(''); setNotes(''); setCost(''); setShowAdd(false);
  }

  async function handleDelete(serviceId: number) {
    await api.deleteServiceLog(vehicle.id, serviceId);
    onUpdate({ ...vehicle, services: services.filter(s => s.id !== serviceId) });
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

  const issues = vehicle.issues ?? [];

  async function handleSave() {
    if (!description) return;
    const iss = await api.addIssueLog(vehicle.id, { description, severity, date });
    onUpdate({ ...vehicle, issues: [iss, ...issues] });
    setDescription(''); setSeverity('medium'); setShowAdd(false);
  }

  async function handleDelete(issueId: number) {
    await api.deleteIssueLog(vehicle.id, issueId);
    onUpdate({ ...vehicle, issues: issues.filter(iss => iss.id !== issueId) });
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
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showEditVehicle, setShowEditVehicle] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', make: '', model: '', year: new Date().getFullYear().toString(),
    regNo: '', fuelType: 'Petrol', color: '#6C63FF', odometer: ''
  });
  const [editForm, setEditForm] = useState({
    name: '', make: '', model: '', year: new Date().getFullYear().toString(),
    regNo: '', fuelType: 'Petrol', color: '#6C63FF', odometer: ''
  });

  useEffect(() => {
    api.getVehicles().then((data: any) => {
      const vList = Array.isArray(data) ? data : [];
      setVehicles(vList);
    }).catch(() => setVehicles([])).finally(() => setLoading(false));
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

  function openEditVehicleForm(vehicle: Vehicle) {
    setEditForm({
      name: vehicle.name || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: (vehicle.year || new Date().getFullYear()).toString(),
      regNo: vehicle.regNo || '',
      fuelType: vehicle.fuelType || 'Petrol',
      color: vehicle.color || '#6C63FF',
      odometer: (vehicle.odometer || 0).toString(),
    });
    setShowEditVehicle(true);
  }

  async function handleEditVehicle() {
    if (!selectedVehicle || !editForm.name.trim() || !editForm.make.trim() || !editForm.odometer) return;

    const payload = {
      name: editForm.name,
      make: editForm.make,
      model: editForm.model,
      year: parseInt(editForm.year),
      regNo: editForm.regNo,
      fuelType: editForm.fuelType,
      color: editForm.color,
      odometer: parseInt(editForm.odometer),
    };

    const updatedFromApi = await api.updateVehicle(selectedVehicle.id, payload);
    const updatedVehicle: Vehicle = {
      ...selectedVehicle,
      ...payload,
      ...(updatedFromApi || {}),
      // Preserve nested logs if API only returns vehicle fields.
      refills: updatedFromApi?.refills ?? selectedVehicle.refills ?? [],
      services: updatedFromApi?.services ?? selectedVehicle.services ?? [],
      issues: updatedFromApi?.issues ?? selectedVehicle.issues ?? [],
    };

    setVehicles(prev => prev.map(v => v.id === selectedVehicle.id ? updatedVehicle : v));
    setSelectedVehicle(updatedVehicle);
    setShowEditVehicle(false);
  }

  async function handleDeleteVehicle() {
    if (!selectedVehicle) return;
    const confirmed = window.confirm(`Delete ${selectedVehicle.name || 'this vehicle'}? This action cannot be undone.`);
    if (!confirmed) return;

    await api.deleteVehicle(selectedVehicle.id);
    const nextVehicles = vehicles.filter(v => v.id !== selectedVehicle.id);
    setVehicles(nextVehicles);
    setSelectedVehicle(null);
    setShowEditVehicle(false);
  }

  function handleVehicleUpdate(updated: Vehicle) {
    setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
    setSelectedVehicle(updated);
  }

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }} /></div>;

  if (vehicles.length === 0) {
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
            <button
              onClick={() => setShowAddVehicle(v => !v)}
              className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold press"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              <Plus size={14} />
              Add Vehicle
            </button>

            {showAddVehicle && (
              <div className="mt-4 p-4 rounded-2xl space-y-3 text-left" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Vehicle</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Nickname *" className="w-full h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  </div>
                  <input value={addForm.make} onChange={e => setAddForm(p => ({ ...p, make: e.target.value }))} placeholder="Make *" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <input value={addForm.model} onChange={e => setAddForm(p => ({ ...p, model: e.target.value }))} placeholder="Model" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <input type="number" value={addForm.year} onChange={e => setAddForm(p => ({ ...p, year: e.target.value }))} placeholder="Year" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <input value={addForm.regNo} onChange={e => setAddForm(p => ({ ...p, regNo: e.target.value }))} placeholder="Reg. No" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <select value={addForm.fuelType} onChange={e => setAddForm(p => ({ ...p, fuelType: e.target.value }))} className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                    {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(f => <option key={f}>{f}</option>)}
                  </select>
                  <input type="number" value={addForm.odometer} onChange={e => setAddForm(p => ({ ...p, odometer: e.target.value }))} placeholder="Odometer (km) *" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                  <div className="flex items-center gap-2 h-10 px-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <input type="color" value={addForm.color} onChange={e => setAddForm(p => ({ ...p, color: e.target.value }))} className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{addForm.color}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddVehicle(false)} className="flex-1 h-10 rounded-xl text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
                  <button onClick={handleAddVehicle} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>Add Vehicle</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedVehicle) {
    return (
      <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex items-center gap-3 px-4 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
            <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Vehicles</h1>
        </div>

        <div className="px-4">
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => {
                setSelectedVehicle(v);
                setShowEditVehicle(false);
              }}
              className="w-full p-4 rounded-2xl mb-3 press"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (v.color || '#6C63FF') + '22' }}>
                  <svg viewBox="0 0 64 32" width="48" height="24">
                    <path d="M6 20 L10 10 L22 8 L42 8 L54 10 L58 20 Z" fill={v.color || '#6C63FF'} opacity="0.8" rx="2"/>
                    <circle cx="16" cy="22" r="5" fill="#333" stroke={v.color || '#6C63FF'} strokeWidth="2"/>
                    <circle cx="48" cy="22" r="5" fill="#333" stroke={v.color || '#6C63FF'} strokeWidth="2"/>
                    <path d="M20 10 L24 8 L40 8 L44 10 L36 10 Z" fill={v.color || '#6C63FF'} opacity="0.5"/>
                  </svg>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{v.name}</p>
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

          {showAddVehicle && (
            <div className="p-4 rounded-2xl space-y-3 mb-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Add Vehicle</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Nickname *" className="w-full h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                </div>
                <input value={addForm.make} onChange={e => setAddForm(p => ({ ...p, make: e.target.value }))} placeholder="Make *" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <input value={addForm.model} onChange={e => setAddForm(p => ({ ...p, model: e.target.value }))} placeholder="Model" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <input type="number" value={addForm.year} onChange={e => setAddForm(p => ({ ...p, year: e.target.value }))} placeholder="Year" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <input value={addForm.regNo} onChange={e => setAddForm(p => ({ ...p, regNo: e.target.value }))} placeholder="Reg. No" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <select value={addForm.fuelType} onChange={e => setAddForm(p => ({ ...p, fuelType: e.target.value }))} className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                  {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(f => <option key={f}>{f}</option>)}
                </select>
                <input type="number" value={addForm.odometer} onChange={e => setAddForm(p => ({ ...p, odometer: e.target.value }))} placeholder="Odometer (km) *" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
                <div className="flex items-center gap-2 h-10 px-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                  <input type="color" value={addForm.color} onChange={e => setAddForm(p => ({ ...p, color: e.target.value }))} className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{addForm.color}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAddVehicle(false)} className="flex-1 h-10 rounded-xl text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button onClick={handleAddVehicle} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>Add Vehicle</button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowAddVehicle(v => !v)}
            className="w-full h-12 rounded-2xl text-sm font-medium press flex items-center justify-center gap-2"
            style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-nav" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <button onClick={() => setSelectedVehicle(null)} className="w-9 h-9 rounded-xl flex items-center justify-center press" style={{ backgroundColor: 'var(--surface)' }}>
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Vehicles</h1>
      </div>

      {/* Vehicle Hero Card */}
      <div
        className="mx-4 mb-4 p-4 rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${(selectedVehicle.color || '#6C63FF')}33, var(--surface))`,
          border: `1px solid ${(selectedVehicle.color || '#6C63FF')}55`
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {selectedVehicle.fuelType || 'Fuel'} · {selectedVehicle.regNo || '--'}
            </p>
            <p className="text-base font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              {selectedVehicle.name || `${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim() || 'Vehicle'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {selectedVehicle.make || 'Make'} {selectedVehicle.model || 'Model'} {selectedVehicle.year || ''}
            </p>
            <div className="flex items-center gap-3 mt-2.5">
              <div className="flex items-center gap-1.5">
                <Gauge size={14} style={{ color: selectedVehicle.color || 'var(--accent)' }} />
                <span className="text-sm font-bold num" style={{ color: 'var(--text-primary)' }}>
                  {formatNum(selectedVehicle.odometer || 0)} km
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Fuel size={14} style={{ color: 'var(--accent-green)' }} />
                <span className="text-xs num" style={{ color: 'var(--text-secondary)' }}>
                  {((selectedVehicle.refills ?? []).filter(r => r.mileage).reduce((s, r, _, a) => s + (r.mileage ?? 0) / (a.length || 1), 0)).toFixed(1)} km/L
                </span>
              </div>
            </div>
          </div>

          <div className="w-20 h-14 flex items-center justify-center">
            <svg viewBox="0 0 64 32" width="80" height="40">
              <path d="M6 20 L10 10 L22 8 L42 8 L54 10 L58 20 Z" fill={selectedVehicle.color || '#6C63FF'} opacity="0.8" rx="2"/>
              <circle cx="16" cy="22" r="5" fill="#111" stroke={selectedVehicle.color || '#6C63FF'} strokeWidth="2"/>
              <circle cx="48" cy="22" r="5" fill="#111" stroke={selectedVehicle.color || '#6C63FF'} strokeWidth="2"/>
              <path d="M20 10 L24 8 L40 8 L44 10 L36 10 Z" fill={selectedVehicle.color || '#6C63FF'} opacity="0.4"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4 flex gap-2">
        <button
          onClick={() => openEditVehicleForm(selectedVehicle)}
          className="flex-1 h-10 rounded-xl text-sm font-semibold press"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          Edit Vehicle
        </button>
        <button
          onClick={handleDeleteVehicle}
          className="h-10 px-4 rounded-xl text-sm font-semibold press flex items-center gap-2"
          style={{ backgroundColor: '#ef444422', color: '#ef4444', border: '1px solid #ef444455' }}
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {showEditVehicle && (
        <div className="mx-4 mb-4 p-4 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--accent)44' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Vehicle</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Nickname *" className="w-full h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            </div>
            <input value={editForm.make} onChange={e => setEditForm(p => ({ ...p, make: e.target.value }))} placeholder="Make *" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            <input value={editForm.model} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))} placeholder="Model" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            <input type="number" value={editForm.year} onChange={e => setEditForm(p => ({ ...p, year: e.target.value }))} placeholder="Year" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            <input value={editForm.regNo} onChange={e => setEditForm(p => ({ ...p, regNo: e.target.value }))} placeholder="Reg. No" className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            <select value={editForm.fuelType} onChange={e => setEditForm(p => ({ ...p, fuelType: e.target.value }))} className="h-10 px-3 rounded-xl outline-none text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
              {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(f => <option key={f}>{f}</option>)}
            </select>
            <input type="number" value={editForm.odometer} onChange={e => setEditForm(p => ({ ...p, odometer: e.target.value }))} placeholder="Odometer (km) *" className="h-10 px-3 rounded-xl outline-none text-sm num" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }} />
            <div className="flex items-center gap-2 h-10 px-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
              <input type="color" value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent p-0" />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{editForm.color}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowEditVehicle(false)} className="flex-1 h-10 rounded-xl text-sm" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
            <button onClick={handleEditVehicle} className="flex-1 h-10 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--accent)' }}>Save Changes</button>
          </div>
        </div>
      )}

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
      {tab === 'Refills' && <RefillsTab vehicle={selectedVehicle} onUpdate={handleVehicleUpdate} />}
      {tab === 'Services' && <ServicesTab vehicle={selectedVehicle} onUpdate={handleVehicleUpdate} />}
      {tab === 'Issues' && <IssuesTab vehicle={selectedVehicle} onUpdate={handleVehicleUpdate} />}
    </div>
  );
}
