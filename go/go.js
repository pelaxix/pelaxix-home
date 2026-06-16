const TRAIN_NUMBER = "1960";
const FROM_STOP = "WR";
const TO_STOP = "UN";
const START_TIME = "0700";
const LOOKUP_TIMEOUT_MS = 10000;
const TARGET_DEPARTURE = { hour: 7, minute: 54 };
const TARGET_ARRIVAL = { hour: 9, minute: 4 };
const LIVE_LOOKAHEAD_MINUTES = 30;
const REFUND_MINUTES = 15;
const REFUND_CLAIM_URL = "https://www.gotransit.com/en/service-guarantee/submit-a-claim";

const apiStatus = document.querySelector("#apiStatus");
const statusCard = document.querySelector("#statusCard");
const liveDelay = document.querySelector("#liveDelay");
const liveUpdated = document.querySelector("#liveUpdated");
const liveDetails = document.querySelector("#liveDetails");
const delayedGrid = document.querySelector("#delayedGrid");
const delayedDeparture = document.querySelector("#delayedDeparture");
const delayedArrival = document.querySelector("#delayedArrival");
const refundEligible = document.querySelector("#refundEligible");
const refundCard = document.querySelector("#refundCard");

let lookupFinished = false;

window.addEventListener("DOMContentLoaded", () => {
  checkTrain1960();
});

