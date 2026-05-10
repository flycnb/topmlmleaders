import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import MemberProfile from "../features/profile";
import { mapMembers } from "../features/search";

function isUuid(segment) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(segment || ""));
}

export default function ProfilePage({
  user,
  onAuthRequired,
  isFollowing,
  toggleFollow,
  onOpenChat,
}) {
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const segment = slugParam === undefined ? "" : decodeURIComponent(slugParam);
    if (!segment) {
      setMember(null);
      setLoading(false);
      return undefined;
    }
    let canceled = false;
    (async () => {
      setLoading(true);
      const res = isUuid(segment)
        ? await supabase.from("members").select("*").eq("id", segment).maybeSingle()
        : await supabase.from("members").select("*").eq("slug", segment).maybeSingle();
      const { data, error } = res;
      if (canceled) return;
      if (error || !data) {
        setMember(null);
      } else {
        const mapped = mapMembers([data])[0];
        if (!mapped) {
          setMember(null);
        } else {
          setMember({
            ...mapped,
            socialFb: Boolean(data.social_fb),
            socialIg: Boolean(data.social_ig),
            socialYt: Boolean(data.social_yt),
            socialLi: Boolean(data.social_li),
          });
        }
      }
      setLoading(false);
    })();
    return () => {
      canceled = true;
    };
  }, [slugParam]);

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <p style={{ color: "var(--color-muted)" }}>Loading profile…</p>
      </main>
    );
  }

  return (
    <MemberProfile
      member={member}
      user={user}
      onAuthRequired={onAuthRequired}
      isFollowing={isFollowing}
      toggleFollow={toggleFollow}
      onOpenChat={onOpenChat}
      onBack={() => navigate("/")}
    />
  );
}
