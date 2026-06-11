export function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id") || "";
  const home = cleanValue(url.searchParams.get("home"), 80);
  const away = cleanValue(url.searchParams.get("away"), 80);
  const kickoff = new Date(url.searchParams.get("kickoff") || "");

  if (!/^\d{1,3}$/.test(id) || !home || !away || Number.isNaN(kickoff.getTime())) {
    return new Response("Invalid calendar event.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  const eventEnd = new Date(kickoff.getTime() + 135 * 60 * 1000);
  const title = `${home} vs ${away}`;
  const description = "2026 World Cup match · Added from Pelaxix World Cup Schedule";
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pelaxix//World Cup Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:worldcup-2026-match-${id}@pelaxix.com`,
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
  const filename = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}.ics"`,
      "Cache-Control": "public, max-age=86400"
    }
  });
}

function cleanValue(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

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
