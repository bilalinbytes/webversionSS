import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthStatus = 'doctor' | 'patient' | 'incomplete' | 'unknown';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  status: AuthStatus;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  initialized: false,
  status: 'unknown',
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState<AuthStatus>('unknown');

  const checkStatus = async (user: User | null) => {
    if (!user) {
      setStatus('unknown');
      setInitialized(true);
      return;
    }
    
    // Check if doctor
    const { data: doc } = await supabase.from('doctors').select('id, specialisation').eq('id', user.id).single();
    if (doc) {
      if (!doc.specialisation) {
        setStatus('incomplete');
      } else {
        setStatus('doctor');
      }
      setInitialized(true);
      return;
    }

    // Check if patient
    const { data: pat } = await supabase.from('patients').select('id').eq('id', user.id).single();
    if (pat) {
      setStatus('patient');
      setInitialized(true);
      return;
    }

    // If neither (new Google sign up), they are a doctor who hasn't completed profile
    setStatus('incomplete');
    setInitialized(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkStatus(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      checkStatus(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, initialized, status, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
