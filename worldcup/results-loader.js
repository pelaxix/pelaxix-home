const RESULT_STATUS_LABELS = {
  live: "LIVE",
  ht: "HT",
  ft: "FT",
  aet: "AET",
  pen: "PEN",
  postponed: "PST",
  cancelled: "CANC"
};

const RESULTS_BY_ID = new Map();
const ENGLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
const SCOTLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}";

FLAGS["England"] = ENGLAND_FLAG;
FLAGS["Scotland"] = SCOTLAND_FLAG;

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
}

function normalizeResult(result) {
  if (!result) return result;

  if (typeof result.status === "string") {
    result.status = result.status.trim().toLowerCase();
  }

  if (typeof result.winner === "string") {
    result.winner = result.winner.trim() || null;
  }

  result.homeScore = normalizeScore(result.homeScore);
  result.awayScore = normalizeScore(result.awayScore);
  result.homePenaltyScore = normalizeScore(result.homePenaltyScore);
  result.awayPenaltyScore = normalizeScore(result.awayPenaltyScore);

  return result;
}

function resultFromRow(fields, row) {
  const result = Array.isArray(row)
    ? Object.fromEntries(fields.map((field, index) => [field, row[index]]))
    : { ...row };

  return normalizeResult(result);
}

function getResult(match) {
  return RESULTS_BY_ID.get(Number(match.id));
}

function hasVisibleResult(result) {
  if (!result) return false;
  if (!result.status || result.status === "scheduled") return false;
  return true;
}

function visibleMatchesWithResults() {
  const query = normalize(searchEl.value.trim());

  return MATCHES
    .map((match) => ({ ...match, kickoff: new Date(match.kickoffUtc) }))
    .filter((match) => showAll || !isPast(match) || hasVisibleResult(getResult(match)))
    .filter((match) => {
      if (!query) return true;
      return normalize(`${match.home} ${match.away}`).includes(query);
    })
    .sort((a, b) => a.kickoff - b.kickoff);
}

function isWinner(team, result) {
  if (!team || !result?.winner) return false;
  return normalize(team) === normalize(result.winner);
}

function isDraw(result) {
  if (!hasVisibleResult(result)) return false;
  if (result.homeScore === null || result.awayScore === null) return false;
  return result.homeScore === result.awayScore && !result.winner;
}

function teamMarkupWithResult(team, side, result, flagSide) {
  const flagOverride = flagSide === "home" ? result?.homeFlagOverride : result?.awayFlagOverride;
  const flag = flagOverride || FLAGS[team] || "";
  const winner = isWinner(team, result);
  const draw = isDraw(result);
  const loser = hasVisibleResult(result) && !winner && !draw;
  const sparkle = winner ? `<span class="winner-sparkle" aria-label="Winner">✨</span>` : "";
  const teamClass = `team ${side}${winner ? " winner" : ""}${draw ? " tied" : ""}${loser ? " loser" : ""}`;

  return `
    <div class="${teamClass}">
      ${side === "away"
        ? `<span class="team-name">${team}</span>${sparkle}<span class="flag" aria-hidden="true">${flag}</span>`
        : `<span class="flag" aria-hidden="true">${flag}</span>${sparkle}<span class="team-name">${team}</span>`}
    </div>
  `;
}

function resultLabel(result) {
  const homeScore = result.homeScore ?? "–";
  const awayScore = result.awayScore ?? "–";
  const penalties = result.homePenaltyScore !== null && result.awayPenaltyScore !== null
    ? ` (${result.homePenaltyScore}–${result.awayPenaltyScore})`
    : "";

  if (result.status === "postponed" || result.status === "cancelled") {
    return RESULT_STATUS_LABELS[result.status];
  }

  return `${homeScore}–${awayScore}${penalties}`;
}

function centerMarkup(match) {
  const result = getResult(match);
  if (!hasVisibleResult(result)) {
    return `<time datetime="${match.kickoffUtc}">${timeLabel(match.kickoff)}</time>`;
  }

  const statusLabel = RESULT_STATUS_LABELS[result.status] || String(result.status || "").toUpperCase();
  const titleParts = [statusLabel, result.note].filter(Boolean);
  const title = titleParts.length ? ` title="${titleParts.join(' · ').replaceAll('"', '&quot;')}"` : "";
  return `<span class="result-pill"${title}>${resultLabel(result)}</span>`;
}

function renderResultAwareSchedule() {
  const matches = visibleMatchesWithResults();
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
            ${dayMatches.map((match) => {
              const result = getResult(match);
              return `
                <div class="match-row ${hasVisibleResult(result) ? "has-result" : ""}">
                  ${teamMarkupWithResult(match.home, "home", result, "home")}
                  ${centerMarkup(match)}
                  ${teamMarkupWithResult(match.away, "away", result, "away")}
                </div>
              `;
            }).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

render = renderResultAwareSchedule;

fetch(`results.json?v=${Date.now()}`)
  .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Results failed: ${response.status}`)))
  .then((data) => {
    const fields = data.fields || [];
    for (const row of data.matches || []) {
      const result = resultFromRow(fields, row);
      RESULTS_BY_ID.set(Number(result.id), result);
    }
    render();
  })
  .catch((error) => {
    console.warn("World Cup results unavailable; showing schedule only.", error);
  });

const resultsStyles = document.createElement("style");
resultsStyles.textContent = `
.result-pill { min-width: 92px; border-radius: 999px; padding: 10px 12px; background: #e0f2fe; color: #075985; font-weight: 900; text-align: center; white-space: nowrap; }
.match-row.has-result .team { transition: color 0.2s ease, opacity 0.2s ease, text-shadow 0.2s ease; }
.team.winner { color: #86efac; font-weight: 1000; text-shadow: 0 0 10px rgba(134, 239, 172, 0.22); }
.team.winner .team-name { padding: 1px 4px; border-radius: 8px; background: rgba(134, 239, 172, 0.10); box-shadow: inset 0 0 0 1px rgba(134, 239, 172, 0.22); text-decoration: none; }
.team.loser { color: rgba(255, 255, 255, 0.42); }
.team.tied { color: #93c5fd; font-weight: 900; }
.team.tied .team-name { padding: 1px 4px; border-radius: 8px; background: rgba(147, 197, 253, 0.10); box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.18); }
.winner-sparkle { display: inline-block; margin: 0 4px; animation: winnerSparkle 1.8s ease-in-out infinite; filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.55)); }
@keyframes winnerSparkle { 0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.78; } 45% { transform: scale(1.15) rotate(10deg); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .winner-sparkle { animation: none; } }
@media (max-width: 680px) { .result-pill { min-width: 70px; padding: 8px; font-size: clamp(0.72rem, 3.1vw, 0.84rem); } .winner-sparkle { margin: 0 2px; } }
`;
document.head.appendChild(resultsStyles);
