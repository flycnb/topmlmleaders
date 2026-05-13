export default async function handler(req, res) {
  const { slug } = req.query;
  const ua = String(req.headers["user-agent"] || "");

  const isBot =
    /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingpreview|embedly/i
    .test(ua);

  const SUPABASE_URL =
    process.env.REACT_APP_SUPABASE_URL ||
    "https://qbhhgspznslxykmrkacx.supabase.co";
  const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

  // Real users → redirect to /u-app/:slug so Vercel serves
  // this deployment's index.html + hashed static assets (no fetch)
  if (!isBot) {
    res.setHeader("Location", `/u-app/${encodeURIComponent(String(slug || ""))}`);
    return res.status(302).end();
  }

  // Bots → fetch member and return OG meta tags
  let member = null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/members?slug=eq.${encodeURIComponent(slug)}&select=name,role,company,city,country,avatar_url,follower_count,rating,slug&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const data = await r.json();
    member = data?.[0] || null;
  } catch {
    member = null;
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const siteUrl = "https://topmlmleaders.com";
  const profileUrl = `${siteUrl}/u/${slug}`;

  const title = member
    ? `${member.name} 🏆 ${[member.role, member.company]
        .filter(Boolean)
        .join(" · ")}`
    : "TopMLMLeaders.com — AI Powered MLM Directory";

  const location = [member?.city, member?.country]
    .filter(Boolean)
    .join(", ");
  const followers = member?.follower_count
    ? `${member.follower_count} Followers`
    : null;
  const rating = member?.rating
    ? `⭐ ${Number(member.rating).toFixed(1)}`
    : null;

  const description = member
    ? [location, followers, rating, "Connect on TopMLMLeaders.com"]
        .filter(Boolean)
        .join(" · ")
    : "Find and connect with top MLM leaders worldwide";

  const image = member?.avatar_url || `${siteUrl}/logo192.png`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeAttr(title)}</title>
  <meta name="description" content="${escapeAttr(description)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${escapeAttr(profileUrl)}" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:image" content="${escapeAttr(image)}" />
  <meta property="og:image:width" content="400" />
  <meta property="og:image:height" content="400" />
  <meta property="og:site_name" content="TopMLMLeaders.com" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${escapeAttr(image)}" />
</head>
<body>
  <p>${escapeAttr(title)}</p>
  <p>${escapeAttr(description)}</p>
  <a href="${escapeAttr(profileUrl)}">View Profile</a>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  return res.status(200).send(html);
}
