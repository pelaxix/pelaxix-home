const map = L.map("map").setView([43.0896, -79.0769], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "OpenStreetMap contributors"
}).addTo(map);

const card = document.querySelector("#location-card");
const filterButtons = document.querySelectorAll(".filter-button");
const locateButton = document.querySelector("#locate-button");
const markerLayer = L.layerGroup().addTo(map);
const markers = [];
let activeFilter = "all";
let activeMarker = null;
let userMarker = null;
let userAccuracy = null;

function typeLabel(type) {
  return type === "boat-launch" ? "Boat launch" : "Parking";
}

function markerIcon(location, selected) {
  const label = location.type === "boat-launch" ? "B" : "P";
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

function renderCard(location) {
  card.innerHTML = "";

  const textBox = document.createElement("div");
  const kicker = document.createElement("p");
  const title = document.createElement("h2");
  const address = document.createElement("p");
  const link = document.createElement("a");

  kicker.className = "card-kicker";
  kicker.textContent = typeLabel(location.type);
  title.textContent = location.name;
  address.className = "card-copy";
  address.textContent = location.address;
  link.className = "directions-button";
  link.href = "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(location.lat + "," + location.lng);
  link.textContent = "Directions";

  textBox.append(kicker, title, address);
  card.append(textBox, link);
}

function showMessage(label, titleText, copyText) {
  card.innerHTML = "";
  const textBox = document.createElement("div");
  const kicker = document.createElement("p");
  const title = document.createElement("h2");
  const copy = document.createElement("p");
  kicker.className = "card-kicker";
  kicker.textContent = label;
  title.textContent = titleText;
  copy.className = "card-copy";
  copy.textContent = copyText;
  textBox.append(kicker, title, copy);
  card.append(textBox);
}

function selectLocation(location, marker) {
  if (activeMarker) activeMarker.setIcon(markerIcon(activeMarker.location, false));
  activeMarker = marker;
  marker.setIcon(markerIcon(location, true));
  marker.openPopup();
  map.setView([location.lat, location.lng], Math.max(map.getZoom(), 14));
  renderCard(location);
}

function resetCard(label) {
  showMessage(label, "Pick a pin.", "Tap any visible marker to open its directions card.");
}

function addMarkers() {
  markerLayer.clearLayers();
  markers.length = 0;
  activeMarker = null;

  NIAGARA_LOCATIONS.filter((location) => activeFilter === "all" || location.type === activeFilter).forEach((location) => {
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

  if (!userMarker) {
    userMarker = L.marker(latLng, { icon: userIcon(), zIndexOffset: 1000 }).addTo(map);
    userMarker.bindPopup("You are here");
  } else {
    userMarker.setLatLng(latLng);
  }

  if (!userAccuracy) {
    userAccuracy = L.circle(latLng, {
      radius: accuracy,
      className: "user-accuracy"
    }).addTo(map);
  } else {
    userAccuracy.setLatLng(latLng);
    userAccuracy.setRadius(accuracy);
  }

  map.setView(latLng, Math.max(map.getZoom(), 15));
  locateButton.textContent = "Update my location";
  locateButton.classList.remove("loading");
  showMessage("Your location", "You are on the map.", "The blue dot shows your approximate location. Tap any parking or boat launch pin for directions.");
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
    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    addMarkers();
    resetCard(button.textContent);
  });
});

locateButton.addEventListener("click", requestLocation);

addMarkers();
