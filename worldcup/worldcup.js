const MATCHES = [
  {
    "id": 1,
    "kickoffUtc": "2026-06-11T19:00:00Z",
    "home": "Mexico",
    "away": "South Africa"
  },
  {
    "id": 2,
    "kickoffUtc": "2026-06-12T02:00:00Z",
    "home": "South Korea",
    "away": "Czechia"
  },
  {
    "id": 3,
    "kickoffUtc": "2026-06-12T19:00:00Z",
    "home": "Canada",
    "away": "Bosnia and Herzegovina"
  },
  {
    "id": 4,
    "kickoffUtc": "2026-06-13T01:00:00Z",
    "home": "United States",
    "away": "Paraguay"
  },
  {
    "id": 5,
    "kickoffUtc": "2026-06-13T19:00:00Z",
    "home": "Qatar",
    "away": "Switzerland"
  },
  {
    "id": 6,
    "kickoffUtc": "2026-06-13T22:00:00Z",
    "home": "Brazil",
    "away": "Morocco"
  },
  {
    "id": 7,
    "kickoffUtc": "2026-06-14T01:00:00Z",
    "home": "Haiti",
    "away": "Scotland"
  },
  {
    "id": 8,
    "kickoffUtc": "2026-06-14T04:00:00Z",
    "home": "Australia",
    "away": "Türkiye"
  },
  {
    "id": 9,
    "kickoffUtc": "2026-06-14T17:00:00Z",
    "home": "Germany",
    "away": "Curaçao"
  },
  {
    "id": 10,
    "kickoffUtc": "2026-06-14T20:00:00Z",
    "home": "Netherlands",
    "away": "Japan"
  },
  {
    "id": 11,
    "kickoffUtc": "2026-06-14T23:00:00Z",
    "home": "Côte d'Ivoire",
    "away": "Ecuador"
  },
  {
    "id": 12,
    "kickoffUtc": "2026-06-15T02:00:00Z",
    "home": "Sweden",
    "away": "Tunisia"
  },
  {
    "id": 13,
    "kickoffUtc": "2026-06-15T16:00:00Z",
    "home": "Spain",
    "away": "Cabo Verde"
  },
  {
    "id": 14,
    "kickoffUtc": "2026-06-15T19:00:00Z",
    "home": "Belgium",
    "away": "Egypt"
  },
  {
    "id": 15,
    "kickoffUtc": "2026-06-15T22:00:00Z",
    "home": "Saudi Arabia",
    "away": "Uruguay"
  },
  {
    "id": 16,
    "kickoffUtc": "2026-06-16T01:00:00Z",
    "home": "IR Iran",
    "away": "New Zealand"
  },
  {
    "id": 17,
    "kickoffUtc": "2026-06-16T19:00:00Z",
    "home": "France",
    "away": "Senegal"
  },
  {
    "id": 18,
    "kickoffUtc": "2026-06-16T22:00:00Z",
    "home": "Iraq",
    "away": "Norway"
  },
  {
    "id": 19,
    "kickoffUtc": "2026-06-17T01:00:00Z",
    "home": "Argentina",
    "away": "Algeria"
  },
  {
    "id": 20,
    "kickoffUtc": "2026-06-17T04:00:00Z",
    "home": "Austria",
    "away": "Jordan"
  },
  {
    "id": 21,
    "kickoffUtc": "2026-06-17T17:00:00Z",
    "home": "Portugal",
    "away": "Congo DR"
  },
  {
    "id": 22,
    "kickoffUtc": "2026-06-17T20:00:00Z",
    "home": "England",
    "away": "Croatia"
  },
  {
    "id": 23,
    "kickoffUtc": "2026-06-17T23:00:00Z",
    "home": "Ghana",
    "away": "Panama"
  },
  {
    "id": 24,
    "kickoffUtc": "2026-06-18T02:00:00Z",
    "home": "Uzbekistan",
    "away": "Colombia"
  },
  {
    "id": 25,
    "kickoffUtc": "2026-06-18T16:00:00Z",
    "home": "Czechia",
    "away": "South Africa"
  },
  {
    "id": 26,
    "kickoffUtc": "2026-06-18T19:00:00Z",
    "home": "Switzerland",
    "away": "Bosnia and Herzegovina"
  },
  {
    "id": 27,
    "kickoffUtc": "2026-06-18T22:00:00Z",
    "home": "Canada",
    "away": "Qatar"
  },
  {
    "id": 28,
    "kickoffUtc": "2026-06-19T01:00:00Z",
    "home": "Mexico",
    "away": "South Korea"
  },
  {
    "id": 29,
    "kickoffUtc": "2026-06-19T19:00:00Z",
    "home": "United States",
    "away": "Australia"
  },
  {
    "id": 30,
    "kickoffUtc": "2026-06-19T22:00:00Z",
    "home": "Scotland",
    "away": "Morocco"
  },
  {
    "id": 31,
    "kickoffUtc": "2026-06-20T00:30:00Z",
    "home": "Brazil",
    "away": "Haiti"
  },
  {
    "id": 32,
    "kickoffUtc": "2026-06-20T03:00:00Z",
    "home": "Türkiye",
    "away": "Paraguay"
  },
  {
    "id": 33,
    "kickoffUtc": "2026-06-20T17:00:00Z",
    "home": "Netherlands",
    "away": "Sweden"
  },
  {
    "id": 34,
    "kickoffUtc": "2026-06-20T20:00:00Z",
    "home": "Germany",
    "away": "Côte d'Ivoire"
  },
  {
    "id": 35,
    "kickoffUtc": "2026-06-21T00:00:00Z",
    "home": "Ecuador",
    "away": "Curaçao"
  },
  {
    "id": 36,
    "kickoffUtc": "2026-06-21T04:00:00Z",
    "home": "Tunisia",
    "away": "Japan"
  },
  {
    "id": 37,
    "kickoffUtc": "2026-06-21T16:00:00Z",
    "home": "Spain",
    "away": "Saudi Arabia"
  },
  {
    "id": 38,
    "kickoffUtc": "2026-06-21T19:00:00Z",
    "home": "Belgium",
    "away": "IR Iran"
  },
  {
    "id": 39,
    "kickoffUtc": "2026-06-21T22:00:00Z",
    "home": "Uruguay",
    "away": "Cabo Verde"
  },
  {
    "id": 40,
    "kickoffUtc": "2026-06-22T01:00:00Z",
    "home": "New Zealand",
    "away": "Egypt"
  },
  {
    "id": 41,
    "kickoffUtc": "2026-06-22T17:00:00Z",
    "home": "Argentina",
    "away": "Austria"
  },
  {
    "id": 42,
    "kickoffUtc": "2026-06-22T21:00:00Z",
    "home": "France",
    "away": "Iraq"
  },
  {
    "id": 43,
    "kickoffUtc": "2026-06-23T00:00:00Z",
    "home": "Norway",
    "away": "Senegal"
  },
  {
    "id": 44,
    "kickoffUtc": "2026-06-23T03:00:00Z",
    "home": "Jordan",
    "away": "Algeria"
  },
  {
    "id": 45,
    "kickoffUtc": "2026-06-23T17:00:00Z",
    "home": "Portugal",
    "away": "Uzbekistan"
  },
  {
    "id": 46,
    "kickoffUtc": "2026-06-23T20:00:00Z",
    "home": "England",
    "away": "Ghana"
  },
  {
    "id": 47,
    "kickoffUtc": "2026-06-23T23:00:00Z",
    "home": "Panama",
    "away": "Croatia"
  },
  {
    "id": 48,
    "kickoffUtc": "2026-06-24T02:00:00Z",
    "home": "Colombia",
    "away": "Congo DR"
  },
  {
    "id": 49,
    "kickoffUtc": "2026-06-24T19:00:00Z",
    "home": "Switzerland",
    "away": "Canada"
  },
  {
    "id": 50,
    "kickoffUtc": "2026-06-24T19:00:00Z",
    "home": "Bosnia and Herzegovina",
    "away": "Qatar"
  },
  {
    "id": 51,
    "kickoffUtc": "2026-06-24T22:00:00Z",
    "home": "Morocco",
    "away": "Haiti"
  },
  {
    "id": 52,
    "kickoffUtc": "2026-06-24T22:00:00Z",
    "home": "Scotland",
    "away": "Brazil"
  },
  {
    "id": 53,
    "kickoffUtc": "2026-06-25T01:00:00Z",
    "home": "South Africa",
    "away": "South Korea"
  },
  {
    "id": 54,
    "kickoffUtc": "2026-06-25T01:00:00Z",
    "home": "Czechia",
    "away": "Mexico"
  },
  {
    "id": 55,
    "kickoffUtc": "2026-06-25T20:00:00Z",
    "home": "Curaçao",
    "away": "Côte d'Ivoire"
  },
  {
    "id": 56,
    "kickoffUtc": "2026-06-25T20:00:00Z",
    "home": "Ecuador",
    "away": "Germany"
  },
  {
    "id": 57,
    "kickoffUtc": "2026-06-25T23:00:00Z",
    "home": "Japan",
    "away": "Sweden"
  },
  {
    "id": 58,
    "kickoffUtc": "2026-06-25T23:00:00Z",
    "home": "Tunisia",
    "away": "Netherlands"
  },
  {
    "id": 59,
    "kickoffUtc": "2026-06-26T02:00:00Z",
    "home": "Paraguay",
    "away": "Australia"
  },
  {
    "id": 60,
    "kickoffUtc": "2026-06-26T02:00:00Z",
    "home": "Türkiye",
    "away": "United States"
  },
  {
    "id": 61,
    "kickoffUtc": "2026-06-26T19:00:00Z",
    "home": "Norway",
    "away": "France"
  },
  {
    "id": 62,
    "kickoffUtc": "2026-06-26T19:00:00Z",
    "home": "Senegal",
    "away": "Iraq"
  },
  {
    "id": 63,
    "kickoffUtc": "2026-06-27T00:00:00Z",
    "home": "Cabo Verde",
    "away": "Saudi Arabia"
  },
  {
    "id": 64,
    "kickoffUtc": "2026-06-27T00:00:00Z",
    "home": "Uruguay",
    "away": "Spain"
  },
  {
    "id": 65,
    "kickoffUtc": "2026-06-27T03:00:00Z",
    "home": "Egypt",
    "away": "IR Iran"
  },
  {
    "id": 66,
    "kickoffUtc": "2026-06-27T03:00:00Z",
    "home": "New Zealand",
    "away": "Belgium"
  },
  {
    "id": 67,
    "kickoffUtc": "2026-06-27T21:00:00Z",
    "home": "Croatia",
    "away": "Ghana"
  },
  {
    "id": 68,
    "kickoffUtc": "2026-06-27T21:00:00Z",
    "home": "Panama",
    "away": "England"
  },
  {
    "id": 69,
    "kickoffUtc": "2026-06-27T23:30:00Z",
    "home": "Colombia",
    "away": "Portugal"
  },
  {
    "id": 70,
    "kickoffUtc": "2026-06-27T23:30:00Z",
    "home": "Congo DR",
    "away": "Uzbekistan"
  },
  {
    "id": 71,
    "kickoffUtc": "2026-06-28T02:00:00Z",
    "home": "Algeria",
    "away": "Austria"
  },
  {
    "id": 72,
    "kickoffUtc": "2026-06-28T02:00:00Z",
    "home": "Jordan",
    "away": "Argentina"
  },
  {
    "id": 73,
    "kickoffUtc": "2026-06-28T19:00:00Z",
    "home": "2A",
    "away": "2B"
  },
  {
    "id": 74,
    "kickoffUtc": "2026-06-29T17:00:00Z",
    "home": "1C",
    "away": "2F"
  },
  {
    "id": 75,
    "kickoffUtc": "2026-06-29T20:30:00Z",
    "home": "1E",
    "away": "3ABCDF"
  },
  {
    "id": 76,
    "kickoffUtc": "2026-06-30T01:00:00Z",
    "home": "1F",
    "away": "2C"
  },
  {
    "id": 77,
    "kickoffUtc": "2026-06-30T17:00:00Z",
    "home": "2E",
    "away": "2I"
  },
  {
    "id": 78,
    "kickoffUtc": "2026-06-30T21:00:00Z",
    "home": "1I",
    "away": "3CDFGH"
  },
  {
    "id": 79,
    "kickoffUtc": "2026-07-01T01:00:00Z",
    "home": "1A",
    "away": "3CEFHI"
  },
  {
    "id": 80,
    "kickoffUtc": "2026-07-01T16:00:00Z",
    "home": "1L",
    "away": "3EHIJK"
  },
  {
    "id": 81,
    "kickoffUtc": "2026-07-01T20:00:00Z",
    "home": "1G",
    "away": "3AEHIJ"
  },
  {
    "id": 82,
    "kickoffUtc": "2026-07-02T00:00:00Z",
    "home": "1D",
    "away": "3BEFIJ"
  },
  {
    "id": 83,
    "kickoffUtc": "2026-07-02T19:00:00Z",
    "home": "1H",
    "away": "2J"
  },
  {
    "id": 84,
    "kickoffUtc": "2026-07-02T23:00:00Z",
    "home": "2K",
    "away": "2L"
  },
  {
    "id": 85,
    "kickoffUtc": "2026-07-03T03:00:00Z",
    "home": "1B",
    "away": "3EFGIJ"
  },
  {
    "id": 86,
    "kickoffUtc": "2026-07-03T18:00:00Z",
    "home": "2D",
    "away": "2G"
  },
  {
    "id": 87,
    "kickoffUtc": "2026-07-03T22:00:00Z",
    "home": "1J",
    "away": "2H"
  },
  {
    "id": 88,
    "kickoffUtc": "2026-07-04T01:30:00Z",
    "home": "1K",
    "away": "3DEIJL"
  },
  {
    "id": 89,
    "kickoffUtc": "2026-07-04T17:00:00Z",
    "home": "R32 M1",
    "away": "R32 M4"
  },
  {
    "id": 90,
    "kickoffUtc": "2026-07-04T21:00:00Z",
    "home": "R32 M3",
    "away": "R32 M6"
  },
  {
    "id": 91,
    "kickoffUtc": "2026-07-05T20:00:00Z",
    "home": "R32 M2",
    "away": "R32 M5"
  },
  {
    "id": 92,
    "kickoffUtc": "2026-07-06T00:00:00Z",
    "home": "R32 M7",
    "away": "R32 M8"
  },
  {
    "id": 93,
    "kickoffUtc": "2026-07-06T19:00:00Z",
    "home": "R32 M12",
    "away": "R32 M11"
  },
  {
    "id": 94,
    "kickoffUtc": "2026-07-07T00:00:00Z",
    "home": "R32 M10",
    "away": "R32 M9"
  },
  {
    "id": 95,
    "kickoffUtc": "2026-07-07T16:00:00Z",
    "home": "R32 M15",
    "away": "R32 M14"
  },
  {
    "id": 96,
    "kickoffUtc": "2026-07-07T20:00:00Z",
    "home": "R32 M13",
    "away": "R32 M16"
  },
  {
    "id": 97,
    "kickoffUtc": "2026-07-09T20:00:00Z",
    "home": "R16 M2",
    "away": "R16 M1"
  },
  {
    "id": 98,
    "kickoffUtc": "2026-07-10T19:00:00Z",
    "home": "R16 M5",
    "away": "R16 M6"
  },
  {
    "id": 99,
    "kickoffUtc": "2026-07-11T21:00:00Z",
    "home": "R16 M3",
    "away": "R16 M4"
  },
  {
    "id": 100,
    "kickoffUtc": "2026-07-12T01:00:00Z",
    "home": "R16 M7",
    "away": "R16 M8"
  },
  {
    "id": 101,
    "kickoffUtc": "2026-07-14T19:00:00Z",
    "home": "QF1",
    "away": "QF2"
  },
  {
    "id": 102,
    "kickoffUtc": "2026-07-15T19:00:00Z",
    "home": "QF3",
    "away": "QF4"
  },
  {
    "id": 103,
    "kickoffUtc": "2026-07-18T21:00:00Z",
    "home": "Third-place Play-off",
    "away": "TBD"
  },
  {
    "id": 104,
    "kickoffUtc": "2026-07-19T19:00:00Z",
    "home": "World Cup Final",
    "away": "TBD"
  }
];

