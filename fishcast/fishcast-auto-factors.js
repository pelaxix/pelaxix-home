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
  const base = getBaseFishingScore(hour, temp, wind, clouds, rain, pressure);
  let score = base.score;
  const reasons = [...base.reasons];

  if (best.isPrimeWindow) { score += 1; reasons.push(`${best.label.toLowerCase()} is close to a low-light feeding window`); }
  if (pressureTrend.kind === 'falling') { score += .75; reasons.push('pressure is falling, which can improve activity before weather changes'); }
  if (pressureTrend.kind === 'rising') { score -= .5; reasons.push('pressure is rising, which can make fish a little tighter to cover'); }
  if (moon.strength === 'major') { score += .5; reasons.push(`${moon.name.toLowerCase()} moon can add a small feeding-window boost`); }
  if (season.kind === 'shoulder') { score += .25; reasons.push(`${season.name.toLowerCase()} seasonal pattern can be productive`); }
  if (season.kind === 'tough') { score -= .5; reasons.push(`${season.name.toLowerCase()} seasonal pattern can be less forgiving`); }

  const selectedTarget = target === 'auto'
    ? pickBestScoringTargetWithFactors(water, temp, wind, clouds, hour, rain, score, season)
    : target;

  const speciesAdjustment = getSpeciesScoreAdjustment(selectedTarget, water, temp, wind, clouds, hour, rain);
  score += speciesAdjustment.value;
  reasons.push(speciesAdjustment.reason);

  score = Math.max(1, Math.min(10, Math.round(score)));
  const rating = score >= 8 ? 'Great' : score >= 6 ? 'Good' : score >= 4 ? 'Okay' : 'Rough';
  const verdict = score >= 8 ? 'Worth making time for.' : score >= 6 ? 'Worth a shot.' : score >= 4 ? 'Go if you feel like exploring.' : 'Probably not ideal.';
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

function pickBestScoringTargetWithFactors(water, temp, wind, clouds, hour, rain, baseScore, season) {
  const candidates = ['bass', 'pike', 'trout', 'panfish', 'carp-catfish'];
  const ranked = candidates.map((candidate) => {
    const adjustment = getSpeciesScoreAdjustment(candidate, water, temp, wind, clouds, hour, rain);
    let score = baseScore + adjustment.value;
    if (candidate === 'trout' && season.name === 'Summer') score -= .5;
    if (candidate === 'carp-catfish' && season.name === 'Summer') score += .5;
    if (candidate === 'pike' && season.name === 'Spring') score += .5;
    if (candidate === 'bass' && (season.name === 'Summer' || season.name === 'Fall')) score += .25;
    return { target: candidate, score: Math.max(1, Math.min(10, Math.round(score))) };
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
