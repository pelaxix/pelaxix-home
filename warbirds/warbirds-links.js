// Small presentation adjustments kept separate from the live-board script.
(() => {
  const title = document.querySelector("#watchlist-title");

  if (title) {
    title.textContent = "Tracked aircrafts";
  }

  document.head.insertAdjacentHTML(
    "beforeend",
    `<style>
      @media (min-width: 821px) {
        .watchlist-section .section-heading {
          align-items: center;
        }

        .watchlist-section .section-copy {
          flex: 0 0 auto;
          max-width: none !important;
          margin: 0 !important;
          font-size: 0.88rem !important;
          text-align: right;
          white-space: nowrap;
        }
      }
    </style>`,
  );
})();
