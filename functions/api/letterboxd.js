export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const username = sanitizeUsername(url.searchParams.get("username") || "pelaxix");

  if (!username) {
    return jsonResponse({ ok: false, error: "Missing Letterboxd username." }, 400);
  }

  const feedUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "User-Agent": "Pelaxix Movie Shelf"
      }
    });

    if (!response.ok) {
      throw new Error(`Letterboxd returned HTTP ${response.status}`);
    }

    const xml = await response.text();
    const items = parseItems(xml)
      .sort((a, b) => getSortableDate(b) - getSortableDate(a))
      .slice(0, 10);

    return jsonResponse({
      ok: true,
      username,
      feedUrl,
      count: items.length,
      items,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      username,
      error: error.message || "Could not load Letterboxd feed."
    }, 500);
  }
}

function sanitizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40);
}

function parseItems(xml) {
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  return itemMatches.map((match) => {
    const itemXml = match[1];
    const title = decodeXml(getTag(itemXml, "title"));
    const link = decodeXml(getTag(itemXml, "link"));
    const pubDate = decodeXml(getTag(itemXml, "pubDate"));
    const watchedDate = decodeXml(getTag(itemXml, "letterboxd:watchedDate")) || extractWatchedDateFromDescription(getTag(itemXml, "description"));
    const description = decodeXml(getTag(itemXml, "description"));
    const poster = extractFirstImage(description);
    const cleanDescription = stripHtml(description).replace(/\s+/g, " ").trim();
    const rating = extractRating(title, cleanDescription);
    const movieTitle = decodeXml(getTag(itemXml, "letterboxd:filmTitle")) || cleanMovieTitle(title);
    const filmYear = decodeXml(getTag(itemXml, "letterboxd:filmYear"));

    return {
      title,
      movieTitle,
      filmYear,
      link,
      pubDate,
      watchedDate,
      dateLabel: watchedDate ? formatDate(watchedDate) : formatDate(pubDate),
      dateType: watchedDate ? "Watched" : "Posted",
      description: cleanDescription,
      rating,
      poster
    };
  });
}

function getTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "") : "";
}

function extractFirstImage(html) {
  const match = String(html || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? decodeXml(match[1]) : "";
}

function extractWatchedDateFromDescription(description) {
  const text = decodeXml(stripHtml(description));
  const match = text.match(/Watched\s+on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  if (!match) return "";

  const date = new Date(match[1]);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function extractRating(title, description) {
  const text = `${title} ${description}`;
  const stars = text.match(/[★½]+/);
  return stars ? stars[0] : "";
}

function cleanMovieTitle(title) {
  return String(title || "")
    .replace(/, \d{4}.*/, "")
    .replace(/ - Letterboxd$/, "")
    .trim();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
}

function decodeXml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#039;", "'");
}

function getSortableDate(item) {
  const date = new Date(item.watchedDate || item.pubDate);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=900"
    }
  });
}
