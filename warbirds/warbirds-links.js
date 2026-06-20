(() => {
  const workerHost = [
    "hamilton-warbird-watch",
    "pelaxix",
    "workers",
    "dev",
  ].join(".");
  const statusEndpoint = `https://${workerHost}/public`;

  const styles = document.createElement("style");
  styles.textContent = `
    .airplanes-live-link {
      cursor: pointer;
    }

    .live-card.airplanes-live-link {
      padding-bottom: 58px;
    }

    .live-card.airplanes-live-link:hover,
    .live-card.airplanes-live-link:focus-visible {
      border-color: rgba(168, 228, 107, 0.72) !important;
      outline: none;
    }

    .live-card.airplanes-live-link::after {
      content: "Follow this plane’s live route";
      position: absolute;
      right: 18px;
      bottom: 18px;
      left: 18px;
      width: auto;
      height: auto;
      border: 0;
      border-radius: 0;
      margin: 0;
      color: var(--green);
      background: transparent;
      font-family: "DM Mono", monospace;
      font-size: 0.68rem;
      letter-spacing: 0.04em;
      line-height: 1.3;
      text-align: center;
      text-transform: uppercase;
    }
  `;
  document.head.append(styles);

  function registrationFromText(value) {
    const match = String(value || "").match(/(?:C-G[A-Z]{3}|CF-[A-Z]{3})/i);
    return match ? match[0].toUpperCase() : null;
  }

  function openGlobe(hex) {
    window.open(
      `https://globe.airplanes.live/?icao=${encodeURIComponent(hex)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function makeClickable(element, hex) {
    if (!element || !hex || element.dataset.globeLinkReady === "true") {
      return;
    }

    element.dataset.globeLinkReady = "true";
    element.classList.add("airplanes-live-link");
    element.setAttribute("role", "link");
    element.setAttribute("tabindex", "0");
    element.setAttribute(
      "aria-label",
      "Follow this plane’s live route on Airplanes.live",
    );
    element.setAttribute("title", "Follow this plane’s live route");

    element.addEventListener("click", () => openGlobe(hex));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openGlobe(hex);
      }
    });
  }

  async function decorateLiveCards() {
    try {
      const response = await fetch(statusEndpoint, { cache: "no-store" });
      const payload = await response.json();
      const active = Array.isArray(payload.active) ? payload.active : [];
      const hexByRegistration = new Map(
        active
          .filter((aircraft) => aircraft.registration && aircraft.hex)
          .map((aircraft) => [aircraft.registration.toUpperCase(), aircraft.hex]),
      );

      document.querySelectorAll(".live-card").forEach((card) => {
        const registration = registrationFromText(card.textContent);
        makeClickable(card, hexByRegistration.get(registration));
      });
    } catch (error) {
      console.warn("Could not add Airplanes.live links", error);
    }
  }

  const liveCards = document.querySelector("#liveCards");

  if (liveCards) {
    new MutationObserver(decorateLiveCards).observe(liveCards, {
      childList: true,
      subtree: true,
    });
  }

  decorateLiveCards();
})();
