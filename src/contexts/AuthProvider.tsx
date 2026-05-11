import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: false,
  isConfigured: false,
  signInWithEmail: async () => ({ error: 'Supabase not configured' }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.' };
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isConfigured: isSupabaseConfigured, signInWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
