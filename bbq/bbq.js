const STORAGE_KEY = "pelaxix-bbq-log";

const form = document.querySelector("#cookForm");
const entriesList = document.querySelector("#entriesList");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const clearButton = document.querySelector("#clearButton");
const exportButton = document.querySelector("#exportButton");
const cookDate = document.querySelector("#cookDate");

const totalCooks = document.querySelector("#totalCooks");
const favoriteProtein = document.querySelector("#favoriteProtein");
const averageRating = document.querySelector("#averageRating");

let entries = loadEntries();

cookDate.valueAsDate = new Date();
renderEntries();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const entry = {
    id: crypto.randomUUID(),
    cookName: clean(formData.get("cookName")),
    cookDate: formData.get("cookDate"),
    protein: formData.get("protein"),
    method: formData.get("method"),
    grillTemp: clean(formData.get("grillTemp")),
    internalTemp: clean(formData.get("internalTemp")),
    cookTime: clean(formData.get("cookTime")),
    flavour: clean(formData.get("flavour")),
    notes: clean(formData.get("notes")),
    nextTime: clean(formData.get("nextTime")),
    rating: Number(formData.get("rating")),
    createdAt: new Date().toISOString()
  };

  entries = [entry, ...entries];
  saveEntries();
  form.reset();
  cookDate.valueAsDate = new Date();
  renderEntries();
});

searchInput.addEventListener("input", renderEntries);

clearButton.addEventListener("click", () => {
  if (!entries.length) return;

  const confirmed = confirm("Clear every BBQ log entry saved in this browser?");
  if (!confirmed) return;

  entries = [];
  saveEntries();
  renderEntries();
});

exportButton.addEventListener("click", () => {
  const data = JSON.stringify(entries, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pelaxix-bbq-log-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

entriesList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const entryId = button.dataset.id;
  const action = button.dataset.action;

  if (action === "delete") {
    entries = entries.filter((entry) => entry.id !== entryId);
    saveEntries();
    renderEntries();
  }

  if (action === "duplicate") {
    const original = entries.find((entry) => entry.id === entryId);
    if (!original) return;

    const copy = {
      ...original,
      id: crypto.randomUUID(),
      cookName: `${original.cookName} copy`,
      createdAt: new Date().toISOString()
    };

    entries = [copy, ...entries];
    saveEntries();
    renderEntries();
  }
});

function loadEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.warn("Could not load BBQ entries", error);
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function renderEntries() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleEntries = entries.filter((entry) => {
    const searchable = [
      entry.cookName,
      entry.cookDate,
      entry.protein,
      entry.method,
      entry.grillTemp,
      entry.internalTemp,
      entry.cookTime,
      entry.flavour,
      entry.notes,
      entry.nextTime,
      String(entry.rating)
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });

  updateStats();
  emptyState.hidden = visibleEntries.length > 0;
  entriesList.innerHTML = visibleEntries.map(createEntryCard).join("");
}

function createEntryCard(entry) {
  return `
    <article class="entry-card">
      <header>
        <div>
          <h3>${escapeHtml(entry.cookName)}</h3>
          <div class="entry-meta">
            <span class="pill">${formatDate(entry.cookDate)}</span>
            <span class="pill">${escapeHtml(entry.protein)}</span>
            <span class="pill">${escapeHtml(entry.method)}</span>
            <span class="pill">${"★".repeat(entry.rating)}${"☆".repeat(5 - entry.rating)}</span>
          </div>
        </div>
        <div class="card-buttons">
          <button class="small-button" type="button" data-action="duplicate" data-id="${entry.id}">Duplicate</button>
          <button class="small-button delete" type="button" data-action="delete" data-id="${entry.id}">Delete</button>
        </div>
      </header>

      <div class="detail-grid">
        ${detail("Grill temp", entry.grillTemp)}
        ${detail("Internal", entry.internalTemp)}
        ${detail("Time", entry.cookTime)}
        ${detail("Flavour", entry.flavour)}
      </div>

      <div class="entry-notes">
        ${entry.notes ? `<p><strong>Notes:</strong> ${escapeHtml(entry.notes)}</p>` : ""}
        ${entry.nextTime ? `<p><strong>Next time:</strong> ${escapeHtml(entry.nextTime)}</p>` : ""}
      </div>
    </article>
  `;
}

function detail(label, value) {
  return `
    <div class="detail">
      <strong>${label}</strong>
      <span>${value ? escapeHtml(value) : "-"}</span>
    </div>
  `;
}

function updateStats() {
  totalCooks.textContent = entries.length;

  if (!entries.length) {
    favoriteProtein.textContent = "-";
    averageRating.textContent = "-";
    return;
  }

  const proteinCounts = entries.reduce((counts, entry) => {
    counts[entry.protein] = (counts[entry.protein] || 0) + 1;
    return counts;
  }, {});

  const topProtein = Object.entries(proteinCounts).sort((a, b) => b[1] - a[1])[0][0];
  const ratingAverage = entries.reduce((sum, entry) => sum + entry.rating, 0) / entries.length;

  favoriteProtein.textContent = topProtein;
  averageRating.textContent = ratingAverage.toFixed(1);
}

function clean(value) {
  return String(value || "").trim();
}

function formatDate(value) {
  if (!value) return "No date";
  const [year, month, day] = value.split("-");
  return `${month}/${day}/${year}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
