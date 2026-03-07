import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContextApi';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Thesis from './pages/Thesis';
import Study from './pages/Study';
import Track from './pages/Track';
import Expenses from './pages/Expenses';
import SelfCare from './pages/SelfCare';
import CalendarView from './pages/CalendarView';
import Settings from './pages/Settings';
import FinancialTracker from './pages/FinancialTracker';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">✨</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <PrivateRoute>
                  <Layout>
                    <Tasks />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/thesis"
              element={
                <PrivateRoute>
                  <Layout>
                    <Thesis />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/study"
              element={
                <PrivateRoute>
                  <Layout>
                    <Study />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/track"
              element={
                <PrivateRoute>
                  <Layout>
                    <Track />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <PrivateRoute>
                  <Layout>
                    <Expenses />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/financial-tracker"
              element={
                <PrivateRoute>
                  <Layout>
                    <FinancialTracker />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/selfcare"
              element={
                <PrivateRoute>
                  <Layout>
                    <SelfCare />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <PrivateRoute>
                  <Layout>
                    <CalendarView />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </PrivateRoute>
              }
            />
            <Route
              path="/financial"
              element={
                <PrivateRoute>
                  <Layout>
                    <FinancialTracker />
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
