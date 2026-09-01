'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

export type UserTier = 'free' | 'tier_99' | 'tier_299' | 'tier_699';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  tier: UserTier;
  credits_minutes?: number;
  is_lifetime_unlocked?: boolean;
  google_free_month?: string | null;
  google_free_count?: number;
  groq_free_day?: string | null;
  groq_free_count?: number;
  stripe_customer_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tier: UserTier;
  isPaid: boolean;
  isPro: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  tier: 'free',
  isPaid: false,
  isPro: false,
  isLoading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Error fetching user profile:', error.message);
        return null;
      }

      return data as UserProfile;
    } catch (err) {
      console.warn('Network error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      }
      setIsLoading(false);
    });

    // 2. Listen to Auth State Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // 3. Realtime subscription for instant tier upgrades
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[AuthContext] Realtime profile update:', payload.new);
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 4. Synchronize user-scoped daily quota, credits, and lifetime status
  useEffect(() => {
    const store = useAppStore.getState();
    store.syncDailyUsage(user?.id);
    store.syncQuotas(user?.id);

    if (profile) {
      if (typeof profile.credits_minutes === 'number') {
        store.setCreditsMinutes(profile.credits_minutes);
      }
      if (typeof profile.is_lifetime_unlocked === 'boolean') {
        store.setLifetimeUnlocked(profile.is_lifetime_unlocked);
      }
    }
  }, [user, profile]);

  const signInWithGoogle = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      alert('Supabase credentials are not configured');
      return;
    }

    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    useAppStore.getState().syncDailyUsage(undefined);
  };

  const tier: UserTier = profile?.tier || 'free';
  const isPaid = tier === 'tier_99' || tier === 'tier_299';
  const isPro = tier === 'tier_299';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tier,
        isPaid,
        isPro,
        isLoading,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
