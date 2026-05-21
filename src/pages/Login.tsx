import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Chrome } from 'lucide-react';
import { useAuth } from '../contexts/AuthContextApi';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';

function formatClerkError(err: any): string {
  try {
    const first = Array.isArray(err?.errors) ? err.errors[0] : null;
    const code = first?.code || err?.code || 'unknown_error';
    const message = first?.longMessage || first?.message || err?.message || 'Unknown Clerk error';
    const status = err?.status ? `status=${err.status}` : 'status=n/a';
    return `[Clerk debug] ${status} code=${code} message=${message}`;
  } catch {
    return '[Clerk debug] Unable to parse Clerk error payload';
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [debugError, setDebugError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { isLoaded, signIn: clerkSignIn } = useSignIn();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setDebugError('');
    setLoading(true);
    try {
      if (!isLoaded || !clerkSignIn) throw new Error('Clerk is not ready yet.');
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const redirectUrlComplete = `${window.location.origin}/`;

      await clerkSignIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl,
        redirectUrlComplete,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to login with Google');
      setDebugError(formatClerkError(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl p-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--accent)' }}
          >
            <span className="text-3xl">✨</span>
          </motion.div>

          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: 'var(--accent)' }}>
            Welcome Back
          </h1>
          <p className="text-center mb-8" style={{ color: 'var(--text-secondary)' }}>Continue your productivity journey</p>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-xl mb-4 text-sm"
              style={{ background: 'rgba(255,107,107,0.12)', color: 'var(--accent-warm)', border: '1px solid rgba(255,107,107,0.2)' }}
            >
              <div>{error}</div>
              {debugError && (
                <pre className="mt-2 text-[11px] whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {debugError}
                </pre>
              )}
            </motion.div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2" size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none"
                  style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2" size={20} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none"
                  style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </motion.button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--border)' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4" style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>Or continue with</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', background: 'var(--surface-elevated)' }}
          >
            <Chrome size={20} />
            Continue with Google
          </motion.button>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              Sign up
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
