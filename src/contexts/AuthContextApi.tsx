import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as api from '../lib/api';

export interface User {
  id: number;
  email: string;
  name?: string;
}

export interface Session {
  access_token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await api.getSession();
      if (session && session.user) {
        setSession(session);
        setUser(session.user);
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const session = await api.signIn(email, password);
      if (session && session.user) {
        setSession(session);
        setUser(session.user);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const session = await api.signUp(email, password, name);
      if (session && session.user) {
        setSession(session);
        setUser(session.user);
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await api.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Redirect to OAuth endpoint
      const baseUrl = (import.meta as any).env?.VITE_API_URL || '';
      window.location.href = `${baseUrl}/api/auth/oauth/google`;
    } catch (error) {
      console.error('Google sign in failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
