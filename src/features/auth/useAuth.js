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

const SESSION_FALLBACK_MS = 400;
/** Entire sign-out (remote + local attempts) stops waiting after this. */
const SIGN_OUT_MAX_MS = 5000;

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
  const [loading, setLoading] = useState(true);
  const [oauthRedirecting, setOauthRedirecting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [plan, setPlan] = useState("free");
  const bootstrapDoneRef = useRef(false);
  /** When true, `signOut()` owns session clearing — ignore duplicate SIGNED_OUT until done. */
  const manualSignOutRef = useRef(false);

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
        if (manualSignOutRef.current) return;
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
      const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: returnTo,
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
    manualSignOutRef.current = true;
    setSigningOut(true);
    try {
      await Promise.race([
        (async () => {
          try {
            await supabase.auth.signOut({ scope: "global" });
          } catch {
            /* ignore */
          }
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            /* ignore */
          }
        })(),
        new Promise((resolve) => window.setTimeout(resolve, SIGN_OUT_MAX_MS)),
      ]);
      setSession(null);
      setPlan("free");
    } finally {
      manualSignOutRef.current = false;
      setSigningOut(false);
    }
  }

  const user = useMemo(() => mapUser(session, plan), [session, plan]);
  return { user, session, loading, oauthRedirecting, signingOut, signInWithGoogle, signOut };
}
