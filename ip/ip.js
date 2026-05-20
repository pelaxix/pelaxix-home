const statusMessage = document.querySelector("#statusMessage");
const fields = {
  ipAddress: document.querySelector("#ipAddress"),
  ipVersion: document.querySelector("#ipVersion"),
  country: document.querySelector("#country"),
  region: document.querySelector("#region"),
  city: document.querySelector("#city"),
  postalCode: document.querySelector("#postalCode"),
  ipTimezone: document.querySelector("#ipTimezone"),
  organization: document.querySelector("#organization"),
  asn: document.querySelector("#asn"),
  colo: document.querySelector("#colo"),
  coordinates: document.querySelector("#coordinates"),
  browserTimezone: document.querySelector("#browserTimezone"),
  language: document.querySelector("#language"),
  screenSize: document.querySelector("#screenSize"),
  platform: document.querySelector("#platform"),
  troubleshootingNotes: document.querySelector("#troubleshootingNotes")
};

loadNetworkCheck();

async function loadNetworkCheck() {
  setBrowserDetails();

  try {
    const response = await fetch(`/api/ip?ts=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    renderNetworkDetails(data);
    statusMessage.textContent = "Connection details loaded.";
  } catch (error) {
    console.error(error);
    fields.ipAddress.textContent = "Unavailable";
    fields.ipVersion.textContent = "IP version unavailable";
    statusMessage.textContent = `Could not load network details: ${error.message}`;
    fields.troubleshootingNotes.textContent = "The browser details below may still be useful, but the network lookup did not return data.";
  }
}

function renderNetworkDetails(data) {
  const location = data.location || {};
  const network = data.network || {};
  const ip = data.ip || "Unavailable";
  const version = getIpVersion(ip);

  fields.ipAddress.textContent = ip;
  fields.ipVersion.textContent = version === "IPv6"
    ? "IPv6 connection detected"
    : version === "IPv4"
      ? "IPv4 connection detected"
      : "IP version unavailable";
  fields.country.textContent = clean(location.country);
  fields.region.textContent = clean(location.region);
  fields.city.textContent = clean(location.city);
  fields.postalCode.textContent = clean(location.postalCode);
  fields.ipTimezone.textContent = clean(location.timezone);
  fields.organization.textContent = clean(network.organization);
  fields.asn.textContent = network.asn ? `AS${network.asn}` : "Unavailable";
  fields.colo.textContent = clean(network.colo);
  fields.coordinates.textContent = location.latitude && location.longitude
    ? `${location.latitude}, ${location.longitude}`
    : "Unavailable";

  fields.troubleshootingNotes.textContent = buildTroubleshootingNote(location, version);
}

function setBrowserDetails() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unavailable";
  fields.browserTimezone.textContent = timezone;
  fields.language.textContent = navigator.language || "Unavailable";
  fields.screenSize.textContent = `${window.screen.width} × ${window.screen.height}`;
  fields.platform.textContent = navigator.platform || "Unavailable";
}

function buildTroubleshootingNote(location, ipVersion) {
  const ipTimezone = location.timezone;
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const versionNote = ipVersion === "IPv6"
    ? " This device reached the site over IPv6, so an IPv4 address will not appear here unless the connection uses IPv4."
    : ipVersion === "IPv4"
      ? " This device reached the site over IPv4. Another device on the same network may still use IPv6 depending on its network settings."
      : "";

  if (ipTimezone && browserTimezone && ipTimezone !== browserTimezone && ipTimezone !== "Unavailable") {
    return `Your IP timezone is ${ipTimezone}, but your browser timezone is ${browserTimezone}. That can happen with VPNs, mobile networks, corporate networks, or remote desktop sessions.${versionNote}`;
  }

  if (location.city && location.region && location.country) {
    return `Your connection appears to route through ${location.city}, ${location.region}, ${location.country}. If that does not match where you are, a VPN, proxy, mobile carrier, or ISP routing may be involved.${versionNote}`;
  }

  return `No obvious timezone mismatch detected. Location is still approximate and may not reflect your exact physical location.${versionNote}`;
}

function getIpVersion(value) {
  const ip = String(value || "");
  if (ip.includes(":")) return "IPv6";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return "IPv4";
  return "Unknown";
}

function clean(value) {
  return value === null || value === undefined || value === "" ? "Unavailable" : String(value);
}
