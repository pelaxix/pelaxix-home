const gps = [
  { id: "monaco", round: 6, label: "Monaco", poster: "posters/R06.MON.png", hasSprint: false, deadlineUtc: "2026-06-06T14:00:00Z", raceStartUtc: "2026-06-07T13:00:00Z" },
  { id: "barcelona", round: 7, label: "Barcelona-Catalunya", poster: "posters/R07.BCN.png", hasSprint: false, deadlineUtc: "2026-06-13T14:00:00Z", raceStartUtc: "2026-06-14T13:00:00Z" },
  { id: "austria", round: 8, label: "Austria", poster: "posters/R08.AUT.png", hasSprint: false, deadlineUtc: "2026-06-27T14:00:00Z", raceStartUtc: "2026-06-28T13:00:00Z" },
  { id: "great-britain", round: 9, label: "Great Britain", poster: "posters/R09.GBR.png", hasSprint: true, deadlineUtc: "2026-07-04T11:00:00Z", raceStartUtc: "2026-07-05T14:00:00Z" },
  { id: "belgium", round: 10, label: "Belgium", poster: "posters/R10.BEL.png", hasSprint: false, deadlineUtc: "2026-07-18T14:00:00Z", raceStartUtc: "2026-07-19T13:00:00Z" },
  { id: "hungary", round: 11, label: "Hungary", poster: "posters/R11.HUN.png", hasSprint: false, deadlineUtc: "2026-07-25T14:00:00Z", raceStartUtc: "2026-07-26T13:00:00Z" },
  { id: "netherlands", round: 12, label: "Netherlands", poster: "posters/R12.NED.png", hasSprint: true, deadlineUtc: "2026-08-22T10:00:00Z", raceStartUtc: "2026-08-23T13:00:00Z" },
  { id: "italy", round: 13, label: "Italy", poster: "posters/R13.ITA.png", hasSprint: false, deadlineUtc: "2026-09-05T14:00:00Z", raceStartUtc: "2026-09-06T13:00:00Z" },
  { id: "spain", round: 14, label: "Spain", poster: "posters/R14.ESP.png", hasSprint: false, deadlineUtc: "2026-09-12T14:00:00Z", raceStartUtc: "2026-09-13T13:00:00Z" },
  { id: "azerbaijan", round: 15, label: "Azerbaijan", poster: "posters/R15.AZE.png", hasSprint: false, deadlineUtc: "2026-09-25T12:00:00Z", raceStartUtc: "2026-09-26T11:00:00Z" },
  { id: "singapore", round: 16, label: "Singapore", poster: "posters/R16.SIN.png", hasSprint: true, deadlineUtc: "2026-10-10T09:00:00Z", raceStartUtc: "2026-10-11T12:00:00Z" },
  { id: "united-states", round: 17, label: "United States", poster: "posters/R17.USA.png", hasSprint: false, deadlineUtc: "2026-10-24T21:00:00Z", raceStartUtc: "2026-10-25T20:00:00Z" },
  { id: "mexico", round: 18, label: "Mexico", poster: "posters/R18.MEX.png", hasSprint: false, deadlineUtc: "2026-10-31T21:00:00Z", raceStartUtc: "2026-11-01T20:00:00Z" },
  { id: "brazil", round: 19, label: "Brazil", poster: "posters/R19.BRA.png", hasSprint: false, deadlineUtc: "2026-11-07T18:00:00Z", raceStartUtc: "2026-11-08T17:00:00Z" },
  { id: "las-vegas", round: 20, label: "Las Vegas", poster: "posters/R20.LVG.png", hasSprint: false, deadlineUtc: "2026-11-21T04:00:00Z", raceStartUtc: "2026-11-22T04:00:00Z" },
  { id: "qatar", round: 21, label: "Qatar", poster: "posters/R21.QAT.png", hasSprint: false, deadlineUtc: "2026-11-28T18:00:00Z", raceStartUtc: "2026-11-29T16:00:00Z" },
  { id: "abu-dhabi", round: 22, label: "Abu Dhabi", poster: "posters/R22.ABD.png", hasSprint: false, deadlineUtc: "2026-12-05T14:00:00Z", raceStartUtc: "2026-12-06T13:00:00Z" },
];

const gpSelect = document.getElementById("gpSelect");
const countdownEl = document.getElementById("countdown");
const deadlineLabel = document.getElementById("deadlineLabel");
const deadlineStatus = document.getElementById("deadlineStatus");
const posterPlaceholder = document.getElementById("posterPlaceholder");
const posterTitle = document.getElementById("posterTitle");
const posterHint = document.getElementById("posterHint");
const posterPath = document.getElementById("posterPath");
const gpPoster = document.getElementById("gpPoster");

function getNextGp() {
  const now = new Date();
  return gps.find((gp) => new Date(gp.raceStartUtc) > now) || gps[gps.length - 1];
}

function getCountdownParts(targetUtc) {
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

function setPoster(gp) {
  gpPoster.hidden = true;
  posterPlaceholder.hidden = false;
  posterTitle.textContent = `R${gp.round} - ${gp.label}`;
  posterHint.textContent = "Upload the matching poster image and it will show here automatically.";
  posterPath.textContent = `/yucafantasy/${gp.poster}`;

  const testImage = new Image();
  testImage.onload = () => {
    gpPoster.src = gp.poster;
    gpPoster.alt = `Poster for ${gp.label}`;
    gpPoster.hidden = false;
    posterPlaceholder.hidden = true;
  };
  testImage.onerror = () => {
    gpPoster.removeAttribute("src");
  };
  testImage.src = gp.poster;
}

function renderSelectedGp() {
  const gp = gps.find((item) => item.id === gpSelect.value) || getNextGp();
  const now = new Date();
  const deadlinePassed = new Date(gp.deadlineUtc) <= now;
  const racePassed = new Date(gp.raceStartUtc) <= now;

  deadlineLabel.textContent = gp.hasSprint ? "Deadline: Sprint start" : "Deadline: Qualy start";
  countdownEl.textContent = formatCountdown(getCountdownParts(gp.deadlineUtc));

  if (!deadlinePassed) {
    deadlineStatus.textContent = "Make your picks before the fantasy window closes.";
  } else if (!racePassed) {
    deadlineStatus.textContent = "Fantasy is locked, but this GP weekend is still active.";
  } else {
    deadlineStatus.textContent = "This GP has already passed.";
  }

  setPoster(gp);
}

function initialize() {
  const orderedGps = [...gps].sort((a, b) => a.round - b.round);
  const nextGp = getNextGp();

  gpSelect.innerHTML = orderedGps
    .map((gp) => `<option value="${gp.id}">R${gp.round} - ${gp.label}</option>`)
    .join("");

  gpSelect.value = nextGp.id;
  renderSelectedGp();
  gpSelect.addEventListener("change", renderSelectedGp);
  setInterval(renderSelectedGp, 1000);
}

initialize();
