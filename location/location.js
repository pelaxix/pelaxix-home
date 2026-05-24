const STORAGE_KEY = 'pelaxix-location-snap-saved';

const coordinateText = document.querySelector('#coordinateText');
const locationMeta = document.querySelector('#locationMeta');
const statusMessage = document.querySelector('#statusMessage');
const refreshButton = document.querySelector('#refreshButton');
const shareButton = document.querySelector('#shareButton');
const copyButton = document.querySelector('#copyButton');
const whatsappButton = document.querySelector('#whatsappButton');
const saveParkingButton = document.querySelector('#saveParkingButton');
const savedCard = document.querySelector('#savedCard');
const savedCoordinateText = document.querySelector('#savedCoordinateText');
const savedMeta = document.querySelector('#savedMeta');
const shareSavedButton = document.querySelector('#shareSavedButton');
const copySavedButton = document.querySelector('#copySavedButton');
const whatsappSavedButton = document.querySelector('#whatsappSavedButton');
const clearSavedButton = document.querySelector('#clearSavedButton');

let currentLocation = null;

refreshButton.addEventListener('click', requestLocation);
shareButton.addEventListener('click', () => shareLocation(currentLocation, 'current'));
copyButton.addEventListener('click', () => copyLocation(currentLocation, 'current', 'Copied current location.'));
saveParkingButton.addEventListener('click', saveParkingSpot);
shareSavedButton.addEventListener('click', () => shareLocation(getSavedSpot(), 'parking'));
copySavedButton.addEventListener('click', () => copyLocation(getSavedSpot(), 'parking', 'Copied saved parking spot.'));
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
  shareButton.disabled = true;
  copyButton.disabled = true;
  saveParkingButton.disabled = true;
  whatsappButton.classList.add('disabled-link');
  whatsappButton.href = '#';

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
  setStatus('Location ready. Tap Share location, or Copy location if you prefer pasting manually.');
}

function handleLocationError(error) {
  currentLocation = null;
  shareButton.disabled = true;
  copyButton.disabled = true;
  saveParkingButton.disabled = true;
  whatsappButton.classList.add('disabled-link');
  whatsappButton.href = '#';
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
  whatsappButton.href = buildWhatsAppUrl(buildShareMessage(location, 'current'));
  whatsappButton.classList.remove('disabled-link');
  shareButton.disabled = false;
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
  whatsappSavedButton.href = buildWhatsAppUrl(buildShareMessage(saved, 'parking'));
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

async function shareLocation(location, type) {
  if (!location) return;
  const message = buildShareMessage(location, type);

  if (navigator.share) {
    try {
      await navigator.share({ text: message, url: buildGoogleMapsUrl(location) });
      setStatus('Location shared.');
      return;
    } catch (error) {
      if (error.name === 'AbortError') {
        setStatus('Share cancelled.');
        return;
      }
    }
  }

  await copyLocation(location, type, 'Native sharing is not available here, so I copied it instead.');
}

async function copyLocation(location, type, successMessage) {
  if (!location) return;
  const message = buildShareMessage(location, type);

  try {
    await navigator.clipboard.writeText(message);
    setStatus(successMessage);
  } catch {
    setStatus('Could not copy automatically. Select the coordinates and copy manually.');
  }
}

function buildShareMessage(location, type) {
  if (type === 'parking') {
    return `Car's here: ${formatCoordinates(location)}\n\nGoogle Maps: ${buildGoogleMapsUrl(location)}\n\nSaved: ${formatTime(location.timestamp)}\nAccuracy: ±${Math.round(location.accuracy)} m`;
  }

  return `I’m here: ${formatCoordinates(location)}\n\nGoogle Maps: ${buildGoogleMapsUrl(location)}\n\nAccuracy: ±${Math.round(location.accuracy)} m`;
}

function buildGoogleMapsUrl(location) {
  return `https://maps.google.com/?q=${location.lat},${location.lng}`;
}

function buildWhatsAppUrl(message) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
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
