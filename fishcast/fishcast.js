const locationMode = document.querySelector('#locationMode');
const spotPickerLabel = document.querySelector('#spotPickerLabel');
const spotPicker = document.querySelector('#spotPicker');
const waterType = document.querySelector('#waterType');
const targetSpecies = document.querySelector('#targetSpecies');
const checkButton = document.querySelector('#checkButton');
const statusMessage = document.querySelector('#statusMessage');

const resultCard = document.querySelector('#resultCard');
const lureCard = document.querySelector('#lureCard');
const weatherCard = document.querySelector('#weatherCard');
const ratingText = document.querySelector('#ratingText');
const verdictText = document.querySelector('#verdictText');
const scoreBadge = document.querySelector('#scoreBadge');
const bestWindow = document.querySelector('#bestWindow');
const targetText = document.querySelector('#targetText');
const tryText = document.querySelector('#tryText');
const watchText = document.querySelector('#watchText');
const lureList = document.querySelector('#lureList');
const tempFact = document.querySelector('#tempFact');
const windFact = document.querySelector('#windFact');
const cloudFact = document.querySelector('#cloudFact');
const rainFact = document.querySelector('#rainFact');
const pressureFact = document.querySelector('#pressureFact');
const sunsetFact = document.querySelector('#sunsetFact');
const whyText = document.querySelector('#whyText');

let fishingSpots = [];

locationMode.addEventListener('change', () => {
  spotPickerLabel.hidden = locationMode.value !== 'spot';
});

spotPicker.addEventListener('change', () => {
  const spot = getSelectedSpot();
  if (!spot) return;
  waterType.value = inferWaterType(spot.category);
  if (spot.species?.length) {
    targetSpecies.value = inferTargetSpecies(spot.species);
  }
});

checkButton.addEventListener('click', runFishCast);
loadFishingSpots();

async function loadFishingSpots() {
  try {
    const response = await fetch('/fishingmap/spots.json');
    if (!response.ok) throw new Error('Could not load saved fishing spots.');
    fishingSpots = await response.json();
    spotPicker.innerHTML = fishingSpots.map((spot) => `<option value="${escapeHtml(spot.id)}">${escapeHtml(spot.name)}</option>`).join('');
  } catch (error) {
    console.error(error);
    spotPicker.innerHTML = '<option value="">No spots found</option>';
  }
}

