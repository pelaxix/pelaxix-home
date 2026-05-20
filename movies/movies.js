const LETTERBOXD_USERNAME = "pelaxix";

const statusMessage = document.querySelector("#statusMessage");
const movieGrid = document.querySelector("#movieGrid");

loadShelf();

async function loadShelf() {
  setStatus("Loading recent Letterboxd activity...");
  movieGrid.innerHTML = "";

  try {
    const response = await fetch(`/api/letterboxd?username=${encodeURIComponent(LETTERBOXD_USERNAME)}&ts=${Date.now()}`, {
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
    const datePrefix = item.dateType || "Watched";
    const date = item.dateLabel ? `<span class="pill">${escapeHtml(datePrefix)} ${escapeHtml(item.dateLabel)}</span>` : "";
    const description = item.description ? `<p class="movie-description">${escapeHtml(item.description)}</p>` : "";

    return `
      <article class="movie-card">
        <div class="movie-topline">
          <a class="poster-wrap" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${poster}</a>
          <div class="movie-header">
            <h3>${escapeHtml(item.movieTitle || item.title)}</h3>
            <div class="movie-meta">${rating}${date}</div>
          </div>
        </div>
        <div class="movie-body">
          ${description}
          <a class="movie-link" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">Open on Letterboxd</a>
        </div>
      </article>
    `;
  }).join("");
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
