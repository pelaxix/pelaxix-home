(() => {
  const FINAL_STATUSES = new Set(["ft", "aet", "pen"]);
  const bracketEl = document.querySelector("#knockoutBracket");
  const thirdPlaceEl = document.querySelector("#thirdPlace");
  const knockoutEmptyStateEl = document.querySelector("#knockoutEmptyState");
  const bracketHintEl = document.querySelector(".bracket-hint");

  const ROUND_LAYOUT = [
    { title: "Round of 32", shortTitle: "R32", subtitle: "16 matches", stage: "r32", ids: [75, 78, 73, 76, 84, 83, 82, 81, 74, 77, 79, 80, 87, 86, 85, 88] },
    { title: "Round of 16", shortTitle: "R16", subtitle: "8 matches", stage: "r16", ids: [90, 89, 93, 94, 91, 92, 95, 96] },
    { title: "Quarterfinals", shortTitle: "QF", subtitle: "4 matches", stage: "qf", ids: [97, 98, 99, 100] },
    { title: "Semifinals", shortTitle: "SF", subtitle: "2 matches", stage: "sf", ids: [101, 102] },
    { title: "Final", shortTitle: "F", subtitle: "1 match", stage: "final", ids: [104], final: true }
  ];

  let scroller = null;
  let pagerEl = null;
  let renderedResults = null;
  let layoutFrame = null;
  let activeGeometry = null;

  function clampPairStart(index) {
    return Math.max(0, Math.min(ROUND_LAYOUT.length - 2, index));
  }

  function roundNodes() {
    return scroller ? [...scroller.querySelectorAll(".bracket-round")] : [];
  }

  function pairStartFromScroll() {
    if (!scroller) return 0;
    const rounds = roundNodes();
    const maxStart = Math.max(0, rounds.length - 2);
    let closest = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    rounds.slice(0, maxStart + 1).forEach((round, index) => {
      const distance = Math.abs(scroller.scrollLeft - round.offsetLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });

    return closest;
  }

  function scrollProgress() {
    if (!scroller) return 0;
    const rounds = roundNodes();
    const maxStart = Math.max(0, rounds.length - 2);
    if (rounds.length < 2) return 0;

    const firstOffset = rounds[0].offsetLeft;
    const columnStep = rounds[1].offsetLeft - firstOffset;
    if (!columnStep) return 0;

    return Math.max(0, Math.min(maxStart, (scroller.scrollLeft - firstOffset) / columnStep));
  }

  function scrollToPair(index, behavior = "smooth") {
    if (!scroller) return;
    const rounds = roundNodes();
    const target = rounds[clampPairStart(index)];
    if (!target) return;
    scroller.scrollTo({ left: target.offsetLeft, behavior });
  }

  function updateRoundPager() {
    if (!pagerEl) return;
    const pairStart = pairStartFromScroll();

    pagerEl.querySelectorAll("[data-round-index]").forEach((button) => {
      const index = Number(button.dataset.roundIndex);
      const inWindow = index === pairStart || index === pairStart + 1;
      button.classList.toggle("is-window", inWindow);
      button.classList.toggle("is-window-start", index === pairStart);
      button.classList.toggle("is-window-end", index === pairStart + 1);
      button.classList.toggle("is-active", index === pairStart);
      button.setAttribute("aria-current", index === pairStart ? "step" : "false");
    });

    const previous = pagerEl.querySelector("[data-pager-prev]");
    const next = pagerEl.querySelector("[data-pager-next]");
    if (previous) previous.disabled = pairStart === 0;
    if (next) next.disabled = pairStart >= ROUND_LAYOUT.length - 2;
  }

  function makeRoundPager() {
    if (!scroller || pagerEl) return;

    pagerEl = document.createElement("section");
    pagerEl.className = "round-pager";
    pagerEl.setAttribute("aria-label", "Knockout round navigation");

    pagerEl.innerHTML = `
      <div class="round-pager-labels">
        ${ROUND_LAYOUT.map((round, index) => `<button type="button" data-round-index="${index}" aria-label="Show ${round.title}">${round.shortTitle}</button>`).join("")}
      </div>
      <div class="round-pager-rail">
        <button type="button" class="round-pager-arrow" data-pager-prev aria-label="Previous round pair">‹</button>
        <div class="round-pager-track">
          ${ROUND_LAYOUT.map((round, index) => `<button type="button" class="round-pager-stop" data-round-index="${index}" aria-label="Show ${round.title}"><span class="round-pager-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="round-pager-name">${round.shortTitle}</span></button>`).join("")}
        </div>
        <button type="button" class="round-pager-arrow" data-pager-next aria-label="Next round pair">›</button>
      </div>
    `;

    scroller.before(pagerEl);

    pagerEl.querySelectorAll("[data-round-index]").forEach((button) => {
      button.addEventListener("click", () => scrollToPair(Number(button.dataset.roundIndex)));
    });

    pagerEl.querySelector("[data-pager-prev]")?.addEventListener("click", () => {
      scrollToPair(pairStartFromScroll() - 1);
    });

    pagerEl.querySelector("[data-pager-next]")?.addEventListener("click", () => {
      scrollToPair(pairStartFromScroll() + 1);
    });
  }

  function makeBracketScrollable() {
    if (!bracketEl || bracketEl.parentElement?.classList.contains("bracket-scroll")) {
      scroller = bracketEl?.parentElement || null;
      makeRoundPager();
      return;
    }

    scroller = document.createElement("div");
    scroller.className = "bracket-scroll";
    scroller.setAttribute("aria-label", "Scrollable World Cup knockout bracket");
    bracketEl.before(scroller);
    scroller.appendChild(bracketEl);

    if (bracketHintEl) {
      bracketHintEl.textContent = "Swipe sideways through round pairs · scroll up and down through the bracket";
    }

    makeRoundPager();

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let axis = null;

    scroller.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startLeft = scroller.scrollLeft;
      axis = null;
    }, { passive: true });

    scroller.addEventListener("touchmove", (event) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const distance = Math.max(Math.abs(deltaX), Math.abs(deltaY));

      if (!axis && distance >= 10) {
        axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? "x" : "y";
      }

      if (axis === "x") {
        event.preventDefault();
        scroller.scrollLeft = startLeft - deltaX;
        updateBracketViewport();
      }
    }, { passive: false });

    scroller.addEventListener("scroll", () => {
      if (layoutFrame) return;
      layoutFrame = requestAnimationFrame(() => {
        layoutFrame = null;
        updateBracketViewport();
      });
    }, { passive: true });

    scroller.addEventListener("touchend", () => { axis = null; }, { passive: true });
    scroller.addEventListener("touchcancel", () => { axis = null; }, { passive: true });
  }

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
    const className = participant.resolved ? (winner ? "winner" : "") : "placeholder";

    return `<div class="bracket-team ${className}">
      <span class="flag">${flag}</span>
      <span class="team-name">${participant.label}</span>
      <span class="score">${score ?? ""}</span>
    </div>`;
  }

  function bracketGeometry() {
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    return {
      pitch: mobile ? 88 : 98,
      cardHeight: mobile ? 62 : 70,
      edgePadding: mobile ? 16 : 20
    };
  }

  function stagePosition(stageIndex, matchIndex, anchorStage, pitch) {
    const delta = stageIndex - anchorStage;

    if (delta >= 0) {
      const multiplier = 2 ** delta;
      return (matchIndex * multiplier + ((multiplier - 1) / 2)) * pitch;
    }

    const matchesPerActiveMatch = 2 ** (-delta);
    const activeMatchIndex = Math.floor(matchIndex / matchesPerActiveMatch);
    const positionWithinGroup = matchIndex % matchesPerActiveMatch;
    const localOffset = ((positionWithinGroup + 0.5) / matchesPerActiveMatch) - 0.5;

    return (activeMatchIndex + localOffset) * pitch;
  }

  function layoutForAnchor(anchorStage, geometry) {
    const positions = new Map();
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;

    ROUND_LAYOUT.forEach((round, stageIndex) => {
      round.ids.forEach((_, matchIndex) => {
        const position = stagePosition(stageIndex, matchIndex, anchorStage, geometry.pitch);
        const key = `${stageIndex}:${matchIndex}`;
        positions.set(key, position);
        minimum = Math.min(minimum, position);
        maximum = Math.max(maximum, position);
      });
    });

    const shift = geometry.edgePadding - minimum;
    const height = (maximum - minimum) + geometry.cardHeight + (geometry.edgePadding * 2);

    return {
      height,
      positions: new Map([...positions.entries()].map(([key, position]) => [key, position + shift]))
    };
  }

  function interpolate(from, to, amount) {
    return from + ((to - from) * amount);
  }

  function applyDynamicSpacing() {
    if (!activeGeometry || !bracketEl) return;

    const progress = scrollProgress();
    const lowerAnchor = Math.floor(progress);
    const upperAnchor = Math.min(ROUND_LAYOUT.length - 2, Math.ceil(progress));
    const blend = progress - lowerAnchor;
    const lowerLayout = layoutForAnchor(lowerAnchor, activeGeometry);
    const upperLayout = layoutForAnchor(upperAnchor, activeGeometry);

    const height = interpolate(lowerLayout.height, upperLayout.height, blend);
    bracketEl.style.setProperty("--bracket-height", `${Math.round(height)}px`);

    bracketEl.querySelectorAll("[data-bracket-key]").forEach((card) => {
      const key = card.dataset.bracketKey;
      const lowerTop = lowerLayout.positions.get(key) ?? 0;
      const upperTop = upperLayout.positions.get(key) ?? lowerTop;
      card.style.top = `${Math.round(interpolate(lowerTop, upperTop, blend))}px`;
    });
  }

  function updateColumnFocus() {
    if (!scroller) return;
    const pairStart = pairStartFromScroll();

    scroller.querySelectorAll(".bracket-round").forEach((round, index) => {
      const visible = index === pairStart || index === pairStart + 1;
      round.classList.toggle("is-active", index === pairStart);
      round.classList.toggle("is-paired", visible);
      round.style.opacity = visible ? "1" : "0.58";
      round.style.transform = visible ? "scale(1)" : "scale(.975)";
    });

    updateRoundPager();
  }

  function updateBracketViewport() {
    applyDynamicSpacing();
    updateColumnFocus();
  }

  function matchCard(match, context, round, stageIndex, matchIndex) {
    const result = context.results.get(match.id) || {};
    const home = resolveParticipant(match.home, context);
    const away = resolveParticipant(match.away, context);
    const winner = finalWinner({ ...match, home: home.label, away: away.label }, context.results);
    const finished = FINAL_STATUSES.has(result.status);
    const classes = `${round.final ? "final-card " : ""}${finished ? "is-finished" : ""}`.trim();

    return `<article class="bracket-card ${classes}" data-bracket-key="${stageIndex}:${matchIndex}">
      <div class="match-meta"><span>M${match.id}</span><span class="match-date">${displayDate(match.kickoffUtc)}</span></div>
      ${teamRow(home, result.homeScore, winner === home.label)}
      ${teamRow(away, result.awayScore, winner === away.label)}
    </article>`;
  }

  function stageMatches(ids) {
    return ids.map((id) => MATCHES.find((match) => match.id === id)).filter(Boolean);
  }

  function renderBracket(results) {
    activeGeometry = bracketGeometry();
    const context = {
      results,
      matchesById: new Map(MATCHES.map((match) => [match.id, match]))
    };

    bracketEl.innerHTML = ROUND_LAYOUT.map((round, stageIndex) => {
      const cards = stageMatches(round.ids)
        .map((match, matchIndex) => matchCard(match, context, round, stageIndex, matchIndex))
        .join("");

      return `<section class="bracket-round stage-${round.stage}">
        <h2 class="round-title">${round.title}<span class="round-subtitle">${round.subtitle}</span></h2>
        <div class="round-matches">${cards}</div>
      </section>`;
    }).join("");

    const third = MATCHES.find((match) => match.id === 103);
    thirdPlaceEl.innerHTML = third ? `<h2>Third-place play-off</h2>${matchCard(third, context, { final: true }, 9, 0)}` : "";

    requestAnimationFrame(() => {
      applyDynamicSpacing();
      updateColumnFocus();
    });
  }

  function rerenderForViewport() {
    if (renderedResults) renderBracket(renderedResults);
  }

  makeBracketScrollable();
  window.addEventListener("resize", rerenderForViewport);

  Promise.all([
    fetch(`../results.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Results failed: ${response.status}`))),
    fetch(`../results-overrides.json?v=${Date.now()}`).then((response) => response.ok ? response.json() : null).catch(() => null)
  ])
    .then(([resultsData, overridesData]) => {
      applyFixtureParticipants(resultsData, overridesData);
      renderedResults = mergeResults(resultsData, overridesData);
      knockoutEmptyStateEl.hidden = true;
      renderBracket(renderedResults);
    })
    .catch((error) => {
      console.warn("Could not load knockout bracket.", error);
      knockoutEmptyStateEl.hidden = false;
    });
})();
