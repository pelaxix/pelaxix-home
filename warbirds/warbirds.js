document.head.insertAdjacentHTML(
  "beforeend",
  `<style>
    .hero { display: block !important; min-height: auto !important; padding: 34px 0 38px !important; }
    .hero h1 { font-size: clamp(2.65rem, 12vw, 5rem) !important; line-height: .92 !important; letter-spacing: -.075em !important; white-space: nowrap; }
    .hero-text { max-width: 630px; margin-bottom: 23px !important; }
    .hero-actions .button { min-height: 44px; padding: 0 17px; }
    .discord-cta { margin: 19px 0 0; padding-top: 17px; border-top: 1px solid var(--line); color: var(--muted); font-size: .92rem; line-height: 1.55; }
    .discord-cta span { color: var(--green); font-weight: 800; }
    .watchlist-text { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 22px; margin: 25px 0 0; padding: 0; list-style: none; border-top: 1px solid var(--line); }
    .watchlist-text li { padding: 11px 0; border-bottom: 1px solid var(--line); color: var(--muted); font-size: .9rem; }
    .watchlist-text code { margin-right: 8px; color: var(--green); font-family: monospace; font-size: .72rem; }
    .live-card.has-route-link { padding-bottom: 58px; }
    .live-route-link { position: absolute; right: 18px; bottom: 18px; left: 18px; z-index: 1; color: var(--green); font-family: "DM Mono", monospace; font-size: .68rem; font-weight: 500; letter-spacing: .04em; line-height: 1.3; text-align: center; text-decoration: none; text-transform: uppercase; }
    .live-route-link:hover, .live-route-link:focus-visible { color: #c1f589; outline: none; text-decoration: underline; text-underline-offset: 4px; }
    @media (max-width: 580px) {
      .hero { padding-top: 28px !important; padding-bottom: 31px !important; }
      .hero h1 { font-size: clamp(2.5rem, 12vw, 3.25rem) !important; }
      .hero-text { font-size: 1.02rem !important; line-height: 1.58 !important; }
      .hero-actions { gap: 9px; }
      .hero-actions .button { min-height: 42px; padding: 0 15px; }
      .live-board, .watchlist-section { margin-bottom: 20px !important; }
      .watchlist-text { grid-template-columns: 1fr; margin-top: 19px; }
      .watchlist-text li { padding: 9px 0; }
      .section-copy { font-size: .84rem !important; }
      .discord-cta { font-size: .86rem; }
    }
  </style>`,
);

const radar = document.querySelector(".radar-panel");
const hero = document.querySelector(".hero");
const scheduleCopy = document.querySelector(".section-copy");
radar?.remove();
document.querySelector(".site-header")?.remove();
document.querySelector('footer a[href="/"]')?.remove();
document.querySelector("#refreshButton")?.remove();
document.querySelector('.hero-actions a[href="#watchlist"]')?.remove();

if (hero) {
  hero.style.gridTemplateColumns = "1fr";
  hero.style.minHeight = "auto";
  hero.style.padding = "42px 0 50px";
}

if (scheduleCopy) {
  scheduleCopy.textContent = "Checked every minute from 8 AM to 11 PM Hamilton time.";
}

const workerHost = [
  "hamilton-warbird-watch",
  "pelaxix",
  "workers",
  "dev",
].join(".");
const api = `https://${workerHost}/public`;
const autoRefreshMs = 60 * 1000;
const status = document.querySelector("#fetchStatus");
const cards = document.querySelector("#liveCards");
let isLoading = false;

