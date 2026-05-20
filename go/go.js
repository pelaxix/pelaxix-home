const TRAIN_NUMBER = "1960";
const FROM_STOP = "WR";
const TO_STOP = "UN";
const START_TIME = "0700";

const apiStatus = document.querySelector("#apiStatus");
const statusCard = document.querySelector("#statusCard");
const liveDelay = document.querySelector("#liveDelay");
const liveUpdated = document.querySelector("#liveUpdated");
const liveDetails = document.querySelector("#liveDetails");

document.addEventListener("DOMContentLoaded", checkTrain1960);

async function checkTrain1960() {
  setStatusState("checking", "CHECKING...", "Checking the current delay status.");
  liveUpdated.textContent = "-";
  liveDetails.innerHTML = "";

  try {
    const params = new URLSearchParams({
      fromStop: FROM_STOP,
      toStop: TO_STOP,
      startTime: START_TIME,
      tripNumber: TRAIN_NUMBER
    });

    const response = await fetch(`/api/go-delay?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    liveUpdated.textContent = data.checkedAt ? new Date(data.checkedAt).toLocaleTimeString() : new Date().toLocaleTimeString();

    if (!data.trainStatus) {
      setStatusState("not-checked", "NOT LISTED", "No live in-service record found for this train yet. Try refreshing closer to departure.");
    } else {
      const delayText = formatDelay(data.delaySeconds);
      const state = getDelayState(data.delaySeconds);
      setStatusState(state, delayText, "Live GO status checked for the West Harbour to Union trip.");
    }

    liveDetails.innerHTML = `<strong>Function response:</strong><br>${escapeHtml(JSON.stringify(data, null, 2))}`;
  } catch (error) {
    console.error(error);
    liveUpdated.textContent = new Date().toLocaleTimeString();
    setStatusState("error", "ERROR", `Live lookup failed: ${error.message}`);
  }
}

function formatDelay(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "NOT LISTED";

  const parsed = Number(seconds);
  if (parsed <= 60 && parsed >= -60) return "ON TIME";

  const minutes = Math.round(Math.abs(parsed) / 60);
  const padded = String(minutes).padStart(2, "0");

  return parsed > 0 ? `${padded} MINUTES DELAYED` : `${padded} MINUTES EARLY`;
}

function getDelayState(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "not-checked";
  return Number(seconds) > 60 ? "delayed" : "on-time";
}

function setStatusState(state, statusText, message) {
  statusCard.classList.remove("not-checked", "checking", "on-time", "delayed", "error");
  statusCard.classList.add(state);
  liveDelay.textContent = statusText;
  apiStatus.textContent = message;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
