const TRAIN_NUMBER = "1960";
const FROM_STOP = "WR";
const TO_STOP = "UN";
const START_TIME = "0700";
const LOOKUP_TIMEOUT_MS = 10000;
const TARGET_DEPARTURE = { hour: 7, minute: 54 };
const TARGET_ARRIVAL = { hour: 9, minute: 4 };
const LIVE_LOOKAHEAD_MINUTES = 30;

const apiStatus = document.querySelector("#apiStatus");
const statusCard = document.querySelector("#statusCard");
const liveDelay = document.querySelector("#liveDelay");
const liveUpdated = document.querySelector("#liveUpdated");
const delayedGrid = document.querySelector("#delayedGrid");
const delayedDeparture = document.querySelector("#delayedDeparture");
const delayedArrival = document.querySelector("#delayedArrival");

let lookupFinished = false;

window.addEventListener("DOMContentLoaded", () => {
  checkTrain1960();
});

async function checkTrain1960() {
  lookupFinished = false;
  hideDelayedGrid();
  setStatusState("checking", "CHECKING...", "Checking the current delay status.");
  liveUpdated.textContent = "-";

  const controller = new AbortController();
  const visibleTimeoutId = setTimeout(() => {
    if (!lookupFinished) {
      lookupFinished = true;
      controller.abort();
      liveUpdated.textContent = formatTime(new Date());
      setStatusState("error", "TIMEOUT", "The live lookup took too long. Refresh to try again.");
    }
  }, LOOKUP_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      fromStop: FROM_STOP,
      toStop: TO_STOP,
      startTime: START_TIME,
      tripNumber: TRAIN_NUMBER,
      ts: Date.now().toString(),
    });

    const response = await fetch(`/api/go-delay?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json();

    if (lookupFinished) return;
    lookupFinished = true;
    clearTimeout(visibleTimeoutId);

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    const now = new Date();
    liveUpdated.textContent = data.checkedAt ? formatTime(new Date(data.checkedAt)) : formatTime(now);

    if (!data.trainStatus) {
      applyNotLiveStatus(now);
      return;
    }

    const delaySeconds = Number(data.delaySeconds || 0);
    const delayText = formatDelay(delaySeconds);
    const state = getDelayState(delaySeconds);

    setStatusState(state, delayText, "Live GO status checked for the West Harbour to Union trip.");

    if (delaySeconds > 60) {
      showDelayedGrid(delaySeconds, data.computedDepartureTime);
    } else {
      hideDelayedGrid();
    }
  } catch (error) {
    console.error(error);
    if (lookupFinished && error.name === "AbortError") return;

    lookupFinished = true;
    clearTimeout(visibleTimeoutId);
    liveUpdated.textContent = formatTime(new Date());
    setStatusState(
      "error",
      error.name === "AbortError" ? "TIMEOUT" : "ERROR",
      error.name === "AbortError"
        ? "The live lookup took too long. Refresh to try again."
        : `Live lookup failed: ${error.message}`
    );
  }
}

function applyNotLiveStatus(now) {
  const departure = getTodayDateAt(TARGET_DEPARTURE.hour, TARGET_DEPARTURE.minute, now);
  const arrival = getTodayDateAt(TARGET_ARRIVAL.hour, TARGET_ARRIVAL.minute, now);
  const liveWindowStart = new Date(departure.getTime() - LIVE_LOOKAHEAD_MINUTES * 60 * 1000);

  if (now < liveWindowStart) {
    setStatusState("scheduled", "SCHEDULED", "Live tracking usually starts about 30 minutes before departure. Check back closer to 7:54 AM.");
    return;
  }

  if (now > arrival) {
    setStatusState("ended", "TRIP ENDED", "This trip is finished, so GO no longer lists it in the live feed.");
    return;
  }

  setStatusState("not-checked", "NOT LISTED", "This train is inside the expected live window, but GO is not listing it yet. Refresh in a few minutes.");
}

function showDelayedGrid(delaySeconds, computedDepartureTime) {
  const delayMinutes = Math.max(1, Math.round(Number(delaySeconds) / 60));
  const now = new Date();
  const targetDeparture = getTodayDateAt(TARGET_DEPARTURE.hour, TARGET_DEPARTURE.minute, now);
  const targetArrival = getTodayDateAt(TARGET_ARRIVAL.hour, TARGET_ARRIVAL.minute, now);
  const computedDeparture = parseMetrolinxDate(computedDepartureTime);

  delayedDeparture.textContent = computedDeparture
    ? formatTime(computedDeparture)
    : formatTime(new Date(targetDeparture.getTime() + delayMinutes * 60 * 1000));
  delayedArrival.textContent = formatTime(new Date(targetArrival.getTime() + delayMinutes * 60 * 1000));
  delayedGrid.hidden = false;
}

function hideDelayedGrid() {
  delayedGrid.hidden = true;
  delayedDeparture.textContent = "-";
  delayedArrival.textContent = "-";
}

function parseMetrolinxDate(value) {
  if (!value) return null;
  const normalized = String(value).trim().replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTodayDateAt(hour, minute, baseDate) {
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatDelay(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "NOT LISTED";

  const parsed = Number(seconds);
  if (parsed <= 60 && parsed >= -60) return "ON TIME";

  const minutes = Math.round(Math.abs(parsed) / 60);
  const padded = String(minutes).padStart(2, "0");
  return parsed > 0 ? `${padded} MINUTES DELAYED` : `${padded} MINUTES EARLY`;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getDelayState(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "not-checked";
  return Number(seconds) > 60 ? "delayed" : "on-time";
}

function setStatusState(state, statusText, message) {
  statusCard.classList.remove("not-checked", "checking", "on-time", "delayed", "error", "scheduled", "ended");
  statusCard.classList.add(state);
  liveDelay.textContent = statusText;
  apiStatus.textContent = message;
}
