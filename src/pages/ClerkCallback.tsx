import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useAuth as useAppAuth } from '../contexts/AuthContextApi';

export default function ClerkCallback() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { user } = useUser();
  const { setSessionFromOAuth } = useAppAuth();
  const [error, setError] = useState('');
  const [isTimingOut, setIsTimingOut] = useState(false);
  const hasExchanged = useRef(false);
  const apiBase = ((import.meta as any).env?.VITE_API_URL || 'https://localhost:5001').replace(/\/$/, '');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isLoaded && !hasExchanged.current) {
        setIsTimingOut(true);
        setError('Authentication is taking too long. Please try Google sign-in again.');
      }
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || hasExchanged.current || isTimingOut) return;

    const exchangeToken = async () => {
      try {
        if (!isSignedIn || !user) {
          setError('No session found. Please sign in again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        hasExchanged.current = true;

        // Call backend endpoint to create/link user with Clerk
        const response = await fetch(`${apiBase}/api/auth/clerk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress || user.primaryEmailAddress?.emailAddress,
            name: user.firstName || user.fullName || 'User',
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || 'Backend authentication failed');
        }

        const data = await response.json();
        setSessionFromOAuth(data.token, data.user);
        navigate('/', { replace: true });
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    exchangeToken();
  }, [isLoaded, isSignedIn, user, navigate, apiBase, isTimingOut, setSessionFromOAuth]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="rounded-3xl p-8" style={{ background: 'var(--surface)', textAlign: 'center' }}>
          <p style={{ color: 'var(--accent-warm)', marginBottom: '1rem' }}>{error}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="rounded-3xl p-8" style={{ background: 'var(--surface)', textAlign: 'center' }}>
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Completing sign in...</p>
      </div>
    </div>
  );
}
