const TARGET_DEPARTURE = {
  hour: 7,
  minute: 54,
  label: "7:54 AM"
};

const SAVED_FROM = "pelaxix-go-from-stop";
const SAVED_TO = "pelaxix-go-to-stop";
const SAVED_START = "pelaxix-go-start-time";
const SAVED_TRIP = "pelaxix-go-trip-number";

const countdown = document.querySelector("#countdown");
const countdownLabel = document.querySelector("#countdownLabel");
const todayDeparture = document.querySelector("#todayDeparture");
const serviceDay = document.querySelector("#serviceDay");
const timeWindow = document.querySelector("#timeWindow");

const apiForm = document.querySelector("#apiForm");
const fromStopCodeInput = document.querySelector("#fromStopCode");
const toStopCodeInput = document.querySelector("#toStopCode");
const startTimeInput = document.querySelector("#startTime");
const tripNumberInput = document.querySelector("#tripNumber");
const apiStatus = document.querySelector("#apiStatus");
const liveTripNumber = document.querySelector("#liveTripNumber");
const liveDelay = document.querySelector("#liveDelay");
const liveUpdated = document.querySelector("#liveUpdated");
const liveDetails = document.querySelector("#liveDetails");

todayDeparture.textContent = TARGET_DEPARTURE.label;
fromStopCodeInput.value = localStorage.getItem(SAVED_FROM) || fromStopCodeInput.value;
toStopCodeInput.value = localStorage.getItem(SAVED_TO) || toStopCodeInput.value;
startTimeInput.value = localStorage.getItem(SAVED_START) || startTimeInput.value;
tripNumberInput.value = localStorage.getItem(SAVED_TRIP) || tripNumberInput.value;

updateTracker();
setInterval(updateTracker, 1000);

apiForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fromStop = fromStopCodeInput.value.trim().toUpperCase();
  const toStop = toStopCodeInput.value.trim().toUpperCase();
  const startTime = startTimeInput.value.trim();
  const tripNumber = tripNumberInput.value.trim();

  localStorage.setItem(SAVED_FROM, fromStop);
  localStorage.setItem(SAVED_TO, toStop);
  localStorage.setItem(SAVED_START, startTime);
  localStorage.setItem(SAVED_TRIP, tripNumber);

  setStatus("Checking GO live data through Cloudflare...", false);
  liveTripNumber.textContent = "-";
  liveDelay.textContent = "-";
  liveUpdated.textContent = "-";
  liveDetails.innerHTML = "";

  try {
    const params = new URLSearchParams({ fromStop, toStop, startTime });
    if (tripNumber) params.set("tripNumber", tripNumber);

    const response = await fetch(`/api/go-delay?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    liveTripNumber.textContent = data.matchedTripNumber || "not found";
    liveDelay.textContent = formatDelay(data.delaySeconds);
    liveUpdated.textContent = data.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : new Date().toLocaleTimeString();

    if (!data.matchedTripNumber) {
      setStatus("No matching GO trip number found. Try a different stop code or start time.", true);
    } else if (!data.trainStatus) {
      setStatus("Trip found, but no in-service live train record was found. It may appear closer to departure.", false);
    } else {
      setStatus("Live GO lookup completed.", false);
    }

    liveDetails.innerHTML = `<strong>Function response:</strong><br>${escapeHtml(JSON.stringify(data, null, 2))}`;
  } catch (error) {
    console.error(error);
    setStatus(`Live lookup failed: ${error.message}`, true);
  }
});

function formatDelay(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "not listed";
  const parsed = Number(seconds);
  if (parsed === 0) return "on time";
  const minutes = Math.round(Math.abs(parsed) / 60);
  return parsed > 0 ? `${minutes} min late` : `${minutes} min early`;
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
