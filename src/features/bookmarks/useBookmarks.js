import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/**
 * Insert bookmark can 409 / unique-violate when row already exists (stale UI or race).
 * PostgrestError has no HTTP status field; duplicate is usually code "23505" on message/details.
 */
function isBookmarkDuplicateInsertError(error) {
  if (!error) return false;
  if (typeof error === "object") {
    const code = String(error.code ?? "").trim();
    if (code === "23505" || code === "409") return true;
    const st = Number(error.status ?? error.statusCode);
    if (Number.isFinite(st) && st === 409) return true;
  }
  const parts = [];
  if (typeof error === "object") {
    for (const key of ["message", "details", "hint"]) {
      const v = error[key];
      if (v != null && v !== "") parts.push(String(v));
    }
    const cause = error.cause;
    if (cause && typeof cause === "object") {
      for (const key of ["message", "details", "hint", "code"]) {
        const v = cause[key];
        if (v != null && v !== "") parts.push(String(v));
      }
    }
  } else {
    parts.push(String(error));
  }
  const text = parts.join(" ").toLowerCase();
  if (
    /\b23505\b/.test(text) ||
    /duplicate key|unique constraint|already exists|violates unique constraint|conflict with/i.test(text)
  ) {
    return true;
  }
  try {
    const dumped = JSON.stringify(error).toLowerCase();
    if (dumped.includes("23505") || dumped.includes('"code":"23505"')) return true;
  } catch {
    /* ignore */
  }
  return false;
}

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
      // Duplicate bookmark: treat as success (keep optimistic UI; no rollback / no surfaced error).
      if (isBookmarkDuplicateInsertError(error)) return;
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  }

  return { isBookmarked, toggleBookmark, bookmarkedIds: stableBookmarkedIds, loading };
}