async function runFishCast() {
  setLoading(true);
  statusMessage.textContent = 'Checking weather and fishing conditions...';

  try {
    const coords = await getCoordinates();
    const weather = await fetchWeather(coords);
    const analysis = analyzeConditions(weather, waterType.value, targetSpecies.value);
    renderResults(weather, analysis);
    statusMessage.textContent = `Checked ${coords.name || 'current location'}.`;
  } catch (error) {
    console.error(error);
    statusMessage.textContent = error.message || 'Could not check conditions.';
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  checkButton.disabled = isLoading;
  checkButton.textContent = isLoading ? 'Checking...' : 'Check conditions';
}

function getCoordinates() {
  if (locationMode.value === 'spot') {
    const spot = getSelectedSpot();
    if (!spot) throw new Error('Choose a saved fishing spot first.');
    return Promise.resolve({ lat: spot.lat, lng: spot.lng, name: spot.name });
  }

  if (!navigator.geolocation) {
    throw new Error('This browser does not support GPS location.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, name: 'current location' }),
      () => reject(new Error('Location permission was denied or unavailable.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  });
}

function getSelectedSpot() {
  return fishingSpots.find((spot) => spot.id === spotPicker.value);
}

function inferWaterType(category = '') {
  const text = category.toLowerCase();
  if (text.includes('harbour') || text.includes('marina') || text.includes('urban shore')) return 'harbour';
  if (text.includes('river') || text.includes('creek')) return 'river';
  if (text.includes('lake') || text.includes('pond') || text.includes('conservation')) return 'lake';
  return 'unknown';
}

function inferTargetSpecies(species = []) {
  const normalized = species.map((item) => item.toLowerCase());
  if (normalized.includes('bass')) return 'bass';
  if (normalized.includes('pike')) return 'pike';
  if (normalized.includes('trout')) return 'trout';
  if (normalized.includes('panfish')) return 'panfish';
  if (normalized.includes('carp') || normalized.includes('catfish')) return 'carp-catfish';
  return 'auto';
}

async function fetchWeather({ lat, lng }) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    current: 'temperature_2m,relative_humidity_2m,precipitation,rain,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
    daily: 'sunrise,sunset,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '1'
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Weather API did not respond.');
  return response.json();
}

function analyzeConditions(weather, water, target) {
  const current = weather.current;
  const hour = new Date(current.time).getHours();
  const temp = current.temperature_2m;
  const wind = current.wind_speed_10m;
  const clouds = current.cloud_cover;
  const rain = weather.daily.precipitation_probability_max?.[0] ?? 0;
  const pressure = current.pressure_msl;

  let score = 5;
  const reasons = [];

  if (hour < 9 || hour >= 18) { score += 1.5; reasons.push('low-light timing is usually better for active fish'); }
  if (clouds >= 45 && clouds <= 85) { score += 1; reasons.push('cloud cover can make fish less cautious'); }
  if (wind >= 6 && wind <= 22) { score += 1; reasons.push('some wind adds chop and can push baitfish'); }
  if (wind > 30) { score -= 1.5; reasons.push('strong wind can make casting and presentation harder'); }
  if (rain > 60) { score -= 1; reasons.push('high rain chance may make the trip rough'); }
  if (pressure >= 1008 && pressure <= 1022) { score += .5; reasons.push('pressure looks fairly stable'); }
  if (temp < 8 || temp > 31) { score -= 1; reasons.push('temperature is on the tougher side'); }

  score = Math.max(1, Math.min(10, Math.round(score)));
  const rating = score >= 8 ? 'Great' : score >= 6 ? 'Good' : score >= 4 ? 'Okay' : 'Rough';
  const verdict = score >= 8 ? 'Worth making time for.' : score >= 6 ? 'Worth a shot.' : score >= 4 ? 'Go if you feel like exploring.' : 'Probably not ideal.';
  const selectedTarget = pickTarget(target, water, wind, clouds, hour);
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

function pickTarget(target, water, wind, clouds, hour) {
  if (target !== 'auto') return target;
  if (water === 'river') return hour < 10 ? 'trout' : 'bass';
  if (water === 'harbour') return wind > 18 ? 'pike' : 'bass';
  if (clouds > 50 || wind > 10) return 'bass / pike';
  return 'bass';
}

function pickLures(target, water, wind, clouds, hour, rain, temp) {
  const lowLight = hour < 9 || hour >= 18;
  const windy = wind >= 12;
  const cloudy = clouds >= 45;

  if (target === 'pike' || target.includes('pike')) {
    return [
      lure('Spinnerbait', 'pike / bass', 'Good in wind or stain, covers water fast around weeds and edges.'),
      lure('Spoon', 'pike', 'Simple search bait from shore, especially around open lanes and weed breaks.'),
      lure('Swimbait', 'pike / bass', 'Use a steady retrieve near structure or baitfish activity.')
    ];
  }

  if (target === 'trout') {
    return [
      lure('Small spoon', 'trout', 'Covers current seams and open water without overthinking it.'),
      lure('Inline spinner', 'trout / small bass', 'Good searching lure when fish are active or water has movement.'),
      lure('Small jig', 'trout', 'Better backup if fish are holding deeper or slower.')
    ];
  }

  if (target === 'panfish') {
    return [
      lure('Tiny jig', 'panfish', 'Good around docks, weeds, and calm pockets.'),
      lure('Micro spinner', 'panfish / small bass', 'Easy search option when you need to find active fish.'),
      lure('Float rig', 'panfish', 'Useful when fish are suspended or you need a slower presentation.')
    ];
  }

  if (target === 'carp-catfish') {
    return [
      lure('Bottom bait rig', 'carp / catfish', 'Best fit when targeting bottom feeders instead of chasing active predators.'),
      lure('Corn or dough bait', 'carp', 'Simple option for calm banks and known feeding areas.'),
      lure('Cut bait or worm', 'catfish', 'Better for evening or stained water.')
    ];
  }

  if (lowLight && !windy) {
    return [
      lure('Topwater popper', 'bass', 'Low light gives bass more confidence near the surface.'),
      lure('Soft plastic worm', 'bass', 'Good backup around weeds, shade, and structure.'),
      lure('Shallow crankbait', 'bass / pike', 'Covers shoreline water quickly if fish are chasing.')
    ];
  }

  if (windy || cloudy || rain > 35) {
    return [
      lure('Spinnerbait', 'bass / pike', 'Wind and clouds make moving baits more believable.'),
      lure('Chatterbait', 'bass', 'Good around grass, stained water, and active fish.'),
      lure('Squarebill crankbait', 'bass', 'Good for bumping shallow cover and finding reaction bites.')
    ];
  }

  return [
    lure('Soft plastic worm', 'bass', 'Best all-around choice when conditions are calm or bright.'),
    lure('Ned rig', 'bass / panfish', 'Finesse option when the bite is slow.'),
    lure('Small swimbait', 'bass / pike', 'Subtle search bait if you still want to cover water.')
  ];
}

function lure(name, target, why) {
  return { name, target, why };
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
  pressureFact.textContent = `${Math.round(current.pressure_msl)} hPa`;
  sunsetFact.textContent = formatTime(weather.daily.sunset?.[0]);
  whyText.textContent = analysis.reasons.length ? analysis.reasons.join(', ') + '.' : 'Neutral conditions with no major weather advantage or penalty.';

  resultCard.hidden = false;
  lureCard.hidden = false;
  weatherCard.hidden = false;
}

function formatTarget(value) {
  return value.split('/').map((part) => part.trim()).join(' / ');
}

function formatTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
