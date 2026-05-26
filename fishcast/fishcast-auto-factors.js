async function fetchWeather({ lat, lng }) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: 'temperature_2m,relative_humidity_2m,precipitation,rain,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation_probability,pressure_msl,wind_speed_10m,cloud_cover',
    daily: 'sunrise,sunset,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '2'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Weather API did not respond.');
  return response.json();
}

function analyzeConditions(weather, water, target) {
  const current = weather.current;
  const now = new Date(current.time);
  const hour = now.getHours();
  const temp = current.temperature_2m;
  const wind = current.wind_speed_10m;
  const clouds = current.cloud_cover;
  const rain = weather.daily.precipitation_probability_max?.[0] ?? 0;
  const pressure = current.pressure_msl;
  const sunrise = new Date(weather.daily.sunrise?.[0]);
  const sunset = new Date(weather.daily.sunset?.[0]);
  const moon = getMoonPhase(now);
  const season = getSeason(now);
  const pressureTrend = getPressureTrend(weather, now, pressure);
  const best = getBestWindow(now, sunrise, sunset, weather);
  const base = getBalancedBaseScore(hour, temp, wind, clouds, rain, pressure);
  let score = base.score;
  const reasons = [...base.reasons];

  if (best.isPrimeWindow) { score += .5; reasons.push(`${best.label.toLowerCase()} is close to a low-light feeding window`); }
  if (pressureTrend.kind === 'falling') { score += .35; reasons.push('pressure is falling, which can help activity'); }
  if (pressureTrend.kind === 'rising') { score -= .45; reasons.push('pressure is rising, which can make fish tighter to cover'); }
  if (moon.strength === 'major') { score += .15; reasons.push(`${moon.name.toLowerCase()} adds a small moon-phase nudge`); }
  if (season.kind === 'shoulder') { score += .15; reasons.push(`${season.name.toLowerCase()} seasonal pattern can be productive`); }
  if (season.kind === 'tough') { score -= .65; reasons.push(`${season.name.toLowerCase()} seasonal pattern can be less forgiving`); }

  const speciesRanking = rankSpeciesForSpot({ water, temp, wind, clouds, hour, rain, baseScore: score, season, targetPreference: target });
  const mostLikely = speciesRanking[0];
  const bestActive = pickBestActiveTarget(speciesRanking, target);
  const wildcard = pickWildcardTarget(speciesRanking, mostLikely, bestActive);
  const selectedTarget = bestActive.target;
  const speciesAdjustment = getBalancedSpeciesAdjustment(selectedTarget, water, temp, wind, clouds, hour, rain);
  score += speciesAdjustment.value;

  reasons.push(buildEncounterReason(mostLikely));
  reasons.push(buildActiveReason(bestActive));
  if (wildcard) reasons.push(buildWildcardReason(wildcard));
  reasons.push(speciesAdjustment.reason);

  score = normalizeFishCastScore(score);
  const rating = score >= 9 ? 'Great' : score >= 7 ? 'Good' : score >= 5 ? 'Okay' : 'Rough';
  const verdict = buildRealisticVerdict(score, mostLikely, bestActive, speciesRanking.confidence);
  const lures = pickLures(selectedTarget, water, wind, clouds, hour, rain, temp);

  return {
    score,
    rating,
    verdict,
    bestWindow: best.label,
    target: selectedTarget,
    mostLikely: mostLikely.target,
    bestActiveTarget: bestActive.target,
    wildcardTarget: wildcard?.target || null,
    confidence: speciesRanking.confidence,
    tryThis: lures[0].name,
    watch: getWatchOut(wind, rain, clouds, pressureTrend, season, wildcard),
    lures,
    reasons,
    speciesRanking,
    pressureTrend,
    moon,
    season
  };
}

function getBalancedBaseScore(hour, temp, wind, clouds, rain, pressure) {
  let score = 5;
  const reasons = [];

  if (hour < 9 || hour >= 18) { score += .7; reasons.push('low-light timing is usually better for active fish'); }
  if (clouds >= 45 && clouds <= 85) { score += .45; reasons.push('cloud cover can make fish less cautious'); }
  if (clouds < 15 && hour >= 10 && hour < 17) { score -= .35; reasons.push('bright sun can make fish hold tighter to cover'); }
  if (wind >= 6 && wind <= 20) { score += .45; reasons.push('some wind adds chop and can push baitfish'); }
  if (wind > 28) { score -= 1.25; reasons.push('strong wind can make casting and presentation harder'); }
  if (rain > 70) { score -= .9; reasons.push('high rain chance may make the trip rough'); }
  if (rain >= 35 && rain <= 70) { score += .15; reasons.push('some weather movement can help activity'); }
  if (pressure >= 1008 && pressure <= 1022) { score += .2; reasons.push('pressure looks fairly stable'); }
  if (temp < 8 || temp > 31) { score -= .9; reasons.push('temperature is on the tougher side'); }

  return { score, reasons };
}

