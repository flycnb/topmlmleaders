import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useFollow(user, membersData, setMembersData) {
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const userId = user?.id || null;

  useEffect(() => {
    if (!userId) {
      setFollowingIds(new Set());
      return;
    }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      if (!active) return;
      setFollowingIds(new Set((data || []).map((x) => String(x.following_id))));
    };
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel("follows-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows" },
        async () => {
          const { data } = await supabase.from("members").select("id,follower_count");
          if (!Array.isArray(data)) return;
          setMembersData((prev) =>
            prev.map((m) => {
              const found = data.find((d) => String(d.id) === String(m.id));
              return found ? { ...m, followerCount: found.follower_count || 0 } : m;
            })
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [setMembersData]);

  const isFollowing = (memberId) => followingIds.has(String(memberId));

  const followingCount = useMemo(() => followingIds.size, [followingIds]);

  const toggleFollow = async (member) => {
    if (!userId || !member?.id || loading) return { ok: false };
    setLoading(true);
    const memberId = member.id;
    const already = followingIds.has(String(memberId));
    try {
      let opError = null;
      if (already) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", memberId);
        opError = error;
        const { data: m } = await supabase.from("members").select("follower_count").eq("id", memberId).single();
        await supabase
          .from("members")
          .update({ follower_count: Math.max(0, (m?.follower_count || 0) - 1) })
          .eq("id", memberId)
          .catch(() => {});
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(String(memberId));
          return next;
        });
        setMembersData((prev) =>
          prev.map((m) =>
            String(m.id) === String(memberId)
              ? { ...m, followerCount: Math.max(0, (m.followerCount || 0) - 1) }
              : m
          )
        );
      } else {
        const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: memberId });
        opError = error;
        const { data: m } = await supabase.from("members").select("follower_count").eq("id", memberId).single();
        await supabase
          .from("members")
          .update({ follower_count: (m?.follower_count || 0) + 1 })
          .eq("id", memberId)
          .catch(() => {});
        const { data: recipient } = await supabase
          .from("users")
          .select("id")
          .eq("email", member?.email || "")
          .single();
        if (recipient?.id) {
          await supabase.from("notifications").insert({
            user_id: recipient.id,
            type: "follow",
            from_name: user?.name || "Someone",
            from_initials: (user?.name || "U").slice(0, 2).toUpperCase(),
            from_color: "#7F77DD",
            text: `${user?.name || "Someone"} followed you`,
            link: `#/m/${member?.slug || ""}`,
          }).catch(() => {});
        }
        setFollowingIds((prev) => new Set(prev).add(String(memberId)));
        setMembersData((prev) =>
          prev.map((m) =>
            String(m.id) === String(memberId)
              ? { ...m, followerCount: (m.followerCount || 0) + 1 }
              : m
          )
        );
      }
      if (opError) return { ok: false, error: opError };
      const { data: latest } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
      setFollowingIds(new Set((latest || []).map((x) => String(x.following_id))));
      return { ok: true };
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, toggleFollow, followingCount, loading };
}

