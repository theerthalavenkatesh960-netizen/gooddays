import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, DollarSign, Dumbbell, UtensilsCrossed, Fuel,
  CheckSquare, BookOpen, MessageSquare, Scale,
  ChevronLeft, Check, Droplets
} from 'lucide-react';
import * as api from '../lib/api';
import cardApi, { type CreditCard } from '../lib/cardApi';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface LogSheetProps {
  onClose: () => void;
  userId?: number;
}

type SubSheet = 'expense' | 'workout' | 'meal' | 'refill' | 'task' | 'journal' | 'note' | 'weight' | 'water' | null;

type ExerciseOption = { id: number; name: string; muscleGroup?: string };
type MealTemplateOption = { id: number; name: string; timing?: string; ingredientsJson?: string };
type MasterMealOption = { id: number; name: string; timing?: string; totalCaloriesKcal?: number; totalProteinG?: number };

function normalizePlannedExerciseIds(rawPlannedExercises: unknown): number[] {
  let parsed: unknown = rawPlannedExercises;
  if (typeof rawPlannedExercises === 'string') {
    try {
      parsed = JSON.parse(rawPlannedExercises);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry: any) => Number(entry?.exerciseId))
    .filter((id): id is number => Number.isFinite(id));
}

function normalizePlannedMealIdsForDay(dayValue: unknown): number[] {
  if (!Array.isArray(dayValue)) return [];
  return dayValue
    .map((item: any) => {
      if (typeof item === 'number') return item;
      if (item && typeof item === 'object' && 'mealTemplateId' in item) {
        const id = Number(item.mealTemplateId);
        return Number.isFinite(id) ? id : null;
      }
      return null;
    })
    .filter((id): id is number => Number.isFinite(id));
}

function parseCaloriesAndProtein(ingredientsJson?: string): { calories: number; protein: number } {
  if (!ingredientsJson) return { calories: 0, protein: 0 };
  try {
    const parsed = JSON.parse(ingredientsJson);
    if (!Array.isArray(parsed)) return { calories: 0, protein: 0 };
    return parsed.reduce(
      (acc, ing: any) => ({
        calories: acc.calories + Number(ing?.caloriesKcal || 0),
        protein: acc.protein + Number(ing?.proteinG || 0),
      }),
      { calories: 0, protein: 0 }
    );
  } catch {
    return { calories: 0, protein: 0 };
  }
}

const QUICK_OPTIONS = [
  { id: 'expense',  label: 'Expense',    icon: DollarSign,      color: '#FF6B6B' },
  { id: 'workout',  label: 'Workout',    icon: Dumbbell,        color: '#4ECDC4' },
  { id: 'meal',     label: 'Meal',       icon: UtensilsCrossed, color: '#FFD93D' },
  { id: 'water',    label: 'Water',      icon: Droplets,        color: '#06B6D4' },
  { id: 'refill',   label: 'Car Refill', icon: Fuel,            color: '#6C63FF' },
  { id: 'task',     label: 'Task',       icon: CheckSquare,     color: '#4ECDC4' },
  { id: 'journal',  label: 'Journal',    icon: BookOpen,        color: '#FF6B6B' },
  { id: 'note',     label: 'Quick Note', icon: MessageSquare,   color: '#8888A0' },
  { id: 'weight',   label: 'Body Weight',icon: Scale,           color: '#FFD93D' },
] as const;

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment', 'Health',
  'Utilities', 'Education', 'Rent', 'Fuel', 'Other'
];

