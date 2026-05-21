/**
 * Clerk OAuth Callback Handler
 * 
 * Completes the OAuth flow:
 * 1. Waits for Clerk session to be established
 * 2. Exchanges Clerk token for backend JWT via /api/auth/clerk
 * 3. Updates app auth context with session state
 * 4. Redirects to dashboard
 * 
 * Flow: Clerk SSO → ClerkCallback → Backend JWT → Navigation
 */

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

  // Safety timeout: If Clerk takes >10s to load, show error and let user retry
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isLoaded && !hasExchanged.current) {
        setIsTimingOut(true);
        setError('Authentication is taking too long. Please try signing in again.');
      }
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [isLoaded]);

  // Exchange Clerk token for backend JWT once Clerk OAuth is complete
  useEffect(() => {
    if (!isLoaded || hasExchanged.current || isTimingOut) return;

    const exchangeToken = async () => {
      try {
        if (!isSignedIn || !user) {
          setError('No active session. Please sign in again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        hasExchanged.current = true;

        // POST Clerk user data to backend to create/link user and get JWT
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
          throw new Error(data.message || 'Failed to create or link account');
        }

        const data = await response.json();
        // Set session state directly—no page reload needed
        setSessionFromOAuth(data.token, data.user);
        navigate('/', { replace: true });
      } catch (err: any) {
        setError(err.message || 'Sign in failed. Please try again.');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    exchangeToken(); // eslint-disable-line no-floating-promises
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
