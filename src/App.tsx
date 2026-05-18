import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContextApi';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Body from './pages/Body';
import Workout from './pages/Workout';
import Finance from './pages/Finance';
import Cards from './pages/Cards';
import CardCategoryTransactions from './pages/CardCategoryTransactions';
import FinanceBudgetSettings from './pages/FinanceBudgetSettings';
import BucketDetail from './pages/BucketDetail';
import Life from './pages/Life';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import GoalCreate from './pages/GoalCreate';
import Settings from './pages/Settings';
import JournalEditor from './pages/JournalEditor';
import Vehicles from './pages/Vehicles';
import WorkoutLibrarySettings from './pages/WorkoutLibrarySettings';
import MealPlannerSettings from './pages/MealPlannerSettings';
import RoutineManager from './pages/RoutineManager';
import WorkoutExerciseDetails from './pages/WorkoutExerciseDetails';
import MealTemplateDetails from './pages/MealTemplateDetails';
import WorkoutAddExercisePage from './pages/WorkoutAddExercisePage';
import MealIngredientLibraryPage from './pages/MealIngredientLibraryPage';
import MealCreateTemplatePage from './pages/MealCreateTemplatePage';
import MealDayPickerPage from './pages/MealDayPickerPage';
import RoutineExercisePickerPage from './pages/RoutineExercisePickerPage';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        <div className="text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--accent)', opacity: 0.9 }}
          >
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LoadingProvider>
            <Routes>
              <Route path="/login"  element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
              <Route path="/body"     element={<PrivateRoute><Layout><Body /></Layout></PrivateRoute>} />
              <Route path="/body/workout-log" element={<PrivateRoute><Layout><Workout /></Layout></PrivateRoute>} />
              <Route path="/finance"  element={<PrivateRoute><Layout><Finance /></Layout></PrivateRoute>} />
              <Route path="/finance/cards" element={<PrivateRoute><Layout><Cards /></Layout></PrivateRoute>} />
              <Route path="/finance/cards/category/:category" element={<PrivateRoute><Layout><CardCategoryTransactions /></Layout></PrivateRoute>} />
              <Route path="/finance/cards/:cardId/category/:category" element={<PrivateRoute><Layout><CardCategoryTransactions /></Layout></PrivateRoute>} />
              <Route path="/finance/settings" element={<PrivateRoute><Layout><FinanceBudgetSettings /></Layout></PrivateRoute>} />
              <Route path="/finance/bucket/:id" element={<PrivateRoute><Layout><BucketDetail /></Layout></PrivateRoute>} />
              <Route path="/finance/vehicles" element={<PrivateRoute><Layout><Vehicles /></Layout></PrivateRoute>} />
              <Route path="/life"     element={<PrivateRoute><Layout><Life /></Layout></PrivateRoute>} />
              <Route path="/goals" element={<PrivateRoute><Layout><Goals /></Layout></PrivateRoute>} />
              <Route path="/goals/new" element={<PrivateRoute><Layout><GoalCreate /></Layout></PrivateRoute>} />
              <Route path="/goals/:id" element={<PrivateRoute><Layout><GoalDetail /></Layout></PrivateRoute>} />
              <Route path="/goals/:id/edit" element={<PrivateRoute><Layout><GoalCreate /></Layout></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library" element={<PrivateRoute><Layout><WorkoutLibrarySettings /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library/new-exercise" element={<PrivateRoute><Layout><WorkoutAddExercisePage /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library/exercise/:id" element={<PrivateRoute><Layout><WorkoutExerciseDetails /></Layout></PrivateRoute>} />
              <Route path="/settings/meals" element={<PrivateRoute><Layout><MealPlannerSettings /></Layout></PrivateRoute>} />
              <Route path="/settings/routines" element={<PrivateRoute><Layout><RoutineManager /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/ingredients" element={<PrivateRoute><Layout><MealIngredientLibraryPage /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/new-template" element={<PrivateRoute><Layout><MealCreateTemplatePage /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/template/:id" element={<PrivateRoute><Layout><MealTemplateDetails /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/pick" element={<PrivateRoute><Layout><MealDayPickerPage /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library/pick" element={<PrivateRoute><Layout><RoutineExercisePickerPage /></Layout></PrivateRoute>} />

              {/* Journal editor — full screen, no nav */}
              <Route path="/journal/new"      element={<PrivateRoute><JournalEditor /></PrivateRoute>} />
              <Route path="/journal/:id/edit" element={<PrivateRoute><JournalEditor /></PrivateRoute>} />

              {/* Legacy redirects */}
              <Route path="/workout"  element={<Navigate to="/body" />} />
              <Route path="/tasks"    element={<Navigate to="/life" />} />
              <Route path="/calendar" element={<Navigate to="/life" />} />
            </Routes>
          </LoadingProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
