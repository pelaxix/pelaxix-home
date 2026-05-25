const map = L.map("map").setView([43.0896, -79.0769], 12);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "OpenStreetMap contributors"
}).addTo(map);

const cardsKicker = document.querySelector("#cards-kicker");
const cardsTitle = document.querySelector("#cards-title");
const cardsContainer = document.querySelector("#location-cards");
const showAllButton = document.querySelector("#show-all-button");
const filterButtons = document.querySelectorAll(".filter-button");
const markerLayer = L.layerGroup().addTo(map);
const markers = [];
let activeFilter = "all";
let selectedLocationName = null;
let activeMarker = null;
let userMarker = null;
let userAccuracy = null;
let userPosition = null;
let locateControlButton = null;
let hasTriedInitialLocation = false;

function typeLabel(type) {
  return type === "boat-launch" ? "Boat launch" : "Parking";
}

function filteredLocations() {
  return NIAGARA_LOCATIONS.filter((location) => activeFilter === "all" || location.type === activeFilter);
}

function distanceKm(from, to) {
  const earthRadiusKm = 6371;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const deltaLat = (to.lat - from.lat) * Math.PI / 180;
  const deltaLng = (to.lng - from.lng) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function sortedLocations(locations) {
  if (!userPosition) return locations;
  return [...locations].sort((a, b) => distanceKm(userPosition, a) - distanceKm(userPosition, b));
}

function formatDistance(location) {
  if (!userPosition) return "";
  const km = distanceKm(userPosition, location);
  return km < 1 ? Math.round(km * 1000) + " m away" : km.toFixed(1) + " km away";
}

function markerIcon(location, selected) {
  const label = location.type === "boat-launch" ? "⚓" : "P";
  const typeClass = location.type === "boat-launch" ? "boat-marker" : "parking-marker";
  const selectedClass = selected ? " selected-marker" : "";

  return L.divIcon({
    className: "custom-marker-wrapper",
    html: "<span class='" + typeClass + selectedClass + "'>" + label + "</span>",
    iconSize: selected ? [44, 44] : [36, 36],
    iconAnchor: selected ? [22, 22] : [18, 18]
  });
}

function userIcon() {
  return L.divIcon({
    className: "custom-marker-wrapper",
    html: "<span class='user-marker'></span>",
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
}

function placeUrl(location) {
  if (location.mapsUrl) return location.mapsUrl;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(location.lat + "," + location.lng);
}

function directionsUrl(location) {
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(location.lat + "," + location.lng);
}

function makeLocationCard(location) {
  const card = document.createElement("article");
  const textBox = document.createElement("div");
  const kicker = document.createElement("p");
  const title = document.createElement("h3");
  const address = document.createElement("a");
  const distance = document.createElement("p");
  const link = document.createElement("a");

  card.className = "location-card " + (location.type === "boat-launch" ? "boat-card" : "parking-card");
  if (selectedLocationName === location.name) card.classList.add("selected-card");

  kicker.className = "card-kicker";
  kicker.textContent = typeLabel(location.type);
  title.textContent = location.name;
  address.className = "card-copy address-link";
  address.href = placeUrl(location);
  address.textContent = location.address;

  const distanceText = formatDistance(location);
  if (distanceText) {
    distance.className = "distance-copy";
    distance.textContent = distanceText;
    textBox.append(kicker, title, address, distance);
  } else {
    textBox.append(kicker, title, address);
  }

  link.className = "directions-button";
  link.href = directionsUrl(location);
  link.textContent = "Directions";

  card.append(textBox, link);
  return card;
}

function renderLocationCards(locations, titleText, kickerText) {
  cardsContainer.innerHTML = "";
  cardsTitle.textContent = titleText;
  cardsKicker.textContent = kickerText;
  showAllButton.hidden = selectedLocationName === null;

  sortedLocations(locations).forEach((location) => {
    cardsContainer.append(makeLocationCard(location));
  });
}

function renderAllCards() {
  selectedLocationName = null;
  const title = userPosition ? "Nearest locations first" : "Parking lots and boat launches";
  const kicker = activeFilter === "all" ? "All locations" : typeLabel(activeFilter);
  renderLocationCards(filteredLocations(), title, kicker);
}

function renderSelectedCard(location) {
  selectedLocationName = location.name;
  renderLocationCards([location], location.name, typeLabel(location.type));
}

function showMessage(label, titleText, copyText) {
  cardsContainer.innerHTML = "";
  cardsKicker.textContent = label;
  cardsTitle.textContent = titleText;
  showAllButton.hidden = selectedLocationName === null;

  const message = document.createElement("p");
  message.className = "card-copy message-copy";
  message.textContent = copyText;
  cardsContainer.append(message);
}

function selectLocation(location, marker) {
  if (activeMarker) activeMarker.setIcon(markerIcon(activeMarker.location, false));
  activeMarker = marker;
  marker.setIcon(markerIcon(location, true));
  marker.openPopup();
  map.setView([location.lat, location.lng], Math.max(map.getZoom(), 14));
  renderSelectedCard(location);
}

function addMarkers() {
  markerLayer.clearLayers();
  markers.length = 0;
  activeMarker = null;

  filteredLocations().forEach((location) => {
    const marker = L.marker([location.lat, location.lng], { icon: markerIcon(location, false) });
    marker.location = location;
    marker.bindPopup(location.name + "<br>" + typeLabel(location.type));
    marker.on("click", () => selectLocation(location, marker));
    marker.addTo(markerLayer);
    markers.push(marker);
  });
}

function fitVisibleMarkers() {
  if (markers.length === 0) return;
  const bounds = L.latLngBounds(markers.map((marker) => marker.getLatLng()));
  map.fitBounds(bounds, { padding: [28, 28] });
}

function setLocateLoading(isLoading) {
  if (!locateControlButton) return;
  locateControlButton.classList.toggle("locating", isLoading);
  locateControlButton.title = isLoading ? "Finding you..." : "Recenter on my location";
}

function showUserLocation(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const accuracy = position.coords.accuracy || 0;
  const latLng = [lat, lng];
  userPosition = { lat, lng };

  if (!userMarker) {
    userMarker = L.marker(latLng, { icon: userIcon(), zIndexOffset: 1000 }).addTo(map);
    userMarker.bindPopup("You are here");
  } else {
    userMarker.setLatLng(latLng);
  }

  if (!userAccuracy) {
    userAccuracy = L.circle(latLng, { radius: accuracy, className: "user-accuracy" }).addTo(map);
  } else {
    userAccuracy.setLatLng(latLng);
    userAccuracy.setRadius(accuracy);
  }

  map.setView(latLng, Math.max(map.getZoom(), 15));
  setLocateLoading(false);
  selectedLocationName = null;
  renderAllCards();
}

function locationError() {
  setLocateLoading(false);
  if (!hasTriedInitialLocation) return;
  fitVisibleMarkers();
  renderAllCards();
}

function requestLocation() {
  if (!navigator.geolocation) {
    fitVisibleMarkers();
    renderAllCards();
    return;
  }

  hasTriedInitialLocation = true;
  setLocateLoading(true);

  navigator.geolocation.getCurrentPosition(showUserLocation, locationError, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 30000
  });
}

function addLocateControl() {
  const LocateControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function () {
      const container = L.DomUtil.create("div", "leaflet-bar locate-control");
      const button = L.DomUtil.create("button", "locate-control-button", container);
      button.type = "button";
      button.title = "Recenter on my location";
      button.setAttribute("aria-label", "Recenter on my location");
      button.textContent = "◎";
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(button, "click", requestLocation);
      locateControlButton = button;
      return container;
    }
  });

  map.addControl(new LocateControl());
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    selectedLocationName = null;
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    addMarkers();
    renderAllCards();
  });
});

showAllButton.addEventListener("click", () => {
  if (activeMarker) activeMarker.setIcon(markerIcon(activeMarker.location, false));
  activeMarker = null;
  renderAllCards();
});

addLocateControl();
addMarkers();
showMessage("Finding location", "Loading near you...", "If location permission is blocked, the map will fall back to showing all parking pass locations.");
requestLocation();
