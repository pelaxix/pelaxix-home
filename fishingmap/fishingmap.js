const DEFAULT_CENTER = [43.2557, -79.8711];
const DEFAULT_ZOOM = 10;

const map = L.map("map", {
  scrollWheelZoom: true
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const markersLayer = L.layerGroup().addTo(map);
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const resetButton = document.querySelector("#resetButton");
const spotList = document.querySelector("#spotList");
const spotCount = document.querySelector("#spotCount");

let spots = [];
let visibleSpots = [];

loadSpots();

searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);

resetButton.addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "all";
  render();
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
});

spotList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-spot-id]");
  if (!button) return;

  const spot = spots.find((item) => item.id === button.dataset.spotId);
  if (!spot) return;

  map.setView([spot.lat, spot.lng], 14);
  const marker = markersLayer.getLayers().find((layer) => layer.options.spotId === spot.id);
  if (marker) marker.openPopup();
});

async function loadSpots() {
  try {
    const response = await fetch("spots.json");
    spots = await response.json();
    populateCategories();
    render();
  } catch (error) {
    console.error("Could not load fishing spots", error);
    spotList.innerHTML = `<p class="error">Could not load fishing spots.</p>`;
  }
}

function populateCategories() {
  const categories = [...new Set(spots.map((spot) => spot.category))].sort();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;

  visibleSpots = spots.filter((spot) => {
    const searchable = [
      spot.name,
      spot.category,
      spot.access,
      spot.notes,
      spot.bestTime,
      ...(spot.species || [])
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchable.includes(query);
    const matchesCategory = selectedCategory === "all" || spot.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  spotCount.textContent = visibleSpots.length;
  renderMarkers();
  renderSpotList();
}

function renderMarkers() {
  markersLayer.clearLayers();

  visibleSpots.forEach((spot) => {
    const marker = L.marker([spot.lat, spot.lng], { spotId: spot.id })
      .bindPopup(createPopup(spot))
      .addTo(markersLayer);
  });

  if (visibleSpots.length > 0) {
    const group = L.featureGroup(markersLayer.getLayers());
    map.fitBounds(group.getBounds().pad(0.18), { maxZoom: 12 });
  }
}

function renderSpotList() {
  if (!visibleSpots.length) {
    spotList.innerHTML = `<div class="empty-state">No spots match your filters.</div>`;
    return;
  }

  spotList.innerHTML = visibleSpots.map(createSpotCard).join("");
}

function createPopup(spot) {
  return `
    <div>
      <h3 class="popup-title">${escapeHtml(spot.name)}</h3>
      <strong>${escapeHtml(spot.category)}</strong><br />
      <span>${escapeHtml((spot.species || []).join(", "))}</span>
      <p class="popup-notes">${escapeHtml(spot.notes)}</p>
    </div>
  `;
}

function createSpotCard(spot) {
  return `
    <article class="spot-card">
      <div>
        <h3>${escapeHtml(spot.name)}</h3>
        <div class="spot-meta">
          <span class="pill">${escapeHtml(spot.category)}</span>
          <span class="pill">${escapeHtml(spot.bestTime)}</span>
        </div>
      </div>
      <p><strong>Species:</strong> ${escapeHtml((spot.species || []).join(", "))}</p>
      <p><strong>Access:</strong> ${escapeHtml(spot.access)}</p>
      <p>${escapeHtml(spot.notes)}</p>
      <button class="button secondary" type="button" data-spot-id="${spot.id}">View on map</button>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
