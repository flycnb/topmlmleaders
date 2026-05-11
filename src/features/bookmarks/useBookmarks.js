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
      const { data, error } = await supabase.from("bookmarks").select("*").eq("member_id", user.id);
      if (!active) return;
      if (error) {
        console.error("[bookmarks] load failed", error);
        setBookmarkedIds(new Set());
        setLoading(false);
        return;
      }
      const ids = (data || []).map((row) => row.saved_member_id).filter(Boolean);
      setBookmarkedIds(new Set(ids));
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
        .eq("member_id", user.id)
        .eq("saved_member_id", memberId);
      if (error) {
        setBookmarkedIds((prev) => new Set(prev).add(memberId));
      }
      return;
    }

    const { error } = await supabase.from("bookmarks").insert({
      member_id: user.id,
      saved_member_id: memberId,
      created_at: new Date().toISOString(),
    });
    if (error) {
      // Unique-constraint conflicts mean the bookmark already exists; keep optimistic state.
      if (error.code === "23505" || error.code === "409") return;
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  }

  return { isBookmarked, toggleBookmark, bookmarkedIds: stableBookmarkedIds, loading };
}