function rankSpeciesForSpot({ water, temp, wind, clouds, hour, rain, baseScore, season, targetPreference }) {
  const candidates = ['bass', 'pike', 'trout', 'panfish', 'carp-catfish'];
  const spotContext = getCurrentSpotContext();
  const lowLight = hour < 9 || hour >= 18;

  const ranked = candidates.map((candidate) => {
    const presence = getSpotPresenceScore(candidate, spotContext);
    const waterFit = getWaterFitScore(candidate, water);
    const seasonFit = getSeasonFitScore(candidate, season, temp);
    const accessibility = getShoreAccessibilityScore(candidate, water, temp, wind, lowLight);
    const encounter = getEncounterBias(candidate, water, spotContext);
    const condition = getBalancedSpeciesAdjustment(candidate, water, temp, wind, clouds, hour, rain);
    const targetBoost = targetPreference !== 'auto' && speciesMatches(candidate, targetPreference) ? 1.5 : 0;

    const rawScore = baseScore + presence.value + waterFit.value + seasonFit.value + accessibility.value + encounter.value + condition.value + targetBoost;

    return {
      target: candidate,
      score: normalizeSpeciesScore(rawScore),
      rawScore,
      localPresence: presence.label,
      notes: [presence.reason, waterFit.reason, seasonFit.reason, accessibility.reason, encounter.reason, condition.reason].filter(Boolean)
    };
  });

  ranked.sort((a, b) => b.rawScore - a.rawScore || targetTieBreaker(a.target, water) - targetTieBreaker(b.target, water));
  ranked.confidence = getRankingConfidence(spotContext, ranked);
  ranked.spotContext = spotContext;
  return ranked;
}

function getCurrentSpotContext() {
  const hasSavedSpot = locationMode?.value === 'spot';
  const spot = hasSavedSpot ? getSelectedSpot() : null;
  const species = Array.isArray(spot?.species) ? spot.species.map(normalizeSpeciesText) : [];

  return {
    hasSavedSpot,
    spotName: spot?.name || null,
    species,
    hasKnownSpecies: species.length > 0
  };
}

function getSpotPresenceScore(candidate, context) {
  if (!context.hasSavedSpot) {
    return {
      value: 0,
      label: 'unknown',
      reason: 'local species are unknown for this location, so the recommendation is more conservative'
    };
  }

  if (!context.hasKnownSpecies) {
    return {
      value: -.5,
      label: 'unknown',
      reason: 'this saved spot does not list known species yet'
    };
  }

  if (context.species.some((species) => speciesMatches(candidate, species))) {
    return {
      value: 4,
      label: 'known',
      reason: `${formatTarget(candidate)} is listed for this spot`
    };
  }

  return {
    value: -3,
    label: 'not listed',
    reason: `${formatTarget(candidate)} is not listed for this spot, so it is treated as less likely`
  };
}

function getWaterFitScore(candidate, water) {
  const table = {
    bass: { lake: 1.5, harbour: 1.25, river: .75, unknown: .25 },
    pike: { lake: 1.25, harbour: 1.25, river: .25, unknown: 0 },
    trout: { river: 1.75, lake: .5, harbour: -1, unknown: 0 },
    panfish: { lake: 1.5, harbour: 1, river: .5, unknown: .5 },
    'carp-catfish': { harbour: 1.25, river: 1, lake: .75, unknown: .25 }
  };
  const value = table[candidate]?.[water] ?? 0;
  return {
    value,
    reason: value > 1 ? `${water} water is a strong fit for ${formatTarget(candidate)}` : value < 0 ? `${water} water is not a great fit for ${formatTarget(candidate)}` : ''
  };
}