const FLAGS = {
  "Mexico": "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Czechia": "🇨🇿",
  "Canada": "🇨🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  "United States": "🇺🇸",
  "Qatar": "🇶🇦",
  "Switzerland": "🇨🇭",
  "Paraguay": "🇵🇾",
  "Brazil": "🇧🇷",
  "Morocco": "🇲🇦",
  "Haiti": "🇭🇹",
  "Scotland": "🏴",
  "Australia": "🇦🇺",
  "Türkiye": "🇹🇷",
  "Germany": "🇩🇪",
  "Curaçao": "🇨🇼",
  "Netherlands": "🇳🇱",
  "Japan": "🇯🇵",
  "Côte d'Ivoire": "🇨🇮",
  "Ecuador": "🇪🇨",
  "Sweden": "🇸🇪",
  "Tunisia": "🇹🇳",
  "Spain": "🇪🇸",
  "Cabo Verde": "🇨🇻",
  "Belgium": "🇧🇪",
  "Egypt": "🇪🇬",
  "Saudi Arabia": "🇸🇦",
  "Uruguay": "🇺🇾",
  "IR Iran": "🇮🇷",
  "New Zealand": "🇳🇿",
  "France": "🇫🇷",
  "Senegal": "🇸🇳",
  "Iraq": "🇮🇶",
  "Norway": "🇳🇴",
  "Argentina": "🇦🇷",
  "Algeria": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordan": "🇯🇴",
  "Portugal": "🇵🇹",
  "Congo DR": "🇨🇩",
  "England": "🏴",
  "Ghana": "🇬🇭",
  "Panama": "🇵🇦",
  "Uzbekistan": "🇺🇿",
  "Colombia": "🇨🇴",
  "Croatia": "🇭🇷",
  "TBD": "⚽"
};

