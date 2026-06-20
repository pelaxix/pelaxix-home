const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czechia"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Türkiye"],
  E: ["Germany", "Curaçao", "Côte d'Ivoire", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"],
  H: ["Belgium", "Egypt", "IR Iran", "New Zealand"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "Congo DR", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"]
};

const FLAGS = {
  "Algeria": "🇩🇿",
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Austria": "🇦🇹",
  "Belgium": "🇧🇪",
  "Bosnia and Herzegovina": "🇧🇦",
  "Brazil": "🇧🇷",
  "Cabo Verde": "🇨🇻",
  "Canada": "🇨🇦",
  "Colombia": "🇨🇴",
  "Congo DR": "🇨🇩",
  "Croatia": "🇭🇷",
  "Curaçao": "🇨🇼",
  "Czechia": "🇨🇿",
  "Côte d'Ivoire": "🇨🇮",
  "Ecuador": "🇪🇨",
  "Egypt": "🇪🇬",
  "England": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "Ghana": "🇬🇭",
  "Haiti": "🇭🇹",
  "IR Iran": "🇮🇷",
  "Iraq": "🇮🇶",
  "Japan": "🇯🇵",
  "Jordan": "🇯🇴",
  "Mexico": "🇲🇽",
  "Morocco": "🇲🇦",
  "Netherlands": "🇳🇱",
  "New Zealand": "🇳🇿",
  "Norway": "🇳🇴",
  "Panama": "🇵🇦",
  "Paraguay": "🇵🇾",
  "Portugal": "🇵🇹",
  "Qatar": "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  "Scotland": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  "Senegal": "🇸🇳",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Switzerland": "🇨🇭",
  "Tunisia": "🇹🇳",
  "Türkiye": "🇹🇷",
  "United States": "🇺🇸",
  "Uruguay": "🇺🇾",
  "Uzbekistan": "🇺🇿"
};

const FINAL_STATUSES = new Set(["ft", "aet", "pen"]);
const WORLD_CUP_TEAM_FILTER_KEY = "worldcupSelectedTeam";
const groupsGrid = document.querySelector("#groupsGrid");
const emptyState = document.querySelector("#groupsEmptyState");
const teamSelectEl = document.querySelector("#teamSearch");
const resetGroupsButton = document.querySelector("#resetGroupsButton");
let currentResults = [];

function isPageReload() {
  const navigationEntry = performance.getEntriesByType?.("navigation")?.[0];
  return navigationEntry?.type === "reload" || performance.navigation?.type === 1;
}

function clearFilterOnReload() {
  if (!isPageReload()) return;
  try {
    sessionStorage.removeItem(WORLD_CUP_TEAM_FILTER_KEY);
  } catch {
  }
}

function savedTeamFilter() {
  try {
    return sessionStorage.getItem(WORLD_CUP_TEAM_FILTER_KEY) || "";
  } catch {
    return "";
  }
}

function saveTeamFilter(value) {
  try {
    if (value) {
      sessionStorage.setItem(WORLD_CUP_TEAM_FILTER_KEY, value);
    } else {
      sessionStorage.removeItem(WORLD_CUP_TEAM_FILTER_KEY);
    }
  } catch {
  }
}

function applySavedTeamFilter() {
  if (!teamSelectEl) return;
  const savedValue = savedTeamFilter();
  if (savedValue && Array.from(teamSelectEl.options).some((option) => option.value === savedValue)) {
    teamSelectEl.value = savedValue;
  }
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeResult(result) {
  return {
    ...result,
    status: String(result.status || "scheduled").trim().toLowerCase(),
    homeScore: normalizeScore(result.homeScore),
    awayScore: normalizeScore(result.awayScore),
    winner: typeof result.winner === "string" ? result.winner.trim() : result.winner
  };
}

function resultFromRow(fields, row) {
  const result = Array.isArray(row)
    ? Object.fromEntries(fields.map((field, index) => [field, row[index]]))
    : { ...row };
  return normalizeResult(result);
}

function mergeResultData(...sources) {
  const resultsById = new Map();

  for (const data of sources.filter(Boolean)) {
    const fields = data.fields || [];
    for (const row of data.matches || []) {
      const result = resultFromRow(fields, row);
      const id = Number(result.id);
      if (!Number.isFinite(id)) continue;

      const existing = resultsById.get(id) || {};
      resultsById.set(id, normalizeResult({ ...existing, ...result, id }));
    }
  }

  return Array.from(resultsById.values());
}

function blankStanding(team) {
  return { team, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 };
}

function groupForTeam(team) {
  return Object.entries(GROUPS).find(([, teams]) => teams.includes(team))?.[0] || null;
}

function selectedGroups() {
  const selectedTeam = teamSelectEl?.value || "";
  const selectedGroup = groupForTeam(selectedTeam);
  return selectedGroup ? [selectedGroup] : Object.keys(GROUPS);
}

function keepResetButtonLabel() {
  if (!resetGroupsButton) return;
  const hasSelection = Boolean(teamSelectEl?.value);
  resetGroupsButton.textContent = "Reset selection";
  resetGroupsButton.disabled = !hasSelection;
  resetGroupsButton.hidden = !hasSelection;
}

function applyMatch(standings, match) {
  if (!FINAL_STATUSES.has(match.status)) return;
  if (match.id > 72) return;
  if (match.homeScore === null || match.awayScore === null) return;

  const group = groupForTeam(match.home);
  if (!group || group !== groupForTeam(match.away)) return;

  const home = standings[group].get(match.home);
  const away = standings[group].get(match.away);
  if (!home || !away) return;

  home.played += 1;
  away.played += 1;
  home.gf += match.homeScore;
  home.ga += match.awayScore;
  away.gf += match.awayScore;
  away.ga += match.homeScore;

  if (match.homeScore > match.awayScore) {
    home.wins += 1;
    home.points += 3;
    away.losses += 1;
  } else if (match.awayScore > match.homeScore) {
    away.wins += 1;
    away.points += 3;
    home.losses += 1;
  } else {
    home.draws += 1;
    away.draws += 1;
    home.points += 1;
    away.points += 1;
  }

  home.gd = home.gf - home.ga;
  away.gd = away.gf - away.ga;
}

function sortStandings(rows) {
  return rows.sort((a, b) =>
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    normalize(a.team).localeCompare(normalize(b.team))
  );
}

function gdLabel(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function gdClass(value) {
  if (value > 0) return "gd-positive";
  if (value < 0) return "gd-negative";
  return "";
}

function renderStandings(results) {
  const standings = Object.fromEntries(
    Object.entries(GROUPS).map(([group, teams]) => [group, new Map(teams.map((team) => [team, blankStanding(team)]))])
  );

  results.forEach((result) => applyMatch(standings, result));

  const visibleGroups = selectedGroups();
  groupsGrid.classList.toggle("filtered", visibleGroups.length === 1);
  groupsGrid.innerHTML = visibleGroups.map((group) => {
    const table = standings[group];
    const rows = sortStandings(Array.from(table.values()));
    const played = rows.reduce((total, row) => total + row.played, 0) / 2;

    return `
      <article class="group-card">
        <div class="group-heading">
          <h2>Group ${group}</h2>
          <span>${played} / 6 games</span>
        </div>
        <table class="standings-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><span class="standings-team"><span class="flag" aria-hidden="true">${FLAGS[row.team] || ""}</span><span>${row.team}</span></span></td>
                <td>${row.played}</td>
                <td>${row.wins}</td>
                <td>${row.draws}</td>
                <td>${row.losses}</td>
                <td>${row.gf}</td>
                <td>${row.ga}</td>
                <td class="${gdClass(row.gd)}">${gdLabel(row.gd)}</td>
                <td>${row.points}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </article>
    `;
  }).join("");
}

clearFilterOnReload();
applySavedTeamFilter();
keepResetButtonLabel();

teamSelectEl?.addEventListener("change", () => {
  saveTeamFilter(teamSelectEl.value);
  renderStandings(currentResults);
  keepResetButtonLabel();
});

resetGroupsButton?.addEventListener("click", (event) => {
  event.preventDefault();
  if (teamSelectEl) teamSelectEl.value = "";
  saveTeamFilter("");
  renderStandings(currentResults);
  keepResetButtonLabel();
});

Promise.all([
  fetch(`../results.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Results failed: ${response.status}`))),
  fetch(`../results-overrides.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : null).catch(() => null)
])
  .then(([resultsData, overridesData]) => {
    currentResults = mergeResultData(resultsData, overridesData);
    emptyState.hidden = true;
    renderStandings(currentResults);
  })
  .catch((error) => {
    console.warn("Could not load World Cup group standings.", error);
    emptyState.hidden = false;
  });