async function checkTrain1960() {
  lookupFinished = false;
  hideDelayedGrid();
  setStatusState("checking", "CHECKING...", "Checking the current delay status.");
  liveUpdated.textContent = "-";
  updateClaimDetails({ state: "checking" });

  const controller = new AbortController();
  const visibleTimeoutId = setTimeout(() => {
    if (!lookupFinished) {
      lookupFinished = true;
      controller.abort();
      liveUpdated.textContent = formatTime(new Date());
      setStatusState("error", "TIMEOUT", "The live lookup took too long. Refresh to try again.");
      updateClaimDetails({ state: "timeout" });
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
    const delayMinutes = getDelayMinutes(delaySeconds);

    setStatusState(state, delayText, "Live GO status checked for the West Harbour to Union trip.");

    if (delaySeconds > 60) {
      showDelayedGrid(delaySeconds, data.computedDepartureTime);
    } else {
      hideDelayedGrid();
    }

    updateClaimDetails({
      state: "live",
      delaySeconds,
      delayMinutes,
      checkedAt: data.checkedAt,
      computedDepartureTime: data.computedDepartureTime,
    });
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
    updateClaimDetails({ state: "error", error });
  }
}

function applyNotLiveStatus(now) {
  const departure = getTodayDateAt(TARGET_DEPARTURE.hour, TARGET_DEPARTURE.minute, now);
  const arrival = getTodayDateAt(TARGET_ARRIVAL.hour, TARGET_ARRIVAL.minute, now);
  const liveWindowStart = new Date(departure.getTime() - LIVE_LOOKAHEAD_MINUTES * 60 * 1000);

  if (now < liveWindowStart) {
    setStatusState("scheduled", "SCHEDULED", "Live tracking usually starts about 30 minutes before departure. Check back closer to 7:54 AM.");
    updateClaimDetails({ state: "scheduled" });
    return;
  }

  if (now > arrival) {
    setStatusState("ended", "TRIP ENDED", "This trip is finished, so GO no longer lists it in the live feed.");
    updateClaimDetails({ state: "ended" });
    return;
  }

  setStatusState("not-checked", "NOT LISTED", "This train is inside the expected live window, but GO is not listing it yet. Refresh in a few minutes.");
  updateClaimDetails({ state: "not-listed" });
}

function showDelayedGrid(delaySeconds, computedDepartureTime) {
  const delayMinutes = getDelayMinutes(delaySeconds);
  const now = new Date();
  const targetDeparture = getTodayDateAt(TARGET_DEPARTURE.hour, TARGET_DEPARTURE.minute, now);
  const targetArrival = getTodayDateAt(TARGET_ARRIVAL.hour, TARGET_ARRIVAL.minute, now);
  const computedDeparture = parseMetrolinxDate(computedDepartureTime);
  const isRefundEligible = delayMinutes >= REFUND_MINUTES;

  delayedDeparture.textContent = computedDeparture
    ? formatTime(computedDeparture)
    : formatTime(new Date(targetDeparture.getTime() + delayMinutes * 60 * 1000));
  delayedArrival.textContent = formatTime(new Date(targetArrival.getTime() + delayMinutes * 60 * 1000));
  refundEligible.textContent = isRefundEligible ? "YES" : "NO";
  updateRefundCard(isRefundEligible);
  delayedGrid.hidden = false;
}

function hideDelayedGrid() {
  delayedGrid.hidden = true;
  delayedDeparture.textContent = "-";
  delayedArrival.textContent = "-";
  refundEligible.textContent = "NO";
  updateRefundCard(false);
}

function updateRefundCard(isRefundEligible) {
  refundCard.classList.toggle("refund-yes", isRefundEligible);
  refundCard.classList.toggle("refund-no", !isRefundEligible);

  if (isRefundEligible) {
    refundCard.href = REFUND_CLAIM_URL;
    refundCard.setAttribute("aria-label", "Refund eligible. Open the GO Transit service guarantee claim form.");
    refundCard.title = "Open GO Transit claim form";
  } else {
    refundCard.removeAttribute("href");
    refundCard.setAttribute("aria-label", "Refund not eligible yet.");
    refundCard.removeAttribute("title");
  }
}

function updateClaimDetails(context) {
  if (!liveDetails) return;

  const thresholdLine = `Claim threshold used by this page: <strong>${REFUND_MINUTES}+ minutes delayed</strong>.`;

  if (context.state === "checking") {
    liveDetails.innerHTML = `${thresholdLine}<br>Waiting for the live GO lookup before deciding claim eligibility.`;
    return;
  }

  if (context.state === "scheduled") {
    liveDetails.innerHTML = `${thresholdLine}<br>No claim check yet because live tracking usually starts about ${LIVE_LOOKAHEAD_MINUTES} minutes before the 7:54 AM departure.`;
    return;
  }

  if (context.state === "ended") {
    liveDetails.innerHTML = `${thresholdLine}<br>No claim check right now because this trip has ended and GO no longer lists it in the live feed.`;
    return;
  }

  if (context.state === "not-listed") {
    liveDetails.innerHTML = `${thresholdLine}<br>No claim check yet because train ${TRAIN_NUMBER} is not currently listed by GO. The refund card stays at <strong>NO</strong>.`;
    return;
  }

  if (context.state === "timeout" || context.state === "error") {
    liveDetails.innerHTML = `${thresholdLine}<br>No claim check was completed because the live lookup failed. The refund card stays at <strong>NO</strong>.`;
    return;
  }

  const delayMinutes = context.delayMinutes || 0;
  const isRefundEligible = delayMinutes >= REFUND_MINUTES;
  const resultText = isRefundEligible ? "YES" : "NO";
  const cardAction = isRefundEligible
    ? "The refund card becomes clickable and opens the GO Transit service guarantee claim form."
    : "The refund card is not clickable yet.";
  const departureTime = context.computedDepartureTime
    ? `<br>GO computed departure: <strong>${formatTime(parseMetrolinxDate(context.computedDepartureTime) || new Date(context.computedDepartureTime))}</strong>.`
    : "";

  liveDetails.innerHTML = [
    thresholdLine,
    `Current live delay: <strong>${delayMinutes} minute${delayMinutes === 1 ? "" : "s"}</strong>.`,
    `Calculation: ${delayMinutes} >= ${REFUND_MINUTES} = <strong>${resultText}</strong>.`,
    `Refund eligible card: <strong>${resultText}</strong>. ${cardAction}`,
    departureTime,
  ].filter(Boolean).join("<br>");
}

function parseMetrolinxDate(value) {
  if (!value) return null;
  const normalized = String(value).trim().replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDelayMinutes(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return 0;
  return Math.max(0, Math.round(Number(seconds) / 60));
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
