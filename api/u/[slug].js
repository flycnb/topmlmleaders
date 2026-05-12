function escapeAttr(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export default async function handler(req, res) {
  const { slug } = req.query;

  // Fetch member from Supabase
  const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL ||
    "https://qbhhgspznslxykmrkacx.supabase.co";
  const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

  let member = null;
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/members?slug=eq.${encodeURIComponent(slug)}&select=name,role,company,city,country,avatar_url,follower_count,rating,slug&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    const data = await response.json();
    member = data?.[0] || null;
  } catch {
    member = null;
  }

  // Build OG values
  const siteUrl = "https://topmlmleaders.com";
  const profileUrl = member?.slug
    ? `${siteUrl}/u/${member.slug}`
    : siteUrl;

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

  const image = member?.avatar_url
    ? member.avatar_url
    : `${siteUrl}/logo192.png`;

  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  const isBot =
    /facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|googlebot|bingpreview|embedly/i
    .test(ua);

  // Real users → serve built index.html directly
  if (!isBot) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const indexPath = path.join(process.cwd(), "build", "index.html");
      const html = fs.readFileSync(indexPath, "utf8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch {
      res.setHeader("Location", "/");
      return res.status(302).send("");
    }
  }

  // Return HTML with OG tags + React app loads normally
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>${title}</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph (WhatsApp, Facebook, Telegram) -->
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${escapeAttr(profileUrl)}" />
  <meta property="og:title" content="${escapeAttr(title)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:image" content="${escapeAttr(image)}" />
  <meta property="og:image:width" content="400" />
  <meta property="og:image:height" content="400" />
  <meta property="og:site_name" content="TopMLMLeaders.com" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeAttr(title)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${escapeAttr(image)}" />

  <meta name="theme-color" content="#6C63FF" />
  <link rel="stylesheet" 
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div>
  <script src="/static/js/main.chunk.js"></script>
  <script src="/static/js/vendors~main.chunk.js"></script>
  <script src="/static/js/bundle.js"></script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
  return res.status(200).send(html);
}
