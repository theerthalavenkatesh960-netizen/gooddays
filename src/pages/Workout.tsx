import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Plus, ChevronRight, ChevronDown, Check, Trash2,
  BarChart2, BookOpen, Camera, Trophy, Calendar, X, Edit2, Save,
  Flame, TrendingUp
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import * as api from '../lib/api';

type Exercise = { id: number; name: string; muscleGroup: string; description?: string; imageUrl?: string; isCustom?: boolean };
type WorkoutSet = { id?: number; exerciseId: number; setNumber: number; reps?: number; weightKg?: number; durationSeconds?: number; isCompleted: boolean; notes?: string };
type WorkoutPlan = { id?: number; date: string; dayLabel?: string; plannedExercises: string; isCompleted: boolean; sets?: WorkoutSet[]; images?: { id: number; imageUrl: string; caption?: string }[] };

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'];

const TABS = [
  { id: 'today', label: "Today's Workout", shortLabel: 'Today', icon: Dumbbell },
  { id: 'library', label: 'Exercise Library', shortLabel: 'Library', icon: BookOpen },
  { id: 'history', label: 'History', shortLabel: 'History', icon: Calendar },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: BarChart2 },
  { id: 'prs', label: 'PRs', shortLabel: 'PRs', icon: Trophy },
];

