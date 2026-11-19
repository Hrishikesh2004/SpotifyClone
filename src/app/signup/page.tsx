"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Music2, Mail, Lock, User, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GoogleIcon } from "@/components/ui/GoogleIcon";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, configured } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!username.trim() || !email || !password) {
      setError("Fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp(email, password, username.trim());
    setLoading(false);
    if (error) {
      setError(error);
    } else if (needsConfirmation) {
      setNotice("Check your email to confirm your account, then log in.");
    } else {
      router.push("/library");
    }
  };

  const google = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Music2 size={28} className="text-black" fill="currentColor" />
          </span>
          <h1 className="text-3xl font-black">Create your account</h1>
          <p className="mt-1 text-sm text-text-dim">Start listening on Vibeify</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-panel p-8">
          {!configured && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-error/10 p-3 text-xs text-error">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              Supabase isn&rsquo;t configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-error/10 p-3 text-xs text-error">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-xs text-accent">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              {notice}
            </div>
          )}

          <button
            onClick={google}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-full border border-white/20 py-3 text-sm font-bold transition hover:border-white hover:scale-[1.01]"
          >
            <GoogleIcon size={18} /> Continue with Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-text-mute">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="h-12 w-full rounded-lg border border-white/10 bg-card pl-11 pr-4 text-sm outline-none focus:border-accent"
                autoComplete="username"
              />
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-12 w-full rounded-lg border border-white/10 bg-card pl-11 pr-4 text-sm outline-none focus:border-accent"
                autoComplete="email"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-mute" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 characters)"
                className="h-12 w-full rounded-lg border border-white/10 bg-card pl-11 pr-11 text-sm outline-none focus:border-accent"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-mute hover:text-white"
                aria-label="Toggle password visibility"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-bold text-black transition hover:bg-accent-bright disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Sign Up
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-text-dim">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-white hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
