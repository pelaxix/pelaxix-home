const DEFAULT_USERNAME = "pelaxix";
const USERNAME_STORAGE_KEY = "pelaxix-letterboxd-username";

const usernameInput = document.querySelector("#usernameInput");
const loadButton = document.querySelector("#loadButton");
const statusMessage = document.querySelector("#statusMessage");
const movieGrid = document.querySelector("#movieGrid");

usernameInput.value = localStorage.getItem(USERNAME_STORAGE_KEY) || DEFAULT_USERNAME;

loadButton.addEventListener("click", () => {
  loadShelf(usernameInput.value.trim());
});

usernameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loadShelf(usernameInput.value.trim());
  }
});

loadShelf(usernameInput.value.trim());

async function loadShelf(username) {
  const cleanUsername = sanitizeUsername(username || DEFAULT_USERNAME);
  usernameInput.value = cleanUsername;
  localStorage.setItem(USERNAME_STORAGE_KEY, cleanUsername);

  setStatus(`Loading recent Letterboxd activity for ${cleanUsername}...`);
  movieGrid.innerHTML = "";

  try {
    const response = await fetch(`/api/letterboxd?username=${encodeURIComponent(cleanUsername)}&ts=${Date.now()}`, {
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (!data.items.length) {
      setStatus("No recent Letterboxd activity found.");
      return;
    }

    renderMovies(data.items);
    setStatus(`Loaded ${data.items.length} recent item${data.items.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not load Letterboxd activity: ${error.message}`);
  }
}

function renderMovies(items) {
  movieGrid.innerHTML = items.map((item) => {
    const poster = item.poster
      ? `<img src="${escapeHtml(item.poster)}" alt="Poster for ${escapeHtml(item.movieTitle || item.title)}" loading="lazy" />`
      : `<div class="poster-placeholder">No poster</div>`;

    const rating = item.rating ? `<span class="pill">${escapeHtml(item.rating)}</span>` : "";
    const date = item.dateLabel ? `<span class="pill">${escapeHtml(item.dateLabel)}</span>` : "";
    const description = item.description ? `<p class="movie-description">${escapeHtml(item.description)}</p>` : "";

    return `
      <article class="movie-card">
        <a class="poster-wrap" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${poster}</a>
        <div>
          <h3>${escapeHtml(item.movieTitle || item.title)}</h3>
          <div class="movie-meta">${rating}${date}</div>
        </div>
        ${description}
        <a class="movie-link" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">Open on Letterboxd</a>
      </article>
    `;
  }).join("");
}

function sanitizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || DEFAULT_USERNAME;
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