function getSeasonFitScore(candidate, season, temp) {
  let value = 0;
  let reason = '';

  if (candidate === 'trout') {
    if (season.name === 'Spring' || season.name === 'Fall') { value += 1; reason = 'spring and fall are better trout windows'; }
    if (season.name === 'Summer' && temp > 22) { value -= 1.5; reason = 'warm summer conditions make trout less realistic from shore'; }
  }

  if (candidate === 'pike') {
    if (season.name === 'Spring' || season.name === 'Fall') { value += .75; reason = 'pike are often more practical in cooler shoulder seasons'; }
    if (season.name === 'Summer' && temp > 27) { value -= .75; reason = 'hot summer weather can push pike out of easy shore range'; }
  }

  if (candidate === 'bass') {
    if (season.name === 'Summer' || season.name === 'Fall') { value += .75; reason = 'bass are a reliable warm-season target'; }
    if (season.name === 'Winter') { value -= 1.25; reason = 'winter makes bass less reliable'; }
  }

  if (candidate === 'panfish') {
    if (season.name !== 'Winter') { value += .5; reason = 'panfish are usually a forgiving open-water target'; }
  }

  if (candidate === 'carp-catfish') {
    if (temp >= 18) { value += .75; reason = 'warmer water improves carp and catfish odds'; }
    if (temp < 10) { value -= .75; reason = 'cold water can slow carp and catfish down'; }
  }

  return { value, reason };
}

function getShoreAccessibilityScore(candidate, water, temp, wind, lowLight) {
  let value = 0;
  let reason = '';

  if (candidate === 'panfish') {
    value += .75;
    reason = 'panfish are usually easier to reach from shore';
  }

  if (candidate === 'bass') {
    value += .45;
    reason = 'bass are a practical shore target around cover and edges';
  }

  if (candidate === 'pike') {
    value += water === 'lake' || water === 'harbour' ? .15 : -.35;
    if (wind > 18) reason = 'wind can create pike opportunity, but only if weeds or ambush edges are reachable';
  }

  if (candidate === 'trout' && temp > 20 && water !== 'river') {
    value -= 1;
    reason = 'trout may be deeper or less reachable from shore in warm non-river water';
  }

  if (candidate === 'carp-catfish') {
    value += lowLight ? .35 : .1;
    reason = 'carp and catfish can be practical from shore with slower bottom presentations';
  }

  return { value, reason };
}

function getEncounterBias(candidate, water, context) {
  if (context.hasSavedSpot && context.hasKnownSpecies) return { value: 0, reason: '' };

  const fallback = {
    bass: .5,
    panfish: .75,
    'carp-catfish': .2,
    pike: -.35,
    trout: water === 'river' ? .2 : -.75
  };

  const value = fallback[candidate] ?? 0;
  return {
    value,
    reason: value > 0 ? `${formatTarget(candidate)} is a more common casual shore target when local species are unknown` : ''
  };
}

function pickBestActiveTarget(ranking, targetPreference) {
  if (targetPreference !== 'auto') {
    const preferred = ranking.find((item) => speciesMatches(item.target, targetPreference));
    if (preferred) return preferred;
  }

  const sportTargets = ranking.filter((item) => ['bass', 'pike', 'trout', 'carp-catfish'].includes(item.target));
  return sportTargets[0] || ranking[0];
}

function pickWildcardTarget(ranking, mostLikely, bestActive) {
  return ranking.find((item) => item.target !== mostLikely.target && item.target !== bestActive.target && item.score >= 5) || null;
}

function getRankingConfidence(context, ranking) {
  if (!context.hasSavedSpot) return 'Low';
  if (!context.hasKnownSpecies) return 'Medium-low';
  const gap = ranking[0]?.rawScore - ranking[1]?.rawScore;
  if (gap >= 2) return 'High';
  return 'Medium';
}

function buildEncounterReason(mostLikely) {
  return `most likely encounter: ${formatTarget(mostLikely.target)} (${mostLikely.localPresence})`;
}

function buildActiveReason(bestActive) {
  return `best active target: ${formatTarget(bestActive.target)} based on today’s practical conditions`;
}

function buildWildcardReason(wildcard) {
  return `wildcard option: ${formatTarget(wildcard.target)} if you find the right cover or depth`;
}

function buildRealisticVerdict(score, mostLikely, bestActive, confidence) {
  const likely = formatTarget(mostLikely.target);
  const active = formatTarget(bestActive.target);

  if (score >= 9) return `Strong outing. ${likely} is the most realistic catch, with ${active} as the best active target.`;
  if (score >= 7) return `Worth a shot. Expect ${likely} first, but target ${active} if you want the better bite.`;
  if (score >= 5) return `Fishable, but manage expectations. ${likely} is the safest play.`;
  return `Tough conditions. ${likely} is still the most realistic option, confidence ${confidence.toLowerCase()}.`;
}

