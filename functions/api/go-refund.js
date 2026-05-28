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

  try {
    const response = await fetch(getEligibilityUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(checkedTrip),
    });

    const text = await response.text();
    const data = safeJson(text);

    if (!response.ok) {
      return jsonResponse({
        ok: false,
        eligible: null,
        label: "Unavailable",
        reason: `Eligibility check failed with HTTP ${response.status}.`,
        checkedTrip,
        raw: data,
        checkedAt: new Date().toISOString(),
      }, 502);
    }

    const eligible = Boolean(data && data.eligible);

    return jsonResponse({
      ok: true,
      eligible,
      label: eligible ? "YES" : "NO",
      reason: data && data.reason ? data.reason : null,
      checkedTrip,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      eligible: null,
      label: "Unavailable",
      reason: error && error.message ? error.message : "Eligibility check unavailable.",
      checkedTrip,
      checkedAt: new Date().toISOString(),
    }, 502);
  }
}

function getEligibilityUrl() {
  return [
    "https://api.metrolinx.com",
    "external",
    "go",
    "serviceguarantee",
    "trip",
    "eligible",
  ].join("/");
}

function safeJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
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
