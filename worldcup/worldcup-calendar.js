const calendarSchedule = document.querySelector("#schedule");

function calendarTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function downloadCalendarEvent(match) {
  const kickoff = new Date(match.kickoffUtc);
  const eventEnd = new Date(kickoff.getTime() + 135 * 60 * 1000);
  const title = `${match.home} vs ${match.away}`;
  const description = "2026 World Cup match · Added from Pelaxix World Cup Schedule";
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pelaxix//World Cup Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:worldcup-2026-match-${match.id}@pelaxix.com`,
    `DTSTAMP:${calendarTimestamp(new Date())}`,
    `DTSTART:${calendarTimestamp(kickoff)}`,
    `DTEND:${calendarTimestamp(eventEnd)}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    "URL:https://pelaxix.com/worldcup/",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeCalendarText(title)} starts in 30 minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  link.href = url;
  link.download = `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  if (match) downloadCalendarEvent(match);
});

new MutationObserver(enhanceCalendarTimes).observe(calendarSchedule, { childList: true, subtree: true });
enhanceCalendarTimes();