const scheduleEl = document.querySelector("#schedule");
const emptyStateEl = document.querySelector("#emptyState");
const searchEl = document.querySelector("#teamSearch");
const timezoneLabelEl = document.querySelector("#timezoneLabel");
const showAllButton = document.querySelector("#showAllButton");

let showAll = false;

const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
timezoneLabelEl.textContent = userTimeZone;

function dateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: userTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function dateHeading(date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: userTimeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function timeLabel(date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: userTimeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function relativeDayLabel(date) {
  const todayKey = dateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dateKey(tomorrow);
  const matchKey = dateKey(date);

  if (matchKey === todayKey) return "Today";
  if (matchKey === tomorrowKey) return "Tomorrow";

  return new Intl.DateTimeFormat(undefined, {
    timeZone: userTimeZone,
    weekday: "short"
  }).format(date);
}

function isPast(match) {
  const kickoff = new Date(match.kickoffUtc);
  const threeHoursAfterKickoff = kickoff.getTime() + 3 * 60 * 60 * 1000;
  return threeHoursAfterKickoff < Date.now();
}

function normalize(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function visibleMatches() {
  const query = normalize(searchEl.value.trim());

  return MATCHES
    .map((match) => ({ ...match, kickoff: new Date(match.kickoffUtc) }))
    .filter((match) => showAll || !isPast(match))
    .filter((match) => {
      if (!query) return true;
      return normalize(`${match.home} ${match.away}`).includes(query);
    })
    .sort((a, b) => a.kickoff - b.kickoff);
}

function teamMarkup(team, side) {
  const flag = FLAGS[team] || "";
  return `
    <div class="team ${side}">
      ${side === "away" ? `<span>${team}</span><span class="flag" aria-hidden="true">${flag}</span>` : `<span class="flag" aria-hidden="true">${flag}</span><span>${team}</span>`}
    </div>
  `;
}

function render() {
  const matches = visibleMatches();
  const grouped = new Map();

  for (const match of matches) {
    const key = dateKey(match.kickoff);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(match);
  }

  emptyStateEl.hidden = matches.length > 0;
  showAllButton.textContent = showAll ? "Show upcoming" : "Show all";

  scheduleEl.innerHTML = Array.from(grouped.values())
    .map((dayMatches) => {
      const firstKickoff = dayMatches[0].kickoff;
      return `
        <article class="date-card">
          <div class="date-heading">
            <div>
              <p class="relative">${relativeDayLabel(firstKickoff)}</p>
              <h2>${dateHeading(firstKickoff)}</h2>
            </div>
            <span>${dayMatches.length} game${dayMatches.length === 1 ? "" : "s"}</span>
          </div>
          <div class="match-list">
            ${dayMatches.map((match) => `
              <div class="match-row">
                ${teamMarkup(match.home, "home")}
                <time datetime="${match.kickoffUtc}">${timeLabel(match.kickoff)}</time>
                ${teamMarkup(match.away, "away")}
              </div>
            `).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

searchEl.addEventListener("input", render);
showAllButton.addEventListener("click", () => {
  showAll = !showAll;
  render();
});

render();
