import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider, useAuth } from './contexts/AuthContextApi';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Body = lazy(() => import('./pages/Body'));
const Workout = lazy(() => import('./pages/Workout'));
const Finance = lazy(() => import('./pages/Finance'));
const Cards = lazy(() => import('./pages/Cards'));
const CardCategoryTransactions = lazy(() => import('./pages/CardCategoryTransactions'));
const FinanceBudgetSettings = lazy(() => import('./pages/FinanceBudgetSettings'));
const BucketDetail = lazy(() => import('./pages/BucketDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Life = lazy(() => import('./pages/Life'));
const GoalDetail = lazy(() => import('./pages/GoalDetail'));
const GoalCreate = lazy(() => import('./pages/GoalCreate'));
const Settings = lazy(() => import('./pages/Settings'));
const DashboardMomentumSettings = lazy(() => import('./pages/DashboardMomentumSettings'));
const JournalEditor = lazy(() => import('./pages/JournalEditor'));
const WorkoutLibrarySettings = lazy(() => import('./pages/WorkoutLibrarySettings'));
const MealPlannerSettings = lazy(() => import('./pages/MealPlannerSettings'));
const MealCatalogBrowse = lazy(() => import('./pages/MealCatalogBrowse'));
const RoutineManager = lazy(() => import('./pages/RoutineManager'));
const WorkoutExerciseDetails = lazy(() => import('./pages/WorkoutExerciseDetails'));
const MealTemplateDetails = lazy(() => import('./pages/MealTemplateDetails'));
const WorkoutAddExercisePage = lazy(() => import('./pages/WorkoutAddExercisePage'));
const MealIngredientLibraryPage = lazy(() => import('./pages/MealIngredientLibraryPage'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const MealCreateTemplatePage = lazy(() => import('./pages/MealCreateTemplatePage'));
const MealDayPickerPage = lazy(() => import('./pages/MealDayPickerPage'));
const RoutineExercisePickerPage = lazy(() => import('./pages/RoutineExercisePickerPage'));
const AiPlannerSettings = lazy(() => import('./pages/AiPlannerSettings'));
const AiAnalysisPage = lazy(() => import('./pages/AiAnalysisPage').then(module => ({ default: module.AiAnalysisPage })));
const HealthAdvisor = lazy(() => import('./pages/HealthAdvisor'));
const ClerkCallback = lazy(() => import('./pages/ClerkCallback'));
const ClerkSsoCallback = lazy(() => import('./pages/ClerkSsoCallback'));
const SettingsLife = lazy(() => import('./pages/SettingsLife'));
const SettingsVehicles = lazy(() => import('./pages/SettingsVehicles'));
const SettingsAnalytics = lazy(() => import('./pages/SettingsAnalytics'));
const FinanceGmailReview = lazy(() => import('./pages/FinanceGmailReview'));
const AddIngredientPage = lazy(() => import('./pages/AddIngredientPage'));
const IngredientPickerPage = lazy(() => import('./pages/IngredientPickerPage'));
const ExerciseLoggerPage = lazy(() => import('./pages/ExerciseLoggerPage'));
const BodyAllPrsPage = lazy(() => import('./pages/BodyAllPrsPage'));
const BodyAllMealsPage = lazy(() => import('./pages/BodyAllMealsPage'));
const MealNeedsReviewPage = lazy(() => import('./pages/MealNeedsReviewPage'));
const LogIngredientPage = lazy(() => import('./pages/LogIngredientPage'));
const AiChat = lazy(() => import('./pages/AiChat'));
const FinanceMerchantHistory = lazy(() => import('./pages/FinanceMerchantHistory'));
const FinanceOrderDetail = lazy(() => import('./pages/FinanceOrderDetail'));

function RouteFallback() {
  return (
    <div className="min-h-[45vh] flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
      <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
    </div>
  );
}

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
  const CLERK_PUBLISHABLE_KEY = ((import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY || '');

  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="max-w-xl w-full rounded-2xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Missing Clerk Publishable Key</h1>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Add VITE_CLERK_PUBLISHABLE_KEY to your .env.local and restart the Vite dev server.
          </p>
          <pre className="text-xs rounded-lg p-3 overflow-auto" style={{ background: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_API_URL=https://gooddays.onrender.com
          </pre>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <LoadingProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
              <Route path="/login"  element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/auth/sso-callback" element={<ClerkSsoCallback />} />
              <Route path="/auth/callback" element={<ClerkCallback />} />

              <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
              <Route path="/body"     element={<PrivateRoute><Layout><Body /></Layout></PrivateRoute>} />
              <Route path="/diet/add-ingredient" element={<PrivateRoute><Layout><AddIngredientPage /></Layout></PrivateRoute>} />
              <Route path="/body/progress/prs" element={<PrivateRoute><Layout><BodyAllPrsPage /></Layout></PrivateRoute>} />
              <Route path="/body/diet/meals" element={<PrivateRoute><Layout><BodyAllMealsPage /></Layout></PrivateRoute>} />
              <Route path="/body/diet/meals/review" element={<PrivateRoute><Layout><MealNeedsReviewPage /></Layout></PrivateRoute>} />
              <Route path="/body/workout/exercise/:exerciseId/log" element={<PrivateRoute><Layout><ExerciseLoggerPage /></Layout></PrivateRoute>} />
              <Route path="/body/workout-log" element={<PrivateRoute><Layout><Workout /></Layout></PrivateRoute>} />
              <Route path="/finance"  element={<PrivateRoute><Layout><Finance /></Layout></PrivateRoute>} />
              <Route path="/finance/merchant-history" element={<PrivateRoute><Layout><FinanceMerchantHistory /></Layout></PrivateRoute>} />
              <Route path="/finance/orders/:orderId" element={<PrivateRoute><Layout><FinanceOrderDetail /></Layout></PrivateRoute>} />
              <Route path="/finance/cards" element={<PrivateRoute><Layout><Cards /></Layout></PrivateRoute>} />
              <Route path="/finance/cards/category/:category" element={<PrivateRoute><Layout><CardCategoryTransactions /></Layout></PrivateRoute>} />
              <Route path="/finance/cards/:cardId/category/:category" element={<PrivateRoute><Layout><CardCategoryTransactions /></Layout></PrivateRoute>} />
              <Route path="/finance/settings" element={<PrivateRoute><Layout><FinanceBudgetSettings /></Layout></PrivateRoute>} />
              <Route path="/finance/bucket/:id" element={<PrivateRoute><Layout><BucketDetail /></Layout></PrivateRoute>} />
              <Route path="/finance/vehicles" element={<Navigate to="/settings/vehicles" replace />} />
              <Route path="/finance/gmail-review" element={<PrivateRoute><Layout><FinanceGmailReview /></Layout></PrivateRoute>} />
              <Route path="/life" element={<PrivateRoute><Layout><Life /></Layout></PrivateRoute>} />
              <Route path="/goals/new" element={<PrivateRoute><Layout><GoalCreate /></Layout></PrivateRoute>} />
              <Route path="/goals/:id" element={<PrivateRoute><Layout><GoalDetail /></Layout></PrivateRoute>} />
              <Route path="/goals/:id/edit" element={<PrivateRoute><Layout><GoalCreate /></Layout></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
              <Route path="/settings/life" element={<PrivateRoute><Layout><SettingsLife /></Layout></PrivateRoute>} />
              <Route path="/settings/vehicles" element={<PrivateRoute><Layout><SettingsVehicles /></Layout></PrivateRoute>} />
              <Route path="/settings/analytics" element={<PrivateRoute><Layout><SettingsAnalytics /></Layout></PrivateRoute>} />
              <Route path="/settings/dashboard-momentum" element={<PrivateRoute><Layout><DashboardMomentumSettings /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library" element={<PrivateRoute><Layout><WorkoutLibrarySettings /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library/new-exercise" element={<PrivateRoute><Layout><WorkoutAddExercisePage /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library/exercise/:id" element={<PrivateRoute><Layout><WorkoutExerciseDetails /></Layout></PrivateRoute>} />
              <Route path="/settings/meals" element={<PrivateRoute><Layout><MealPlannerSettings /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/catalog" element={<PrivateRoute><Layout><MealCatalogBrowse /></Layout></PrivateRoute>} />
              <Route path="/settings/routines" element={<PrivateRoute><Layout><RoutineManager /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/ingredients" element={<PrivateRoute><Layout><MealIngredientLibraryPage /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/pick-ingredients" element={<PrivateRoute><Layout><IngredientPickerPage /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/new-template" element={<PrivateRoute><Layout><MealCreateTemplatePage /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/template/:id" element={<PrivateRoute><Layout><MealTemplateDetails /></Layout></PrivateRoute>} />
              <Route path="/settings/meals/pick" element={<PrivateRoute><Layout><MealDayPickerPage /></Layout></PrivateRoute>} />
              <Route path="/meals/add-ingredient" element={<PrivateRoute><Layout><LogIngredientPage /></Layout></PrivateRoute>} />
              <Route path="/settings/workout-library/pick" element={<PrivateRoute><Layout><RoutineExercisePickerPage /></Layout></PrivateRoute>} />
              <Route path="/settings/ai-planner" element={<PrivateRoute><Layout><AiPlannerSettings /></Layout></PrivateRoute>} />
              <Route path="/settings/ai-planner/analysis" element={<PrivateRoute><AiAnalysisPage /></PrivateRoute>} />

              {/* AI Chat interface */}
              <Route path="/ai-chat" element={<PrivateRoute><Layout><AiChat /></Layout></PrivateRoute>} />
              <Route path="/ai-chat/:conversationId" element={<PrivateRoute><Layout><AiChat /></Layout></PrivateRoute>} />

              {/* AI Health Advisor — powered by Python AI service */}
              <Route path="/health-advisor" element={<PrivateRoute><Layout><HealthAdvisor /></Layout></PrivateRoute>} />

              {/* Journal editor — full screen, no nav */}
              <Route path="/journal/new"      element={<PrivateRoute><JournalEditor /></PrivateRoute>} />
              <Route path="/journal/:id/edit" element={<PrivateRoute><JournalEditor /></PrivateRoute>} />

              {/* Legacy redirects */}
              <Route path="/workout"  element={<Navigate to="/body" />} />
              <Route path="/tasks" element={<PrivateRoute><Layout><Tasks /></Layout></PrivateRoute>} />
              <Route path="/calendar" element={<Navigate to="/settings" />} />
              </Routes>
            </Suspense>
          </LoadingProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
    </ClerkProvider>
  );
}

export default App;
