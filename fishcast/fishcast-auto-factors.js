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
  if (moon.strength === 'major') { score += .2; reasons.push(`${moon.name.toLowerCase()} adds a small moon-phase nudge`); }
  if (season.kind === 'shoulder') { score += .15; reasons.push(`${season.name.toLowerCase()} seasonal pattern can be productive`); }
  if (season.kind === 'tough') { score -= .65; reasons.push(`${season.name.toLowerCase()} seasonal pattern can be less forgiving`); }

  const selectedTarget = target === 'auto'
    ? pickBestScoringTargetWithFactors(water, temp, wind, clouds, hour, rain, score, season)
    : target;

  const speciesAdjustment = getBalancedSpeciesAdjustment(selectedTarget, water, temp, wind, clouds, hour, rain);
  score += speciesAdjustment.value;
  reasons.push(speciesAdjustment.reason);

  score = normalizeFishCastScore(score);
  const rating = score >= 9 ? 'Great' : score >= 7 ? 'Good' : score >= 5 ? 'Okay' : 'Rough';
  const verdict = score >= 9 ? 'Strong conditions, worth making time for.' : score >= 7 ? 'Good enough to be worth a shot.' : score >= 5 ? 'Fishable, but manage expectations.' : 'Probably not ideal.';
  const lures = pickLures(selectedTarget, water, wind, clouds, hour, rain, temp);

  return {
    score,
    rating,
    verdict,
    bestWindow: best.label,
    target: selectedTarget,
    tryThis: lures[0].name,
    watch: getWatchOut(wind, rain, clouds, pressureTrend, season),
    lures,
    reasons,
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

function pickBestScoringTargetWithFactors(water, temp, wind, clouds, hour, rain, baseScore, season) {
  const candidates = ['bass', 'pike', 'trout', 'panfish', 'carp-catfish'];
  const ranked = candidates.map((candidate) => {
    const adjustment = getBalancedSpeciesAdjustment(candidate, water, temp, wind, clouds, hour, rain);
    let score = baseScore + adjustment.value;
    if (candidate === 'trout' && season.name === 'Summer') score -= .35;
    if (candidate === 'carp-catfish' && season.name === 'Summer') score += .2;
    if (candidate === 'pike' && season.name === 'Spring') score += .2;
    if (candidate === 'bass' && (season.name === 'Summer' || season.name === 'Fall')) score += .15;
    return { target: candidate, score: normalizeFishCastScore(score) };
  });

  ranked.sort((a, b) => b.score - a.score || targetTieBreaker(a.target, water) - targetTieBreaker(b.target, water));
  return ranked[0].target;
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

function getWatchOut(wind, rain, clouds, pressureTrend, season) {
  if (wind > 25) return 'Heavy wind';
  if (rain > 50) return 'Rain risk';
  if (pressureTrend.kind === 'rising') return 'Rising pressure';
  if (season.kind === 'tough') return 'Cold season';
  if (clouds < 25) return 'Bright sun';
  return 'Slow areas';
}

function renderResults(weather, analysis) {
  const current = weather.current;
  ratingText.textContent = analysis.rating;
  verdictText.textContent = analysis.verdict;
  scoreBadge.textContent = `${analysis.score}/10`;
  bestWindow.textContent = analysis.bestWindow;
  targetText.textContent = formatTarget(analysis.target);
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
  whyText.textContent = analysis.reasons.length ? analysis.reasons.join(', ') + '.' : 'Neutral conditions with no major weather advantage or penalty.';

  resultCard.hidden = false;
  lureCard.hidden = false;
  weatherCard.hidden = false;
}
