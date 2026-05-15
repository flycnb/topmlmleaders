import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../../lib/supabaseClient";
import { useNotifications } from "../notifications/useNotifications";
import { mapMembers } from "../search";

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
  "messages",
  "media",
  "services",
  "events",
  "team",
  "bookmarks",
  "bookings",
  "settings",
  "refer & earn",
];

const TAB_LABELS = {
  messages: "Chat",
  "refer & earn": "Refer & Earn",
};

const MAX_GALLERY_PHOTOS = 10;

/** Must match bucket id in Supabase Dashboard → Storage (this project uses avtars). */
const AVATAR_STORAGE_BUCKET = "avtars";

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

/** Segment used in public profile URL `/u/{segment}` — stored slug, derived slug, or member id. */
function memberPublicSlugSegment(member, profileNameFallback, userNameFallback) {
  if (!member) {
    return slugify(profileNameFallback || userNameFallback || "") || "";
  }
  const stored = member.slug && String(member.slug).trim();
  if (stored) return stored;
  const derived = slugify(profileNameFallback || userNameFallback || "");
  if (derived) return derived;
  return member.id != null ? String(member.id) : "";
}

function normalizeCustomSlugInput(raw) {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateCustomSlug(normalized) {
  if (!normalized || normalized.length < 3 || normalized.length > 30) {
    return "Use 3–30 characters (lowercase letters, numbers, hyphens).";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    return "Use lowercase letters, numbers, and hyphens only.";
  }
  return null;
}

function canCustomizeProfileSlug(plan) {
  const p = String(plan || "free").toLowerCase();
  return p === "pro" || p === "elite";
}

const MS_PER_DAY = 86400000;

function planCapsForMemberPlan(plan) {
  const p = String(plan || "free").toLowerCase();
  const unlimited = p === "elite" || p === "company";
  return {
    productsMax: unlimited ? Number.MAX_SAFE_INTEGER : p === "pro" ? 10 : 3,
    eventsMax: unlimited ? Number.MAX_SAFE_INTEGER : p === "pro" ? 5 : 1,
    teamMax: unlimited ? Number.MAX_SAFE_INTEGER : p === "pro" ? 10 : 3,
  };
}

function formatCapLabel(n) {
  return n >= Number.MAX_SAFE_INTEGER / 2 ? "∞" : String(n);
}

function planPdfCapForPlan(plan) {
  const p = String(plan || "free").toLowerCase();
  if (p === "elite" || p === "company") return Number.MAX_SAFE_INTEGER;
  if (p === "pro") return 3;
  return 1;
}

/** Escape structured values for vCard 3.0 (comma, semicolon, backslash, newline). */
function escapeVcardText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function buildDashboardProfileVcard({ name, phone, whatsappDigits, email, company, role, city, country, profileUrl }) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const fn = escapeVcardText(name);
  lines.push(fn ? `FN:${fn}` : "FN:Member");
  lines.push(fn ? `N:${fn};;;;` : "N:Member;;;;");
  if (company) lines.push(`ORG:${escapeVcardText(company)}`);
  if (role) lines.push(`TITLE:${escapeVcardText(role)}`);
  const tel = String(phone || "").replace(/[^\d+]/g, "");
  if (tel) lines.push(`TEL;TYPE=CELL:${escapeVcardText(tel)}`);
  if (whatsappDigits) {
    lines.push(`item1.TEL;TYPE=CELL:${escapeVcardText(whatsappDigits)}`);
    lines.push("item1.X-ABLabel:WhatsApp");
  }
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVcardText(email)}`);
  if (city || country) {
    lines.push(`ADR;TYPE=WORK:;;;${escapeVcardText(city)};;;${escapeVcardText(country)}`);
  }
  if (profileUrl) lines.push(`URL:${escapeVcardText(profileUrl)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** Reject if `promise` does not settle within `ms` (avoids hung Supabase calls leaving UI stuck). */
function withTimeout(promise, ms, label = "Request") {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(
        () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
        ms
      );
    }),
  ]);
}

