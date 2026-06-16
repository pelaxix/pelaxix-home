const GO_REFUND_CLAIM_URL = "https://www.gotransit.com/en/service-guarantee/submit-a-claim";

window.addEventListener("DOMContentLoaded", () => {
  updateGoRefundCard();
});

async function updateGoRefundCard() {
  const card = document.querySelector("#refundCard");
  const label = document.querySelector("#refundEligible");
  const details = document.querySelector("#liveDetails");

  if (!card || !label) return;

  label.textContent = "CHECKING...";
  card.classList.remove("refund-yes", "refund-no");
  card.removeAttribute("href");
  card.removeAttribute("title");
  card.setAttribute("aria-label", "Checking GO refund eligibility.");
  updateRefundDetails(details, {
    status: "checking",
  });

  try {
    const response = await fetch(`/api/go-refund?ts=${Date.now()}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok || !data.ok || data.eligible === null) {
      throw new Error(data.reason || "Eligibility unavailable.");
    }

    label.textContent = data.eligible ? "YES" : "NO";
    card.classList.toggle("refund-yes", data.eligible);
    card.classList.toggle("refund-no", !data.eligible);

    if (data.eligible) {
      card.href = GO_REFUND_CLAIM_URL;
      card.title = data.reason || "Open GO Transit claim form";
      card.setAttribute("aria-label", `Refund eligible. ${data.reason || "Open the GO Transit claim form."}`);
    } else {
      card.removeAttribute("href");
      card.removeAttribute("title");
      card.setAttribute("aria-label", data.reason || "Refund not eligible.");
    }

    updateRefundDetails(details, {
      status: "complete",
      data,
    });
  } catch (error) {
    label.textContent = "Unavailable";
    card.classList.add("refund-no");
    card.removeAttribute("href");
    card.removeAttribute("title");
    card.setAttribute("aria-label", error.message || "Refund eligibility unavailable.");
    updateRefundDetails(details, {
      status: "error",
      error,
    });
  }
}

function updateRefundDetails(details, context) {
  if (!details) return;

  if (context.status === "checking") {
    details.innerHTML = "Checking GO's Service Guarantee eligibility endpoint for this exact trip.";
    return;
  }

  if (context.status === "error") {
    details.innerHTML = [
      "The refund card is controlled only by <code>/api/go-refund</code>.",
      "The GO Service Guarantee eligibility check did not return a usable result.",
      `Result shown: <strong>Unavailable</strong>.`,
      `Reason: ${escapeHtml(context.error?.message || "Eligibility unavailable.")}`,
    ].join("<br>");
    return;
  }

  const data = context.data || {};
  const trip = data.checkedTrip || {};
  const eligibleText = data.eligible ? "YES" : "NO";
  const cardAction = data.eligible
    ? "The card is clickable and opens the GO Transit claim form."
    : "The card is not clickable.";

  details.innerHTML = [
    "The refund card is controlled only by <code>/api/go-refund</code>.",
    "That endpoint asks Metrolinx's Service Guarantee eligibility API about this trip:",
    `<strong>Train:</strong> ${escapeHtml(trip.tripNumber || "-")}`,
    `<strong>Departure:</strong> ${escapeHtml(trip.departureDateTime || "-")}`,
    `<strong>Route:</strong> ${escapeHtml(trip.departureStationCode || "-")} → ${escapeHtml(trip.arrivalStationCode || "-")}`,
    `<strong>Metrolinx eligible response:</strong> ${eligibleText}`,
    data.reason ? `<strong>Reason:</strong> ${escapeHtml(data.reason)}` : null,
    cardAction,
  ].filter(Boolean).join("<br>");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
