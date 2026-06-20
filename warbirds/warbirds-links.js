// Kept separate for cached markup, but now also aligns the public page with the one-minute Worker schedule.
(() => {
  const refreshEveryMs = 60 * 1000;
  const watchlistCopy = document.querySelector(".section-copy");
  const status = document.querySelector("#fetchStatus");

  if (watchlistCopy) {
    watchlistCopy.textContent = "Checked every minute from 8 AM to 11 PM Hamilton time.";
  }

  function updateStatusCopy() {
    if (!status) {
      return;
    }

    status.textContent = status.textContent
      .replace(/updates every 3 min/g, "updates every min")
      .replace(/retrying every 3 min/g, "retrying every min");
  }

  updateStatusCopy();

  if (status) {
    new MutationObserver(updateStatusCopy).observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  window.setInterval(() => {
    if (!document.hidden && typeof window.load === "function") {
      window.load();
    }
  }, refreshEveryMs);
})();
