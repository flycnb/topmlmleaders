import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        // Chrome can occasionally miss automatic URL exchange on OAuth return.
        if (window.location.search.includes("code=")) {
          await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => {});
          const cleaned = `${window.location.origin}${window.location.pathname}${window.location.hash || ""}`;
          window.history.replaceState(window.history.state, "", cleaned);
        }
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        setSession(nextSession ?? null);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_OUT") {
        setSession(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  };
}
