export const SEARCH_FILTERS = ["all", "city", "country", "company", "role", "experience"];

const SEARCH_KEYS = ["name", "city", "area", "pin", "country", "company", "role"];

function asText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function fieldMatches(member, key, query) {
  const value = asText(member[key]);
  return value.includes(query);
}

export function applyMemberSearch(members, searchTerm, activeFilter, locationFilter) {
  const query = asText(searchTerm);
  const selectedFilter = asText(activeFilter || "all");

  return members.filter((member) => {
    const locationMatch = !locationFilter
      ? true
      : asText(member.city) === asText(locationFilter.city) &&
        asText(member.country) === asText(locationFilter.country);

    if (!locationMatch) return false;
    if (!query) return true;

    if (selectedFilter === "all") {
      return SEARCH_KEYS.some((key) => fieldMatches(member, key, query));
    }
    if (selectedFilter === "experience") {
      return asText(member.yearsExp).includes(query);
    }
    return fieldMatches(member, selectedFilter, query);
  });
}

export function mapMembers(rawMembers) {
  return (rawMembers || []).map((member) => ({
    id: member.id,
    name: member.name || "Unknown Leader",
    city: member.city || "",
    area: member.area || "",
    pin: member.pin || "",
    country: member.country || "",
    company: member.company || "",
    role: member.role || "",
    yearsExp: member.years_exp || 0,
    rating: Number(member.rating || 0),
    reviews: Number(member.rating_count ?? member.likes ?? 0),
    phone: member.phone || "",
    phoneVisibility: member.phone_visibility || "private",
    wa: member.wa || "",
    waVisibility: member.wa_visibility || "private",
    initials: member.photo_initials || "ML",
    avatarUrl: member.avatar_url || "",
    youtubeUrl: member.youtube_url || "",
    color: member.color || "#6C63FF",
    description: member.description || "",
    slug: member.slug || "",
    verified: Boolean(member.verified),
    plan: member.plan || "free",
    badges: Array.isArray(member.badges) ? member.badges : [],
    joinedDate: member.joined_date || "",
    teamSize: member.team_size || "",
    earnings: member.earnings || "",
    followerCount: Number(member.follower_count || 0),
    ownerId: member.owner_id || "",
    slots: Number(member.bookings_count || 0),
  }));
}
