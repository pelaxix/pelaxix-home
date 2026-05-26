const gps = [
  { id: "monaco", round: 6, label: "Monaco", poster: "./gp-posters/R06.MON.png", hasSprint: false, deadlineUtc: "2026-06-06T14:00:00Z", raceStartUtc: "2026-06-07T13:00:00Z" },
  { id: "barcelona", round: 7, label: "Barcelona-Catalunya", poster: "./gp-posters/R07.BCN.png", hasSprint: false, deadlineUtc: "2026-06-13T14:00:00Z", raceStartUtc: "2026-06-14T13:00:00Z" },
  { id: "austria", round: 8, label: "Austria", poster: "./gp-posters/R08.AUT.png", hasSprint: false, deadlineUtc: "2026-06-27T14:00:00Z", raceStartUtc: "2026-06-28T13:00:00Z" },
  { id: "great-britain", round: 9, label: "Great Britain", poster: "./gp-posters/R09.GBR.png", hasSprint: true, deadlineUtc: "2026-07-04T11:00:00Z", raceStartUtc: "2026-07-05T14:00:00Z" },
  { id: "belgium", round: 10, label: "Belgium", poster: "./gp-posters/R10.BEL.png", hasSprint: false, deadlineUtc: "2026-07-18T14:00:00Z", raceStartUtc: "2026-07-19T13:00:00Z" },
  { id: "hungary", round: 11, label: "Hungary", poster: "./gp-posters/R11.HUN.png", hasSprint: false, deadlineUtc: "2026-07-25T14:00:00Z", raceStartUtc: "2026-07-26T13:00:00Z" },
  { id: "netherlands", round: 12, label: "Netherlands", poster: "./gp-posters/R12.NED.png", hasSprint: true, deadlineUtc: "2026-08-22T10:00:00Z", raceStartUtc: "2026-08-23T13:00:00Z" },
  { id: "italy", round: 13, label: "Italy", poster: "./gp-posters/R13.ITA.png", hasSprint: false, deadlineUtc: "2026-09-05T14:00:00Z", raceStartUtc: "2026-09-06T13:00:00Z" },
  { id: "spain", round: 14, label: "Spain", poster: "./gp-posters/R14.ESP.png", hasSprint: false, deadlineUtc: "2026-09-12T14:00:00Z", raceStartUtc: "2026-09-13T13:00:00Z" },
  { id: "azerbaijan", round: 15, label: "Azerbaijan", poster: "./gp-posters/R15.AZE.png", hasSprint: false, deadlineUtc: "2026-09-25T12:00:00Z", raceStartUtc: "2026-09-26T11:00:00Z" },
  { id: "singapore", round: 16, label: "Singapore", poster: "./gp-posters/R16.SIN.png", hasSprint: true, deadlineUtc: "2026-10-10T09:00:00Z", raceStartUtc: "2026-10-11T12:00:00Z" },
  { id: "united-states", round: 17, label: "United States", poster: "./gp-posters/R17.USA.png", hasSprint: false, deadlineUtc: "2026-10-24T21:00:00Z", raceStartUtc: "2026-10-25T20:00:00Z" },
  { id: "mexico", round: 18, label: "Mexico", poster: "./gp-posters/R18.MEX.png", hasSprint: false, deadlineUtc: "2026-10-31T21:00:00Z", raceStartUtc: "2026-11-01T20:00:00Z" },
  { id: "brazil", round: 19, label: "Brazil", poster: "./gp-posters/R19.BRA.png", hasSprint: false, deadlineUtc: "2026-11-07T18:00:00Z", raceStartUtc: "2026-11-08T17:00:00Z" },
  { id: "las-vegas", round: 20, label: "Las Vegas", poster: "./gp-posters/R20.LVG.png", hasSprint: false, deadlineUtc: "2026-11-21T04:00:00Z", raceStartUtc: "2026-11-22T04:00:00Z" },
  { id: "qatar", round: 21, label: "Qatar", poster: "./gp-posters/R21.QAT.png", hasSprint: false, deadlineUtc: "2026-11-28T18:00:00Z", raceStartUtc: "2026-11-29T16:00:00Z" },
  { id: "abu-dhabi", round: 22, label: "Abu Dhabi", poster: "./gp-posters/R22.ABD.png", hasSprint: false, deadlineUtc: "2026-12-05T14:00:00Z", raceStartUtc: "2026-12-06T13:00:00Z" },
];

