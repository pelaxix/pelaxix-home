(() => {
  function fixtureFromRow(fields, row) {
    return Array.isArray(row)
      ? Object.fromEntries(fields.map((field, index) => [field, row[index]]))
      : row || {};
  }

  async function fetchJsonIfAvailable(url) {
    const response = await fetch(`${url}?v=${Date.now()}`);
    if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
    return response.json();
  }

  function applyOverrides(fixturesById, overridesData) {
    if (!overridesData) return;

    const fields = overridesData.fields || [];
    for (const row of overridesData.matches || []) {
      const override = fixtureFromRow(fields, row);
      const id = Number(override.id);
      if (!id || override.manualLock === true) continue;

      const fixture = fixturesById.get(id) || { id };
      for (const [key, value] of Object.entries(override)) {
        if (key === "id" || value === undefined) continue;
        fixture[key] = value;
      }
      fixturesById.set(id, fixture);
    }
  }

  function referencedMatchId(label) {
    if (typeof label !== "string") return null;

    const r32 = label.match(/^R32 M(\d+)$/i);
    if (r32) return 72 + Number(r32[1]);

    const r16 = label.match(/^R16 M(\d+)$/i);
    if (r16) return 88 + Number(r16[1]);

    const qf = label.match(/^QF(\d+)$/i);
    if (qf) return 96 + Number(qf[1]);

    return null;
  }

  function resolveTeamName(team, fixturesById) {
    const referencedId = referencedMatchId(team);
    if (!referencedId) return team;

    const referenced = fixturesById.get(referencedId);
    return referenced && referenced.winner ? referenced.winner : team;
  }

  async function applyQualifiedParticipants() {
    try {
      const data = await fetchJsonIfAvailable("results.json");
      let overridesData = null;

      try {
        overridesData = await fetchJsonIfAvailable("results-overrides.json");
      } catch (error) {
        console.warn("World Cup result overrides unavailable; using base fixtures only.", error);
      }

      const fields = data.fields || [];
      const fixturesById = new Map(
        (data.matches || []).map((row) => {
          const fixture = fixtureFromRow(fields, row);
          return [Number(fixture.id), fixture];
        })
      );

      applyOverrides(fixturesById, overridesData);

      let changed = false;
      for (const match of MATCHES) {
        const fixture = fixturesById.get(Number(match.id));
        if (!fixture) continue;

        for (const side of ["home", "away"]) {
          const team = typeof fixture[side] === "string" ? fixture[side].trim() : "";
          const resolvedTeam = resolveTeamName(team, fixturesById);

          if (resolvedTeam && resolvedTeam !== match[side]) {
            match[side] = resolvedTeam;
            changed = true;
          }
        }
      }

      if (changed && typeof render === "function") render();
    } catch (error) {
      console.warn("World Cup fixture participants unavailable; showing schedule placeholders.", error);
    }
  }

  applyQualifiedParticipants();
})();