function getBalancedSpeciesAdjustment(target, water, temp, wind, clouds, hour, rain) {
  const species = target.toLowerCase();
  const lowLight = hour < 9 || hour >= 18;
  const cloudyOrWindy = clouds >= 45 || wind >= 10;

  if (species.includes('trout')) {
    let value = 0;
    const notes = [];
    if (temp <= 18) { value += .8; notes.push('cooler weather favours trout'); }
    if (temp > 22) { value -= 1.4; notes.push('warm weather makes trout tougher'); }
    if (water === 'river') { value += .5; notes.push('river or creek water fits trout better'); }
    if (rain > 55) { value -= .35; notes.push('rain risk may muddy small-water trout spots'); }
    return { value, reason: notes.join(', ') || 'trout conditions are neutral' };
  }

  if (species.includes('pike')) {
    let value = 0;
    const notes = [];
    if (cloudyOrWindy) { value += .65; notes.push('cloud and wind can help pike ambush prey'); }
    if (temp >= 8 && temp <= 22) { value += .35; notes.push('temperature is comfortable for pike activity'); }
    if (temp > 27) { value -= .9; notes.push('hot weather can slow pike down'); }
    if (water === 'harbour' || water === 'lake') { value += .25; notes.push('this water type is a decent pike fit'); }
    return { value, reason: notes.join(', ') || 'pike conditions are neutral' };
  }

  if (species.includes('panfish')) {
    let value = .15;
    const notes = ['panfish are usually more forgiving'];
    if (wind > 24) { value -= .75; notes.push('heavy wind makes small presentations harder'); }
    if (temp >= 14 && temp <= 28) { value += .35; notes.push('temperature is friendly for panfish'); }
    if (lowLight) { value += .15; notes.push('low light can help shore activity'); }
    return { value, reason: notes.join(', ') };
  }

  if (species.includes('carp') || species.includes('catfish')) {
    let value = 0;
    const notes = [];
    if (temp >= 18) { value += .65; notes.push('warmer water favours carp and catfish activity'); }
    if (lowLight) { value += .45; notes.push('evening timing is good for carp and catfish'); }
    if (wind > 28) { value -= .6; notes.push('strong wind can make bottom fishing annoying'); }
    if (temp < 10) { value -= .9; notes.push('cold weather can make bottom feeders slower'); }
    return { value, reason: notes.join(', ') || 'carp and catfish conditions are neutral' };
  }

  let value = 0;
  const notes = [];
  if (temp >= 16 && temp <= 28) { value += .55; notes.push('temperature is in a good bass range'); }
  if (lowLight) { value += .35; notes.push('low light helps bass move shallow'); }
  if (cloudyOrWindy) { value += .35; notes.push('cloud or wind can improve bass reaction bites'); }
  if (temp < 10) { value -= 1.1; notes.push('cold weather can slow bass down'); }
  if (clouds < 20 && !lowLight) { value -= .35; notes.push('bright sun can push bass tighter to cover'); }
  return { value, reason: notes.join(', ') || 'bass conditions are neutral' };
}

function normalizeFishCastScore(rawScore) {
  const rounded = Math.round(rawScore);
  if (rawScore >= 9.25) return 10;
  if (rawScore >= 8.45) return 9;
  if (rawScore >= 7.45) return 8;
  if (rawScore >= 6.45) return 7;
  if (rawScore >= 5.45) return 6;
  if (rawScore >= 4.45) return 5;
  if (rawScore >= 3.45) return 4;
  if (rawScore >= 2.45) return 3;
  return Math.max(1, Math.min(10, rounded));
}

function normalizeSpeciesScore(rawScore) {
  return Math.max(1, Math.min(10, Math.round(rawScore)));
}

function getPressureTrend(weather, now, currentPressure) {
  const hourly = weather.hourly;
  if (!hourly?.time?.length || !hourly.pressure_msl?.length) return { kind: 'unknown', label: 'trend unknown' };
  const index = hourly.time.findIndex((time) => new Date(time) >= now);
  const safeIndex = Math.max(0, index);
  const futureIndex = Math.min(hourly.time.length - 1, safeIndex + 6);
  const futurePressure = hourly.pressure_msl[futureIndex];
  const delta = futurePressure - currentPressure;

  if (delta <= -1.5) return { kind: 'falling', label: 'falling' };
  if (delta >= 1.5) return { kind: 'rising', label: 'rising' };
  return { kind: 'stable', label: 'stable' };
}

function getBestWindow(now, sunrise, sunset, weather) {
  const minutesToSunrise = Math.abs(now - sunrise) / 60000;
  const minutesToSunset = Math.abs(now - sunset) / 60000;

  if (minutesToSunrise <= 90) return { label: 'Now near sunrise', isPrimeWindow: true };
  if (minutesToSunset <= 120) return { label: 'Now to sunset', isPrimeWindow: true };
  if (now < sunrise) return { label: 'Sunrise window', isPrimeWindow: true };
  if (now < sunset) return { label: 'Evening bite', isPrimeWindow: false };

  const tomorrowSunrise = new Date(weather.daily.sunrise?.[1] || sunrise);
  return { label: `Tomorrow ${formatTime(tomorrowSunrise)}`, isPrimeWindow: false };
}

