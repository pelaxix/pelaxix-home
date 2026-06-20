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
const autoRefreshMs = 60 * 1000;

let showActivityOnly = false;
let allScans = [];
let isLoading = false;

// Warbird Watch is intentionally standalone: navigation stays inside the project.
document.querySelector(".site-header")?.remove();
document.querySelector("footer a")?.remove();

function getScanTime(scan) {
  return scan.at || scan.timestamp || null;
}

function formatTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const year = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
  }).format(date);
  const month = new Intl.DateTimeFormat(undefined, {
    month: "2-digit",
  }).format(date);
  const day = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${year}.${month}.${day} · ${time}`;
}

function aircraftItems(scan) {
  return Array.isArray(scan.aircraft)
    ? scan.aircraft
    : Array.isArray(scan.liveMatches)
      ? scan.liveMatches
      : [];
}

function scanActivities(scan) {
  const rawActivities = Array.isArray(scan.activity)
    ? scan.activity
    : Array.isArray(scan.activities)
      ? scan.activities
      : scan.event
        ? aircraftItems(scan).map((item) => ({ ...item, type: scan.event }))
        : [];

  return rawActivities
    .map((item) => {
      const type = String(item?.type ?? item?.event ?? "").toLowerCase();

      return {
        type,
        aircraft:
          item?.label ||
          item?.aircraft ||
          item?.registration ||
          "Watched aircraft",
      };
    })
    .filter((item) => item.type === "detected" || item.type === "airborne");
}

function hasActivity(scan) {
  return scanActivities(scan).length > 0;
}

function scanKind(scan) {
  if (scan.error) {
    return "error";
  }

  const activities = scanActivities(scan);

  if (activities.some((item) => item.type === "airborne")) {
    return "airborne";
  }

  if (activities.length) {
    return "detected";
  }

  return "quiet";
}

function showEmpty(title, description) {
  const card = document.createElement("article");
  const icon = document.createElement("span");
  const content = document.createElement("div");
  const heading = document.createElement("h3");
  const text = document.createElement("p");

  card.className = "empty-state";
  icon.className = "empty-icon";
  icon.textContent = "⌁";
  heading.textContent = title;
  text.textContent = description;
  content.append(heading, text);
  card.append(icon, content);
  historyList.replaceChildren(card);
}

function appendActivityMessage(message, activities) {
  activities.forEach((activity, index) => {
    if (index > 0) {
      message.append(document.createTextNode(" · "));
    }

    message.append(document.createTextNode(`${activity.aircraft} `));

    const status = document.createElement("span");
    status.className = `status-word ${activity.type}`;
    status.textContent = activity.type === "airborne" ? "airborne" : "detected";
    message.append(status);
  });
}

function appendScanMessage(message, scan) {
  if (scan.error) {
    const status = document.createElement("span");
    status.className = "status-word error";
    status.textContent = "Scan error";
    message.append(status, document.createTextNode(` · ${scan.error}`));
    return;
  }

  const activities = scanActivities(scan);

  if (activities.length) {
    appendActivityMessage(message, activities);
    return;
  }

  const aircraft = aircraftItems(scan);

  if (aircraft.length === 1) {
    const name = aircraft[0].label || aircraft[0].aircraft || aircraft[0].registration || "Watched aircraft";
    message.textContent = `${name} still tracked`;
    return;
  }

  if (aircraft.length > 1) {
    message.textContent = `${aircraft.length} watched aircraft still tracked`;
    return;
  }

  message.append(document.createTextNode("Scan completed · "));

  const status = document.createElement("span");
  status.className = "status-word quiet";
  status.textContent = "Quiet";
  message.append(status);
}

function render() {
  const scans = showActivityOnly
    ? allScans.filter(hasActivity)
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
    const row = document.createElement("article");
    const time = document.createElement("time");
    const message = document.createElement("p");

    row.className = `scan-row ${scanKind(scan)}`;
    time.className = "scan-time";
    time.dateTime = getScanTime(scan) || "";
    time.textContent = formatTimestamp(getScanTime(scan));

    message.className = "scan-message";
    appendScanMessage(message, scan);

    row.append(time, message);
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
        Date.parse(getScanTime(second)) - Date.parse(getScanTime(first)),
    );

    render();

    historyStatus.textContent = allScans.length
      ? `${allScans.length} scan${allScans.length === 1 ? "" : "s"} recorded · last 48 hours · updates every min`
      : "No scans recorded yet · checks every min";
  } catch (error) {
    console.error("Could not load scan history", error);
    showEmpty(
      "Scan history is not online yet",
      "The history page is ready. The Worker needs its scan-log update before entries can appear here.",
    );
    historyStatus.textContent = "Waiting for the scan-log update · retrying every min";
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
