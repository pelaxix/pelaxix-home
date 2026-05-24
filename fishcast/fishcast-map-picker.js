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

function initFishCastMap() {
  if (fishcastMap || !window.L) return;

  fishcastMap = L.map('fishcastMap').setView([43.2696, -79.8714], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
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

const baseGetCoordinates = getCoordinates;
getCoordinates = function getCoordinatesWithMapPicker() {
  if (locationMode.value === 'map') {
    if (!pickedPoint) throw new Error('Tap the map to pick a point first.');
    return Promise.resolve(pickedPoint);
  }

  return baseGetCoordinates();
};
