import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../lib/supabaseClient";
import { useNotifications } from "../notifications/useNotifications";

/*
 * TICKET-011 — Run in Supabase SQL Editor once if columns/bucket missing:
 *
 * ALTER TABLE members ADD COLUMN IF NOT EXISTS gallery_urls jsonb DEFAULT '[]';
 * ALTER TABLE members ADD COLUMN IF NOT EXISTS youtube_urls jsonb DEFAULT '[]';
 *
 * Storage: create public bucket "gallery" (public read). Upload path: [member-id]/[timestamp].[ext]
 */

const TABS = [
  "overview",
  "profile",
  "media",
  "messages",
  "bookmarks",
  "bookings",
  "settings",
  "refer & earn",
];

const MAX_GALLERY_PHOTOS = 10;

function timeAgo(value) {
  if (!value) return "";
  const time = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} mins ago`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

/** Parse YouTube watch/embed/shorts URLs for thumbnail preview. */
function extractYoutubeVideoId(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const normalized = s.includes("://") ? s : `https://${s}`;
    const u = new URL(normalized);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embed = u.pathname.match(/\/(embed|live|shorts|v)\/([^/?]+)/);
      if (embed) return embed[2];
    }
  } catch {
    /* ignore */
  }
  return null;
}

function Dashboard({
  user,
  authInitializing = false,
  onBack,
  onOpenChat,
  onOpenProfile,
  onSignOut,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [myMember, setMyMember] = useState(null);
  const [membersById, setMembersById] = useState({});
  const [conversations, setConversations] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [incomingBookings, setIncomingBookings] = useState([]);
  const [outgoingBookings, setOutgoingBookings] = useState([]);
  const [stats, setStats] = useState({ followers: 0, messages: 0, bookmarks: 0 });
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState({});
  const [saveStatus, setSaveStatus] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [bookmarkSearch, setBookmarkSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    reason: "",
    proofLink: "",
  });
  const [verificationStatus, setVerificationStatus] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    company: "",
    role: "",
    city: "",
    country: "",
    wa: "",
    phone: "",
    phoneVisibility: "private",
    waVisibility: "private",
    description: "",
    yearsExp: "",
    teamSize: "",
    earnings: "",
    youtubeUrl: "",
  });
  const fileRef = useRef(null);
  const galleryInputRef = useRef(null);
  const qrId = "dashboard-profile-qr";
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [youtubeInputs, setYoutubeInputs] = useState(["", "", ""]);
  const [youtubeVideosStatus, setYoutubeVideosStatus] = useState("");
  const [savingYoutubeVideos, setSavingYoutubeVideos] = useState(false);
  const [mediaGalleryStatus, setMediaGalleryStatus] = useState("");

  const { notifications, unreadCount, loading: notificationsLoading } =
    useNotifications(user);

  const profileUrl = useMemo(() => {
    const slug = myMember?.slug || slugify(profileForm.name || user?.name);
    return `https://topmlmleaders.com/${slug}`;
  }, [myMember?.slug, profileForm.name, user?.name]);

  useEffect(() => {
    const raw = myMember?.youtube_urls;
    if (!Array.isArray(raw)) {
      setYoutubeInputs(["", "", ""]);
      return;
    }
    setYoutubeInputs([
      String(raw[0] ?? "").trim(),
      String(raw[1] ?? "").trim(),
      String(raw[2] ?? "").trim(),
    ]);
  }, [myMember?.id, myMember?.youtube_urls]);

  useEffect(() => {
    if (authInitializing) return undefined;
    if (!user?.id) {
      setLoading(false);
      return undefined;
    }
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      try {
        const myMemberPromise = supabase
          .from("members")
          .select("*")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();
        const conversationsPromise = supabase
          .from("conversations")
          .select("*")
          .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
          .order("last_message_time", { ascending: false });
        const bookmarksPromise = supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        const outgoingPromise = supabase
          .from("bookings")
          .select("*")
          .eq("booker_id", user.id)
          .order("created_at", { ascending: false });

        const [myMemberRes, convRes, bookmarksRes, outgoingRes] = await Promise.all([
          myMemberPromise,
          conversationsPromise,
          bookmarksPromise,
          outgoingPromise,
        ]);

        if (!active) return;

        const memberRow = myMemberRes.data || null;
        setMyMember(memberRow);

        const convRows = convRes.data || [];
        const bookmarkRows = bookmarksRes.data || [];
        const outgoingRows = outgoingRes.data || [];

        setConversations(convRows);
        setOutgoingBookings(outgoingRows);

        const memberIdsFromBookmarks = bookmarkRows.map((row) => row.member_id).filter(Boolean);
        const otherConversationOwnerIds = convRows
          .map((row) => (row.member1_id === user.id ? row.member2_id : row.member1_id))
          .filter(Boolean);
        const bookingMemberIds = outgoingRows.map((row) => row.member_id).filter(Boolean);

        const ownerIdSet = new Set(otherConversationOwnerIds);
        if (memberRow?.owner_id) ownerIdSet.add(memberRow.owner_id);

        const bookmarkOrBookingMemberIds = Array.from(
          new Set([...memberIdsFromBookmarks, ...bookingMemberIds])
        );

        const incomingBookingsPromise =
          memberRow?.id != null
            ? supabase
                .from("bookings")
                .select("*")
                .eq("member_id", memberRow.id)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] });

        const [membersByOwnerRes, bookmarkMemberRes, incomingRes] = await Promise.all([
          ownerIdSet.size
            ? supabase
                .from("members")
                .select("*")
                .in("owner_id", Array.from(ownerIdSet))
            : Promise.resolve({ data: [] }),
          bookmarkOrBookingMemberIds.length
            ? supabase.from("members").select("*").in("id", bookmarkOrBookingMemberIds)
            : Promise.resolve({ data: [] }),
          incomingBookingsPromise,
        ]);

        if (!active) return;

        const allMembers = [...(membersByOwnerRes.data || []), ...(bookmarkMemberRes.data || [])];
        const byId = {};
        allMembers.forEach((row) => {
          byId[row.id] = row;
        });
        setMembersById(byId);

        const bookmarkWithMembers = bookmarkRows
          .map((row) => ({ ...row, member: byId[row.member_id] }))
          .filter((row) => Boolean(row.member));
        setBookmarks(bookmarkWithMembers);

        setStats({
          followers: Number(memberRow?.follower_count || 0),
          messages: convRows.length,
          bookmarks: bookmarkRows.length,
        });

        setIncomingBookings(incomingRes.data || []);

        setProfileForm({
          name: memberRow?.name || user?.name || "",
          company: memberRow?.company || "",
          role: memberRow?.role || "",
          city: memberRow?.city || "",
          country: memberRow?.country || "",
          wa: memberRow?.wa || "",
          phone: memberRow?.phone || "",
          phoneVisibility: memberRow?.phone_visibility || "private",
          waVisibility: memberRow?.wa_visibility || "private",
          description: memberRow?.description || "",
          yearsExp: memberRow?.years_exp || "",
          teamSize: memberRow?.team_size || "",
          earnings: memberRow?.earnings || "",
          youtubeUrl: memberRow?.youtube_url || "",
        });
      } catch {
        /* Supabase/network failures — still show dashboard shell */
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
      setLoading(false);
    };
  }, [authInitializing, user?.id, user?.name]);

  function getMemberPayload() {
    const initials =
      profileForm.name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "ML";
    return {
      owner_id: user.id,
      name: profileForm.name,
      email: user.email,
      company: profileForm.company,
      role: profileForm.role,
      city: profileForm.city,
      country: profileForm.country,
      wa: profileForm.wa,
      phone: profileForm.phone,
      phone_visibility: profileForm.phoneVisibility,
      wa_visibility: profileForm.waVisibility,
      description: profileForm.description,
      team_size: profileForm.teamSize,
      earnings: profileForm.earnings,
      youtube_url: profileForm.youtubeUrl,
      photo_initials: initials,
      slug: myMember?.slug || slugify(profileForm.name),
      updated_at: new Date().toISOString(),
    };
  }

  async function saveProfile() {
    if (!user?.id) return;
    setSavingProfile(true);
    setSaveStatus("");
    try {
      const payload = getMemberPayload();
      let error = null;
      if (myMember?.id) {
        const res = await supabase.from("members").update(payload).eq("id", myMember.id);
        error = res.error;
      } else {
        const res = await supabase
          .from("members")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("*");
        error = res.error;
        if (!error && res.data?.[0]) setMyMember(res.data[0]);
      }
      setSaveStatus(error ? `Could not save profile: ${error.message}` : "✅ Profile saved!");
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadAvatar(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (input) input.value = "";
    if (!file || !user?.id) return;

    setUploading(true);
    try {
      let memberId = myMember?.id;
      if (!memberId) {
        const insertPayload = {
          ...getMemberPayload(),
          created_at: new Date().toISOString(),
        };
        const created = await supabase.from("members").insert(insertPayload).select("*");
        if (created.error || !created.data?.[0]) {
          setSaveStatus(
            created.error
              ? `Could not create profile for photo: ${created.error.message}`
              : "Could not create profile for photo."
          );
          return;
        }
        setMyMember(created.data[0]);
        memberId = created.data[0].id;
      }

      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
      const path = `${memberId}-${Date.now()}.${ext}`;
      const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType });

      if (uploadError) {
        setSaveStatus(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { error: dbError } = await supabase
        .from("members")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", memberId);

      if (dbError) {
        setSaveStatus(`Photo uploaded but profile not updated: ${dbError.message}`);
        return;
      }
      setMyMember((prev) => ({ ...prev, avatar_url: publicUrl }));
      setSaveStatus("");
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadGalleryPhoto(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (input) input.value = "";
    if (!file || !user?.id) return;

    setGalleryUploading(true);
    setMediaGalleryStatus("");
    try {
      let memberRow = myMember;
      let memberId = memberRow?.id;
      if (!memberId) {
        const insertPayload = {
          ...getMemberPayload(),
          created_at: new Date().toISOString(),
        };
        const created = await supabase.from("members").insert(insertPayload).select("*");
        if (created.error || !created.data?.[0]) {
          const msg = created.error
            ? `Could not create profile: ${created.error.message}`
            : "Could not create profile. Save your profile on the Profile tab first.";
          console.error("[TICKET-003 gallery] insert member failed", created.error);
          setMediaGalleryStatus(msg);
          return;
        }
        memberRow = created.data[0];
        memberId = memberRow.id;
        setMyMember(memberRow);
      }

      const existing = Array.isArray(memberRow?.gallery_urls)
        ? memberRow.gallery_urls.filter((u) => typeof u === "string" && u.trim())
        : [];
      if (existing.length >= MAX_GALLERY_PHOTOS) {
        setMediaGalleryStatus(`Maximum ${MAX_GALLERY_PHOTOS} photos. Delete one to add another.`);
        return;
      }

      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
      const path = `${memberId}/${Date.now()}.${ext}`;
      const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(path, file, { upsert: false, cacheControl: "3600", contentType });

      if (uploadError) {
        console.error("[TICKET-003 gallery] storage upload failed", uploadError);
        setMediaGalleryStatus(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const nextGallery = [...existing, publicUrl].slice(0, MAX_GALLERY_PHOTOS);

      const { error: dbError } = await supabase
        .from("members")
        .update({ gallery_urls: nextGallery, updated_at: new Date().toISOString() })
        .eq("id", memberId);

      if (dbError) {
        console.error("[TICKET-003 gallery] members update failed", dbError);
        setMediaGalleryStatus(`Photo uploaded but not saved: ${dbError.message}`);
        return;
      }
      setMyMember((prev) => ({ ...prev, gallery_urls: nextGallery }));
      setMediaGalleryStatus("✅ Photo added!");
      window.setTimeout(() => {
        setMediaGalleryStatus((prev) => (prev === "✅ Photo added!" ? "" : prev));
      }, 4000);
    } catch (e) {
      console.error("[TICKET-003 gallery] unexpected", e);
      setMediaGalleryStatus(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setGalleryUploading(false);
    }
  }

  async function deleteGalleryPhoto(url) {
    if (!myMember?.id || !url) return;
    setMediaGalleryStatus("");
    const existing = Array.isArray(myMember.gallery_urls)
      ? myMember.gallery_urls.filter((u) => typeof u === "string")
      : [];
    const nextGallery = existing.filter((u) => u !== url);
    const { error } = await supabase
      .from("members")
      .update({ gallery_urls: nextGallery, updated_at: new Date().toISOString() })
      .eq("id", myMember.id);
    if (error) {
      setMediaGalleryStatus(error.message || "Could not remove photo.");
      return;
    }
    setMyMember((prev) => (prev ? { ...prev, gallery_urls: nextGallery } : prev));
  }

  async function saveYoutubeVideos() {
    if (!myMember?.id) {
      setYoutubeVideosStatus("Save your profile on the Profile tab first.");
      return;
    }
    setSavingYoutubeVideos(true);
    setYoutubeVideosStatus("");
    try {
      const youtube_urls = [
        youtubeInputs[0]?.trim() || "",
        youtubeInputs[1]?.trim() || "",
        youtubeInputs[2]?.trim() || "",
      ];
      const { error } = await supabase
        .from("members")
        .update({ youtube_urls, updated_at: new Date().toISOString() })
        .eq("id", myMember.id);
      if (error) {
        setYoutubeVideosStatus(error.message || "Could not save videos.");
        return;
      }
      setMyMember((prev) => (prev ? { ...prev, youtube_urls } : prev));
      setYoutubeVideosStatus("✅ Videos saved!");
    } catch (e) {
      setYoutubeVideosStatus(e instanceof Error ? e.message : "Could not save videos.");
    } finally {
      setSavingYoutubeVideos(false);
    }
  }

  function downloadQr() {
    const canvas = document.getElementById(qrId);
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${slugify(profileForm.name || "member")}-topmlmleaders-qr.png`;
    link.click();
  }

  async function copyProfileUrl() {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function confirmBooking(bookingId) {
    await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
    setIncomingBookings((prev) =>
      prev.map((item) =>
        item.id === bookingId ? { ...item, status: "confirmed" } : item
      )
    );
  }

  async function cancelOutgoingBooking(bookingId) {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    setOutgoingBookings((prev) =>
      prev.map((item) =>
        item.id === bookingId ? { ...item, status: "cancelled" } : item
      )
    );
  }

  async function removeBookmark(bookmarkId) {
    await supabase.from("bookmarks").delete().eq("id", bookmarkId);
    setBookmarks((prev) => prev.filter((item) => item.id !== bookmarkId));
    setStats((prev) => ({ ...prev, bookmarks: Math.max(0, prev.bookmarks - 1) }));
  }

  async function submitVerification() {
    if (!user?.id || !myMember?.id || !verificationForm.reason.trim()) return;
    const { error } = await supabase.from("verification_requests").insert({
      user_id: user.id,
      member_id: myMember.id,
      reason: verificationForm.reason,
      proof_link: verificationForm.proofLink || null,
      created_at: new Date().toISOString(),
    });
    setVerificationStatus(
      error
        ? `Could not submit: ${error.message}`
        : "Application submitted! We'll review within 48 hours."
    );
    if (!error) {
      setVerificationForm({ reason: "", proofLink: "" });
    }
  }

  async function deleteAccount() {
    if (myMember?.id) {
      await supabase.from("members").delete().eq("id", myMember.id);
    }
    await onSignOut();
    onBack();
  }

  const filteredBookmarks = useMemo(() => {
    const query = bookmarkSearch.toLowerCase().trim();
    if (!query) return bookmarks;
    return bookmarks.filter((item) => {
      const member = item.member || {};
      return (
        String(member.name || "").toLowerCase().includes(query) ||
        String(member.company || "").toLowerCase().includes(query) ||
        String(member.city || "").toLowerCase().includes(query)
      );
    });
  }, [bookmarkSearch, bookmarks]);

  const conversationRows = useMemo(() => {
    return conversations.map((item) => {
      const otherOwnerId = item.member1_id === user?.id ? item.member2_id : item.member1_id;
      const otherMember = Object.values(membersById).find(
        (memberRow) => memberRow.owner_id === otherOwnerId
      );
      return {
        ...item,
        otherMember: otherMember || null,
      };
    });
  }, [conversations, membersById, user?.id]);

  async function openConversation(row) {
    if (row.otherMember) onOpenChat(row.otherMember);
  }

  const loadMessageUnreadCount = useCallback(
    async (conversationId) => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", user?.id)
        .eq("read", false);
      return count || 0;
    },
    [user?.id]
  );

  const [unreadMessageCounts, setUnreadMessageCounts] = useState({});
  useEffect(() => {
    let active = true;
    async function loadCounts() {
      const pairs = await Promise.all(
        conversationRows.map(async (row) => [row.id, await loadMessageUnreadCount(row.id)])
      );
      if (!active) return;
      const next = {};
      pairs.forEach(([id, count]) => {
        next[id] = count;
      });
      setUnreadMessageCounts(next);
    }
    if (conversationRows.length) loadCounts();
    else setUnreadMessageCounts({});
    return () => {
      active = false;
    };
  }, [conversationRows, loadMessageUnreadCount]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const channel = supabase
      .channel(`dashboard-conversations:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        async () => {
          setSectionLoading((prev) => ({ ...prev, messages: true }));
          const convRes = await supabase
            .from("conversations")
            .select("*")
            .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
            .order("last_message_time", { ascending: false });
          setConversations(convRes.data || []);
          setStats((prev) => ({ ...prev, messages: (convRes.data || []).length }));
          setSectionLoading((prev) => ({ ...prev, messages: false }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (authInitializing) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <p style={{ color: "var(--color-muted)", fontSize: 16 }}>Restoring your session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <h2>Please login to open dashboard</h2>
          <button
            type="button"
            onClick={onBack}
            style={{
              border: "none",
              borderRadius: 999,
              background: "var(--color-primary)",
              color: "#FFFFFF",
              padding: "10px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  function renderOverview() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <section
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            padding: 14,
            boxShadow: "var(--shadow-card)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--color-primary), #4338CA)",
              color: "#FFFFFF",
              display: "grid",
              placeItems: "center",
              fontSize: 24,
              fontWeight: 800,
              overflow: "hidden",
            }}
          >
            {myMember?.avatar_url ? (
              <img src={myMember.avatar_url} alt={myMember.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              (myMember?.photo_initials || "ML").slice(0, 2)
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800 }}>{myMember?.name || user.name}</div>
            <div style={{ color: "var(--color-muted)", fontSize: 13 }}>{user.email}</div>
            <div style={{ marginTop: 6, display: "inline-block", borderRadius: 999, background: "#EEF2FF", color: "var(--color-primary)", padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
              {(myMember?.plan || "free").toUpperCase()}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-muted)" }}>{profileUrl}</div>
          </div>
          <button
            type="button"
            onClick={copyProfileUrl}
            style={{
              border: "1px solid var(--color-border)",
              background: "#FFFFFF",
              borderRadius: 10,
              padding: "8px 10px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </section>

        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px" }}>Recent activity</h3>
          {notificationsLoading ? (
            <p style={{ color: "var(--color-muted)" }}>Loading activity...</p>
          ) : notifications.length ? (
            notifications.slice(0, 8).map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                  background: item.read ? "#FFFFFF" : "#F5F3FF",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {item.type === "message" ? "💬" : "👥"} {item.text}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-muted)" }}>
                  {timeAgo(item.created_at)}
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--color-muted)" }}>No activity yet</p>
          )}
        </section>
      </div>
    );
  }

  function renderProfile() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px" }}>
            {myMember ? "Edit Profile" : "Create Your Profile"}
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Full Name" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.company} onChange={(event) => setProfileForm((prev) => ({ ...prev, company: event.target.value }))} placeholder="Company" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.role} onChange={(event) => setProfileForm((prev) => ({ ...prev, role: event.target.value }))} placeholder="Role" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.city} onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="City" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.country} onChange={(event) => setProfileForm((prev) => ({ ...prev, country: event.target.value }))} placeholder="Country" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone Number" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <select value={profileForm.phoneVisibility} onChange={(event) => setProfileForm((prev) => ({ ...prev, phoneVisibility: event.target.value }))} aria-label="Phone visibility" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="pro">Pro & above</option>
              <option value="elite">Elite & above</option>
            </select>
            <input value={profileForm.wa} onChange={(event) => setProfileForm((prev) => ({ ...prev, wa: event.target.value }))} placeholder="WhatsApp Number" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <select value={profileForm.waVisibility} onChange={(event) => setProfileForm((prev) => ({ ...prev, waVisibility: event.target.value }))} aria-label="WhatsApp visibility" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="pro">Pro & above</option>
              <option value="elite">Elite & above</option>
            </select>
            <textarea value={profileForm.description} onChange={(event) => setProfileForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description/Bio" rows={4} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input type="number" value={profileForm.yearsExp} onChange={(event) => setProfileForm((prev) => ({ ...prev, yearsExp: event.target.value }))} placeholder="Years of Experience" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.teamSize} onChange={(event) => setProfileForm((prev) => ({ ...prev, teamSize: event.target.value }))} placeholder="Team Size" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.earnings} onChange={(event) => setProfileForm((prev) => ({ ...prev, earnings: event.target.value }))} placeholder="Earnings" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
            <input value={profileForm.youtubeUrl} onChange={(event) => setProfileForm((prev) => ({ ...prev, youtubeUrl: event.target.value }))} placeholder="YouTube URL" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#EEF2FF", display: "grid", placeItems: "center", overflow: "hidden", fontWeight: 700 }}>
              {myMember?.avatar_url ? <img src={myMember.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (profileForm.name || "ML").slice(0, 2).toUpperCase()}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={uploadAvatar} />
            <button type="button" onClick={() => fileRef.current?.click()} style={{ border: "1px solid var(--color-border)", background: "#FFFFFF", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
              {uploading ? "Uploading..." : "Upload new photo"}
            </button>
          </div>
          <div style={{ marginTop: 14, background: "#F8FAFC", borderRadius: 12, padding: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Profile QR Code</div>
            <QRCodeCanvas id={qrId} value={profileUrl} size={160} includeMargin />
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={downloadQr} style={{ border: "none", background: "var(--color-primary)", color: "#FFFFFF", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
                Download QR PNG
              </button>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" onClick={saveProfile} style={{ border: "none", background: "var(--color-primary)", color: "#FFFFFF", borderRadius: 10, padding: "10px 14px", fontWeight: 700 }}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
            {saveStatus ? <span style={{ color: "var(--color-muted)", fontSize: 13 }}>{saveStatus}</span> : null}
          </div>
        </section>
      </div>
    );
  }

  function renderMedia() {
    const galleryUrls = Array.isArray(myMember?.gallery_urls)
      ? myMember.gallery_urls.filter((u) => typeof u === "string" && u.trim())
      : [];
    const atLimit = galleryUrls.length >= MAX_GALLERY_PHOTOS;

    return (
      <div style={{ display: "grid", gap: 16 }}>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 6px" }}>📸 Gallery Photos</h3>
          <p style={{ margin: "0 0 12px", color: "var(--color-muted)", fontSize: 14 }}>
            Add photos to showcase on your profile
          </p>
          {mediaGalleryStatus ? (
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 13,
                color: mediaGalleryStatus.startsWith("✅") ? "#059669" : "#DC2626",
              }}
            >
              {mediaGalleryStatus}
            </p>
          ) : null}
          {galleryUrls.length === 0 ? (
            <p style={{ color: "var(--color-muted)", marginBottom: 12 }}>No photos yet. Upload your first photo!</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                marginBottom: 12,
              }}
            >
              {galleryUrls.map((url) => (
                <div
                  key={url}
                  style={{
                    position: "relative",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                    aspectRatio: "1",
                  }}
                >
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => deleteGalleryPhoto(url)}
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.55)",
                      color: "#FFFFFF",
                      fontWeight: 800,
                      cursor: "pointer",
                      lineHeight: 1,
                      fontSize: 18,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={uploadGalleryPhoto}
          />
          <button
            type="button"
            disabled={galleryUploading || atLimit}
            onClick={() => galleryInputRef.current?.click()}
            style={{
              border: "none",
              borderRadius: 10,
              background: galleryUploading || atLimit ? "#D1D5DB" : "var(--color-primary)",
              color: "#FFFFFF",
              padding: "10px 14px",
              fontWeight: 700,
              cursor: galleryUploading || atLimit ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {galleryUploading ? (
              <>
                <span
                  className="spinner"
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTopColor: "#FFFFFF",
                    borderRadius: "50%",
                  }}
                  aria-hidden
                />
                Uploading...
              </>
            ) : (
              "Upload Photo"
            )}
          </button>
        </section>

        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 6px" }}>🎥 YouTube Videos</h3>
          <p style={{ margin: "0 0 12px", color: "var(--color-muted)", fontSize: 14 }}>
            Add up to 3 YouTube video links
          </p>
          {[0, 1, 2].map((index) => {
            const vid = extractYoutubeVideoId(youtubeInputs[index]);
            return (
              <div key={index} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{`Video ${index + 1}`}</div>
                <input
                  value={youtubeInputs[index]}
                  onChange={(event) => {
                    const next = [...youtubeInputs];
                    next[index] = event.target.value;
                    setYoutubeInputs(next);
                  }}
                  placeholder="YouTube URL..."
                  style={{
                    width: "100%",
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    boxSizing: "border-box",
                  }}
                />
                {vid ? (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                      alt=""
                      style={{ width: "100%", display: "block", maxHeight: 180, objectFit: "cover" }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={saveYoutubeVideos}
            disabled={savingYoutubeVideos}
            style={{
              border: "none",
              borderRadius: 10,
              background: savingYoutubeVideos ? "#D1D5DB" : "var(--color-primary)",
              color: "#FFFFFF",
              padding: "10px 14px",
              fontWeight: 700,
              cursor: savingYoutubeVideos ? "default" : "pointer",
            }}
          >
            {savingYoutubeVideos ? "Saving..." : "Save Videos"}
          </button>
          {youtubeVideosStatus ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 13,
                color: youtubeVideosStatus.startsWith("✅") ? "#059669" : "#DC2626",
              }}
            >
              {youtubeVideosStatus}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  function renderMessages() {
    return (
      <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
        <h3 style={{ margin: "0 0 10px" }}>Conversations</h3>
        {sectionLoading.messages ? <p style={{ color: "var(--color-muted)" }}>Loading conversations...</p> : null}
        {conversationRows.length ? (
          conversationRows.map((row) => {
            const other = row.otherMember;
            const unread = unreadMessageCounts[row.id] || 0;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => openConversation(row)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#EEF2FF", display: "grid", placeItems: "center", fontWeight: 700 }}>
                  {String(other?.photo_initials || other?.name || "U").slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{other?.name || "Member"}</div>
                  <div style={{ color: "var(--color-muted)", fontSize: 12 }}>
                    {row.last_message || "No messages yet"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--color-muted)", fontSize: 12 }}>
                    {timeAgo(row.last_message_time || row.created_at)}
                  </div>
                  {unread ? (
                    <span style={{ marginTop: 4, display: "inline-block", background: "var(--color-primary)", color: "#FFFFFF", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                      {unread}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })
        ) : (
          <p style={{ color: "var(--color-muted)" }}>
            No conversations yet. Start chatting from member profiles!
          </p>
        )}
      </section>
    );
  }

  function renderBookmarks() {
    return (
      <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
        <h3 style={{ margin: "0 0 10px" }}>Bookmarks</h3>
        <input
          value={bookmarkSearch}
          onChange={(event) => setBookmarkSearch(event.target.value)}
          placeholder="Search saved profiles..."
          style={{ width: "100%", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}
        />
        {filteredBookmarks.length ? (
          filteredBookmarks.map((row) => {
            const memberRow = row.member;
            return (
              <div
                key={row.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <button type="button" onClick={() => onOpenProfile(memberRow)} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", background: "transparent", textAlign: "left", flex: 1, cursor: "pointer" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#EEF2FF", display: "grid", placeItems: "center", fontWeight: 700, overflow: "hidden" }}>
                    {memberRow?.avatar_url ? (
                      <img src={memberRow.avatar_url} alt={memberRow.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      String(memberRow?.photo_initials || memberRow?.name || "M").slice(0, 2)
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{memberRow?.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                      {memberRow?.role} · {memberRow?.company} · {memberRow?.city}
                    </div>
                  </div>
                </button>
                <button type="button" onClick={() => removeBookmark(row.id)} style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "#FFFFFF", width: 30, height: 30, cursor: "pointer" }}>
                  ×
                </button>
              </div>
            );
          })
        ) : (
          <p style={{ color: "var(--color-muted)" }}>
            No bookmarks yet. Save profiles from the directory!
          </p>
        )}
      </section>
    );
  }

  function bookingBadge(status) {
    if (status === "confirmed") return { color: "#10B981", bg: "#ECFDF5", label: "Confirmed" };
    if (status === "cancelled") return { color: "#EF4444", bg: "#FEF2F2", label: "Cancelled" };
    return { color: "#F59E0B", bg: "#FFFBEB", label: "Pending" };
  }

  function renderBookings() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px" }}>Incoming bookings</h3>
          {incomingBookings.length ? (
            incomingBookings.map((row) => {
              const badge = bookingBadge(row.status);
              return (
                <div key={row.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{row.booker_name || "Member"}</strong>
                    <span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{badge.label}</span>
                  </div>
                  <div style={{ marginTop: 4, color: "var(--color-muted)", fontSize: 13 }}>
                    {row.slot_day} · {row.slot_time} · {row.slot_type}
                  </div>
                  {row.status === "pending" ? (
                    <button type="button" onClick={() => confirmBooking(row.id)} style={{ marginTop: 8, border: "none", borderRadius: 8, background: "var(--color-primary)", color: "#FFFFFF", padding: "7px 10px", fontWeight: 700 }}>
                      Confirm
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p style={{ color: "var(--color-muted)" }}>No incoming bookings yet.</p>
          )}
        </section>

        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px" }}>Outgoing bookings</h3>
          {outgoingBookings.length ? (
            outgoingBookings.map((row) => {
              const badge = bookingBadge(row.status);
              const host = membersById[row.member_id];
              return (
                <div key={row.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>{host?.name || "Host"}</strong>
                    <span style={{ background: badge.bg, color: badge.color, borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{badge.label}</span>
                  </div>
                  <div style={{ marginTop: 4, color: "var(--color-muted)", fontSize: 13 }}>
                    {row.slot_day} · {row.slot_time} · {row.slot_type}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    {host?.wa ? (
                      <button type="button" onClick={() => window.open(`https://wa.me/${String(host.wa).replace(/[^\d]/g, "")}`, "_blank", "noopener")} style={{ border: "1px solid #D1FAE5", borderRadius: 8, background: "#ECFDF5", color: "#10B981", padding: "7px 10px", fontWeight: 700 }}>
                        WA
                      </button>
                    ) : null}
                    {row.status === "pending" ? (
                      <button type="button" onClick={() => cancelOutgoingBooking(row.id)} style={{ border: "1px solid #FECACA", borderRadius: 8, background: "#FFFFFF", color: "#EF4444", padding: "7px 10px", fontWeight: 700 }}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: "var(--color-muted)" }}>No outgoing bookings yet.</p>
          )}
        </section>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px" }}>Account</h3>
          <p style={{ margin: "0 0 8px", color: "var(--color-muted)" }}>Email: {user.email}</p>
          <div style={{ marginBottom: 8, display: "inline-block", background: "#EEF2FF", color: "var(--color-primary)", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
            {(myMember?.plan || "free").toUpperCase()}
          </div>
          <div>
            <button type="button" style={{ border: "none", background: "#F59E0B", color: "#FFFFFF", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
              Upgrade Plan
            </button>
          </div>
        </section>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px" }}>Verification</h3>
          <p style={{ color: "var(--color-muted)" }}>
            Current status: {myMember?.verified ? "Verified ✓" : "Unverified"}
          </p>
          {!myMember?.verified ? (
            <div style={{ display: "grid", gap: 8 }}>
              <input value={verificationForm.reason} onChange={(event) => setVerificationForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Reason for verification" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
              <input value={verificationForm.proofLink} onChange={(event) => setVerificationForm((prev) => ({ ...prev, proofLink: event.target.value }))} placeholder="Social proof link" style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }} />
              <button type="button" onClick={submitVerification} style={{ border: "none", background: "var(--color-primary)", color: "#FFFFFF", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
                Apply for Verification
              </button>
              {verificationStatus ? <p style={{ margin: 0, color: "var(--color-muted)" }}>{verificationStatus}</p> : null}
            </div>
          ) : null}
        </section>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px", color: "#EF4444" }}>Danger Zone</h3>
          <button type="button" onClick={() => setShowDeleteConfirm(true)} style={{ border: "1px solid #FECACA", background: "#FFFFFF", color: "#EF4444", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
            Delete Account
          </button>
        </section>
      </div>
    );
  }

  function renderRefer() {
    const refSlug = slugify(user.name || user.email || "member");
    const referralLink = `https://topmlmleaders.com/ref/${refSlug}`;
    return (
      <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
        <h3 style={{ margin: "0 0 10px" }}>Refer & Earn</h3>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, marginBottom: 10 }}>{referralLink}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={async () => navigator.clipboard.writeText(referralLink)} style={{ border: "1px solid var(--color-border)", background: "#FFFFFF", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
            Copy
          </button>
          <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on TopMLMLeaders: ${referralLink}`)}`, "_blank", "noopener")} style={{ border: "1px solid #D1FAE5", background: "#ECFDF5", color: "#10B981", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}>
            Share on WhatsApp
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, textAlign: "center" }}><strong>0</strong><div style={{ fontSize: 12, color: "var(--color-muted)" }}>Total referrals</div></div>
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, textAlign: "center" }}><strong>₹0</strong><div style={{ fontSize: 12, color: "var(--color-muted)" }}>Earnings</div></div>
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, textAlign: "center" }}><strong>₹0</strong><div style={{ fontSize: 12, color: "var(--color-muted)" }}>This month</div></div>
        </div>
        <div style={{ marginTop: 12, background: "#EEF2FF", color: "var(--color-primary)", borderRadius: 10, padding: 10, fontWeight: 600 }}>
          Referral rewards launching soon!
        </div>
      </section>
    );
  }

  function renderTabContent() {
    if (loading) return <p style={{ color: "var(--color-muted)" }}>Loading dashboard...</p>;
    if (activeTab === "overview") return renderOverview();
    if (activeTab === "profile") return renderProfile();
    if (activeTab === "media") return renderMedia();
    if (activeTab === "messages") return renderMessages();
    if (activeTab === "bookmarks") return renderBookmarks();
    if (activeTab === "bookings") return renderBookings();
    if (activeTab === "settings") return renderSettings();
    return renderRefer();
  }

  return (
    <div
      className="fade-in"
      style={{
        minHeight: "100vh",
        background: "#FFFFFF",
        position: "relative",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          background: "#FFFFFF",
          borderBottom: "1px solid var(--color-border)",
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={onBack} style={{ justifySelf: "start", border: "none", background: "transparent", fontWeight: 700, cursor: "pointer" }}>
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>My Dashboard</h1>
          <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-primary), #4338CA)", color: "#FFFFFF", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>
              {(user.name || "M").slice(0, 1).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "var(--color-muted)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </span>
          </div>
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { key: "followers", icon: "👥", label: "Followers", value: stats.followers, tab: "overview" },
            { key: "messages", icon: "💬", label: "Messages", value: stats.messages, tab: "messages" },
            { key: "bookmarks", icon: "🔖", label: "Bookmarks", value: stats.bookmarks, tab: "bookmarks" },
            { key: "alerts", icon: "🔔", label: "Alerts", value: unreadCount, tab: "overview" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.tab)}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                background: "#FFFFFF",
                padding: 10,
                textAlign: "center",
                cursor: "pointer",
                position: "relative",
              }}
            >
              <div style={{ fontSize: 14 }}>{item.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 2px" }}>{item.value}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{item.label}</div>
              {item.key === "alerts" && unreadCount > 0 ? (
                <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
              ) : null}
            </button>
          ))}
        </section>

        <section style={{ borderBottom: "1px solid var(--color-border)", marginBottom: 12 }}>
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "10px 6px",
                  fontWeight: activeTab === tab ? 800 : 600,
                  color: activeTab === tab ? "var(--color-primary)" : "var(--color-muted)",
                  borderBottom: activeTab === tab ? "2px solid var(--color-primary)" : "2px solid transparent",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </section>

        {renderTabContent()}
      </main>

      {showDeleteConfirm ? (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 90,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ background: "#FFFFFF", borderRadius: 14, padding: 16, width: "100%", maxWidth: 420 }}
          >
            <h3 style={{ marginTop: 0 }}>Delete account?</h3>
            <p style={{ color: "var(--color-muted)" }}>
              Are you sure? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, border: "1px solid var(--color-border)", borderRadius: 10, background: "#FFFFFF", padding: "10px 12px", fontWeight: 700 }}>
                Cancel
              </button>
              <button type="button" onClick={deleteAccount} style={{ flex: 1, border: "none", borderRadius: 10, background: "#EF4444", color: "#FFFFFF", padding: "10px 12px", fontWeight: 700 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Dashboard;

