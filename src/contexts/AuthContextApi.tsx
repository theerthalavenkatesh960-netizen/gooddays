/**
 * Authentication Context
 * 
 * Provides app-level JWT session management and authentication methods.
 * - Syncs session state from localStorage on app mount
 * - Handles email/password auth via backend endpoints
 * - Integrates with Clerk OAuth (state updated by ClerkCallback)
 */

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
  setSessionFromOAuth: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localSession = api.getSession();
    if (localSession && localSession.user) {
      setSession(localSession);
      setUser(localSession.user);
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const session = await api.signIn(email, password);
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const session = await api.signUp(email, password, name);
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await api.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  // Called by ClerkCallback after exchanging Clerk token for app JWT
  const setSessionFromOAuth = (token: string, user: User) => {
    const newSession: Session = { access_token: token, user };
    localStorage.setItem('gd_session', JSON.stringify(newSession));
    setSession(newSession);
    setUser(user);
  };

  // OAuth is handled directly in Login/Signup via Clerk SDK
  // This method exists for interface completeness
  const signInWithGoogle = async () => {
    throw new Error('Use Clerk OAuth in Login.tsx instead');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, signInWithGoogle, setSessionFromOAuth }}>
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
