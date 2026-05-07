import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
      return data.session ?? null;
    };
    const syncSessionWithRetry = async (retries = 4, delayMs = 250) => {
      let next = await syncSession();
      let left = retries;
      while (!next && left > 0 && mounted) {
        await new Promise((r) => setTimeout(r, delayMs));
        next = await syncSession();
        left -= 1;
      }
    };
    const bootstrap = async () => {
      try {
        // Chrome can occasionally miss automatic URL exchange on OAuth return.
        const hadCode = window.location.search.includes("code=");
        if (window.location.search.includes("code=")) {
          await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {});
          const cleaned = `${window.location.origin}${window.location.pathname}${window.location.hash || ""}`;
          window.history.replaceState(window.history.state, "", cleaned);
        }
        if (hadCode) {
          await syncSessionWithRetry();
        } else {
          await syncSession();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    bootstrap();

    const { data } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        if (nextSession) {
          setSession(nextSession);
          setLoading(false);
        } else {
          await syncSessionWithRetry();
        }
        return;
      }
      if (event === "SIGNED_OUT") {
        setSession(null);
        setLoading(false);
      }
    });

    // Some Chrome OAuth redirects restore storage on focus.
    const onFocus = () => {
      syncSession().catch(() => {});
    };
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  };
}
