export async function onRequestGet(context) {
  const request = context.request;
  const cf = request.cf || {};

  const forwardedFor = request.headers.get("X-Forwarded-For") || "";
  const ip = request.headers.get("CF-Connecting-IP")
    || forwardedFor.split(",")[0]?.trim()
    || "Unavailable";

  const data = {
    ok: true,
    checkedAt: new Date().toISOString(),
    ip,
    location: {
      country: cf.country || "Unavailable",
      region: cf.region || "Unavailable",
      city: cf.city || "Unavailable",
      postalCode: cf.postalCode || "Unavailable",
      timezone: cf.timezone || "Unavailable",
      latitude: cf.latitude || null,
      longitude: cf.longitude || null
    },
    network: {
      asn: cf.asn || null,
      organization: cf.asOrganization || "Unavailable",
      colo: cf.colo || "Unavailable"
    },
    note: "Location is approximate and based on Cloudflare request metadata, not GPS."
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
