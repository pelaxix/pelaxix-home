function analyzeConditions(weather, water, target) {
  const current = weather.current;
  const hour = new Date(current.time).getHours();
  const temp = current.temperature_2m;
  const wind = current.wind_speed_10m;
  const clouds = current.cloud_cover;
  const rain = weather.daily.precipitation_probability_max?.[0] ?? 0;
  const pressure = current.pressure_msl;

  const base = getBaseFishingScore(hour, temp, wind, clouds, rain, pressure);
  const selectedTarget = target === 'auto'
    ? pickBestScoringTarget(water, temp, wind, clouds, hour, rain, base.score)
    : target;

  const speciesAdjustment = getSpeciesScoreAdjustment(selectedTarget, water, temp, wind, clouds, hour, rain);
  let score = base.score + speciesAdjustment.value;
  const reasons = [...base.reasons, speciesAdjustment.reason];

  score = Math.max(1, Math.min(10, Math.round(score)));
  const rating = score >= 8 ? 'Great' : score >= 6 ? 'Good' : score >= 4 ? 'Okay' : 'Rough';
  const verdict = score >= 8 ? 'Worth making time for.' : score >= 6 ? 'Worth a shot.' : score >= 4 ? 'Go if you feel like exploring.' : 'Probably not ideal.';
  const lures = pickLures(selectedTarget, water, wind, clouds, hour, rain, temp);

  return {
    score,
    rating,
    verdict,
    bestWindow: hour < 9 ? 'Now / morning' : hour >= 17 ? 'Now to sunset' : 'Evening bite',
    target: selectedTarget,
    tryThis: lures[0].name,
    watch: wind > 25 ? 'Heavy wind' : rain > 50 ? 'Rain risk' : clouds < 25 ? 'Bright sun' : 'Slow areas',
    lures,
    reasons
  };
}

function getBaseFishingScore(hour, temp, wind, clouds, rain, pressure) {
  let score = 5;
  const reasons = [];

  if (hour < 9 || hour >= 18) { score += 1.5; reasons.push('low-light timing is usually better for active fish'); }
  if (clouds >= 45 && clouds <= 85) { score += 1; reasons.push('cloud cover can make fish less cautious'); }
  if (wind >= 6 && wind <= 22) { score += 1; reasons.push('some wind adds chop and can push baitfish'); }
  if (wind > 30) { score -= 1.5; reasons.push('strong wind can make casting and presentation harder'); }
  if (rain > 60) { score -= 1; reasons.push('high rain chance may make the trip rough'); }
  if (pressure >= 1008 && pressure <= 1022) { score += .5; reasons.push('pressure looks fairly stable'); }
  if (temp < 8 || temp > 31) { score -= 1; reasons.push('temperature is on the tougher side'); }

  return { score, reasons };
}

function pickBestScoringTarget(water, temp, wind, clouds, hour, rain, baseScore) {
  const candidates = ['bass', 'pike', 'trout', 'panfish', 'carp-catfish'];
  const ranked = candidates.map((candidate) => {
    const adjustment = getSpeciesScoreAdjustment(candidate, water, temp, wind, clouds, hour, rain);
    return {
      target: candidate,
      score: Math.max(1, Math.min(10, Math.round(baseScore + adjustment.value)))
    };
  });

  ranked.sort((a, b) => b.score - a.score || targetTieBreaker(a.target, water) - targetTieBreaker(b.target, water));
  return ranked[0].target;
}

function targetTieBreaker(target, water) {
  if (water === 'river') {
    return target === 'trout' ? 0 : target === 'bass' ? 1 : 2;
  }
  if (water === 'harbour') {
    return target === 'pike' ? 0 : target === 'bass' ? 1 : target === 'carp-catfish' ? 2 : 3;
  }
  if (water === 'lake') {
    return target === 'bass' ? 0 : target === 'pike' ? 1 : target === 'panfish' ? 2 : 3;
  }
  return target === 'bass' ? 0 : target === 'panfish' ? 1 : target === 'pike' ? 2 : 3;
}
