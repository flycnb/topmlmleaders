import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export function useBookmarks(user, onAuthRequired) {
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadBookmarks() {
      if (!user?.id) {
        setBookmarkedIds(new Set());
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("bookmarks")
        .select("member_id")
        .eq("user_id", user.id);
      if (!active) return;
      setBookmarkedIds(new Set((data || []).map((row) => row.member_id)));
      setLoading(false);
    }
    loadBookmarks();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const isBookmarked = useCallback(
    (memberId) => bookmarkedIds.has(memberId),
    [bookmarkedIds]
  );

  const stableBookmarkedIds = useMemo(() => bookmarkedIds, [bookmarkedIds]);

  async function toggleBookmark(member) {
    if (!user?.id) {
      onAuthRequired?.();
      return;
    }
    const memberId = member?.id;
    if (!memberId) return;
    const wasBookmarked = bookmarkedIds.has(memberId);

    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(memberId);
      else next.add(memberId);
      return next;
    });

    if (wasBookmarked) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("member_id", memberId);
      if (error) {
        setBookmarkedIds((prev) => new Set(prev).add(memberId));
      }
      return;
    }

    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      member_id: memberId,
      created_at: new Date().toISOString(),
    });
    if (error) {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  }

  return { isBookmarked, toggleBookmark, bookmarkedIds: stableBookmarkedIds, loading };
}

