import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export default function ClerkCallback() {
  const navigate = useNavigate();
  const { session } = useClerk();
  const [error, setError] = useState('');
  const apiBase = ((import.meta as any).env?.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

  useEffect(() => {
    const exchangeToken = async () => {
      try {
        if (!session) {
          setError('No session found. Please sign in again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        const user = session.user;
        if (!user) {
          setError('User info not found.');
          return;
        }

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
        localStorage.setItem('token', data.token);
        
        // Redirect to dashboard
        navigate('/');
      } catch (err: any) {
        setError(err.message || 'Authentication failed');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    exchangeToken();
  }, [session, navigate]);

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
