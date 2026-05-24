const STORAGE_KEY = 'pelaxix-location-snap-saved';

const coordinateText = document.querySelector('#coordinateText');
const locationMeta = document.querySelector('#locationMeta');
const statusMessage = document.querySelector('#statusMessage');
const refreshButton = document.querySelector('#refreshButton');
const copyButton = document.querySelector('#copyButton');
const saveParkingButton = document.querySelector('#saveParkingButton');
const savedCard = document.querySelector('#savedCard');
const savedCoordinateText = document.querySelector('#savedCoordinateText');
const savedMeta = document.querySelector('#savedMeta');
const copySavedButton = document.querySelector('#copySavedButton');
const clearSavedButton = document.querySelector('#clearSavedButton');

let currentLocation = null;

refreshButton.addEventListener('click', requestLocation);
copyButton.addEventListener('click', () => copyLocation(currentLocation, 'Copied current location.'));
saveParkingButton.addEventListener('click', saveParkingSpot);
copySavedButton.addEventListener('click', () => copyLocation(getSavedSpot(), 'Copied saved spot.'));
clearSavedButton.addEventListener('click', clearSavedSpot);

renderSavedSpot();
requestLocation();

function requestLocation() {
  if (!navigator.geolocation) {
    setStatus('This browser does not support GPS location.');
    coordinateText.textContent = 'Location unavailable';
    return;
  }

  setStatus('Getting your location...');
  coordinateText.textContent = 'Getting location...';
  locationMeta.textContent = 'Your browser may ask for GPS permission.';
  copyButton.disabled = true;
  saveParkingButton.disabled = true;

  navigator.geolocation.getCurrentPosition(handleLocation, handleLocationError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  });
}

function handleLocation(position) {
  currentLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: Date.now()
  };

  renderLocation(currentLocation);
  setStatus('Location ready. Tap Copy location to put it on your clipboard.');
}

function handleLocationError(error) {
  currentLocation = null;
  copyButton.disabled = true;
  saveParkingButton.disabled = true;
  coordinateText.textContent = 'Location unavailable';

  if (error.code === error.PERMISSION_DENIED) {
    setStatus('Location permission was denied. Allow location access in your browser settings and try again.');
  } else if (error.code === error.TIMEOUT) {
    setStatus('Location request timed out. Try again somewhere with a clearer GPS signal.');
  } else {
    setStatus('Could not get your location. Try again.');
  }
}

function renderLocation(location) {
  coordinateText.textContent = formatCoordinates(location);
  locationMeta.textContent = `Accuracy: ±${Math.round(location.accuracy)} m · ${formatTime(location.timestamp)}`;
  copyButton.disabled = false;
  saveParkingButton.disabled = false;
}

function saveParkingSpot() {
  if (!currentLocation) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLocation));
  renderSavedSpot();
  setStatus('Parking spot saved on this device.');
}

function renderSavedSpot() {
  const saved = getSavedSpot();

  if (!saved) {
    savedCard.hidden = true;
    return;
  }

  savedCoordinateText.textContent = formatCoordinates(saved);
  savedMeta.textContent = `Saved: ${formatTime(saved.timestamp)} · Accuracy: ±${Math.round(saved.accuracy)} m`;
  savedCard.hidden = false;
}

function clearSavedSpot() {
  localStorage.removeItem(STORAGE_KEY);
  renderSavedSpot();
  setStatus('Saved parking spot cleared.');
}

function getSavedSpot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function copyLocation(location, successMessage) {
  if (!location) return;
  const message = buildShareMessage(location);

  try {
    await navigator.clipboard.writeText(message);
    setStatus(successMessage);
  } catch {
    setStatus('Could not copy automatically. Select the coordinates and copy manually.');
  }
}

function buildShareMessage(location) {
  return `I’m here: ${formatCoordinates(location)}\nGoogle Maps: ${buildGoogleMapsUrl(location)}\nAccuracy: ±${Math.round(location.accuracy)} m`;
}

function buildGoogleMapsUrl(location) {
  return `https://maps.google.com/?q=${location.lat},${location.lng}`;
}

function formatCoordinates(location) {
  return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString([], {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  });
}

function setStatus(message) {
  statusMessage.textContent = message;
}
