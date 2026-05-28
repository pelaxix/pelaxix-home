const API_BASE = "https://api.openmetrolinx.com/OpenDataAPI/api/V1";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const mode = (url.searchParams.get("mode") || "delay").trim().toLowerCase();
  const fromStop = (url.searchParams.get("fromStop") || "WR").trim().toUpperCase();
  const toStop = (url.searchParams.get("toStop") || "UN").trim().toUpperCase();
  const startTime = (url.searchParams.get("startTime") || "0700").trim();
  const tripNumber = (url.searchParams.get("tripNumber") || "").trim();

  const apiKey = getApiKey(context);

  if (!apiKey) {
    return jsonResponse(
      {
        ok: false,
        error:
          "GO_API_KEY is missing at runtime. Confirm the secret exists in the same Cloudflare Pages environment as this deployment, then redeploy the site so the Function can read it.",
        availableBindings: getAvailableBindingNames(context)
      },
      500
    );
  }

  try {
    if (mode === "next-service") {
      const nextService = await findStopNextService({ apiKey, stopCode: fromStop });

      return jsonResponse({
        ok: true,
        mode,
        stopCode: fromStop,
        endpoint: `Stop/NextService/${fromStop}`,
        serviceCount: nextService.services.length,
        services: nextService.services.slice(0, 12),
        raw: nextService.raw,
        checkedAt: new Date().toISOString()
      });
    }

    if (mode === "stop-details") {
      const stopDetails = await findStopDetails({ apiKey, stopCode: fromStop });

      return jsonResponse({
        ok: true,
        mode,
        stopCode: fromStop,
        requestedTripNumber: tripNumber || null,
        endpoint: `Stop/Details/${fromStop}`,
        raw: stopDetails.raw,
        checkedAt: new Date().toISOString()
      });
    }

    const journey = tripNumber
      ? null
      : await findTargetJourney({ apiKey, fromStop, toStop, startTime });

    const matchedTripNumber = tripNumber || extractTripNumber(journey);
    const trainStatus = matchedTripNumber
      ? await findTrainStatus({ apiKey, tripNumber: matchedTripNumber })
      : null;

    return jsonResponse({
      ok: true,
      fromStop,
      toStop,
      startTime,
      requestedTripNumber: tripNumber || null,
      matchedTripNumber: matchedTripNumber || null,
      journey: journey ? simplifyJourney(journey) : null,
      trainStatus,
      delaySeconds: getDelaySeconds(trainStatus),
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.message || "GO lookup failed."
      },
      500
    );
  }
}

function getApiKey(context) {
  return (
    context?.env?.GO_API_KEY ||
    context?.env?.METROLINX_API_KEY ||
    globalThis?.GO_API_KEY ||
    ""
  )
    .toString()
    .trim();
}

function getAvailableBindingNames(context) {
  return Object.keys(context?.env || {}).sort();
}

async function findStopNextService({ apiKey, stopCode }) {
  const url = `${API_BASE}/Stop/NextService/${encodeURIComponent(stopCode)}?key=${encodeURIComponent(apiKey)}`;
  const raw = await fetchJson(url);

  return {
    raw,
    services: findArray(raw)
  };
}

async function findStopDetails({ apiKey, stopCode }) {
  const url = `${API_BASE}/Stop/Details/${encodeURIComponent(stopCode)}?key=${encodeURIComponent(apiKey)}`;
  const raw = await fetchJson(url);

  return { raw };
}

async function findTargetJourney({ apiKey, fromStop, toStop, startTime }) {
  const url = `${API_BASE}/Stop/NextService/${encodeURIComponent(fromStop)}/${encodeURIComponent(toStop)}/${encodeURIComponent(startTime)}?key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url);
  const journeys = findArray(data);

  if (!journeys.length) return null;

  return journeys
    .map((journey) => ({ journey, score: scoreJourney(journey) }))
    .sort((a, b) => a.score - b.score)[0].journey;
}

async function findTrainStatus({ apiKey, tripNumber }) {
  const url = `${API_BASE}/ServiceataGlance/Trains/All?key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson(url);
  const trains = findArray(data);
  const target = normalizeTripId(tripNumber);

  return trains.find((train) => {
    const possibleIds = [
      train.TripNumber,
      train.TrainNumber,
      train.TripID,
      train.TripId,
      train.Trip,
      train.ServiceNumber
    ].map(normalizeTripId);

    return possibleIds.some((candidate) => isTripMatch(candidate, target));
  }) || null;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`GO API returned HTTP ${response.status}`);
  }

  return response.json();
}

function findArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  for (const item of Object.values(value)) {
    if (Array.isArray(item)) return item;
    const nested = findArray(item);
    if (nested.length) return nested;
  }

  return [];
}

function scoreJourney(journey) {
  const text = JSON.stringify(journey).toLowerCase();
  const hasTargetTime = text.includes("7:54") || text.includes("0754") || text.includes("7:53") || text.includes("0753");
  const hasUnion = text.includes("union");
  const hasWestHarbour = text.includes("west harbour") || text.includes("westharbour");

  let score = 100;
  if (hasTargetTime) score -= 50;
  if (hasUnion) score -= 10;
  if (hasWestHarbour) score -= 10;
  return score;
}

function extractTripNumber(journey) {
  if (!journey) return "";

  const keys = ["TripNumber", "TrainNumber", "TripID", "TripId", "Trip", "ServiceNumber"];
  const found = findFirstKey(journey, keys);
  return found ? String(found) : "";
}

function normalizeTripId(value) {
  return String(value || "").trim().toLowerCase();
}

function isTripMatch(candidate, target) {
  if (!candidate || !target) return false;
  if (candidate === target) return true;

  const candidateParts = candidate.split("-").filter(Boolean);
  const targetParts = target.split("-").filter(Boolean);
  const candidateLast = candidateParts[candidateParts.length - 1];
  const targetLast = targetParts[targetParts.length - 1];

  if (candidateLast && targetLast && candidateLast === targetLast) return true;
  if (candidate.endsWith(`-${target}`)) return true;
  if (target.endsWith(`-${candidate}`)) return true;

  return false;
}

function findFirstKey(value, keys) {
  if (!value || typeof value !== "object") return null;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key) && value[key]) {
      return value[key];
    }
  }

  for (const child of Object.values(value)) {
    if (typeof child === "object") {
      const found = findFirstKey(child, keys);
      if (found) return found;
    }
  }

  return null;
}

function simplifyJourney(journey) {
  const tripNumber = extractTripNumber(journey);
  const text = JSON.stringify(journey);

  return {
    possibleTripNumber: tripNumber || null,
    preview: text.length > 1200 ? `${text.slice(0, 1200)}...` : text
  };
}

function getDelaySeconds(trainStatus) {
  if (!trainStatus) return null;

  const raw = trainStatus.DelaySeconds ?? trainStatus.delaySeconds ?? trainStatus.Delay ?? null;
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}