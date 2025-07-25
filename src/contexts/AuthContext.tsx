import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext - Starting auth initialization');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthContext - Initial session:', session, 'error:', error);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        console.log('AuthContext - No initial session, setting loading to false');
        setLoading(false);
      }
    }).catch((error) => {
      console.error('AuthContext - Error getting initial session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthContext - Auth state change:', event, session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Use setTimeout to avoid blocking the auth state change
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('AuthContext - Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('AuthContext - Error fetching profile:', error);
      } else if (!data) {
        console.log('AuthContext - No profile found, creating one');
        // Create profile if it doesn't exist
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const newProfile = {
            user_id: userId,
            name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || 'Usuário',
            email: userData.user.email || '',
            role: 'admin' // Primeiro usuário é admin
          };
          
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();
            
          if (createError) {
            console.error('AuthContext - Error creating profile:', createError);
          } else {
            console.log('AuthContext - Profile created successfully:', createdProfile);
            setProfile(createdProfile as Profile);
          }
        }
      } else {
        console.log('AuthContext - Profile fetched successfully:', data);
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('AuthContext - Error fetching profile:', error);
    } finally {
      console.log('AuthContext - Setting loading to false');
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};