const $ = (id) => document.getElementById(id);
const gpSelect = $("gpSelect");
const countdownEl = $("countdown");
const deadlineType = $("deadlineType") || $("deadlineLabel");
const deadlineMeta = $("deadlineMeta") || $("deadlineStatus");
const roundLabel = $("roundLabel");
const gpTitle = $("gpTitle") || $("posterTitle");
const weekendStatus = $("weekendStatus");
const gpPoster = $("gpPoster");
const posterFallback = $("posterFallback") || $("posterPlaceholder");
const fallbackTitle = $("fallbackTitle") || $("posterTitle");
const fallbackPath = $("fallbackPath") || $("posterPath");
const posterHint = $("posterHint");

let selectedGp;

function orderedGps() {
  return gps.slice().sort((a, b) => a.round - b.round);
}

function nextGp() {
  const now = new Date();
  return orderedGps().find((gp) => new Date(gp.raceStartUtc) > now) || gps[gps.length - 1];
}

function countdownParts(targetUtc) {
  const diff = new Date(targetUtc) - new Date();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function formatCountdown(parts) {
  if (!parts) return "Fantasy cerrado";
  return `${parts.days}d ${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
}

function formatDateTime(utcDate) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(utcDate));
}

function renderSelect() {
  gpSelect.innerHTML = "";
  orderedGps().forEach((gp) => {
    const option = document.createElement("option");
    option.value = gp.id;
    option.textContent = `R${gp.round} - ${gp.label}`;
    gpSelect.appendChild(option);
  });
}

function renderPoster(gp) {
  if (!gpPoster) return;
  gpPoster.hidden = false;
  if (posterFallback) posterFallback.hidden = true;
  gpPoster.src = gp.poster;
  gpPoster.alt = `Poster for ${gp.label}`;
  if (fallbackTitle) fallbackTitle.textContent = `R${gp.round} - ${gp.label}`;
  if (fallbackPath) fallbackPath.textContent = gp.poster;
  if (posterHint) posterHint.textContent = "Upload the matching poster image and it will show here automatically.";
}

function renderStatus(gp) {
  const now = new Date();
  const deadlinePassed = new Date(gp.deadlineUtc) <= now;
  const racePassed = new Date(gp.raceStartUtc) <= now;

  if (roundLabel) roundLabel.textContent = `Round ${gp.round}`;
  if (gpTitle) gpTitle.textContent = gp.label;
  if (deadlineType) deadlineType.textContent = gp.hasSprint ? "Deadline: Sprint start" : "Deadline: Qualy start";
  if (deadlineMeta) deadlineMeta.textContent = `Deadline: ${formatDateTime(gp.deadlineUtc)}. Race: ${formatDateTime(gp.raceStartUtc)}.`;

  if (weekendStatus) {
    if (!deadlinePassed) weekendStatus.textContent = "Haz tus picks antes de que cierre la ventana del fantasy.";
    else if (!racePassed) weekendStatus.textContent = "Fantasy ya cerró para este GP, pero la carrera sigue activa.";
    else weekendStatus.textContent = "Este GP ya pasó. Puedes seguir viendo el poster desde el selector.";
  }
}

function updateCountdown() {
  if (!selectedGp || !countdownEl) return;
  countdownEl.textContent = formatCountdown(countdownParts(selectedGp.deadlineUtc));
}

function selectGp(gpId) {
  selectedGp = gps.find((gp) => gp.id === gpId) || nextGp();
  gpSelect.value = selectedGp.id;
  renderStatus(selectedGp);
  renderPoster(selectedGp);
  updateCountdown();
}

function init() {
  if (!gpSelect) return;
  renderSelect();
  selectGp(nextGp().id);
  gpSelect.addEventListener("change", (event) => selectGp(event.target.value));

  if (gpPoster) {
    gpPoster.addEventListener("error", () => {
      gpPoster.hidden = true;
      if (posterFallback) posterFallback.hidden = false;
    });
    gpPoster.addEventListener("load", () => {
      gpPoster.hidden = false;
      if (posterFallback) posterFallback.hidden = true;
    });
  }

  setInterval(updateCountdown, 1000);
}

init();
