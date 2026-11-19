"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface Profile {
  username?: string;
  avatar_url?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  const refreshProfile = useCallback(async () => {
    if (!configured) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .maybeSingle();
    setProfile(data);
  }, [configured]);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    init();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: User | null } | null) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        // ensure profile row exists
        supabase
          .from("profiles")
          .upsert(
            {
              id: session.user.id,
              username: session.user.user_metadata?.username ?? session.user.email?.split("@")[0],
              avatar_url: session.user.user_metadata?.avatar_url ?? null,
            },
            { onConflict: "id" }
          )
          .then(() => refreshProfile());
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [configured, refreshProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!configured) return { error: "Authentication is not configured. Add Supabase env vars." };
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [configured]
  );

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      if (!configured) return { error: "Authentication is not configured.", needsConfirmation: false };
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    [configured]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!configured) return { error: "Authentication is not configured." };
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/library` },
    });
    return { error: error?.message ?? null };
  }, [configured]);

  const signOut = useCallback(async () => {
    if (configured) await getSupabase().auth.signOut();
  }, [configured]);

  const value = useMemo(
    () => ({ user, profile, loading, configured, signIn, signUp, signInWithGoogle, signOut, refreshProfile }),
    [user, profile, loading, configured, signIn, signUp, signInWithGoogle, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
