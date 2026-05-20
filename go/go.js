const TARGET_DEPARTURE = {
  hour: 7,
  minute: 54,
  label: "7:54 AM"
};

const API_BASE = "https://api.openmetrolinx.com/OpenDataAPI/api/V1";
const SAVED_KEY = "pelaxix-go-api-key";
const SAVED_FROM = "pelaxix-go-from-stop";
const SAVED_TO = "pelaxix-go-to-stop";
const SAVED_START = "pelaxix-go-start-time";

const countdown = document.querySelector("#countdown");
const countdownLabel = document.querySelector("#countdownLabel");
const todayDeparture = document.querySelector("#todayDeparture");
const serviceDay = document.querySelector("#serviceDay");
const timeWindow = document.querySelector("#timeWindow");

const apiForm = document.querySelector("#apiForm");
const apiKeyInput = document.querySelector("#apiKey");
const fromStopCodeInput = document.querySelector("#fromStopCode");
const toStopCodeInput = document.querySelector("#toStopCode");
const startTimeInput = document.querySelector("#startTime");
const apiStatus = document.querySelector("#apiStatus");
const liveTripNumber = document.querySelector("#liveTripNumber");
const liveDelay = document.querySelector("#liveDelay");
const liveUpdated = document.querySelector("#liveUpdated");
const liveDetails = document.querySelector("#liveDetails");

todayDeparture.textContent = TARGET_DEPARTURE.label;
apiKeyInput.value = localStorage.getItem(SAVED_KEY) || "";
fromStopCodeInput.value = localStorage.getItem(SAVED_FROM) || fromStopCodeInput.value;
toStopCodeInput.value = localStorage.getItem(SAVED_TO) || toStopCodeInput.value;
startTimeInput.value = localStorage.getItem(SAVED_START) || startTimeInput.value;

updateTracker();
setInterval(updateTracker, 1000);

apiForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const apiKey = apiKeyInput.value.trim();
  const fromStop = fromStopCodeInput.value.trim().toUpperCase();
  const toStop = toStopCodeInput.value.trim().toUpperCase();
  const startTime = startTimeInput.value.trim();

  localStorage.setItem(SAVED_KEY, apiKey);
  localStorage.setItem(SAVED_FROM, fromStop);
  localStorage.setItem(SAVED_TO, toStop);
  localStorage.setItem(SAVED_START, startTime);

  if (!apiKey) {
    setStatus("Add your GO API key first.", true);
    return;
  }

  setStatus("Checking GO Open Data...", false);
  liveTripNumber.textContent = "-";
  liveDelay.textContent = "-";
  liveUpdated.textContent = "-";
  liveDetails.innerHTML = "";

  try {
    const journey = await findTargetJourney({ apiKey, fromStop, toStop, startTime });
    if (!journey) {
      setStatus("Could not find a matching journey. Try changing the from stop code, to stop code, or start time.", true);
      return;
    }

    const tripNumber = extractTripNumber(journey);
    liveTripNumber.textContent = tripNumber || "found";
    liveDetails.innerHTML = `<strong>Matched journey:</strong><br>${escapeHtml(JSON.stringify(simplifyJourney(journey), null, 2))}`;

    const trainStatus = tripNumber ? await findTrainStatus({ apiKey, tripNumber }) : null;
    if (!trainStatus) {
      setStatus("Journey matched, but no live train delay record was found yet. It may appear closer to departure.", false);
      liveDelay.textContent = "not listed";
      liveUpdated.textContent = new Date().toLocaleTimeString();
      return;
    }

    const delaySeconds = Number(trainStatus.DelaySeconds || trainStatus.delaySeconds || trainStatus.Delay || 0);
    liveDelay.textContent = formatDelay(delaySeconds);
    liveUpdated.textContent = new Date().toLocaleTimeString();
    setStatus("Live GO lookup completed.", false);
    liveDetails.innerHTML += `<br><br><strong>Live train record:</strong><br>${escapeHtml(JSON.stringify(trainStatus, null, 2))}`;
  } catch (error) {
    console.error(error);
    setStatus(`Live lookup failed: ${error.message}`, true);
  }
});

