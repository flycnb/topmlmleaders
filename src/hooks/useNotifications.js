import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useNotifications(user) {
  const [items, setItems] = useState([]);
  const userId = user?.id || null;

  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (active) setItems(data || []);
    };
    load();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return { notifications: items, unreadCount, markAllRead };
}

