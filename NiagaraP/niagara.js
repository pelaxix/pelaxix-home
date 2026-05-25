const map = L.map("map").setView([43.0896, -79.0769], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "OpenStreetMap contributors"
}).addTo(map);

const cardsKicker = document.querySelector("#cards-kicker");
const cardsTitle = document.querySelector("#cards-title");
const cardsContainer = document.querySelector("#location-cards");
const showAllButton = document.querySelector("#show-all-button");
const filterButtons = document.querySelectorAll(".filter-button");
const locateButton = document.querySelector("#locate-button");
const markerLayer = L.layerGroup().addTo(map);
const markers = [];
let activeFilter = "all";
let selectedLocationName = null;
let activeMarker = null;
let userMarker = null;
let userAccuracy = null;
let userPosition = null;

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

function directionsUrl(location) {
  if (location.mapsUrl) return location.mapsUrl;
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(location.lat + "," + location.lng);
}

function makeLocationCard(location) {
  const card = document.createElement("article");
  const textBox = document.createElement("div");
  const kicker = document.createElement("p");
  const title = document.createElement("h3");
  const address = document.createElement("p");
  const distance = document.createElement("p");
  const link = document.createElement("a");

  card.className = "location-card " + (location.type === "boat-launch" ? "boat-card" : "parking-card");
  if (selectedLocationName === location.name) card.classList.add("selected-card");

  kicker.className = "card-kicker";
  kicker.textContent = typeLabel(location.type);
  title.textContent = location.name;
  address.className = "card-copy";
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

  if (markers.length > 0) {
    const bounds = L.latLngBounds(markers.map((marker) => marker.getLatLng()));
    map.fitBounds(bounds, { padding: [28, 28] });
  }
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
  locateButton.textContent = "Update my location";
  locateButton.classList.remove("loading");
  selectedLocationName = null;
  renderAllCards();
}

function locationError() {
  locateButton.textContent = "Use my location";
  locateButton.classList.remove("loading");
  showMessage("Location blocked", "Could not get your location.", "Check your browser location permission and make sure the site is using HTTPS.");
}

function requestLocation() {
  if (!navigator.geolocation) {
    showMessage("Not supported", "Location is not available.", "This browser does not support geolocation.");
    return;
  }

  locateButton.textContent = "Finding you...";
  locateButton.classList.add("loading");

  navigator.geolocation.getCurrentPosition(showUserLocation, locationError, {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 30000
  });
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

locateButton.addEventListener("click", requestLocation);

addMarkers();
renderAllCards();
