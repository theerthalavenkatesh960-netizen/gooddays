import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContextApi';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingProvider } from './contexts/LoadingContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Body from './pages/Body';
import Finance from './pages/Finance';
import Life from './pages/Life';
import Settings from './pages/Settings';
import JournalEditor from './pages/JournalEditor';
import Vehicles from './pages/Vehicles';

function PrivateRoute({ children }: { children: React.ReactNode }) {
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
              <Route path="/finance"  element={<PrivateRoute><Layout><Finance /></Layout></PrivateRoute>} />
              <Route path="/finance/vehicles" element={<PrivateRoute><Layout><Vehicles /></Layout></PrivateRoute>} />
              <Route path="/life"     element={<PrivateRoute><Layout><Life /></Layout></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />

              {/* Journal editor — full screen, no nav */}
              <Route path="/journal/new"      element={<PrivateRoute><JournalEditor /></PrivateRoute>} />
              <Route path="/journal/:id/edit" element={<PrivateRoute><JournalEditor /></PrivateRoute>} />

              {/* Legacy redirects */}
              <Route path="/workout"  element={<Navigate to="/body" />} />
              <Route path="/goals"    element={<Navigate to="/life" />} />
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
