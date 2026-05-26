export async function onRequestPost(context) {
  const apiKey = context.env.OPENAI_API_KEY;
  const model = context.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return jsonResponse(
      {
        ok: false,
        error: "OPENAI_API_KEY is not configured in Cloudflare Pages environment variables."
      },
      500
    );
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch (error) {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const safePayload = buildSafePayload(payload);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "fishcast_analysis",
            strict: true,
            schema: fishcastSchema
          }
        },
        messages: [
          {
            role: "system",
            content: [
              "You are FishCast AI, a practical freshwater fishing advisor for Ontario-style shore fishing.",
              "Use the supplied weather, water type, target preference, and baseline app analysis.",
              "Return realistic recommendations. Do not promise catches.",
              "Prefer practical, plain-language advice over generic fishing folklore.",
              "Keep score conservative and explain the main drivers."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify(safePayload)
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(
        {
          ok: false,
          error: data?.error?.message || `OpenAI returned HTTP ${response.status}`
        },
        502
      );
    }

    const content = data?.choices?.[0]?.message?.content;
    const analysis = JSON.parse(content);

    return jsonResponse({
      ok: true,
      analysis: normalizeAnalysis(analysis),
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error.message || "FishCast AI lookup failed."
      },
      500
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

const fishcastSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "rating",
    "verdict",
    "bestWindow",
    "target",
    "tryThis",
    "watch",
    "lures",
    "reasons",
    "confidence"
  ],
  properties: {
    score: { type: "integer", minimum: 1, maximum: 10 },
    rating: { type: "string", enum: ["Great", "Good", "Okay", "Rough"] },
    verdict: { type: "string", minLength: 8, maxLength: 120 },
    bestWindow: { type: "string", minLength: 3, maxLength: 60 },
    target: { type: "string", minLength: 3, maxLength: 40 },
    tryThis: { type: "string", minLength: 3, maxLength: 40 },
    watch: { type: "string", minLength: 3, maxLength: 40 },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    lures: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "target", "why"],
        properties: {
          name: { type: "string", minLength: 3, maxLength: 40 },
          target: { type: "string", minLength: 3, maxLength: 40 },
          why: { type: "string", minLength: 10, maxLength: 140 }
        }
      }
    },
    reasons: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string", minLength: 8, maxLength: 140 }
    }
  }
};

function buildSafePayload(payload = {}) {
  const weather = payload.weather || {};
  const current = weather.current || {};
  const daily = weather.daily || {};
  const hourly = weather.hourly || {};
  const coords = payload.coords || {};

  return {
    location: {
      name: String(coords.name || "selected location"),
      lat: roundNumber(coords.lat, 4),
      lng: roundNumber(coords.lng, 4)
    },
    userSelection: {
      waterType: String(payload.waterType || "unknown"),
      targetSpecies: String(payload.targetSpecies || "auto")
    },
    currentWeather: {
      time: current.time || null,
      temperatureC: current.temperature_2m ?? null,
      humidityPercent: current.relative_humidity_2m ?? null,
      precipitationMm: current.precipitation ?? null,
      rainMm: current.rain ?? null,
      cloudCoverPercent: current.cloud_cover ?? null,
      pressureHpa: current.pressure_msl ?? null,
      windKmh: current.wind_speed_10m ?? null,
      windDirectionDegrees: current.wind_direction_10m ?? null
    },
    dailyWeather: {
      sunrise: daily.sunrise?.[0] || null,
      sunset: daily.sunset?.[0] || null,
      rainProbabilityMaxPercent: daily.precipitation_probability_max?.[0] ?? null
    },
    nextHours: summarizeNextHours(hourly),
    baselineAnalysis: payload.baselineAnalysis || null
  };
}

function summarizeNextHours(hourly = {}) {
  if (!Array.isArray(hourly.time)) return [];

  return hourly.time.slice(0, 12).map((time, index) => ({
    time,
    temperatureC: hourly.temperature_2m?.[index] ?? null,
    rainProbabilityPercent: hourly.precipitation_probability?.[index] ?? null,
    pressureHpa: hourly.pressure_msl?.[index] ?? null,
    windKmh: hourly.wind_speed_10m?.[index] ?? null,
    cloudCoverPercent: hourly.cloud_cover?.[index] ?? null
  }));
}

function normalizeAnalysis(analysis) {
  const score = clampInteger(analysis.score, 1, 10);
  const rating = ["Great", "Good", "Okay", "Rough"].includes(analysis.rating)
    ? analysis.rating
    : score >= 9 ? "Great" : score >= 7 ? "Good" : score >= 5 ? "Okay" : "Rough";

  return {
    score,
    rating,
    verdict: cleanText(analysis.verdict, "Fishable, but manage expectations."),
    bestWindow: cleanText(analysis.bestWindow, "Next low-light window"),
    target: cleanText(analysis.target, "bass"),
    tryThis: cleanText(analysis.tryThis, "Soft plastic worm"),
    watch: cleanText(analysis.watch, "Changing conditions"),
    confidence: cleanText(analysis.confidence, "medium"),
    lures: normalizeLures(analysis.lures),
    reasons: normalizeReasons(analysis.reasons)
  };
}

function normalizeLures(lures) {
  const fallback = [
    { name: "Soft plastic worm", target: "bass", why: "Reliable all-around option when conditions are mixed." },
    { name: "Spinnerbait", target: "bass / pike", why: "Good search bait when wind or cloud cover helps reaction bites." },
    { name: "Small jig", target: "panfish / bass", why: "Useful slower presentation if fish are holding tight." }
  ];

  if (!Array.isArray(lures)) return fallback;

  return lures.slice(0, 3).map((item, index) => ({
    name: cleanText(item?.name, fallback[index].name),
    target: cleanText(item?.target, fallback[index].target),
    why: cleanText(item?.why, fallback[index].why)
  }));
}

function normalizeReasons(reasons) {
  if (!Array.isArray(reasons) || !reasons.length) {
    return ["AI used the current weather, timing, water type, and baseline FishCast factors."];
  }

  return reasons.slice(0, 6).map((reason) => cleanText(reason, "Condition noted."));
}

function cleanText(value, fallback) {
  const text = String(value || "").replace(/[<>]/g, "").trim();
  return text || fallback;
}

function clampInteger(value, min, max) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function roundNumber(value, decimals) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const factor = 10 ** decimals;
  return Math.round(parsed * factor) / factor;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
