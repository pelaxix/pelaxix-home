const workerHost = [
  "hamilton-warbird-watch",
  "pelaxix",
  "workers",
  "dev",
].join(".");
const historyEndpoint = `https://${workerHost}/history`;
const activityFilter = document.querySelector("#activityFilter");
const historyStatus = document.querySelector("#historyStatus");
const historyList = document.querySelector("#historyList");
const autoRefreshMs = 3 * 60 * 1000;
let showActivityOnly = false;
let allScans = [];
let isLoading = false;

function formatTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getPlaneUrl(hex) {
  return hex
    ? `https://globe.airplanes.live/?icao=${encodeURIComponent(hex)}`
    : null;
}

function showEmpty(title, description) {
  historyList.innerHTML = `<article class="empty-state"><span class="empty-icon">⌁</span><div><h3>${title}</h3><p>${description}</p></div></article>`;
}

function activityItems(scan) {
  return Array.isArray(scan.aircraft)
    ? scan.aircraft
    : Array.isArray(scan.liveMatches)
      ? scan.liveMatches
      : [];
}

function scanKind(scan) {
  if (scan.error) {
    return "error";
  }

  const aircraft = activityItems(scan);

  if (aircraft.some((item) => item.airborne)) {
    return "airborne";
  }

  if (aircraft.length) {
    return "detected";
  }

  return "quiet";
}

function scanLabel(scan) {
  const aircraft = activityItems(scan);
  const kind = scanKind(scan);

  if (kind === "error") {
    return "Scan error";
  }

  if (!aircraft.length) {
    return "No watched aircraft detected";
  }

  if (aircraft.length === 1) {
    return aircraft[0].label || aircraft[0].aircraft || aircraft[0].registration || "Aircraft detected";
  }

  return `${aircraft.length} watched aircraft detected`;
}

function scanDetail(scan) {
  const aircraft = activityItems(scan);

  if (scan.error) {
    return scan.error;
  }

  if (!aircraft.length) {
    return scan.source === "manual" ? "Manual check" : "Scheduled check";
  }

  return aircraft
    .map((item) => {
      const name = item.label || item.aircraft || item.registration || "Aircraft";
      const registration = item.registration ? ` (${item.registration})` : "";
      const route = getPlaneUrl(item.hex);

      return route
        ? `<a class="plane-link" href="${route}" target="_blank" rel="noopener noreferrer">${name}${registration}</a>`
        : `${name}${registration}`;
    })
    .join(" · ");
}

function render() {
  const scans = showActivityOnly
    ? allScans.filter((scan) => scanKind(scan) !== "quiet")
    : allScans;

  if (!scans.length) {
    showEmpty(
      showActivityOnly ? "No activity in this window" : "No scans recorded yet",
      showActivityOnly
        ? "Try showing all scans, or check back after an aircraft is detected."
        : "The first completed scheduled scan will appear here.",
    );
    return;
  }

  const fragment = document.createDocumentFragment();

  scans.forEach((scan) => {
    const kind = scanKind(scan);
    const row = document.createElement("article");
    const time = document.createElement("time");
    const detail = document.createElement("div");
    const heading = document.createElement("h3");
    const text = document.createElement("p");
    const badge = document.createElement("span");

    row.className = `scan-row ${kind}`;
    time.className = "scan-time";
    time.dateTime = scan.at || scan.timestamp || "";
    time.textContent = formatTime(scan.at || scan.timestamp);

    detail.className = "scan-detail";
    heading.textContent = scanLabel(scan);
    text.innerHTML = scanDetail(scan);
    detail.append(heading, text);

    badge.className = `scan-badge ${kind}`;
    badge.textContent = kind === "airborne"
      ? "Airborne"
      : kind === "detected"
        ? "Detected"
        : kind === "error"
          ? "Error"
          : "Quiet";

    row.append(time, detail, badge);
    fragment.append(row);
  });

  historyList.replaceChildren(fragment);
}

async function loadHistory() {
  if (isLoading) {
    return;
  }

  isLoading = true;
  historyStatus.textContent = "Reading the last 48 hours of scans…";

  try {
    const response = await fetch(historyEndpoint, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`History returned ${response.status}`);
    }

    const payload = await response.json();

    if (!payload.ok) {
      throw new Error(payload.error || "Invalid history response");
    }

    allScans = Array.isArray(payload.scans)
      ? payload.scans
      : Array.isArray(payload.history)
        ? payload.history
        : [];
    allScans.sort(
      (first, second) =>
        Date.parse(second.at || second.timestamp) - Date.parse(first.at || first.timestamp),
    );
    render();
    historyStatus.textContent = allScans.length
      ? `${allScans.length} scan${allScans.length === 1 ? "" : "s"} recorded · last 48 hours · updates every 3 min`
      : "No scans recorded yet · checks every 3 min";
  } catch (error) {
    console.error("Could not load scan history", error);
    showEmpty(
      "Scan history is not online yet",
      "The history page is ready. The Worker needs its final scan-log update before entries can appear here.",
    );
    historyStatus.textContent = "Waiting for the scan-log update · retrying every 3 min";
  } finally {
    isLoading = false;
  }
}

activityFilter.addEventListener("click", () => {
  showActivityOnly = !showActivityOnly;
  activityFilter.classList.toggle("is-active", showActivityOnly);
  activityFilter.setAttribute("aria-pressed", String(showActivityOnly));
  activityFilter.textContent = showActivityOnly ? "Showing activity only" : "Activity only";
  render();
});

window.setInterval(() => {
  if (!document.hidden) {
    loadHistory();
  }
}, autoRefreshMs);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadHistory();
  }
});

loadHistory();
