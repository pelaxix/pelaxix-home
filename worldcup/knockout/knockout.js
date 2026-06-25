(() => {
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

const FINAL_STATUSES = new Set(["ft", "aet", "pen"]);
const bracketEl = document.querySelector("#knockoutBracket");
const thirdPlaceEl = document.querySelector("#thirdPlace");
const knockoutEmptyStateEl = document.querySelector("#knockoutEmptyState");

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function resultFromRow(fields, row) {
  return Array.isArray(row) ? Object.fromEntries(fields.map((field, index) => [field, row[index]])) : { ...row };
}

function mergeResults(...sources) {
  const byId = new Map();
  for (const source of sources.filter(Boolean)) {
    for (const row of source.matches || []) {
      const result = resultFromRow(source.fields || [], row);
      const id = Number(result.id);
      if (!Number.isFinite(id)) continue;
      byId.set(id, { ...(byId.get(id) || {}), ...result, id, status: String(result.status || "scheduled").toLowerCase() });
    }
  }
  return byId;
}

function groupForTeam(team) {
  return Object.entries(GROUPS).find(([, teams]) => teams.includes(team))?.[0] || null;
}

function buildStandings(results) {
  const standings = Object.fromEntries(Object.entries(GROUPS).map(([group, teams]) => [group, new Map(teams.map((team) => [team, { team, points: 0, gf: 0, ga: 0, gd: 0 }]))]));
  for (const result of results.values()) {
    if (!FINAL_STATUSES.has(result.status) || result.id > 72) continue;
    const homeGroup = groupForTeam(result.home);
    if (!homeGroup || homeGroup !== groupForTeam(result.away)) continue;
    const home = standings[homeGroup].get(result.home);
    const away = standings[homeGroup].get(result.away);
    const hs = Number(result.homeScore);
    const as = Number(result.awayScore);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    home.gf += hs; home.ga += as; away.gf += as; away.ga += hs;
    if (hs > as) home.points += 3;
    else if (as > hs) away.points += 3;
    else { home.points += 1; away.points += 1; }
  }
  for (const table of Object.values(standings)) for (const row of table.values()) row.gd = row.gf - row.ga;
  return Object.fromEntries(Object.entries(standings).map(([group, table]) => [group, Array.from(table.values()).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || normalize(a.team).localeCompare(normalize(b.team)))]));
}

function winnerForMatch(match, results) {
  const result = results.get(match.id);
  if (!result || !FINAL_STATUSES.has(result.status)) return null;
  if (result.winner) return result.winner;
  const hs = Number(result.homeScore);
  const as = Number(result.awayScore);
  if (!Number.isFinite(hs) || !Number.isFinite(as) || hs === as) return null;
  return hs > as ? match.home : match.away;
}

function rankThirds(standings) {
  return Object.entries(standings).map(([group, rows]) => ({ group, ...rows[2] })).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || normalize(a.team).localeCompare(normalize(b.team)));
}

function resolveParticipant(token, context) {
  if (!token) return { label: "TBD", resolved: false };
  const direct = token.match(/^([12])([A-L])$/);
  if (direct) {
    const row = context.standings[direct[2]]?.[Number(direct[1]) - 1];
    return row ? { label: row.team, resolved: true, seed: token } : { label: token, resolved: false };
  }
  const bestThird = token.match(/^3([A-L]+)$/);
  if (bestThird) {
    const eligible = context.thirds.filter((row) => bestThird[1].includes(row.group) && !context.usedThirds.has(row.team));
    const row = eligible[0];
    if (row) { context.usedThirds.add(row.team); return { label: row.team, resolved: true, seed: token }; }
    return { label: token, resolved: false };
  }
  const source = token.match(/^(R32|R16) M(\d+)$/);
  if (source) {
    const id = source[1] === "R32" ? 72 + Number(source[2]) : 88 + Number(source[2]);
    const match = context.matchesById.get(id);
    const winner = match ? winnerForMatch(match, context.results) : null;
    return winner ? { label: winner, resolved: true, seed: token } : { label: token, resolved: false };
  }
  const qf = token.match(/^QF(\d+)$/);
  if (qf) {
    const match = context.matchesById.get(96 + Number(qf[1]));
    const winner = match ? winnerForMatch(match, context.results) : null;
    return winner ? { label: winner, resolved: true, seed: token } : { label: token, resolved: false };
  }
  return { label: token, resolved: false };
}

function displayDate(utc) {
  const date = new Date(utc);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function teamRow(participant, score, winner) {
  const flag = participant.resolved ? (FLAGS[participant.label] || "") : "";
  const className = participant.resolved ? (winner ? "winner" : "") : "placeholder";
  return `<div class="bracket-team ${className}"><span class="flag">${flag}</span><span class="team-name">${participant.label}</span><span class="score">${score ?? ""}</span></div>`;
}

function matchCard(match, context, finalCard = false) {
  const result = context.results.get(match.id) || {};
  const home = resolveParticipant(match.home, context);
  const away = resolveParticipant(match.away, context);
  const winner = winnerForMatch({ ...match, home: home.label, away: away.label }, context.results);
  const finished = FINAL_STATUSES.has(result.status);
  const cardClass = `${finalCard ? "final-card " : ""}${finished ? "is-finished" : ""}`;
  return `<article class="bracket-card ${cardClass}"><div class="match-meta"><span>M${match.id}</span><span class="match-date">${displayDate(match.kickoffUtc)}</span></div>${teamRow(home, result.homeScore, winner === home.label)}${teamRow(away, result.awayScore, winner === away.label)}</article>`;
}

function stageMatches(ids) {
  return ids.map((id) => MATCHES.find((match) => match.id === id)).filter(Boolean);
}

function renderBracket(results) {
  const standings = buildStandings(results);
  const context = {
    results,
    standings,
    thirds: rankThirds(standings),
    usedThirds: new Set(),
    matchesById: new Map(MATCHES.map((match) => [match.id, match]))
  };
  const rounds = [
    { title: "Round of 32", subtitle: "16 matches", ids: Array.from({ length: 16 }, (_, index) => 73 + index) },
    { title: "Round of 16", subtitle: "8 matches", ids: Array.from({ length: 8 }, (_, index) => 89 + index) },
    { title: "Quarterfinals", subtitle: "4 matches", ids: [97, 98, 99, 100] },
    { title: "Semifinals", subtitle: "2 matches", ids: [101, 102] },
    { title: "Final", subtitle: "1 match", ids: [104], final: true }
  ];
  bracketEl.innerHTML = rounds.map((round) => `<section class="bracket-round"><h2 class="round-title">${round.title}<span class="round-subtitle">${round.subtitle}</span></h2><div class="round-matches">${stageMatches(round.ids).map((match) => matchCard(match, context, round.final)).join("")}</div></section>`).join("");
  const third = MATCHES.find((match) => match.id === 103);
  thirdPlaceEl.innerHTML = third ? `<h2>Third-place play-off</h2>${matchCard(third, context)}` : "";
}

Promise.all([
  fetch(`../results.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Results failed: ${response.status}`))),
  fetch(`../results-overrides.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : null).catch(() => null)
]).then(([resultsData, overridesData]) => {
  knockoutEmptyStateEl.hidden = true;
  renderBracket(mergeResults(resultsData, overridesData));
}).catch((error) => {
  console.warn("Could not load knockout bracket.", error);
  knockoutEmptyStateEl.hidden = false;
});
})();
