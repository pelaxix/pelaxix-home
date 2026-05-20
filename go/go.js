const TARGET_DEPARTURE = {
  hour: 7,
  minute: 54,
  label: "7:54 AM"
};

const countdown = document.querySelector("#countdown");
const countdownLabel = document.querySelector("#countdownLabel");
const todayDeparture = document.querySelector("#todayDeparture");
const serviceDay = document.querySelector("#serviceDay");
const timeWindow = document.querySelector("#timeWindow");

todayDeparture.textContent = TARGET_DEPARTURE.label;
updateTracker();
setInterval(updateTracker, 1000);

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