function getMoonPhase(date) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const days = (date - knownNewMoon) / 86400000;
  const cycle = 29.53058867;
  const age = ((days % cycle) + cycle) % cycle;
  const names = [
    [1.845, 'New moon'], [5.536, 'Waxing crescent'], [9.228, 'First quarter'], [12.919, 'Waxing gibbous'],
    [16.611, 'Full moon'], [20.302, 'Waning gibbous'], [23.994, 'Last quarter'], [27.685, 'Waning crescent'], [cycle, 'New moon']
  ];
  const match = names.find(([limit]) => age <= limit);
  const name = match ? match[1] : 'New moon';
  const strength = name === 'Full moon' || name === 'New moon' ? 'major' : 'minor';
  return { name, strength };
}

function getSeason(date) {
  const month = date.getMonth() + 1;
  if ([3, 4, 5].includes(month)) return { name: 'Spring', kind: 'shoulder' };
  if ([6, 7, 8].includes(month)) return { name: 'Summer', kind: 'steady' };
  if ([9, 10, 11].includes(month)) return { name: 'Fall', kind: 'shoulder' };
  return { name: 'Winter', kind: 'tough' };
}

function getWatchOut(wind, rain, clouds, pressureTrend, season, wildcard) {
  if (wind > 25) return 'Heavy wind';
  if (rain > 50) return 'Rain risk';
  if (pressureTrend.kind === 'rising') return 'Rising pressure';
  if (season.kind === 'tough') return 'Cold season';
  if (clouds < 25) return 'Bright sun';
  if (wildcard) return `${formatTarget(wildcard.target)} is a wildcard`;
  return 'Slow areas';
}

function normalizeSpeciesText(value) {
  return String(value || '').toLowerCase().trim();
}

function speciesMatches(candidate, value) {
  const text = normalizeSpeciesText(value);
  if (!text) return false;
  if (candidate === 'carp-catfish') return text.includes('carp') || text.includes('catfish') || text.includes('channel catfish');
  if (candidate === 'panfish') return text.includes('panfish') || text.includes('bluegill') || text.includes('sunfish') || text.includes('perch') || text.includes('crappie') || text.includes('rock bass');
  return text.includes(candidate);
}

function renderResults(weather, analysis) {
  const current = weather.current;
  ratingText.textContent = analysis.rating;
  verdictText.textContent = analysis.verdict;
  scoreBadge.textContent = `${analysis.score}/10`;
  bestWindow.textContent = analysis.bestWindow;
  targetText.textContent = buildTargetSummary(analysis);
  tryText.textContent = analysis.tryThis;
  watchText.textContent = analysis.watch;

  lureList.innerHTML = analysis.lures.map((item) => `
    <article class="lure-item">
      <span class="target">Target: ${escapeHtml(item.target)}</span>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.why)}</p>
    </article>
  `).join('');

  tempFact.textContent = `${Math.round(current.temperature_2m)}°C`;
  windFact.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  cloudFact.textContent = `${current.cloud_cover}%`;
  rainFact.textContent = `${weather.daily.precipitation_probability_max?.[0] ?? 0}%`;
  pressureFact.textContent = `${Math.round(current.pressure_msl)} hPa, ${analysis.pressureTrend.label}`;
  sunsetFact.textContent = `${formatTime(weather.daily.sunset?.[0])} · ${analysis.moon.name}`;
  whyText.textContent = buildWhyText(analysis);

  resultCard.hidden = false;
  lureCard.hidden = false;
  weatherCard.hidden = false;
}

function buildTargetSummary(analysis) {
  const likely = formatTarget(analysis.mostLikely || analysis.target);
  const active = formatTarget(analysis.bestActiveTarget || analysis.target);
  if (likely === active) return `${likely} · ${analysis.confidence} confidence`;
  return `Likely ${likely} · Target ${active}`;
}

function buildWhyText(analysis) {
  const rankingText = Array.isArray(analysis.speciesRanking)
    ? `Species ranking: ${analysis.speciesRanking.slice(0, 3).map((item) => `${formatTarget(item.target)} ${item.score}/10`).join(', ')}.`
    : '';
  const reasonsText = analysis.reasons.length ? analysis.reasons.join(', ') + '.' : 'Neutral conditions with no major weather advantage or penalty.';
  return [rankingText, reasonsText].filter(Boolean).join(' ');
}
