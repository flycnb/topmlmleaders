import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

async function fetchFollowerCount(memberId) {
  const { data: row } = await supabase
    .from("members")
    .select("follower_count")
    .eq("id", memberId)
    .maybeSingle();
  return Number(row?.follower_count ?? 0);
}

export function useFollow(user, onAuthRequired) {
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadFollows() {
      if (!user?.id) {
        setFollowingIds(new Set());
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (!active) return;
      setFollowingIds(new Set((data || []).map((row) => row.following_id)));
      setLoading(false);
    }
    loadFollows();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const isFollowing = useCallback(
    (memberId) => followingIds.has(memberId),
    [followingIds]
  );

  const stableFollowingIds = useMemo(() => followingIds, [followingIds]);

  async function toggleFollow(member, onFollowerCountSynced) {
    if (!user?.id) {
      onAuthRequired?.();
      return;
    }
    const memberId = member?.id;
    if (!memberId) return;
    const wasFollowing = followingIds.has(memberId);

    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(memberId);
      else next.add(memberId);
      return next;
    });

    const syncFollowerUi = async () => {
      const followerCount = await fetchFollowerCount(memberId);
      onFollowerCountSynced?.({ memberId, followerCount });
    };

    if (wasFollowing) {
      const { error: removeError } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", memberId);
      const { error: countError } = await supabase
        .from("members")
        .update({ follower_count: Math.max(0, (member.followerCount || 0) - 1) })
        .eq("id", memberId);
      if (removeError || countError) {
        setFollowingIds((prev) => new Set(prev).add(memberId));
      }
      await syncFollowerUi();
      return;
    }

    const { error: addError } = await supabase.from("follows").insert({
      follower_id: user.id,
      following_id: memberId,
      created_at: new Date().toISOString(),
    });
    const { error: countError } = await supabase
      .from("members")
      .update({ follower_count: (member.followerCount || 0) + 1 })
      .eq("id", memberId);
    if (addError || countError) {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
      await syncFollowerUi();
      return;
    }

    if (member.ownerId) {
      await supabase.from("notifications").insert({
        user_id: member.ownerId,
        type: "follow",
        from_name: user.name,
        text: `${user.name} started following you`,
        read: false,
        created_at: new Date().toISOString(),
      });
    }
    await syncFollowerUi();
  }

  return { isFollowing, toggleFollow, followingIds: stableFollowingIds, loading };
}

