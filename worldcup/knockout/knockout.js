(() => {
const FINAL_STATUSES = new Set(["ft", "aet", "pen"]);
const bracketEl = document.querySelector("#knockoutBracket");
const thirdPlaceEl = document.querySelector("#thirdPlace");
const knockoutEmptyStateEl = document.querySelector("#knockoutEmptyState");

function makeBracketScrollable() {
  if (!bracketEl || bracketEl.parentElement?.classList.contains("bracket-scroll")) return;

  const scroller = document.createElement("div");
  scroller.className = "bracket-scroll";
  bracketEl.before(scroller);
  scroller.appendChild(bracketEl);

  const style = document.createElement("style");
  style.textContent = `
    .bracket-scroll { width: 100%; max-width: 100%; overflow-x: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch; touch-action: pan-x; padding-bottom: 14px; }
    .bracket-scroll .knockout-bracket { width: max-content; overflow: visible; }
  `;
  document.head.appendChild(style);
}

makeBracketScrollable();

function resultFromRow(fields, row) {
  return Array.isArray(row)
    ? Object.fromEntries(fields.map((field, index) => [field, row[index]]))
    : { ...row };
}

function normalizeResult(result) {
  return {
    ...result,
    id: Number(result.id),
    status: String(result.status || "scheduled").trim().toLowerCase(),
    winner: typeof result.winner === "string" ? result.winner.trim() || null : result.winner
  };
}

function mergeResults(...sources) {
  const byId = new Map();

  for (const source of sources.filter(Boolean)) {
    for (const row of source.matches || []) {
      const result = normalizeResult(resultFromRow(source.fields || [], row));
      if (!Number.isFinite(result.id)) continue;
      byId.set(result.id, { ...(byId.get(result.id) || {}), ...result });
    }
  }

  return byId;
}

function applyFixtureParticipants(...sources) {
  const fixturesById = new Map();

  for (const source of sources.filter(Boolean)) {
    for (const row of source.matches || []) {
      const fixture = resultFromRow(source.fields || [], row);
      const id = Number(fixture.id);
      if (!Number.isFinite(id)) continue;
      fixturesById.set(id, { ...(fixturesById.get(id) || {}), ...fixture });
    }
  }

  for (const match of MATCHES) {
    const fixture = fixturesById.get(Number(match.id));
    if (!fixture) continue;

    for (const side of ["home", "away"]) {
      const team = typeof fixture[side] === "string" ? fixture[side].trim() : "";
      if (team) match[side] = team;
    }
  }
}

function finalWinner(match, results) {
  const result = results.get(Number(match.id));
  if (!result || !FINAL_STATUSES.has(result.status)) return null;
  if (result.winner) return result.winner;

  const homeScore = Number(result.homeScore);
  const awayScore = Number(result.awayScore);
  if (Number.isFinite(homeScore) && Number.isFinite(awayScore) && homeScore !== awayScore) {
    return homeScore > awayScore ? match.home : match.away;
  }

  const homePenalties = Number(result.homePenaltyScore);
  const awayPenalties = Number(result.awayPenaltyScore);
  if (Number.isFinite(homePenalties) && Number.isFinite(awayPenalties) && homePenalties !== awayPenalties) {
    return homePenalties > awayPenalties ? match.home : match.away;
  }

  return null;
}

function resolveParticipant(token, context) {
  if (!token) return { label: "TBD", resolved: false };

  const source = token.match(/^(R32|R16) M(\d+)$/);
  if (source) {
    const id = source[1] === "R32" ? 72 + Number(source[2]) : 88 + Number(source[2]);
    const sourceMatch = context.matchesById.get(id);
    const winner = sourceMatch ? finalWinner(sourceMatch, context.results) : null;
    return winner ? { label: winner, resolved: true } : { label: token, resolved: false };
  }

  const qf = token.match(/^QF(\d+)$/);
  if (qf) {
    const sourceMatch = context.matchesById.get(96 + Number(qf[1]));
    const winner = sourceMatch ? finalWinner(sourceMatch, context.results) : null;
    return winner ? { label: winner, resolved: true } : { label: token, resolved: false };
  }

  return { label: token, resolved: Boolean(FLAGS[token]) };
}

function displayDate(utc) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(utc));
}

function teamRow(participant, score, winner) {
  const flag = participant.resolved ? (FLAGS[participant.label] || "") : "";
  const className = participant.resolved
    ? (winner ? "winner" : "")
    : "placeholder";

  return `<div class="bracket-team ${className}">
    <span class="flag">${flag}</span>
    <span class="team-name">${participant.label}</span>
    <span class="score">${score ?? ""}</span>
  </div>`;
}

function matchCard(match, context, finalCard = false) {
  const result = context.results.get(match.id) || {};
  const home = resolveParticipant(match.home, context);
  const away = resolveParticipant(match.away, context);
  const winner = finalWinner({ ...match, home: home.label, away: away.label }, context.results);
  const finished = FINAL_STATUSES.has(result.status);
  const classes = `${finalCard ? "final-card " : ""}${finished ? "is-finished" : ""}`;

  return `<article class="bracket-card ${classes}">
    <div class="match-meta"><span>M${match.id}</span><span class="match-date">${displayDate(match.kickoffUtc)}</span></div>
    ${teamRow(home, result.homeScore, winner === home.label)}
    ${teamRow(away, result.awayScore, winner === away.label)}
  </article>`;
}

function stageMatches(ids) {
  return ids.map((id) => MATCHES.find((match) => match.id === id)).filter(Boolean);
}

function renderBracket(results) {
  const context = {
    results,
    matchesById: new Map(MATCHES.map((match) => [match.id, match]))
  };

  const rounds = [
    { title: "Round of 32", subtitle: "16 matches", ids: Array.from({ length: 16 }, (_, index) => 73 + index) },
    { title: "Round of 16", subtitle: "8 matches", ids: Array.from({ length: 8 }, (_, index) => 89 + index) },
    { title: "Quarterfinals", subtitle: "4 matches", ids: [97, 98, 99, 100] },
    { title: "Semifinals", subtitle: "2 matches", ids: [101, 102] },
    { title: "Final", subtitle: "1 match", ids: [104], final: true }
  ];

  bracketEl.innerHTML = rounds.map((round) => `
    <section class="bracket-round">
      <h2 class="round-title">${round.title}<span class="round-subtitle">${round.subtitle}</span></h2>
      <div class="round-matches">${stageMatches(round.ids).map((match) => matchCard(match, context, round.final)).join("")}</div>
    </section>
  `).join("");

  const third = MATCHES.find((match) => match.id === 103);
  thirdPlaceEl.innerHTML = third ? `<h2>Third-place play-off</h2>${matchCard(third, context)}` : "";
}

Promise.all([
  fetch(`../results.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Results failed: ${response.status}`))),
  fetch(`../results-overrides.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : null).catch(() => null)
])
  .then(([resultsData, overridesData]) => {
    applyFixtureParticipants(resultsData, overridesData);
    knockoutEmptyStateEl.hidden = true;
    renderBracket(mergeResults(resultsData, overridesData));
  })
  .catch((error) => {
    console.warn("Could not load knockout bracket.", error);
    knockoutEmptyStateEl.hidden = false;
  });
})();
