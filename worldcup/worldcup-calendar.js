const calendarSchedule = document.querySelector("#schedule");

function openCalendarEvent(match) {
  const params = new URLSearchParams({
    id: match.id,
    home: match.home,
    away: match.away,
    kickoff: match.kickoffUtc
  });

  window.location.href = `/api/worldcup-calendar?${params}`;
}

function enhanceCalendarTimes() {
  calendarSchedule.querySelectorAll(".match-row > time").forEach((time) => {
    const match = MATCHES.find((item) => item.kickoffUtc === time.dateTime);
    if (!match) return;
    const button = document.createElement("button");
    button.className = "time-pill";
    button.type = "button";
    button.dataset.calendarMatch = match.id;
    button.title = "Add to calendar";
    button.setAttribute("aria-label", `Add ${match.home} vs ${match.away} at ${time.textContent} to calendar`);
    time.replaceWith(button);
    button.appendChild(time);
  });
}

const calendarStyles = document.createElement("style");
calendarStyles.textContent = `
.time-pill { appearance: none; border: 0; min-width: 92px; border-radius: 999px; padding: 10px 12px; background: #f8fafc; color: #0f172a; font: inherit; font-weight: 900; text-align: center; white-space: nowrap; cursor: pointer; transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.time-pill:hover { background: #e0f2fe; box-shadow: 0 0 0 2px rgba(125, 211, 252, 0.35); transform: translateY(-1px); }
.time-pill:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.time-pill:active { transform: translateY(0); }
.time-pill time { color: inherit; font: inherit; }
@media (max-width: 680px) { .time-pill { min-width: 70px; padding: 8px; font-size: clamp(0.72rem, 3.1vw, 0.84rem); } }
`;
document.head.appendChild(calendarStyles);

calendarSchedule.addEventListener("click", (event) => {
  const pill = event.target.closest("[data-calendar-match]");
  if (!pill) return;
  const match = MATCHES.find((item) => item.id === Number(pill.dataset.calendarMatch));
  if (match) openCalendarEvent(match);
});

new MutationObserver(enhanceCalendarTimes).observe(calendarSchedule, { childList: true, subtree: true });
enhanceCalendarTimes();
