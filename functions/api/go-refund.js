const TRIP_NUMBER = "1960";
const DEPARTURE_TIME = "07:54";
const FROM_STOP = "WR";
const TO_STOP = "UN";
const TIME_ZONE = "America/Toronto";

export async function onRequestGet() {
  const today = getTodayTorontoDate();
  const checkedTrip = {
    tripNumber: TRIP_NUMBER,
    departureDateTime: `${today}T${DEPARTURE_TIME}`,
    departureStationCode: FROM_STOP,
    arrivalStationCode: TO_STOP,
    lang: "en",
  };

  return jsonResponse({
    ok: true,
    eligible: null,
    label: "Unavailable",
    reason: "Eligibility lookup is not wired yet.",
    checkedTrip,
    checkedAt: new Date().toISOString(),
  });
}

function getTodayTorontoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