function since(value) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Unknown";
  }

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (seconds < 60) {
    return `${seconds} sec ago`;
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min ago`;
  }

  return `${Math.round(seconds / 3600)} hr ago`;
}

function field(label, value) {
  const container = document.createElement("div");
  const heading = document.createElement("span");
  const text = document.createElement("strong");

  heading.textContent = label;
  text.textContent = value || "—";
  container.append(heading, text);
  return container;
}

function empty(title, text, isError = false) {
  const card = document.createElement("article");
  const icon = document.createElement("span");
  const content = document.createElement("div");
  const heading = document.createElement("h3");
  const message = document.createElement("p");

  card.className = `empty-state${isError ? " error-state" : ""}`;
  icon.className = "empty-icon";
  icon.textContent = isError ? "!" : "⌁";
  heading.textContent = title;
  message.textContent = text;
  content.append(heading, message);
  card.append(icon, content);
  cards.replaceChildren(card);
}

function createRouteLink(hex) {
  if (!hex) {
    return null;
  }

  const link = document.createElement("a");
  link.className = "live-route-link";
  link.href = `https://globe.airplanes.live/?icao=${encodeURIComponent(hex)}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Follow this plane’s live route";
  return link;
}

function card(item) {
  const airborne = Boolean(item.airborne);
  const liveCard = document.createElement("article");
  const header = document.createElement("div");
  const title = document.createElement("h3");
  const badge = document.createElement("span");
  const meta = document.createElement("p");
  const grid = document.createElement("div");
  const routeLink = createRouteLink(item.hex);

  liveCard.className = `live-card${airborne ? " airborne" : ""}`;
  header.className = "live-card-head";
  title.textContent = item.label || item.aircraft || "Historic aircraft";
  badge.className = `status-badge ${airborne ? "airborne" : "detected"}`;
  badge.textContent = airborne ? "Airborne" : "Detected";
  header.append(title, badge);

  meta.className = "live-card-meta";
  meta.textContent = `${item.registration || "Unknown"} • ${item.name || item.type || "Warbird watch"}`;

  grid.className = "data-grid";
  grid.append(
    field("Altitude", item.altitude),
    field("Speed", item.speed),
    field("Callsign", item.callsign || "Not broadcast"),
    field("Last signal", since(item.lastSeenAt || item.last_seen_at)),
  );

  liveCard.append(header, meta, grid);

  if (routeLink) {
    liveCard.classList.add("has-route-link");
    liveCard.append(routeLink);
  }

  return liveCard;
}

function render(payload) {
  const active = Array.isArray(payload.active)
    ? payload.active
    : Array.isArray(payload.liveMatches)
      ? payload.liveMatches
      : [];

  if (!active.length) {
    empty(
      "Quiet skies right now",
      "No watched aircraft were recently reported by the tracker. That is normal most days.",
    );
    return;
  }

  const fragment = document.createDocumentFragment();
  active
    .sort((first, second) => Boolean(second.airborne) - Boolean(first.airborne))
    .forEach((item) => fragment.append(card(item)));
  cards.replaceChildren(fragment);
}

async function load() {
  if (isLoading) {
    return;
  }

  isLoading = true;
  status.textContent = "Reading the most recent Worker scan…";

  try {
    const response = await window.fetch(api, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Live status returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Invalid live status");
    }

    render(data);

    const count = Number(data.trackedAircraft || data.watchedCount || 10);
    const activeCount = Array.isArray(data.active)
      ? data.active.length
      : Array.isArray(data.liveMatches)
        ? data.liveMatches.length
        : 0;
    const baseStatus = activeCount
      ? `${activeCount} of ${count} tracked · latest signal ${since(data.checkedAt || data.lastCheckedAt || data.active?.[0]?.lastSeenAt)}`
      : `${count} tracked · no recently reported aircraft`;

    status.textContent = `${baseStatus} · updates every min`;
  } catch (error) {
    console.error("Warbird Watch live status failed", error);
    empty(
      "Live board unavailable",
      "The status feed could not be reached just now. It will try again automatically.",
      true,
    );
    status.textContent = "Live status temporarily unavailable · retrying every min";
  } finally {
    isLoading = false;
  }
}

window.setInterval(() => {
  if (!document.hidden) {
    load();
  }
}, autoRefreshMs);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    load();
  }
});

load();
