import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function mapUser(session, plan = "free") {
  const user = session?.user;
  if (!user) return null;
  const email = user.email || "";
  const fallbackName = email.split("@")[0] || "member";
  return {
    id: user.id,
    name: user.user_metadata?.name || user.user_metadata?.full_name || fallbackName,
    email,
    plan,
  };
}

/** Ensures INITIAL_SESSION/PKCE never leaves the app stuck in loading=false with no user while URL exchange runs. */
const SESSION_FALLBACK_MS = 400;
/** Global signOut() can hang on some networks/browsers — we always finish with local cleanup. */
const SIGN_OUT_TIMEOUT_MS = 8000;
const LOCAL_SIGN_OUT_TIMEOUT_MS = 3000;

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);
}

/** Standalone helpers for email/password auth (used by AuthModal; same Supabase client as the hook). */
export async function signInWithEmailPassword(email, password) {
  const trimmed = String(email || "").trim();
  return supabase.auth.signInWithPassword({ email: trimmed, password });
}

export async function signUpWithEmail(email, password) {
  const trimmed = String(email || "").trim();
  return supabase.auth.signUp({ email: trimmed, password });
}

export function useAuth() {
  const [session, setSession] = useState(null);
  /** True until first auth hydration (INITIAL_SESSION / SIGNED_IN / SIGNED_OUT path). */
  const [loading, setLoading] = useState(true);
  const [oauthRedirecting, setOauthRedirecting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [plan, setPlan] = useState("free");
  const bootstrapDoneRef = useRef(false);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;

      const applySessionAndFinishBootstrap = (next) => {
        setSession(next ?? null);
        setLoading(false);
        bootstrapDoneRef.current = true;
      };

      if (event === "INITIAL_SESSION") {
        applySessionAndFinishBootstrap(nextSession);
        return;
      }

      if (event === "SIGNED_IN") {
        applySessionAndFinishBootstrap(nextSession);
        if (window.location.search.includes("code=")) {
          window.location.replace("/");
        }
        const nextUser = nextSession?.user;
        if (nextUser?.id) {
          const email = nextUser.email || "";
          const name =
            nextUser.user_metadata?.name ||
            nextUser.user_metadata?.full_name ||
            email.split("@")[0] ||
            "member";
          await supabase.from("users").upsert(
            {
              id: nextUser.id,
              name,
              email,
              plan: "free",
            },
            { onConflict: "id" }
          );
          setPlan("free");
        }
        return;
      }

      if (event === "SIGNED_OUT") {
        applySessionAndFinishBootstrap(null);
        setPlan("free");
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        setSession(nextSession ?? null);
      }
    });

    const fallbackTimer = window.setTimeout(async () => {
      if (!active || bootstrapDoneRef.current) return;
      const { data } = await supabase.auth.getSession();
      if (!active || bootstrapDoneRef.current) return;
      setSession(data?.session ?? null);
      setLoading(false);
      bootstrapDoneRef.current = true;
    }, SESSION_FALLBACK_MS);

    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    setOauthRedirecting(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
    } catch {
      setOauthRedirecting(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await withTimeout(supabase.auth.signOut({ scope: "global" }), SIGN_OUT_TIMEOUT_MS);
    } catch {
      /* remote sign-out failed — continue with local cleanup */
    } finally {
      try {
        await withTimeout(
          supabase.auth.signOut({ scope: "local" }),
          LOCAL_SIGN_OUT_TIMEOUT_MS
        );
      } catch {
        /* ignore */
      }
      setSession(null);
      setPlan("free");
      setSigningOut(false);
    }
  }

  const user = useMemo(() => mapUser(session, plan), [session, plan]);
  return { user, session, loading, oauthRedirecting, signingOut, signInWithGoogle, signOut };
}