/** Normalize `members.gallery_urls` (jsonb array or legacy string) into string URLs. */
function normalizeGalleryUrls(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((u) => typeof u === "string" && u.trim());
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((u) => typeof u === "string" && u.trim());
      }
    } catch {
      /* ignore */
    }
  }
  return [];
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
  signingOut = false,
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
  const [referralCopied, setReferralCopied] = useState(false);
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
  const [dashProducts, setDashProducts] = useState([]);
  const [dashEvents, setDashEvents] = useState([]);
  const [dashTeam, setDashTeam] = useState([]);
  const [extrasStatusProducts, setExtrasStatusProducts] = useState("");
  const [extrasStatusEvents, setExtrasStatusEvents] = useState("");
  const [extrasStatusTeam, setExtrasStatusTeam] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: "" });
  const [newEvent, setNewEvent] = useState({ title: "", date: "", location: "", description: "" });
  const [newTeam, setNewTeam] = useState({ name: "", role: "" });
  const teamPhotoInputRef = useRef(null);
  const [teamPhotoRowId, setTeamPhotoRowId] = useState(null);
  const [teamPhotoUploading, setTeamPhotoUploading] = useState(false);
  const productPdfInputRef = useRef(null);
  const [productPdfRowId, setProductPdfRowId] = useState(null);
  const [productPdfUploading, setProductPdfUploading] = useState(false);
  const claimOwnerAttemptedRef = useRef(false);
  const navigate = useNavigate();
  const [slugDraft, setSlugDraft] = useState("");
  const [slugSettingsStatus, setSlugSettingsStatus] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);
  const [referralCount, setReferralCount] = useState(null);

  const { notifications, unreadCount, loading: notificationsLoading } =
    useNotifications(user);

  useEffect(() => {
    setStats((prev) => ({ ...prev, bookmarks: bookmarks.length }));
  }, [bookmarks]);

  const profileUrl = useMemo(() => {
    const segment = memberPublicSlugSegment(myMember, profileForm.name, user?.name);
    if (!segment) return "https://topmlmleaders.com/";
    return `https://topmlmleaders.com/u/${encodeURIComponent(segment)}`;
  }, [myMember, profileForm.name, user?.name]);

  const profileVcard = useMemo(() => {
    const slug =
      (myMember?.slug && String(myMember.slug).trim()) ||
      slugify(profileForm.name || user?.name || "") ||
      (myMember?.id != null ? String(myMember.id) : "");
    const websiteUrl = slug
      ? `https://topmlmleaders.com/u/${encodeURIComponent(slug)}`
      : "https://topmlmleaders.com/";

    return buildDashboardProfileVcard({
      name: String(profileForm.name || myMember?.name || user?.name || "").trim(),
      phone: String(profileForm.phone || myMember?.phone || "").trim(),
      whatsappDigits: String(profileForm.wa || myMember?.wa || "").replace(/\D/g, ""),
      email: String(user?.email || "").trim(),
      company: String(profileForm.company || myMember?.company || "").trim(),
      role: String(profileForm.role || myMember?.role || "").trim(),
      city: String(profileForm.city || myMember?.city || "").trim(),
      country: String(profileForm.country || myMember?.country || "").trim(),
      profileUrl: websiteUrl,
    });
  }, [
    profileForm.name,
    profileForm.phone,
    profileForm.wa,
    profileForm.company,
    profileForm.role,
    profileForm.city,
    profileForm.country,
    myMember?.name,
    myMember?.phone,
    myMember?.wa,
    myMember?.company,
    myMember?.role,
    myMember?.city,
    myMember?.country,
    myMember?.slug,
    myMember?.id,
    user?.name,
    user?.email,
  ]);

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
    if (!myMember?.id) {
      setDashProducts([]);
      setDashEvents([]);
      setDashTeam([]);
      return undefined;
    }
    let active = true;
    (async () => {
      const [pr, ev, tm] = await Promise.all([
        supabase.from("products").select("*").eq("member_id", myMember.id).order("created_at", { ascending: true }),
        supabase.from("events").select("*").eq("member_id", myMember.id).order("date", { ascending: true }),
        supabase.from("profile_team").select("*").eq("member_id", myMember.id).order("sort_order", { ascending: true }),
      ]);
      if (!active) return;
      setDashProducts(pr.data || []);
      setDashEvents(ev.data || []);
      setDashTeam(tm.data || []);
    })();
    return () => {
      active = false;
    };
  }, [myMember?.id]);

  useEffect(() => {
    if (authInitializing) return undefined;
    if (!user?.id) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    let loadTimeoutId = null;

    async function loadDashboard() {
      setLoading(true);
      loadTimeoutId = window.setTimeout(() => {
        if (!active) return;
        console.warn("[dashboard] dashboard data fetch exceeded 5s; unlocking UI");
        setLoading(false);
      }, 5000);

      try {
        const myMemberRes = await supabase
          .from("members")
          .select("*")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!active) return;

        const memberRow = myMemberRes.data || null;
        setMyMember(memberRow);

        const conversationsPromise = supabase
          .from("conversations")
          .select("*")
          .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
          .order("last_message_time", {
            ascending: false,
            nullsFirst: false,
          });
        const bookmarksPromise =
          memberRow?.id != null
            ? supabase
                .from("bookmarks")
                .select("*")
                .eq("member_id", memberRow.id)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] });
        const outgoingPromise = supabase
          .from("bookings")
          .select("*")
          .eq("booker_id", user.id)
          .order("created_at", { ascending: false });

        const [convRes, bookmarksRes, outgoingRes] = await Promise.all([
          conversationsPromise,
          bookmarksPromise,
          outgoingPromise,
        ]);

        if (!active) return;

        const convRows = convRes.data || [];
        const bookmarkRows = bookmarksRes.data || [];
        const outgoingRows = outgoingRes.data || [];

        setConversations(convRows);
        setOutgoingBookings(outgoingRows);

        const memberIdsFromBookmarks = bookmarkRows.map((row) => row.saved_member_id).filter(Boolean);
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
          .map((row) => ({ ...row, member: byId[row.saved_member_id] }))
          .filter((row) => Boolean(row.member));
        setBookmarks(bookmarkWithMembers);

        setStats({
          followers: Number(memberRow?.follower_count || 0),
          messages: convRows.length,
          bookmarks: bookmarkWithMembers.length,
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
      } catch (err) {
        console.error("[dashboard] loadDashboard failed", err);
      } finally {
        if (loadTimeoutId != null) {
          window.clearTimeout(loadTimeoutId);
          loadTimeoutId = null;
        }
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
      if (loadTimeoutId != null) window.clearTimeout(loadTimeoutId);
      setLoading(false);
    };
  }, [authInitializing, user?.id, user?.name]);

  useEffect(() => {
    if (!myMember?.id) {
      setSlugDraft("");
      return;
    }
    const stored = myMember.slug && String(myMember.slug).trim();
    setSlugDraft(
      stored ||
        slugify(profileForm.name || user?.name || "") ||
        String(myMember.id)
    );
    // Only re-sync when server slug or member row changes — avoids wiping unsaved slug edits when name changes on Profile tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps
  }, [myMember?.id, myMember?.slug]);

  useEffect(() => {
    if (!user?.id || loading) return undefined;
    let active = true;
    (async () => {
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", String(user.id));
      if (!active) return;
      if (error) {
        console.warn("[dashboard] referral count", error.message);
        setReferralCount(0);
        return;
      }
      setReferralCount(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [user?.id, loading]);

  useEffect(() => {
    if (
      referralCount === null ||
      !user?.id ||
      !myMember?.id ||
      myMember.owner_id !== user.id
    ) {
      return undefined;
    }
    const bonus5 = Boolean(myMember.referral_bonus_5_applied);
    const bonus10 = Boolean(myMember.referral_bonus_10_applied);
    let baseMs = Math.max(
      Date.now(),
      myMember.plan_expires_at ? new Date(myMember.plan_expires_at).getTime() : 0
    );
    const patches = {};
    if (referralCount >= 5 && !bonus5) {
      baseMs += 30 * MS_PER_DAY;
      patches.referral_bonus_5_applied = true;
    }
    if (referralCount >= 10 && !bonus10) {
      baseMs += 90 * MS_PER_DAY;
      patches.referral_bonus_10_applied = true;
    }
    if (Object.keys(patches).length === 0) return undefined;

    patches.plan_expires_at = new Date(baseMs).toISOString();
    patches.updated_at = new Date().toISOString();

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("members")
        .update(patches)
        .eq("id", myMember.id)
        .eq("owner_id", user.id)
        .select("*")
        .maybeSingle();
      if (cancelled || error) return;
      if (data) setMyMember(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    referralCount,
    user?.id,
    myMember?.id,
    myMember?.owner_id,
    myMember?.referral_bonus_5_applied,
    myMember?.referral_bonus_10_applied,
    myMember?.plan_expires_at,
  ]);

  useEffect(() => {
    if (!user?.id || !myMember?.id || loading) return;
    if (myMember.owner_id === user.id) {
      claimOwnerAttemptedRef.current = false;
      return;
    }
    if (myMember.owner_id != null) return;
    if (claimOwnerAttemptedRef.current) return;
    claimOwnerAttemptedRef.current = true;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("members")
        .update({
          owner_id: user.id,
          email: user.email || myMember.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", myMember.id)
        .is("owner_id", null)
        .select("*")
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.warn("[dashboard] claim member owner failed", error.message);
        claimOwnerAttemptedRef.current = false;
        return;
      }
      if (data) setMyMember(data);
      claimOwnerAttemptedRef.current = false;
    })();
    return () => {
      active = false;
    };
  }, [user?.id, user?.email, myMember?.id, myMember?.owner_id, myMember?.email, loading]);

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

      const { error: uploadError } = await withTimeout(
        supabase.storage
          .from(AVATAR_STORAGE_BUCKET)
          .upload(path, file, { upsert: true, cacheControl: "3600", contentType }),
        120000,
        "Avatar upload"
      );

      if (uploadError) {
        setSaveStatus(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from(AVATAR_STORAGE_BUCKET).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { data: updatedMember, error: dbError } = await withTimeout(
        supabase
          .from("members")
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", memberId)
          .eq("owner_id", user.id)
          .select("id, avatar_url")
          .maybeSingle(),
        30000,
        "Saving avatar URL"
      );

      if (dbError) {
        setSaveStatus(`Photo uploaded but profile not updated: ${dbError.message}`);
        return;
      }
      if (!updatedMember) {
        console.error("[dashboard avatar] members update matched 0 rows (RLS or missing row)", { memberId });
        setSaveStatus(
          "Photo uploaded to storage but the profile row could not be updated. Check Members table UPDATE policy for your user and the avatar_url column."
        );
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

      const existing = normalizeGalleryUrls(memberRow?.gallery_urls);
      if (existing.length >= MAX_GALLERY_PHOTOS) {
        setMediaGalleryStatus(`Maximum ${MAX_GALLERY_PHOTOS} photos. Delete one to add another.`);
        return;
      }

      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
      const path = `${memberId}/${Date.now()}.${ext}`;
      const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

      const { error: uploadError } = await withTimeout(
        supabase.storage.from("gallery").upload(path, file, { upsert: false, cacheControl: "3600", contentType }),
        120000,
        "Gallery file upload"
      );

      if (uploadError) {
        console.error("[TICKET-003 gallery] storage upload failed", uploadError);
        setMediaGalleryStatus(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const nextGallery = [...existing, publicUrl].slice(0, MAX_GALLERY_PHOTOS);

      const { data: updatedMember, error: dbError } = await withTimeout(
        supabase
          .from("members")
          .update({ gallery_urls: nextGallery, updated_at: new Date().toISOString() })
          .eq("id", memberId)
          .eq("owner_id", user.id)
          .select("id, gallery_urls")
          .maybeSingle(),
        30000,
        "Saving gallery URLs"
      );

      if (dbError) {
        console.error("[TICKET-003 gallery] members update failed", dbError);
        setMediaGalleryStatus(`Photo uploaded but not saved: ${dbError.message}`);
        return;
      }
      if (!updatedMember) {
        console.error("[TICKET-003 gallery] members update matched 0 rows (RLS or missing row)", { memberId });
        setMediaGalleryStatus(
          "Photo is in storage but could not update your profile. Add a `gallery_urls` jsonb column on `members` and allow authenticated owners to UPDATE their row."
        );
        return;
      }
      const savedUrls = normalizeGalleryUrls(updatedMember.gallery_urls);
      setMyMember((prev) => ({ ...prev, gallery_urls: savedUrls.length ? savedUrls : nextGallery }));
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
    if (!myMember?.id || !user?.id || !url) return;
    setMediaGalleryStatus("");
    const existing = normalizeGalleryUrls(myMember.gallery_urls);
    const nextGallery = existing.filter((u) => u !== url);
    const { data: updatedMember, error } = await withTimeout(
      supabase
        .from("members")
        .update({ gallery_urls: nextGallery, updated_at: new Date().toISOString() })
        .eq("id", myMember.id)
        .eq("owner_id", user.id)
        .select("gallery_urls")
        .maybeSingle(),
      30000,
      "Removing gallery photo"
    );
    if (error) {
      setMediaGalleryStatus(error.message || "Could not remove photo.");
      return;
    }
    if (!updatedMember) {
      setMediaGalleryStatus("Could not remove photo (no permission or row missing).");
      return;
    }
    setMyMember((prev) =>
      prev ? { ...prev, gallery_urls: normalizeGalleryUrls(updatedMember.gallery_urls) } : prev
    );
  }

  async function saveYoutubeVideos() {
    if (!myMember?.id || !user?.id) {
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
      const { data: updatedRow, error } = await supabase
        .from("members")
        .update({ youtube_urls, updated_at: new Date().toISOString() })
        .eq("id", myMember.id)
        .eq("owner_id", user.id)
        .select("youtube_urls")
        .maybeSingle();
      if (error) {
        setYoutubeVideosStatus(error.message || "Could not save videos.");
        return;
      }
      if (!updatedRow) {
        setYoutubeVideosStatus(
          "Could not save videos (no matching row or update blocked). Check you are logged in as the profile owner."
        );
        return;
      }
      const saved = Array.isArray(updatedRow.youtube_urls) ? updatedRow.youtube_urls : youtube_urls;
      setMyMember((prev) => (prev ? { ...prev, youtube_urls: saved } : prev));
      setYoutubeVideosStatus("✅ Videos saved!");
    } catch (e) {
      setYoutubeVideosStatus(e instanceof Error ? e.message : "Could not save videos.");
    } finally {
      setSavingYoutubeVideos(false);
    }
  }

  async function addDashboardProduct() {
    if (!user?.id || !myMember?.id) {
      setExtrasStatusProducts("Save your profile first.");
      return;
    }
    await supabase.auth.getSession();
    const caps = planCapsForMemberPlan(myMember.plan);
    if (dashProducts.length >= caps.productsMax) {
      setExtrasStatusProducts("You have reached your plan limit for services.");
      return;
    }
    const name = newProduct.name.trim();
    if (!name) {
      setExtrasStatusProducts("Service name is required.");
      return;
    }
    setExtrasStatusProducts("");
    const { data, error } = await supabase
      .from("products")
      .insert({
        member_id: myMember.id,
        name,
        description: newProduct.description.trim() || null,
        price: newProduct.price.trim() || null,
      })
      .select("*");
    if (error) {
      setExtrasStatusProducts(error.message);
      return;
    }
    setNewProduct({ name: "", description: "", price: "" });
    setDashProducts((prev) => [...prev, ...(data || [])]);
    setExtrasStatusProducts("✅ Service added.");
    window.setTimeout(() => setExtrasStatusProducts((prev) => (prev === "✅ Service added." ? "" : prev)), 4000);
  }

  async function deleteDashboardProduct(id) {
    if (!user?.id || !myMember?.id || !id) return;
    const { error } = await supabase.from("products").delete().eq("id", id).eq("member_id", myMember.id);
    if (error) {
      setExtrasStatusProducts(error.message);
      return;
    }
    setDashProducts((prev) => prev.filter((row) => row.id !== id));
  }

  async function clearProductPdf(productId) {
    if (!user?.id || !myMember?.id || !productId) return;
    const { error } = await supabase
      .from("products")
      .update({ pdf_url: null })
      .eq("id", productId)
      .eq("member_id", myMember.id);
    if (error) {
      setExtrasStatusProducts(error.message);
      return;
    }
    setDashProducts((prev) => prev.map((row) => (row.id === productId ? { ...row, pdf_url: null } : row)));
  }

  async function onProductPdfFileChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (input) input.value = "";
    const pid = productPdfRowId;
    setProductPdfRowId(null);
    if (!file || !pid || !myMember?.id || !user?.id) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setExtrasStatusProducts("Please upload a PDF file.");
      return;
    }
    const pdfCap = planPdfCapForPlan(myMember.plan);
    const rowsWithPdf = dashProducts.filter((r) => r.pdf_url);
    const row = dashProducts.find((r) => r.id === pid);
    const replacing = Boolean(row?.pdf_url);
    if (!replacing && rowsWithPdf.length >= pdfCap) {
      setExtrasStatusProducts("PDF limit reached for your plan (Free: 1, Pro: 3, Elite: unlimited).");
      return;
    }
    setProductPdfUploading(true);
    setExtrasStatusProducts("");
    try {
      const path = `${myMember.id}/product-${pid}-${Date.now()}.pdf`;
      const { error: upErr } = await withTimeout(
        supabase.storage.from("gallery").upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: "application/pdf",
        }),
        120000,
        "PDF upload"
      );
      if (upErr) {
        setExtrasStatusProducts(upErr.message);
        return;
      }
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { data: updated, error } = await supabase
        .from("products")
        .update({ pdf_url: publicUrl })
        .eq("id", pid)
        .eq("member_id", myMember.id)
        .select("id, pdf_url")
        .maybeSingle();
      if (error) {
        setExtrasStatusProducts(error.message);
        return;
      }
      if (updated) {
        setDashProducts((prev) =>
          prev.map((r) => (r.id === pid ? { ...r, pdf_url: updated.pdf_url } : r))
        );
        setExtrasStatusProducts("✅ PDF saved.");
        window.setTimeout(() => setExtrasStatusProducts((p) => (p === "✅ PDF saved." ? "" : p)), 4000);
      }
    } catch (e) {
      setExtrasStatusProducts(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setProductPdfUploading(false);
    }
  }

  async function addDashboardEvent() {
    if (!user?.id || !myMember?.id) {
      setExtrasStatusEvents("Save your profile first.");
      return;
    }
    await supabase.auth.getSession();
    const caps = planCapsForMemberPlan(myMember.plan);
    if (dashEvents.length >= caps.eventsMax) {
      setExtrasStatusEvents("You have reached your plan limit for events.");
      return;
    }
    const title = newEvent.title.trim();
    const date = newEvent.date.trim();
    if (!title || !date) {
      setExtrasStatusEvents("Title and date are required.");
      return;
    }
    setExtrasStatusEvents("");
    const { data, error } = await supabase
      .from("events")
      .insert({
        member_id: myMember.id,
        title,
        date,
        location: newEvent.location.trim() || null,
        description: newEvent.description.trim() || null,
      })
      .select("*");
    if (error) {
      setExtrasStatusEvents(error.message);
      return;
    }
    setNewEvent({ title: "", date: "", location: "", description: "" });
    setDashEvents((prev) => [...prev, ...(data || [])]);
    setExtrasStatusEvents("✅ Event added.");
    window.setTimeout(() => setExtrasStatusEvents((prev) => (prev === "✅ Event added." ? "" : prev)), 4000);
  }

  async function deleteDashboardEvent(id) {
    if (!user?.id || !myMember?.id || !id) return;
    const { error } = await supabase.from("events").delete().eq("id", id).eq("member_id", myMember.id);
    if (error) {
      setExtrasStatusEvents(error.message);
      return;
    }
    setDashEvents((prev) => prev.filter((row) => row.id !== id));
  }

  async function addDashboardTeamMember() {
    if (!user?.id || !myMember?.id) {
      setExtrasStatusTeam("Save your profile first.");
      return;
    }
    await supabase.auth.getSession();
    const caps = planCapsForMemberPlan(myMember.plan);
    if (dashTeam.length >= caps.teamMax) {
      setExtrasStatusTeam("You have reached your plan limit for team members.");
      return;
    }
    const name = newTeam.name.trim();
    if (!name) {
      setExtrasStatusTeam("Name is required.");
      return;
    }
    setExtrasStatusTeam("");
    const { data, error } = await supabase
      .from("profile_team")
      .insert({
        member_id: myMember.id,
        name,
        role: newTeam.role.trim() || "",
        sort_order: dashTeam.length,
      })
      .select("*");
    if (error) {
      setExtrasStatusTeam(error.message);
      return;
    }
    setNewTeam({ name: "", role: "" });
    setDashTeam((prev) => [...prev, ...(data || [])]);
    setExtrasStatusTeam("✅ Team member added.");
    window.setTimeout(() => setExtrasStatusTeam((prev) => (prev === "✅ Team member added." ? "" : prev)), 4000);
  }

  async function deleteDashboardTeamMember(id) {
    if (!user?.id || !myMember?.id || !id) return;
    const { error } = await supabase.from("profile_team").delete().eq("id", id).eq("member_id", myMember.id);
    if (error) {
      setExtrasStatusTeam(error.message);
      return;
    }
    setDashTeam((prev) => prev.filter((row) => row.id !== id));
  }

  async function onTeamPhotoFileChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (input) input.value = "";
    const rowId = teamPhotoRowId;
    setTeamPhotoRowId(null);
    if (!file || !rowId || !myMember?.id || !user?.id) return;
    setTeamPhotoUploading(true);
    setExtrasStatusTeam("");
    try {
      const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt) ? rawExt : "jpg";
      const path = `${myMember.id}/team-${rowId}-${Date.now()}.${ext}`;
      const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
      const { error: uploadError } = await withTimeout(
        supabase.storage.from("gallery").upload(path, file, { upsert: true, cacheControl: "3600", contentType }),
        120000,
        "Team photo upload"
      );
      if (uploadError) {
        setExtrasStatusTeam(uploadError.message);
        return;
      }
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      const { data: updated, error } = await supabase
        .from("profile_team")
        .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", rowId)
        .eq("member_id", myMember.id)
        .select("id, photo_url")
        .maybeSingle();
      if (error) {
        setExtrasStatusTeam(error.message);
        return;
      }
      if (updated) {
        setDashTeam((prev) => prev.map((row) => (row.id === rowId ? { ...row, photo_url: updated.photo_url } : row)));
        setExtrasStatusTeam("✅ Photo updated.");
        window.setTimeout(() => setExtrasStatusTeam((prev) => (prev === "✅ Photo updated." ? "" : prev)), 4000);
      }
    } catch (e) {
      setExtrasStatusTeam(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setTeamPhotoUploading(false);
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

  function getReferralUrl() {
    const refSlug = memberPublicSlugSegment(myMember, profileForm.name, user?.name);
    return refSlug
      ? `https://topmlmleaders.com?ref=${encodeURIComponent(refSlug)}`
      : "https://topmlmleaders.com";
  }

  async function copyReferralUrl() {
    const referralUrl = getReferralUrl();
    let copiedOk = false;
    try {
      await navigator.clipboard.writeText(referralUrl);
      copiedOk = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = referralUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        copiedOk = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* ignore */
      }
    }
    if (copiedOk) {
      setReferralCopied(true);
      window.setTimeout(() => setReferralCopied(false), 1500);
    }
  }

  async function saveSlug() {
    if (!user?.id || !myMember?.id) return;
    if (!canCustomizeProfileSlug(myMember.plan)) return;
    const normalized = normalizeCustomSlugInput(slugDraft);
    const validationErr = validateCustomSlug(normalized);
    if (validationErr) {
      setSlugSettingsStatus(validationErr);
      return;
    }
    const current = myMember.slug && String(myMember.slug).trim();
    if (normalized === current) {
      setSlugSettingsStatus("✅ Profile URL is already up to date.");
      return;
    }
    setSavingSlug(true);
    setSlugSettingsStatus("");
    try {
      const { data: taken, error: qErr } = await supabase
        .from("members")
        .select("id")
        .eq("slug", normalized)
        .maybeSingle();
      if (qErr) {
        setSlugSettingsStatus(qErr.message);
        return;
      }
      if (taken && taken.id !== myMember.id) {
        setSlugSettingsStatus("This URL is already taken, try another");
        return;
      }
      const { data: updated, error: uErr } = await supabase
        .from("members")
        .update({ slug: normalized, updated_at: new Date().toISOString() })
        .eq("id", myMember.id)
        .eq("owner_id", user.id)
        .select("*")
        .maybeSingle();
      if (uErr) {
        setSlugSettingsStatus(uErr.message);
        return;
      }
      if (!updated) {
        setSlugSettingsStatus("Could not update URL.");
        return;
      }
      setMyMember(updated);
      setSlugDraft(normalized);
      setSlugSettingsStatus("✅ Profile URL saved!");
    } catch (e) {
      setSlugSettingsStatus(e instanceof Error ? e.message : "Could not save URL.");
    } finally {
      setSavingSlug(false);
    }
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
      const otherMember =
        Object.values(membersById).find((memberRow) => memberRow.owner_id === otherOwnerId) ||
        (otherOwnerId
          ? {
              id: "",
              name: "Member",
              city: "",
              country: "",
              company: "",
              role: "",
              initials: "M",
              avatarUrl: "",
              slug: "",
              ownerId: otherOwnerId,
            }
          : null);
      return {
        ...item,
        otherMember: otherMember || null,
      };
    });
  }, [conversations, membersById, user?.id]);

  function openConversation(row) {
    const om = row.otherMember;
    if (!om) return;
    if (om.id) {
      const mapped = mapMembers([om])[0];
      onOpenChat(mapped || om);
      return;
    }
    onOpenChat(om);
  }

  const loadMessageUnreadCount = useCallback(
    async (conversationId) => {
      if (!myMember?.id) return 0;
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .neq("sender_id", myMember.id)
        .eq("read", false);
      return count || 0;
    },
    [myMember?.id]
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
            .order("last_message_time", {
              ascending: false,
              nullsFirst: false,
            });
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

  function renderServicesTab() {
    const caps = planCapsForMemberPlan(myMember?.plan);
    const pLabel = `${dashProducts.length} / ${formatCapLabel(caps.productsMax)}`;
    const pdfCap = planPdfCapForPlan(myMember?.plan);
    const pdfCount = dashProducts.filter((r) => r.pdf_url).length;
    const pdfLabel = `${pdfCount} / ${formatCapLabel(pdfCap)}`;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <input
          ref={productPdfInputRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: "none" }}
          onChange={onProductPdfFileChange}
        />
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 6px" }}>Products &amp; Services</h3>
          <p style={{ margin: "0 0 10px", color: "var(--color-muted)", fontSize: 13 }}>
            Public profile Services tab · Services: Free max 3 · Pro max 10 · Elite unlimited ({pLabel}) · PDFs: Free 1 · Pro 3 · Elite unlimited ({pdfLabel}) · Stored in{' '}
            <strong>gallery</strong> bucket
          </p>
          {extrasStatusProducts ? (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: extrasStatusProducts.startsWith("✅") ? "#059669" : "#DC2626" }}>
              {extrasStatusProducts}
            </p>
          ) : null}
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {dashProducts.map((row) => (
              <div key={row.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 700 }}>{row.name}</div>
                {row.description ? (
                  <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>{row.description}</div>
                ) : null}
                {row.price ? <div style={{ fontSize: 13, marginTop: 4 }}>{row.price}</div> : null}
                {row.pdf_url ? (
                  <div style={{ marginTop: 8 }}>
                    <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                      View PDF
                    </a>
                  </div>
                ) : null}
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    disabled={productPdfUploading || !myMember?.id}
                    onClick={() => {
                      setProductPdfRowId(row.id);
                      productPdfInputRef.current?.click();
                    }}
                    style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "#FFFFFF", padding: "6px 10px", fontWeight: 600 }}
                  >
                    {productPdfUploading ? "Uploading…" : row.pdf_url ? "Replace PDF" : "Add PDF"}
                  </button>
                  {row.pdf_url ? (
                    <button
                      type="button"
                      onClick={() => clearProductPdf(row.id)}
                      style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "#FFFFFF", padding: "6px 10px", fontWeight: 600 }}
                    >
                      Remove PDF
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deleteDashboardProduct(row.id)}
                    style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "#FFFFFF", padding: "6px 10px", fontWeight: 600 }}
                  >
                    Remove service
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={newProduct.name}
              onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
              placeholder="Service name"
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description"
              rows={3}
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <input
              value={newProduct.price}
              onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
              placeholder="Price (optional)"
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <button
              type="button"
              onClick={addDashboardProduct}
              disabled={!myMember?.id || dashProducts.length >= caps.productsMax}
              style={{
                border: "none",
                borderRadius: 10,
                background: !myMember?.id || dashProducts.length >= caps.productsMax ? "#D1D5DB" : "var(--color-primary)",
                color: "#FFFFFF",
                padding: "10px 14px",
                fontWeight: 700,
              }}
            >
              Add service
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderEventsTab() {
    const caps = planCapsForMemberPlan(myMember?.plan);
    const eLabel = `${dashEvents.length} / ${formatCapLabel(caps.eventsMax)}`;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 6px" }}>Events</h3>
          <p style={{ margin: "0 0 10px", color: "var(--color-muted)", fontSize: 13 }}>
            Public profile Events tab · Free: max 1 · Pro: max 5 · Elite: unlimited ({eLabel} used)
          </p>
          {extrasStatusEvents ? (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: extrasStatusEvents.startsWith("✅") ? "#059669" : "#DC2626" }}>
              {extrasStatusEvents}
            </p>
          ) : null}
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {dashEvents.map((row) => (
              <div key={row.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 700 }}>{row.title}</div>
                <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
                  {[row.date, row.location].filter(Boolean).join(" · ") || "Date TBA"}
                </div>
                {row.description ? <div style={{ fontSize: 13, marginTop: 4 }}>{row.description}</div> : null}
                <button
                  type="button"
                  onClick={() => deleteDashboardEvent(row.id)}
                  style={{
                    marginTop: 8,
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    background: "#FFFFFF",
                    padding: "6px 10px",
                    fontWeight: 600,
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={newEvent.title}
              onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
              placeholder="Title"
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <input
              value={newEvent.date}
              onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
              placeholder="Date (e.g. Jun 14, 2026 or ISO)"
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <input
              value={newEvent.location}
              onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))}
              placeholder="Location (optional)"
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              rows={3}
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <button
              type="button"
              onClick={addDashboardEvent}
              disabled={!myMember?.id || dashEvents.length >= caps.eventsMax}
              style={{
                border: "none",
                borderRadius: 10,
                background: !myMember?.id || dashEvents.length >= caps.eventsMax ? "#D1D5DB" : "var(--color-primary)",
                color: "#FFFFFF",
                padding: "10px 14px",
                fontWeight: 700,
              }}
            >
              Add event
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderTeamTab() {
    const caps = planCapsForMemberPlan(myMember?.plan);
    const tLabel = `${dashTeam.length} / ${formatCapLabel(caps.teamMax)}`;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <input
          ref={teamPhotoInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onTeamPhotoFileChange}
        />
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 6px" }}>Team</h3>
          <p style={{ margin: "0 0 10px", color: "var(--color-muted)", fontSize: 13 }}>
            Public profile Team tab · Free: max 3 · Pro: max 10 · Elite: unlimited ({tLabel} used) · Photos: <strong>gallery</strong> bucket · path{' '}
            <code style={{ fontSize: 11 }}>{myMember?.id}/team-…</code>
          </p>
          {extrasStatusTeam ? (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: extrasStatusTeam.startsWith("✅") ? "#059669" : "#DC2626" }}>
              {extrasStatusTeam}
            </p>
          ) : null}
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {dashTeam.map((row) => (
              <div
                key={row.id}
                style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                {row.photo_url ? (
                  <img src={row.photo_url} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {String(row.name || "").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{row.name}</div>
                  {row.role ? <div style={{ fontSize: 13, color: "var(--color-muted)" }}>{row.role}</div> : null}
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      type="button"
                      disabled={teamPhotoUploading}
                      onClick={() => {
                        setTeamPhotoRowId(row.id);
                        teamPhotoInputRef.current?.click();
                      }}
                      style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "#FFFFFF", padding: "6px 10px", fontWeight: 600 }}
                    >
                      {teamPhotoUploading ? "Uploading…" : "Gallery photo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDashboardTeamMember(row.id)}
                      style={{ border: "1px solid var(--color-border)", borderRadius: 8, background: "#FFFFFF", padding: "6px 10px", fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <input
              value={newTeam.name}
              onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))}
              placeholder="Name"
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <input
              value={newTeam.role}
              onChange={(e) => setNewTeam((p) => ({ ...p, role: e.target.value }))}
              placeholder="Role (optional)"
              style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
            />
            <button
              type="button"
              onClick={addDashboardTeamMember}
              disabled={!myMember?.id || dashTeam.length >= caps.teamMax}
              style={{
                border: "none",
                borderRadius: 10,
                background: !myMember?.id || dashTeam.length >= caps.teamMax ? "#D1D5DB" : "var(--color-primary)",
                color: "#FFFFFF",
                padding: "10px 14px",
                fontWeight: 700,
              }}
            >
              Add team member
            </button>
          </div>
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
            <div style={{ marginBottom: 4, fontWeight: 700, fontSize: 15 }}>📲 Your Smart QR Code</div>
            <div style={{ marginBottom: 8, fontSize: 13, color: "var(--color-muted)" }}>
              Just scan to save your contact automatically
            </div>
            <QRCodeCanvas id={qrId} value={profileVcard} size={160} includeMargin />
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
        <section style={{ background: "#F8FAFC", borderRadius: 12, padding: 12, border: "1px solid var(--color-border)" }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-muted)" }}>
            Edit <strong>Services</strong>, <strong>Events</strong>, and <strong>Team</strong> in their own tabs above.
          </p>
        </section>
      </div>
    );
  }

  function renderMedia() {
    const galleryUrls = normalizeGalleryUrls(myMember?.gallery_urls);
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
                    width: "100%",
                    minHeight: 0,
                    alignSelf: "stretch",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                    aspectRatio: "4 / 3",
                    background: "#F3F4F6",
                  }}
                >
                  <img
                    src={url}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
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
        <h3 style={{ margin: "0 0 10px" }}>Saved</h3>
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
    const slugSegment = memberPublicSlugSegment(myMember, profileForm.name, user?.name);
    const fullProfileUrl = slugSegment
      ? `https://topmlmleaders.com/u/${encodeURIComponent(slugSegment)}`
      : "https://topmlmleaders.com/";
    const slugEditable = canCustomizeProfileSlug(myMember?.plan);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
          <h3 style={{ margin: "0 0 10px" }}>Account</h3>
          <p style={{ margin: "0 0 8px", color: "var(--color-muted)" }}>Email: {user.email}</p>
          <div style={{ marginBottom: 8, display: "inline-block", background: "#EEF2FF", color: "var(--color-primary)", borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
            {(myMember?.plan || "free").toUpperCase()}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Public profile URL</div>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--color-muted)", wordBreak: "break-all" }}>{fullProfileUrl}</p>
            <div style={{ marginBottom: 6, fontSize: 13, color: "var(--color-muted)" }}>
              Slug: <strong style={{ color: "var(--color-text, #111827)" }}>{slugSegment || "—"}</strong>
            </div>
            {slugEditable ? (
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <label htmlFor="dashboard-slug-input" style={{ fontSize: 13, fontWeight: 600 }}>
                  Customize URL (Pro &amp; Elite)
                </label>
                <input
                  id="dashboard-slug-input"
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(normalizeCustomSlugInput(e.target.value))}
                  placeholder="your-custom-url"
                  autoComplete="off"
                  spellCheck={false}
                  style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px" }}
                />
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-muted)" }}>
                  3–30 characters · lowercase · letters, numbers, hyphens only
                </p>
                <button
                  type="button"
                  disabled={savingSlug || !myMember?.id}
                  onClick={saveSlug}
                  style={{
                    justifySelf: "start",
                    border: "none",
                    borderRadius: 10,
                    background: savingSlug || !myMember?.id ? "#D1D5DB" : "var(--color-primary)",
                    color: "#FFFFFF",
                    padding: "8px 14px",
                    fontWeight: 700,
                    cursor: savingSlug || !myMember?.id ? "default" : "pointer",
                  }}
                >
                  {savingSlug ? "Saving…" : "Save URL"}
                </button>
                {slugSettingsStatus ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: slugSettingsStatus.startsWith("✅") ? "#059669" : "#DC2626",
                    }}
                  >
                    {slugSettingsStatus}
                  </p>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--color-muted)" }}>
                Upgrade to Pro to customize your URL
              </p>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => navigate("/plans")}
              style={{ border: "none", background: "#F59E0B", color: "#FFFFFF", borderRadius: 10, padding: "8px 10px", fontWeight: 700, cursor: "pointer" }}
            >
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
    const referralUrl = getReferralUrl();
    const count = referralCount ?? 0;
    const goalFirstReward = 5;
    const progressPct = Math.min(100, Math.round((Math.min(count, goalFirstReward) / goalFirstReward) * 100));
    const rewardDaysEarned =
      (myMember?.referral_bonus_5_applied ? 30 : 0) + (myMember?.referral_bonus_10_applied ? 90 : 0);
    const expiresLabel = myMember?.plan_expires_at
      ? new Date(myMember.plan_expires_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

    return (
      <section style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, boxShadow: "var(--shadow-card)" }}>
        <h3 style={{ margin: "0 0 10px" }}>Refer &amp; Earn</h3>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--color-muted)" }}>
          Share your link. When someone joins TopMLMLeaders from your link, it counts as a referral.
        </p>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 10, marginBottom: 10, wordBreak: "break-all", fontSize: 14 }}>
          {referralUrl}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => void copyReferralUrl()}
            style={{ border: "1px solid var(--color-border)", background: "#FFFFFF", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}
          >
            {referralCopied ? "Copied!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`Join me on TopMLMLeaders: ${referralUrl}`)}`,
                "_blank",
                "noopener"
              )
            }
            style={{ border: "1px solid #D1FAE5", background: "#ECFDF5", color: "#10B981", borderRadius: 10, padding: "8px 10px", fontWeight: 700 }}
          >
            Share on WhatsApp
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontWeight: 700 }}>Progress to 1 month free Pro</span>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
              {count}/{goalFirstReward} referrals
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                borderRadius: 999,
                background: "linear-gradient(90deg, var(--color-primary), #4338CA)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--color-muted)" }}>
            Milestones: 5 referrals → +30 days on your plan expiry · 10 referrals → +90 days (stacked).
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, textAlign: "center" }}>
            <strong style={{ fontSize: 22 }}>{referralCount === null ? "…" : count}</strong>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>People referred</div>
          </div>
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 12, textAlign: "center" }}>
            <strong style={{ fontSize: 22 }}>{rewardDaysEarned}</strong>
            <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>Reward days earned</div>
          </div>
        </div>

        {expiresLabel ? (
          <div style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 8 }}>
            Plan perks extended through <strong style={{ color: "var(--color-text, #111827)" }}>{expiresLabel}</strong>{" "}
            (includes referral bonuses).
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 8 }}>
            Referral rewards extend your <strong>plan_expires_at</strong> on your member profile (see milestones above).
          </div>
        )}
      </section>
    );
  }

  function renderTabContent() {
    if (loading) return <p style={{ color: "var(--color-muted)" }}>Loading dashboard...</p>;
    if (activeTab === "overview") return renderOverview();
    if (activeTab === "profile") return renderProfile();
    if (activeTab === "services") return renderServicesTab();
    if (activeTab === "events") return renderEventsTab();
    if (activeTab === "team") return renderTeamTab();
    if (activeTab === "media") return renderMedia();
    if (activeTab === "messages") return renderMessages();
    if (activeTab === "bookmarks") return renderBookmarks();
    if (activeTab === "bookings") return renderBookings();
    if (activeTab === "settings") return renderSettings();
    return renderRefer();
  }

  if (!user?.id) {
    if (authInitializing || loading) {
      return (
        <div className="fade-in" style={{ minHeight: "100vh", background: "#FFFFFF", display: "grid", placeItems: "center", padding: 24 }}>
          <p style={{ color: "var(--color-muted)" }}>Loading dashboard…</p>
        </div>
      );
    }
    return (
      <div className="fade-in" style={{ minHeight: "100vh", background: "#FFFFFF", padding: 24, textAlign: "center" }}>
        <p style={{ color: "var(--color-muted)" }}>Please sign in to open your dashboard.</p>
        <button type="button" onClick={onBack} style={{ marginTop: 16, border: "none", borderRadius: 999, background: "var(--color-primary)", color: "#FFFFFF", padding: "10px 20px", fontWeight: 700 }}>
          ← Back home
        </button>
      </div>
    );
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
            <button
              type="button"
              disabled={signingOut}
              onClick={() => onSignOut?.()}
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                background: "#FFFFFF",
                padding: "8px 12px",
                fontWeight: 700,
                fontSize: 12,
                cursor: signingOut ? "default" : "pointer",
                opacity: signingOut ? 0.65 : 1,
              }}
            >
              {signingOut ? "…" : "Logout"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { key: "followers", icon: "👥", label: "Followers", value: stats.followers, tab: "overview" },
            { key: "messages", icon: "💬", label: "Chat", value: stats.messages, tab: "messages" },
            { key: "bookmarks", icon: "🔖", label: "Saved", value: stats.bookmarks, tab: "bookmarks" },
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
                {TAB_LABELS[tab] || tab.charAt(0).toUpperCase() + tab.slice(1)}
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

