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

function resultFromRow(fields, row) {
  return Object.fromEntries(fields.map((field, index) => [field, row[index]]));
}

function getResult(match) {
  return RESULTS_BY_ID.get(Number(match.id));
}

function hasVisibleResult(result) {
  if (!result) return false;
  if (!result.status || result.status === "scheduled") return false;
  return true;
}

function teamMarkupWithResult(team, side, result, flagSide) {
  const flagOverride = flagSide === "home" ? result?.homeFlagOverride : result?.awayFlagOverride;
  const flag = flagOverride || FLAGS[team] || "";
  return `
    <div class="team ${side}">
      ${side === "away" ? `<span>${team}</span><span class="flag" aria-hidden="true">${flag}</span>` : `<span class="flag" aria-hidden="true">${flag}</span><span>${team}</span>`}
    </div>
  `;
}

function resultLabel(result) {
  const status = RESULT_STATUS_LABELS[result.status] || String(result.status || "").toUpperCase();
  const homeScore = result.homeScore ?? "–";
  const awayScore = result.awayScore ?? "–";
  const penalties = result.homePenaltyScore !== null && result.awayPenaltyScore !== null
    ? ` (${result.homePenaltyScore}–${result.awayPenaltyScore} pens)`
    : "";
  return `${status} ${homeScore}–${awayScore}${penalties}`;
}

function centerMarkup(match) {
  const result = getResult(match);
  if (!hasVisibleResult(result)) {
    return `<time datetime="${match.kickoffUtc}">${timeLabel(match.kickoff)}</time>`;
  }

  const title = result.note ? ` title="${result.note.replaceAll('"', '&quot;')}"` : "";
  return `<span class="result-pill"${title}>${resultLabel(result)}</span>`;
}

function renderResultAwareSchedule() {
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

fetch("results.json?v=1")
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
.match-row.has-result .team span:last-child,
.match-row.has-result .team span:first-child:not(.flag) { font-weight: 900; }
@media (max-width: 680px) { .result-pill { min-width: 70px; padding: 8px; font-size: clamp(0.72rem, 3.1vw, 0.84rem); } }
`;
document.head.appendChild(resultsStyles);