export default function LogSheet({ onClose, userId }: LogSheetProps) {
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubSheet>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Expense state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');
  const [expenseNote, setExpenseNote] = useState('');
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [expenseCardId, setExpenseCardId] = useState<string>('');

  // Workout state
  const [workoutName, setWorkoutName] = useState('');
  const [workoutMins, setWorkoutMins] = useState('');
  const [workoutReps, setWorkoutReps] = useState('10');
  const [workoutWeightKg, setWorkoutWeightKg] = useState('');
  const [showWorkoutAdvanced, setShowWorkoutAdvanced] = useState(false);
  const [allExercises, setAllExercises] = useState<ExerciseOption[]>([]);
  const [plannedExercises, setPlannedExercises] = useState<ExerciseOption[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [workoutPlanId, setWorkoutPlanId] = useState<number | null>(null);

  // Meal state
  const [allMealTemplates, setAllMealTemplates] = useState<MealTemplateOption[]>([]);
  const [plannedMealsToday, setPlannedMealsToday] = useState<MealTemplateOption[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  const [selectedCatalogMealId, setSelectedCatalogMealId] = useState<number | null>(null);
  const [mealPickMode, setMealPickMode] = useState<'existing' | 'create'>('existing');
  const [mealSearch, setMealSearch] = useState('');
  const [catalogMeals, setCatalogMeals] = useState<MasterMealOption[]>([]);
  const [loadingCatalogMeals, setLoadingCatalogMeals] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealTiming, setNewMealTiming] = useState('snack');
  const [newMealCalories, setNewMealCalories] = useState('');
  const [newMealProtein, setNewMealProtein] = useState('');
  const [newMealCarbs, setNewMealCarbs] = useState('');
  const [newMealFats, setNewMealFats] = useState('');
  const [todayMealIds, setTodayMealIds] = useState<number[]>([]);

  // Refill state
  const [vehicles, setVehicles] = useState<api.Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [refillLitres, setRefillLitres] = useState('');
  const [refillAmount, setRefillAmount] = useState('');
  const [refillOdometer, setRefillOdometer] = useState('');

  // Task state
  const [taskTitle, setTaskTitle] = useState('');

  // Journal state
  const [journalTitle, setJournalTitle] = useState('');
  const [journalBody, setJournalBody] = useState('');

  // Note state
  const [noteText, setNoteText] = useState('');

  // Weight state
  const [weight, setWeight] = useState('');

  // Water state
  const [waterMl, setWaterMl] = useState(250);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDayKey = format(new Date(), 'EEEE').toLowerCase();

  const selectedExercise = useMemo(
    () => allExercises.find(ex => ex.id === selectedExerciseId) || null,
    [allExercises, selectedExerciseId]
  );

  const selectedMeal = useMemo(
    () => allMealTemplates.find(m => m.id === selectedMealId) || null,
    [allMealTemplates, selectedMealId]
  );

  const selectedCatalogMeal = useMemo(
    () => catalogMeals.find(m => m.id === selectedCatalogMealId) || null,
    [catalogMeals, selectedCatalogMealId]
  );

  const searchableMeals = useMemo(() => {
    const q = mealSearch.trim().toLowerCase();
    const plannedSet = new Set(plannedMealsToday.map(m => m.id));
    const combined = [...plannedMealsToday, ...allMealTemplates.filter(m => !plannedSet.has(m.id))];
    if (!q) return combined;
    return combined.filter(meal => {
      const name = meal.name.toLowerCase();
      const timing = (meal.timing || '').toLowerCase();
      return name.includes(q) || timing.includes(q);
    });
  }, [mealSearch, plannedMealsToday, allMealTemplates]);

  useEffect(() => {
    if (!sub || userId == null) return;
    const currentUserId = userId;

    let cancelled = false;
    async function loadMeta() {
      setLoadingMeta(true);
      setError('');
      try {
        if (sub === 'expense') {
          const userCards = await cardApi.getCards(currentUserId);
          if (!cancelled) setCards(Array.isArray(userCards) ? userCards : []);
        }

        if (sub === 'workout') {
          const [exerciseData, todayPlan] = await Promise.all([
            api.getExercises(),
            api.getWorkoutPlanByDate(today),
          ]);

          const all: ExerciseOption[] = Array.isArray(exerciseData)
            ? exerciseData.map((e: any) => ({ id: Number(e.id), name: String(e.name || 'Exercise'), muscleGroup: e.muscleGroup ? String(e.muscleGroup) : undefined }))
            : [];

          const plannedIds = normalizePlannedExerciseIds((todayPlan as any)?.plannedExercises);
          const planned = plannedIds
            .map(id => all.find(ex => ex.id === id))
            .filter(Boolean) as ExerciseOption[];

          if (!cancelled) {
            setAllExercises(all);
            setPlannedExercises(planned);
            setWorkoutPlanId(Number((todayPlan as any)?.id) || null);
            if (planned.length > 0) {
              setSelectedExerciseId(prev => prev ?? planned[0].id);
            }
          }
        }

        if (sub === 'meal') {
          const [templateData, weeklyPlan, todayLog] = await Promise.all([
            api.getMealTemplates(),
            api.getWeeklyMealPlan() as Promise<any>,
            api.getDailyMealLog(today) as Promise<any>,
          ]);

          const templates: MealTemplateOption[] = Array.isArray(templateData)
            ? templateData.map((m: any) => ({
                id: Number(m.id),
                name: String(m.name || 'Meal'),
                timing: m.timing ? String(m.timing) : undefined,
                ingredientsJson: typeof m.ingredientsJson === 'string' ? m.ingredientsJson : undefined,
              }))
            : [];

          const rawPlanJson = (weeklyPlan as any)?.planJson ?? (weeklyPlan as any)?.plan_json;
          const planMap = rawPlanJson
            ? (typeof rawPlanJson === 'string' ? JSON.parse(rawPlanJson) : rawPlanJson)
            : {};

          const plannedIds = normalizePlannedMealIdsForDay(planMap?.[today])
            .concat(normalizePlannedMealIdsForDay(planMap?.[todayDayKey]))
            .filter((id, idx, arr) => arr.indexOf(id) === idx);

          const plannedTodayList = plannedIds
            .map(id => templates.find((m: MealTemplateOption) => m.id === id))
            .filter(Boolean) as MealTemplateOption[];

          if (!cancelled) {
            setAllMealTemplates(templates);
            setPlannedMealsToday(plannedTodayList);
            setTodayMealIds(Array.isArray(todayLog?.mealIds) ? todayLog.mealIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id)) : []);
            const defaultMeal = plannedTodayList[0] ?? templates[0] ?? null;
            setMealPickMode('existing');
            setSelectedMealId(prev => prev ?? defaultMeal?.id ?? null);
          }
        }

        if (sub === 'refill') {
          const list = await api.getVehicles();
          const vehicleList = Array.isArray(list) ? list : [];
          if (!cancelled) {
            setVehicles(vehicleList);
            if (vehicleList.length > 0) {
              setSelectedVehicleId(prev => prev ?? Number(vehicleList[0].id));
              if (!refillOdometer) {
                const v = vehicleList[0] as any;
                if (Number.isFinite(Number(v?.odometer))) {
                  setRefillOdometer(String(v.odometer));
                }
              }
            }
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load quick log options');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [sub, userId, today, todayDayKey]);

  useEffect(() => {
    if (sub !== 'meal' || mealPickMode !== 'existing') {
      setCatalogMeals([]);
      return;
    }

    const query = mealSearch.trim();
    if (query.length < 2) {
      setCatalogMeals([]);
      return;
    }

    let cancelled = false;
    async function loadCatalogMeals() {
      setLoadingCatalogMeals(true);
      try {
        const data = await api.getMealCatalog({ search: query });
        if (cancelled) return;
        const mapped: MasterMealOption[] = Array.isArray(data)
          ? data.map((m: any) => ({
              id: Number(m.id),
              name: String(m.name || 'Meal'),
              timing: m.timing ? String(m.timing) : undefined,
              totalCaloriesKcal: Number(m.totalCaloriesKcal ?? 0),
              totalProteinG: Number(m.totalProteinG ?? 0),
            }))
            .filter((m: MasterMealOption) => Number.isFinite(m.id) && m.id > 0)
          : [];
        setCatalogMeals(mapped);
      } catch {
        if (!cancelled) setCatalogMeals([]);
      } finally {
        if (!cancelled) setLoadingCatalogMeals(false);
      }
    }

    loadCatalogMeals();
    return () => {
      cancelled = true;
    };
  }, [sub, mealPickMode, mealSearch]);

  useEffect(() => {
    setError('');
    setSaved(false);
    setShowWorkoutAdvanced(false);
    if (sub === 'meal') {
      setMealPickMode('existing');
      setMealSearch('');
      setCatalogMeals([]);
      setSelectedCatalogMealId(null);
      setNewMealName('');
      setNewMealCalories('');
      setNewMealProtein('');
      setNewMealCarbs('');
      setNewMealFats('');
      setNewMealTiming('snack');
    }
    if (sub === 'journal') {
      setJournalTitle('');
      setJournalBody('');
    }
  }, [sub]);

  const handleSave = async () => {
    if (!userId) {
      setError('Sign in required to save logs');
      return;
    }

    setError('');
    setSaving(true);
    try {
      if (sub === 'journal') {
        const title = journalTitle.trim();
        const body = journalBody.trim();

        if (!title && !body) {
          setError('Add a title or journal text');
          return;
        }

        await api.createJournalEntry({
          title,
          body,
          moodTag: 'neutral',
          date: new Date().toISOString(),
        });
      }

      if (sub === 'expense') {
        const amount = Number(expenseAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          setError('Enter a valid amount');
          return;
        }

        const description = (expenseNote || expenseCategory).trim() || 'Quick expense';
        if (expenseCardId) {
          await cardApi.bulkCreateExpenses([
            {
              expense: {
                userId,
                description,
                note: expenseNote || undefined,
                amount,
                category: expenseCategory,
                date: new Date().toISOString(),
              },
              cardId: expenseCardId,
            },
          ]);
        } else {
          await api.createExpense(userId, description, amount, expenseCategory, new Date());
        }

        const selectedCard = cards.find(c => c.id === expenseCardId);
        await api.logQuickEntry('expense', {
          amount,
          category: expenseCategory,
          description,
          cardId: expenseCardId || null,
          cardName: selectedCard?.name || null,
        }, today);
      } else if (sub === 'workout') {
        const durationMins = Number(workoutMins || 0);
        const reps = Number(workoutReps || 10);
        const weightKg = Number(workoutWeightKg || 0);

        if (selectedExerciseId) {
          let planId = workoutPlanId;
          if (!planId) {
            const createdPlan = await api.createWorkoutPlan({
              date: `${today}T00:00:00.000Z`,
              dayLabel: todayDayKey,
              plannedExercises: JSON.stringify([{ exerciseId: selectedExerciseId, targetSets: 1, targetReps: reps, targetWeightKg: weightKg || null }]),
              isCompleted: false,
            });
            planId = Number((createdPlan as any)?.id) || null;
            setWorkoutPlanId(planId);
          }

          if (planId) {
            await api.logWorkoutSet(planId, {
              exerciseId: selectedExerciseId,
              reps,
              weightKg,
              isCompleted: true,
            });
          }

          await api.logQuickEntry('workout', {
            planId,
            exerciseId: selectedExerciseId,
            exerciseName: selectedExercise?.name || workoutName || 'Workout',
            durationMins,
            reps,
            weightKg,
            source: plannedExercises.some(ex => ex.id === selectedExerciseId) ? 'planned' : 'other',
          }, today);
        } else if (workoutName.trim()) {
          await api.logQuickEntry('workout', {
            exerciseName: workoutName.trim(),
            durationMins,
            reps,
            weightKg,
            source: 'manual',
          }, today);
        } else {
          setError('Select a workout or enter a workout name');
          return;
        }
      } else if (sub === 'meal') {
        if (mealPickMode === 'existing') {
          let mealId = selectedMealId;
          let mealName = selectedMeal?.name || 'Meal';
          let source = plannedMealsToday.some(m => m.id === mealId) ? 'planned' : 'existing';

          if (!mealId && selectedCatalogMealId) {
            const cloned = await api.addMealFromCatalog(selectedCatalogMealId);
            const clonedId = Number((cloned as any)?.id || 0);
            if (!clonedId) {
              setError('Could not add selected catalog meal to your library');
              return;
            }
            mealId = clonedId;
            mealName = String((cloned as any)?.name || selectedCatalogMeal?.name || 'Meal');
            source = 'catalog';

            setAllMealTemplates(prev => {
              if (prev.some(p => p.id === clonedId)) return prev;
              return [
                {
                  id: clonedId,
                  name: mealName,
                  timing: (cloned as any)?.timing ? String((cloned as any).timing) : undefined,
                  ingredientsJson: typeof (cloned as any)?.ingredientsJson === 'string' ? (cloned as any).ingredientsJson : undefined,
                },
                ...prev,
              ];
            });
            setSelectedMealId(clonedId);
          }

          if (!mealId) {
            setError('Search and select a meal to log');
            return;
          }

          const nextMealIds = Array.from(new Set([...(todayMealIds || []), mealId]));
          await api.upsertDailyMealLog(today, nextMealIds);
          setTodayMealIds(nextMealIds);

          await api.logQuickEntry('meal', {
            mealIds: [mealId],
            mealId,
            mealName,
            source,
          }, today);
        } else {
          const name = newMealName.trim();
          const calories = Number(newMealCalories || 0);
          const protein = Number(newMealProtein || 0);
          const carbs = Number(newMealCarbs || 0);
          const fats = Number(newMealFats || 0);

          if (!name) {
            setError('Enter a meal name');
            return;
          }

          if (![calories, protein, carbs, fats].some(v => Number.isFinite(v) && v > 0)) {
            setError('Add at least one nutrition value');
            return;
          }

          const created = await api.createMealTemplate({
            name,
            timing: newMealTiming,
            recipe: '',
            imageUrl: null,
            ingredientsJson: JSON.stringify([
              {
                id: 0,
                name,
                qty: 1,
                baseQty: 1,
                baseUnit: 'serving',
                caloriesKcal: Number.isFinite(calories) ? calories : 0,
                proteinG: Number.isFinite(protein) ? protein : 0,
                carbsG: Number.isFinite(carbs) ? carbs : 0,
                fatsG: Number.isFinite(fats) ? fats : 0,
              },
            ]),
          });

          const createdMealId = Number((created as any)?.id || 0);
          if (!createdMealId) {
            setError('Meal was created but could not be logged. Try again.');
            return;
          }

          const nextMealIds = Array.from(new Set([...(todayMealIds || []), createdMealId]));
          await api.upsertDailyMealLog(today, nextMealIds);
          setTodayMealIds(nextMealIds);
          setAllMealTemplates(prev => [
            {
              id: createdMealId,
              name,
              timing: newMealTiming,
              ingredientsJson: JSON.stringify([
                {
                  caloriesKcal: Number.isFinite(calories) ? calories : 0,
                  proteinG: Number.isFinite(protein) ? protein : 0,
                  carbsG: Number.isFinite(carbs) ? carbs : 0,
                  fatsG: Number.isFinite(fats) ? fats : 0,
                },
              ]),
            },
            ...prev,
          ]);

          await api.logQuickEntry('meal', {
            mealIds: [createdMealId],
            mealId: createdMealId,
            mealName: name,
            calories: Number.isFinite(calories) ? calories : 0,
            proteinG: Number.isFinite(protein) ? protein : 0,
            carbsG: Number.isFinite(carbs) ? carbs : 0,
            fatsG: Number.isFinite(fats) ? fats : 0,
            source: 'created',
          }, today);
        }
      } else if (sub === 'refill') {
        const vehicleId = Number(selectedVehicleId || 0);
        const litres = Number(refillLitres || 0);
        const amount = Number(refillAmount || 0);
        const odometer = Number(refillOdometer || 0);

        if (!vehicleId || litres <= 0 || amount <= 0 || odometer <= 0) {
          setError('Select vehicle and fill valid refill details');
          return;
        }

        const vehicle = vehicles.find(v => v.id === vehicleId);
        await api.addRefill(vehicleId, {
          date: new Date().toISOString(),
          litres,
          amount,
          odometer,
          mileage: undefined,
        });

        // Quick log backend supports fixed types only; keep refill trace under expense with subtype.
        await api.logQuickEntry('expense', {
          subtype: 'refill',
          category: 'Fuel',
          amount,
          litres,
          odometer,
          vehicleId,
          vehicleName: vehicle?.name || 'Vehicle',
          description: `Fuel refill${vehicle?.name ? ` (${vehicle.name})` : ''}`,
        }, today);
      } else if (sub === 'task' && taskTitle && userId) {
        await api.createTask({
          userId,
          title: taskTitle,
          category: 'Personal',
          priority: 'medium',
          dueDate: new Date(),
          recurring: false,
        });
        await api.logQuickEntry('task', {
          title: taskTitle,
          source: 'quick-log',
        }, today);
      } else if (sub === 'note' && noteText.trim()) {
        await api.createJournalEntry({
          title: 'Quick Note',
          body: noteText.trim(),
          moodTag: 'neutral',
          date: new Date().toISOString(),
        });
      } else if (sub === 'weight' && weight && userId) {
        await api.logBodyWeight(Number(weight), today);
      } else if (sub === 'water' && waterMl > 0 && userId) {
        await api.incrementWaterIntake(today, waterMl);
        await api.logQuickEntry('water', { ml: waterMl }, today);
      }

      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sheetVariants = {
    hidden: { y: '100%' },
    visible: { y: 0, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
    exit: { y: '100%', transition: { duration: 0.2 } },
  };

  const canSave =
    (sub === 'expense' && Number(expenseAmount) > 0) ||
    (sub === 'workout' && (selectedExerciseId !== null || workoutName.trim().length > 0)) ||
    (sub === 'meal' && (
      (mealPickMode === 'existing' && (selectedMealId !== null || selectedCatalogMealId !== null)) ||
      (mealPickMode === 'create' && newMealName.trim().length > 0)
    )) ||
    (sub === 'refill' && selectedVehicleId !== null && Number(refillLitres) > 0 && Number(refillAmount) > 0 && Number(refillOdometer) > 0) ||
    (sub === 'task' && taskTitle.trim().length > 0) ||
    (sub === 'journal' && (journalTitle.trim().length > 0 || journalBody.trim().length > 0)) ||
    (sub === 'note' && noteText.trim().length > 0) ||
    (sub === 'weight' && Number(weight) > 0) ||
    (sub === 'water' && Number(waterMl) > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={onClose}
      />

      <motion.div
        className="relative sheet w-full max-w-md mx-auto max-h-[86dvh] min-h-[62dvh] overflow-y-auto scrollbar-none rounded-t-3xl"
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="sheet-handle" />

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          {sub ? (
            <button onClick={() => setSub(null)} className="flex items-center gap-1 press" style={{ color: 'var(--accent)' }}>
              <ChevronLeft size={18} />
              <span className="text-xs font-medium">Back</span>
            </button>
          ) : (
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Quick Log</span>
          )}
          <button onClick={onClose} className="press p-1">
            <X size={20} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!sub ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-2 px-3 pb-6 pt-1"
            >
              {QUICK_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSub(opt.id as SubSheet)}
                    className="flex flex-col items-center gap-2 p-2.5 rounded-xl press"
                    style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: opt.color + '22' }}>
                      <Icon size={16} style={{ color: opt.color }} />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key={sub}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="px-3 pb-4 pt-1"
            >
              {sub === 'expense' && (
                <div className="space-y-3">
                  <div>
                    <label className="section-label mb-2 block">Amount</label>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <span className="text-xl font-bold" style={{ color: 'var(--text-muted)' }}>₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={expenseAmount}
                        onChange={e => setExpenseAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 bg-transparent text-2xl font-bold num outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="section-label mb-2 block">Payment Method</label>
                    {loadingMeta ? (
                      <div className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>Loading cards...</div>
                    ) : (
                      <select
                        value={expenseCardId}
                        onChange={e => setExpenseCardId(e.target.value)}
                        className="w-full p-2.5 rounded-xl outline-none text-xs"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      >
                        <option value="">Cash / UPI / Other (No card link)</option>
                        {cards.map(card => (
                          <option key={card.id} value={card.id}>
                            {card.name} ({card.issuer}){card.last4Digits ? ` •••• ${card.last4Digits}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {expenseCardId && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--accent)' }}>
                        This expense will be linked to the selected card analytics.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="section-label mb-2 block">Category</label>
                    <div className="h-scroll pb-1">
                      {EXPENSE_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => setExpenseCategory(cat)}
                          className={`pill-tab ${expenseCategory === cat ? 'pill-tab-active' : 'pill-tab-inactive'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Note (optional)</label>
                    <input
                      type="text"
                      value={expenseNote}
                      onChange={e => setExpenseNote(e.target.value)}
                      placeholder="What was it for?"
                      className="w-full p-2.5 rounded-xl outline-none text-xs"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}

              {sub === 'workout' && (
                <div className="space-y-3">
                  {loadingMeta ? (
                    <div className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                      Loading workouts...
                    </div>
                  ) : (
                    <>
                      {plannedExercises.length > 0 && (
                        <div>
                          <label className="section-label mb-2 block">From Today's Plan</label>
                          <div className="space-y-1.5">
                            {plannedExercises.map(ex => (
                              <button
                                key={ex.id}
                                onClick={() => setSelectedExerciseId(ex.id)}
                                className="w-full text-left p-2.5 rounded-xl border"
                                style={{
                                  backgroundColor: selectedExerciseId === ex.id ? 'var(--accent)22' : 'var(--surface-elevated)',
                                  borderColor: selectedExerciseId === ex.id ? 'var(--accent)' : 'var(--border)',
                                  color: 'var(--text-primary)'
                                }}
                              >
                                <p className="text-xs font-semibold">{ex.name}</p>
                                {ex.muscleGroup && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ex.muscleGroup}</p>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="section-label mb-2 block">Other Workout</label>
                        <select
                          value={selectedExerciseId ?? ''}
                          onChange={e => setSelectedExerciseId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full p-2.5 rounded-xl outline-none text-xs"
                          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                        >
                          <option value="">Select from library</option>
                          {allExercises.map(ex => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}{ex.muscleGroup ? ` • ${ex.muscleGroup}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="section-label mb-2 block">Duration (min)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={workoutMins}
                      onChange={e => setWorkoutMins(e.target.value)}
                      placeholder="45"
                      className="w-full p-2.5 rounded-xl outline-none text-lg font-bold num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowWorkoutAdvanced(v => !v)}
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--accent)' }}
                  >
                    {showWorkoutAdvanced ? 'Hide details' : 'More options'}
                  </button>

                  {showWorkoutAdvanced && (
                    <>
                      <div>
                        <label className="section-label mb-2 block">Custom Name (optional)</label>
                        <input
                          type="text"
                          value={workoutName}
                          onChange={e => setWorkoutName(e.target.value)}
                          placeholder="Use only if not picking from list"
                          className="w-full p-3 rounded-xl outline-none text-sm font-semibold"
                          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="section-label mb-2 block">Reps</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={workoutReps}
                            onChange={e => setWorkoutReps(e.target.value)}
                            placeholder="10"
                            className="w-full p-2.5 rounded-xl outline-none text-lg font-bold num"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="section-label mb-2 block">Weight (kg)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={workoutWeightKg}
                            onChange={e => setWorkoutWeightKg(e.target.value)}
                            placeholder="0"
                            className="w-full p-2.5 rounded-xl outline-none text-lg font-bold num"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {sub === 'meal' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMealPickMode('existing')}
                      className="h-8 rounded-xl text-[11px] font-semibold"
                      style={{
                        backgroundColor: mealPickMode === 'existing' ? 'var(--accent)' : 'var(--surface-elevated)',
                        color: mealPickMode === 'existing' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      Existing Meal
                    </button>
                    <button
                      onClick={() => setMealPickMode('create')}
                      className="h-8 rounded-xl text-[11px] font-semibold"
                      style={{
                        backgroundColor: mealPickMode === 'create' ? 'var(--accent)' : 'var(--surface-elevated)',
                        color: mealPickMode === 'create' ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      Create New
                    </button>
                  </div>

                  {loadingMeta ? (
                    <div className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                      Loading meal options...
                    </div>
                  ) : mealPickMode === 'existing' ? (
                    <div>
                      <label className="section-label mb-2 block">Search Existing Meals</label>
                      <input
                        type="text"
                        value={mealSearch}
                        onChange={e => setMealSearch(e.target.value)}
                        placeholder="Search by name or timing"
                        className="w-full p-2.5 rounded-xl outline-none text-xs"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                      <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5 pr-1">
                        {searchableMeals.length === 0 ? (
                          <p className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                            No meals found. Switch to Create New to add and log one now.
                          </p>
                        ) : (
                          searchableMeals.map(meal => {
                            const meta = parseCaloriesAndProtein(meal.ingredientsJson);
                            const alreadyLogged = todayMealIds.includes(meal.id);
                            const isPlanned = plannedMealsToday.some(p => p.id === meal.id);
                            return (
                              <button
                                key={meal.id}
                                onClick={() => {
                                  setSelectedMealId(meal.id);
                                  setSelectedCatalogMealId(null);
                                }}
                                className="w-full text-left p-2.5 rounded-xl border"
                                style={{
                                  backgroundColor: selectedMealId === meal.id ? 'var(--accent)22' : 'var(--surface-elevated)',
                                  borderColor: selectedMealId === meal.id ? 'var(--accent)' : 'var(--border)',
                                  color: 'var(--text-primary)'
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold">{meal.name}</p>
                                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                      {meal.timing || 'Meal'} • {Math.round(meta.calories)} kcal • {Math.round(meta.protein)}g protein
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-0.5">
                                    {isPlanned && <span className="text-[10px]" style={{ color: 'var(--accent)' }}>Planned</span>}
                                    {alreadyLogged && <span className="text-[10px]" style={{ color: 'var(--accent-green)' }}>Logged</span>}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}

                        {mealSearch.trim().length >= 2 && (
                          <div className="pt-1">
                            <p className="text-[10px] font-semibold px-1 mb-1" style={{ color: 'var(--text-muted)' }}>
                              Catalog matches
                            </p>
                            {loadingCatalogMeals ? (
                              <p className="text-xs p-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                                Searching catalog...
                              </p>
                            ) : catalogMeals.length === 0 ? (
                              <p className="text-xs p-2 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                                No catalog matches
                              </p>
                            ) : (
                              catalogMeals.map(meal => (
                                <button
                                  key={`catalog-${meal.id}`}
                                  onClick={() => {
                                    setSelectedCatalogMealId(meal.id);
                                    setSelectedMealId(null);
                                  }}
                                  className="w-full text-left p-2.5 rounded-xl border mb-1.5"
                                  style={{
                                    backgroundColor: selectedCatalogMealId === meal.id ? 'var(--accent)22' : 'var(--surface-elevated)',
                                    borderColor: selectedCatalogMealId === meal.id ? 'var(--accent)' : 'var(--border)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-semibold">{meal.name}</p>
                                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                        {meal.timing || 'Meal'} • {Math.round(meal.totalCaloriesKcal || 0)} kcal • {Math.round(meal.totalProteinG || 0)}g protein
                                      </p>
                                    </div>
                                    <span className="text-[10px]" style={{ color: 'var(--accent)' }}>Catalog</span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="section-label mb-2 block">Meal Name</label>
                        <input
                          type="text"
                          value={newMealName}
                          onChange={e => setNewMealName(e.target.value)}
                          placeholder="e.g. Chicken Rice Bowl"
                          className="w-full p-2.5 rounded-xl outline-none text-sm"
                          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="section-label mb-2 block">Timing</label>
                        <select
                          value={newMealTiming}
                          onChange={e => setNewMealTiming(e.target.value)}
                          className="w-full p-2.5 rounded-xl outline-none text-xs"
                          style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                        >
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                          <option value="pre-workout">Pre-workout</option>
                          <option value="post-workout">Post-workout</option>
                          <option value="snack">Snack</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="section-label mb-2 block">Calories</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={newMealCalories}
                            onChange={e => setNewMealCalories(e.target.value)}
                            placeholder="500"
                            className="w-full p-2.5 rounded-xl outline-none text-xs num"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="section-label mb-2 block">Protein (g)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={newMealProtein}
                            onChange={e => setNewMealProtein(e.target.value)}
                            placeholder="35"
                            className="w-full p-2.5 rounded-xl outline-none text-xs num"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="section-label mb-2 block">Carbs (g)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={newMealCarbs}
                            onChange={e => setNewMealCarbs(e.target.value)}
                            placeholder="45"
                            className="w-full p-2.5 rounded-xl outline-none text-xs num"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="section-label mb-2 block">Fats (g)</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={newMealFats}
                            onChange={e => setNewMealFats(e.target.value)}
                            placeholder="15"
                            className="w-full p-2.5 rounded-xl outline-none text-xs num"
                            style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        This creates the meal in your library and logs it for today in one step.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {sub === 'refill' && (
                <div className="space-y-3">
                  <div>
                    <label className="section-label mb-2 block">Vehicle</label>
                    {loadingMeta ? (
                      <div className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                        Loading vehicles...
                      </div>
                    ) : vehicles.length === 0 ? (
                      <div className="text-xs p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                        No vehicles found. Add one in Vehicles page.
                      </div>
                    ) : (
                      <select
                        value={selectedVehicleId ?? ''}
                        onChange={e => {
                          const id = Number(e.target.value);
                          setSelectedVehicleId(Number.isFinite(id) ? id : null);
                          const v = vehicles.find(x => x.id === id);
                          if (v && Number.isFinite(Number(v.odometer))) {
                            setRefillOdometer(String(v.odometer));
                          }
                        }}
                        className="w-full p-2.5 rounded-xl outline-none text-xs"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      >
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} • {v.make} {v.model} • {v.regNo}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="section-label mb-2 block">Litres</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={refillLitres}
                        onChange={e => setRefillLitres(e.target.value)}
                        placeholder="30.5"
                        className="w-full p-2.5 rounded-xl outline-none text-lg font-bold num"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="section-label mb-2 block">Amount (₹)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={refillAmount}
                        onChange={e => setRefillAmount(e.target.value)}
                        placeholder="2800"
                        className="w-full p-2.5 rounded-xl outline-none text-lg font-bold num"
                        style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="section-label mb-2 block">Odometer (km)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={refillOdometer}
                      onChange={e => setRefillOdometer(e.target.value)}
                      placeholder="12500"
                      className="w-full p-2.5 rounded-xl outline-none text-lg font-bold num"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  {refillLitres && refillAmount && (
                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cost per litre</p>
                      <p className="text-sm font-bold num" style={{ color: 'var(--accent-gold)' }}>
                        ₹{(parseFloat(refillAmount) / parseFloat(refillLitres)).toFixed(2)}/L
                      </p>
                    </div>
                  )}

                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Refill updates vehicle history and adds a quick-log record.
                  </p>
                </div>
              )}

              {sub === 'task' && (
                <div className="space-y-3">
                  <div>
                    <label className="section-label mb-2 block">Task</label>
                    <textarea
                      value={taskTitle}
                      onChange={e => setTaskTitle(e.target.value)}
                      placeholder="What needs to get done?"
                      rows={3}
                      className="w-full p-3 rounded-xl outline-none text-sm resize-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {sub === 'journal' && (
                <div className="space-y-3">
                  <div>
                    <label className="section-label mb-2 block">Title (optional)</label>
                    <input
                      type="text"
                      value={journalTitle}
                      onChange={e => setJournalTitle(e.target.value)}
                      placeholder="Today felt..."
                      className="w-full p-2.5 rounded-xl outline-none text-xs"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="section-label mb-2 block">Journal</label>
                    <textarea
                      value={journalBody}
                      onChange={e => setJournalBody(e.target.value)}
                      placeholder="Write your thoughts..."
                      rows={5}
                      className="w-full p-3 rounded-xl outline-none text-sm resize-none"
                      style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      navigate('/journal/new', { state: { fromQuickLog: true } });
                    }}
                    className="w-full h-9 rounded-xl text-[11px] font-semibold"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  >
                    Open Full Editor Instead
                  </button>
                </div>
              )}

              {sub === 'note' && (
                <div className="space-y-3">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Quick note..."
                    rows={5}
                    className="w-full p-3 rounded-xl outline-none text-sm resize-none"
                    style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                </div>
              )}

              {sub === 'water' && (
                <div className="space-y-3">
                  <label className="section-label mb-2 block">Water amount</label>
                  <div className="flex items-end gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={waterMl}
                      onChange={e => setWaterMl(Math.max(1, Number(e.target.value)))}
                      className="flex-1 bg-transparent text-3xl font-bold num outline-none"
                      style={{ color: 'var(--accent)' }}
                      autoFocus
                    />
                    <span className="text-base font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>ml</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 250, 500, 1000].map(ml => (
                      <button key={ml} onClick={() => setWaterMl(ml)}
                        className="py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ backgroundColor: waterMl === ml ? 'var(--accent)' : 'var(--surface-elevated)', color: waterMl === ml ? '#fff' : 'var(--text-primary)' }}>
                        {ml >= 1000 ? '1L' : `${ml}ml`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sub === 'weight' && (
                <div className="space-y-3">
                  <div>
                    <label className="section-label mb-2 block">Body Weight</label>
                    <div className="flex items-end gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={weight}
                        onChange={e => setWeight(e.target.value)}
                        placeholder="72.5"
                        className="flex-1 bg-transparent text-3xl font-bold num outline-none"
                        style={{ color: 'var(--text-primary)' }}
                        autoFocus
                      />
                      <span className="text-base font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>kg</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-2.5 rounded-xl text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)' }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || saved || !canSave}
                className="w-full h-10 rounded-xl mt-5 text-sm font-semibold text-white press flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: saved ? 'var(--accent-green)' : 'var(--accent)', opacity: (saving || saved || !canSave) ? 0.7 : 1 }}
              >
                {saved ? (
                  <>
                    <Check size={18} />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  'Save'
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
