import { useEffect, useMemo, useState } from "react";
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

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    let active = true;

    async function fetchInitial() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data?.session || null);
      setLoading(false);
    }

    fetchInitial();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;
      if (event === "INITIAL_SESSION") {
        setSession(nextSession || null);
        setLoading(false);
      }
      if (event === "SIGNED_IN") {
        setSession(nextSession || null);
        setLoading(false);
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
      }
      if (event === "SIGNED_OUT") {
        setSession(null);
        setLoading(false);
      }
      if (event === "TOKEN_REFRESHED") {
        setSession(nextSession || null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    setLoading(true);
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
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

  const user = useMemo(() => mapUser(session, plan), [session, plan]);
  return { user, session, loading, signInWithGoogle, signOut };
}

