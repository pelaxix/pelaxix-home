(() => {
  function fixtureFromRow(fields, row) {
    return Array.isArray(row)
      ? Object.fromEntries(fields.map((field, index) => [field, row[index]]))
      : row || {};
  }

  async function applyQualifiedParticipants() {
    try {
      const response = await fetch(`results.json?v=${Date.now()}`);
      if (!response.ok) throw new Error(`Fixture data failed: ${response.status}`);

      const data = await response.json();
      const fields = data.fields || [];
      const fixturesById = new Map(
        (data.matches || []).map((row) => {
          const fixture = fixtureFromRow(fields, row);
          return [Number(fixture.id), fixture];
        })
      );

      let changed = false;
      for (const match of MATCHES) {
        const fixture = fixturesById.get(Number(match.id));
        if (!fixture) continue;

        for (const side of ["home", "away"]) {
          const team = typeof fixture[side] === "string" ? fixture[side].trim() : "";
          if (team && team !== match[side]) {
            match[side] = team;
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