async function findTargetJourney({ apiKey, fromStop, toStop, startTime }) {
  const url = `${API_BASE}/Stop/NextService/${encodeURIComponent(fromStop)}/${encodeURIComponent(toStop)}/${encodeURIComponent(startTime)}?key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url);
  const journeys = findArray(data);
  if (!journeys.length) return null;

  return journeys
    .map((journey) => ({ journey, score: scoreJourney(journey) }))
    .sort((a, b) => a.score - b.score)[0].journey;
}

async function findTrainStatus({ apiKey, tripNumber }) {
  const url = `${API_BASE}/ServiceataGlance/Trains/All?key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url);
  const trains = findArray(data);
  const target = String(tripNumber).trim().toLowerCase();

  return trains.find((train) => {
    const possibleIds = [
      train.TripNumber,
      train.TrainNumber,
      train.TripID,
      train.TripId,
      train.Trip,
      train.ServiceNumber
    ].map((value) => String(value || "").trim().toLowerCase());

    return possibleIds.includes(target);
  });
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function findArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  for (const item of Object.values(value)) {
    if (Array.isArray(item)) return item;
    const nested = findArray(item);
    if (nested.length) return nested;
  }

  return [];
}

function scoreJourney(journey) {
  const text = JSON.stringify(journey).toLowerCase();
  const hasTargetTime = text.includes("7:54") || text.includes("0754");
  const hasUnion = text.includes("union");
  const hasWestHarbour = text.includes("west harbour") || text.includes("westharbour");

  let score = 100;
  if (hasTargetTime) score -= 70;
  if (hasUnion) score -= 10;
  if (hasWestHarbour) score -= 10;
  return score;
}

function extractTripNumber(journey) {
  const keys = ["TripNumber", "TrainNumber", "TripID", "TripId", "Trip", "ServiceNumber"];
  const found = findFirstKey(journey, keys);
  return found ? String(found) : "";
}

function findFirstKey(value, keys) {
  if (!value || typeof value !== "object") return null;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key) && value[key]) {
      return value[key];
    }
  }

  for (const child of Object.values(value)) {
    if (typeof child === "object") {
      const found = findFirstKey(child, keys);
      if (found) return found;
    }
  }

  return null;
}

function simplifyJourney(journey) {
  const text = JSON.stringify(journey);
  if (text.length < 900) return journey;
  return {
    note: "Large GO API response trimmed for display. Full object is available in the browser console.",
    possibleTripNumber: extractTripNumber(journey)
  };
}

function formatDelay(seconds) {
  if (!Number.isFinite(seconds) || seconds === 0) return "on time";
  const minutes = Math.round(Math.abs(seconds) / 60);
  return seconds > 0 ? `${minutes} min late` : `${minutes} min early`;
}

function setStatus(message, isError) {
  apiStatus.textContent = message;
  apiStatus.classList.toggle("error", Boolean(isError));
}

function updateTracker() {
  const now = new Date();
  const target = getNextTargetDeparture(now);
  const diffMs = target - now;

  countdown.textContent = formatDuration(diffMs);
  countdownLabel.textContent = buildCountdownLabel(now, target);
  serviceDay.textContent = getServiceDayLabel(now);
  timeWindow.textContent = getTimeWindow(now, target);
}

function getNextTargetDeparture(now) {
  const target = new Date(now);
  target.setHours(TARGET_DEPARTURE.hour, TARGET_DEPARTURE.minute, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function buildCountdownLabel(now, target) {
  const today = now.toDateString() === target.toDateString();
  const dayLabel = today ? "today" : "tomorrow";
  return `Next target departure is ${TARGET_DEPARTURE.label} ${dayLabel}. Confirm live status with GO before relying on it.`;
}

function getServiceDayLabel(date) {
  const day = date.getDay();
  if (day === 0) return "Sunday";
  if (day === 6) return "Saturday";
  return "Weekday";
}

function getTimeWindow(now, target) {
  const diffMinutes = Math.round((target - now) / 60000);

  if (diffMinutes <= 0) return "Departing now";
  if (diffMinutes <= 15) return "Leave now";
  if (diffMinutes <= 45) return "Getting close";
  if (diffMinutes <= 120) return "This morning";
  return "Later";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
