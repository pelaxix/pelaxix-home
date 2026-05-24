const mapPickerPanel = document.querySelector('#mapPickerPanel');
const mapPickedText = document.querySelector('#mapPickedText');
let fishcastMap = null;
let pickedMarker = null;
let pickedPoint = null;

const originalLocationModeHandler = () => {
  spotPickerLabel.hidden = locationMode.value !== 'spot';
  mapPickerPanel.hidden = locationMode.value !== 'map';

  if (locationMode.value === 'map') {
    initFishCastMap();
    setTimeout(() => fishcastMap?.invalidateSize(), 50);
  }
};

locationMode.addEventListener('change', originalLocationModeHandler);
originalLocationModeHandler();
preventAccidentalPageZoom();

function initFishCastMap() {
  if (fishcastMap || !window.L) return;

  fishcastMap = L.map('fishcastMap').setView([43.2696, -79.8714], 11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(fishcastMap);

  fishcastMap.on('click', (event) => {
    pickedPoint = {
      lat: event.latlng.lat,
      lng: event.latlng.lng,
      name: 'picked map point'
    };

    if (!pickedMarker) {
      pickedMarker = L.marker(event.latlng).addTo(fishcastMap);
    } else {
      pickedMarker.setLatLng(event.latlng);
    }

    mapPickedText.textContent = `Selected: ${pickedPoint.lat.toFixed(5)}, ${pickedPoint.lng.toFixed(5)}`;
  });
}

function preventAccidentalPageZoom() {
  document.addEventListener('gesturestart', (event) => {
    if (!event.target.closest?.('.leaflet-container')) {
      event.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1 && !event.target.closest?.('.leaflet-container')) {
      event.preventDefault();
    }
  }, { passive: false });
}

const baseGetCoordinates = getCoordinates;
getCoordinates = function getCoordinatesWithMapPicker() {
  if (locationMode.value === 'map') {
    if (!pickedPoint) throw new Error('Tap the map to pick a point first.');
    return Promise.resolve(pickedPoint);
  }

  return baseGetCoordinates();
};