export default function Workout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('today');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [todayPlan, setTodayPlan] = useState<WorkoutPlan | null>(null);
  const [workingSets, setWorkingSets] = useState<WorkoutSet[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [history, setHistory] = useState<WorkoutPlan[]>([]);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState('All');
  const [newExercise, setNewExercise] = useState({ name: '', muscleGroup: 'Chest', description: '', imageUrl: '' });
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null);
  const [planLabel, setPlanLabel] = useState('');
  const [editingPlanLabel, setEditingPlanLabel] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<number[]>([]);
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');
  const search = new URLSearchParams(location.search);
  const deepLinkTab = search.get('tab');
  const deepLinkExerciseId = Number(search.get('exerciseId') || '0');
  const returnPath = search.get('return');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (deepLinkTab && TABS.some(t => t.id === deepLinkTab)) {
      setActiveTab(deepLinkTab);
    }
  }, [deepLinkTab]);

  useEffect(() => {
    if (!deepLinkExerciseId) return;
    if (activeTab !== 'today') return;
    setExpandedExercise(deepLinkExerciseId);
  }, [deepLinkExerciseId, activeTab, todayPlan?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [exs, plan, prData] = await Promise.all([
        api.getExercises(),
        api.getWorkoutPlanByDate(today),
        api.getPersonalRecords(),
      ]);
      setExercises(Array.isArray(exs) ? exs : []);
      if (plan && plan.id) {
        setTodayPlan(plan);
        setWorkingSets(plan.sets || []);
      }
      setPrs(Array.isArray(prData) ? prData : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function loadHistory() {
    const from = format(subDays(new Date(), 90), 'yyyy-MM-dd');
    const plans = await api.getWorkoutPlans(from);
    setHistory(Array.isArray(plans) ? plans : []);
  }

  async function loadAnalytics() {
    const data = await api.getWorkoutAnalytics(12);
    setAnalytics(data);
  }

  async function createTodayPlan() {
    const planned = selectedExercises.map(id => {
      const ex = exercises.find(e => e.id === id);
      return { exerciseId: id, name: ex?.name, targetSets: 3, targetReps: 10, targetWeightKg: null };
    });
    const plan = await api.createWorkoutPlan({
      date: new Date().toISOString(),
      dayLabel: planLabel,
      plannedExercises: JSON.stringify(planned),
      isCompleted: false,
    });
    setTodayPlan(plan);
    setWorkingSets([]);
    setShowAddPlan(false);
    setSelectedExercises([]);
    setPlanLabel('');
  }

  async function logSet(exerciseId: number) {
    if (!todayPlan?.id) return;
    const existingSets = workingSets.filter(s => s.exerciseId === exerciseId);
    const setNumber = existingSets.length + 1;
    const prevSet = existingSets[existingSets.length - 1];
    const newSet = await api.logWorkoutSet(todayPlan.id, {
      exerciseId,
      setNumber,
      reps: prevSet?.reps ?? 10,
      weightKg: prevSet?.weightKg ?? 0,
      isCompleted: false,
    });
    setWorkingSets(prev => [...prev, newSet]);
  }

  async function updateSet(setId: number, field: string, value: any) {
    setWorkingSets(prev => prev.map(s => s.id === setId ? { ...s, [field]: value } : s));
    await api.updateWorkoutSet(setId, { [field]: value });
  }

  async function toggleSetComplete(set: WorkoutSet) {
    if (!set.id) return;
    const updated = await api.updateWorkoutSet(set.id, { ...set, isCompleted: !set.isCompleted });
    setWorkingSets(prev => prev.map(s => s.id === set.id ? updated : s));
  }

  async function deleteSet(setId: number) {
    await api.deleteWorkoutSet(setId);
    setWorkingSets(prev => prev.filter(s => s.id !== setId));
  }

  async function markDayComplete() {
    if (!todayPlan?.id) return;
    const updated = await api.updateWorkoutPlan(todayPlan.id, { ...todayPlan, isCompleted: true });
    setTodayPlan(updated);
    const freshPrs = await api.getPersonalRecords();
    setPrs(Array.isArray(freshPrs) ? freshPrs : []);
  }

  async function saveExercise() {
    if (!newExercise.name.trim()) return;

    if (editingExerciseId) {
      const updated = await api.updateExercise(editingExerciseId, newExercise);
      setExercises(prev => prev.map(ex => ex.id === editingExerciseId ? updated : ex));
    } else {
      const ex = await api.createExercise(newExercise);
      setExercises(prev => [...prev, ex]);
    }

    setNewExercise({ name: '', muscleGroup: 'Chest', description: '', imageUrl: '' });
    setEditingExerciseId(null);
    setShowAddExercise(false);
  }

  async function deleteExerciseItem(exerciseId: number) {
    await api.deleteExercise(exerciseId);
    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    setSelectedExercises(prev => prev.filter(id => id !== exerciseId));
  }

  async function deleteTodayPlan() {
    if (!todayPlan?.id) return;
    await api.deleteWorkoutPlan(todayPlan.id);
    setTodayPlan(null);
    setWorkingSets([]);
    setExpandedExercise(null);
  }

  async function savePlanLabel() {
    if (!todayPlan?.id) return;
    const updated = await api.updateWorkoutPlan(todayPlan.id, {
      ...todayPlan,
      dayLabel: planLabel,
    });
    setTodayPlan(updated);
    setEditingPlanLabel(false);
  }

  function openAddExercise() {
    setEditingExerciseId(null);
    setNewExercise({ name: '', muscleGroup: 'Chest', description: '', imageUrl: '' });
    setShowAddExercise(true);
  }

  function openEditExercise(exercise: Exercise) {
    setEditingExerciseId(exercise.id);
    setNewExercise({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      description: exercise.description || '',
      imageUrl: exercise.imageUrl || '',
    });
    setShowAddExercise(true);
  }

  async function handleImageUpload(planId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = await api.addWorkoutImage(planId, { imageUrl: dataUrl, caption: '' });
      setTodayPlan(prev => prev ? { ...prev, images: [...(prev.images || []), img] } : prev);
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    setPlanLabel(todayPlan?.dayLabel || '');
  }, [todayPlan?.dayLabel]);

  const plannedExercises = todayPlan ? (() => { try { return JSON.parse(todayPlan.plannedExercises); } catch { return []; } })() : [];

  const filteredExercises = filterMuscle === 'All' ? exercises : exercises.filter(e => e.muscleGroup === filterMuscle);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workout</h1>
          <p className="text-gray-500 mt-0.5">{format(new Date(), 'EEEE, MMM d')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {returnPath && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate(returnPath)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200">
              Back to Body
            </motion.button>
          )}
          {todayPlan && !todayPlan.isCompleted && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={markDayComplete}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold shadow-md">
              <Check size={18} /> Mark Complete
            </motion.button>
          )}
          {todayPlan && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={deleteTodayPlan}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold border border-red-200">
              <Trash2 size={16} /> Delete Workout
            </motion.button>
          )}
          {todayPlan?.isCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-semibold">
              <Flame size={18} /> Done!
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 mb-6 p-1 rounded-2xl hide-scrollbar" style={{ backgroundColor: 'var(--surface)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button key={tab.id} whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'history') loadHistory();
                if (tab.id === 'analytics') loadAnalytics();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all flex-shrink-0"
              style={{ backgroundColor: isActive ? 'var(--accent)' : 'transparent', color: isActive ? '#fff' : 'var(--text-muted)' }}>
              <Icon size={14} />
              <span>{tab.shortLabel}</span>
            </motion.button>
          );
        })}
      </div>

      {/* TODAY TAB */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          {!todayPlan ? (
            <div className="text-center py-16">
              <Dumbbell size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No workout planned for today</h3>
              <p className="text-gray-400 mb-6">Plan your workout — pick exercises and your targets</p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddPlan(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-lg mx-auto">
                <Plus size={20} /> Plan Today's Workout
              </motion.button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Day label */}
              <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                  <Dumbbell size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  {editingPlanLabel ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={planLabel}
                        onChange={e => setPlanLabel(e.target.value)}
                        placeholder="Workout label"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                      />
                      <button onClick={savePlanLabel} className="text-emerald-600"><Save size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{todayPlan.dayLabel || 'Today'}</p>
                      <button onClick={() => setEditingPlanLabel(true)} className="text-gray-400 hover:text-emerald-600">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">{plannedExercises.length} exercises planned</p>
                </div>
              </div>

              {/* Exercise cards */}
              {plannedExercises.map((planned: any) => {
                const exercise = exercises.find(e => e.id === planned.exerciseId);
                if (!exercise) return null;
                const sets = workingSets.filter(s => s.exerciseId === planned.exerciseId);
                const completedSets = sets.filter(s => s.isCompleted).length;
                const isExpanded = expandedExercise === planned.exerciseId;

                return (
                  <motion.div key={planned.exerciseId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button onClick={() => setExpandedExercise(isExpanded ? null : planned.exerciseId)}
                      className="w-full flex items-center gap-3 p-4">
                      {exercise.imageUrl ? (
                        <img src={exercise.imageUrl} alt={exercise.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Dumbbell size={20} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900">{exercise.name}</p>
                        <p className="text-sm text-gray-500">{exercise.muscleGroup} · {completedSets}/{sets.length} sets done</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {completedSets > 0 && completedSets === sets.length && sets.length > 0 && (
                          <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Check size={14} className="text-emerald-600" />
                          </div>
                        )}
                        {isExpanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="overflow-hidden">
                          <div className="px-4 pb-4 space-y-2">
                            {/* Set rows */}
                            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-400 uppercase px-1 mb-1">
                              <span>Set</span><span>Reps</span><span>Weight (kg)</span><span>Done</span>
                            </div>
                            {sets.map((set, idx) => (
                              <div key={set.id ?? idx} className={`grid grid-cols-4 gap-2 items-center p-2 rounded-xl ${set.isCompleted ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                                <span className="text-sm font-bold text-gray-600">#{set.setNumber}</span>
                                <input type="number" value={set.reps ?? ''} min={0}
                                  onChange={e => set.id && updateSet(set.id, 'reps', parseInt(e.target.value))}
                                  className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-sm text-center" />
                                <input type="number" value={set.weightKg ?? ''} min={0} step={0.5}
                                  onChange={e => set.id && updateSet(set.id, 'weightKg', parseFloat(e.target.value))}
                                  className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-sm text-center" />
                                <div className="flex items-center gap-1">
                                  <button onClick={() => toggleSetComplete(set)}
                                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${set.isCompleted ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => set.id && deleteSet(set.id)} className="text-gray-300 hover:text-red-400">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => logSet(planned.exerciseId)}
                              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-emerald-400 hover:text-emerald-600 text-sm font-medium transition-all">
                              <Plus size={16} /> Add Set
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* Photo upload */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-700 flex items-center gap-2"><Camera size={18} /> Workout Photos</p>
                  <label className="flex items-center gap-1 text-sm text-emerald-600 cursor-pointer hover:text-emerald-800">
                    <Plus size={16} /> Add Photo
                    <input type="file" accept="image/*" className="hidden" onChange={e => todayPlan.id && handleImageUpload(todayPlan.id, e)} />
                  </label>
                </div>
                {todayPlan.images && todayPlan.images.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {todayPlan.images.map(img => (
                      <img key={img.id} src={img.imageUrl} alt="" className="w-full h-24 object-cover rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No photos yet — document your workout!</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIBRARY TAB */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {['All', ...MUSCLE_GROUPS].map(mg => (
                <button key={mg} onClick={() => setFilterMuscle(mg)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterMuscle === mg ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {mg}
                </button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={openAddExercise}
              className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold sm:ml-2 flex-shrink-0">
              <Plus size={16} /> Add Exercise
            </motion.button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredExercises.map(ex => {
              const pr = prs.find(p => p.exerciseId === ex.id);
              return (
                <motion.div key={ex.id} whileHover={{ y: -2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {ex.imageUrl ? (
                    <img src={ex.imageUrl} alt={ex.name} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Dumbbell size={32} className="text-gray-300" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 text-sm">{ex.name}</p>
                    <p className="text-xs text-gray-500 mb-1">{ex.muscleGroup}</p>
                    {pr && (
                      <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Trophy size={12} /> PR: {pr.maxWeightKg}kg × {pr.reps}
                      </div>
                    )}
                    {ex.isCustom && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-indigo-500">Custom</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditExercise(ex)}
                            className="text-gray-400 hover:text-emerald-600"
                            title="Edit exercise"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteExerciseItem(ex.id)}
                            className="text-gray-400 hover:text-red-500"
                            title="Delete exercise"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Dumbbell size={40} className="mx-auto mb-2 opacity-40" />
              <p>No exercises found. Add some!</p>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {history.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={40} className="mx-auto mb-2 opacity-40" />
              <p>No workout history yet</p>
            </div>
          )}
          {history.map(plan => {
            const planned = (() => { try { return JSON.parse(plan.plannedExercises); } catch { return []; } })();
            return (
              <div key={plan.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">{format(new Date(plan.date), 'EEE, MMM d')}</p>
                    <p className="text-sm text-gray-500">{plan.dayLabel || ''} · {planned.length} exercises</p>
                  </div>
                  {plan.isCompleted && (
                    <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                      <Check size={16} /> Done
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Trained days (tracked)</p>
              <p className="text-2xl font-bold text-emerald-600">{analytics.trainedDates?.length ?? 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Total volume (12wk)</p>
              <p className="text-2xl font-bold text-indigo-600">
                {analytics.weeklyVolume?.reduce((sum: number, w: any) => sum + (w.totalVolume ?? 0), 0).toFixed(0)}kg
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="font-semibold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={18} /> Weekly Volume (12 weeks)</p>
            <div className="space-y-2">
              {(analytics.weeklyVolume ?? []).map((w: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0">{w.week}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                      style={{ width: `${Math.min(100, (w.totalVolume / 5000) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-16 text-right">{w.totalVolume?.toFixed(0)}kg</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRs TAB */}
      {activeTab === 'prs' && (
        <div className="space-y-3">
          {prs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Trophy size={40} className="mx-auto mb-2 opacity-40" />
              <p>No personal records yet. Start logging sets!</p>
            </div>
          )}
          {prs.map(pr => (
            <div key={pr.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Trophy size={20} className="text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{pr.exercise?.name ?? `Exercise #${pr.exerciseId}`}</p>
                <p className="text-sm text-gray-500">{pr.exercise?.muscleGroup}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-emerald-600">{pr.maxWeightKg}kg</p>
                <p className="text-xs text-gray-400">× {pr.reps} reps</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal: Plan Today's Workout ─── */}
      <AnimatePresence>
        {showAddPlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: 'min(90dvh, calc(100vh - 32px))' }}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Plan Today's Workout</h2>
                <button onClick={() => setShowAddPlan(false)}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <input value={planLabel} onChange={e => setPlanLabel(e.target.value)} placeholder="Day label (e.g. Chest + Triceps)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <p className="text-sm font-semibold text-gray-600">Select exercises:</p>
                <div className="flex gap-2 flex-wrap">
                  {['All', ...MUSCLE_GROUPS].map(mg => (
                    <button key={mg} onClick={() => setFilterMuscle(mg)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${filterMuscle === mg ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {mg}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {(filterMuscle === 'All' ? exercises : exercises.filter(e => e.muscleGroup === filterMuscle)).map(ex => {
                    const isSelected = selectedExercises.includes(ex.id);
                    return (
                      <button key={ex.id} onClick={() => setSelectedExercises(prev => isSelected ? prev.filter(id => id !== ex.id) : [...prev, ex.id])}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <span className="font-medium text-gray-800">{ex.name}</span>
                        <span className="text-xs text-gray-400 ml-auto">{ex.muscleGroup}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-white" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={createTodayPlan} disabled={selectedExercises.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold shadow-md disabled:opacity-40">
                  Start Workout ({selectedExercises.length} exercises)
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal: Add Exercise ─── */}
      <AnimatePresence>
        {showAddExercise && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md flex flex-col" style={{ maxHeight: 'min(90dvh, calc(100vh - 32px))' }}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">{editingExerciseId ? 'Edit Custom Exercise' : 'Add Custom Exercise'}</h2>
                <button onClick={() => { setShowAddExercise(false); setEditingExerciseId(null); }}><X size={20} className="text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <input value={newExercise.name} onChange={e => setNewExercise(p => ({ ...p, name: e.target.value }))} placeholder="Exercise name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <select value={newExercise.muscleGroup} onChange={e => setNewExercise(p => ({ ...p, muscleGroup: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                </select>
                <input value={newExercise.description} onChange={e => setNewExercise(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input value={newExercise.imageUrl} onChange={e => setNewExercise(p => ({ ...p, imageUrl: e.target.value }))} placeholder="Image URL (optional)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="p-4 sm:p-5 border-t border-gray-100 bg-white" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={saveExercise} disabled={!newExercise.name}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold disabled:opacity-40">
                  {editingExerciseId ? 'Save Exercise' : 'Add Exercise'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
