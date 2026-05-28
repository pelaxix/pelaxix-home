const GO_REFUND_CLAIM_URL = "https://www.gotransit.com/en/service-guarantee/submit-a-claim";

document.addEventListener("DOMContentLoaded", () => {
  updateGoRefundCard();
});

async function updateGoRefundCard() {
  const card = document.querySelector("#refundCard");
  const label = document.querySelector("#refundEligible");

  if (!card || !label) return;

  label.textContent = "CHECKING...";
  card.classList.remove("refund-yes", "refund-no");
  card.removeAttribute("href");
  card.setAttribute("aria-label", "Checking GO refund eligibility.");

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
  } catch (error) {
    label.textContent = "Unavailable";
    card.classList.add("refund-no");
    card.removeAttribute("href");
    card.removeAttribute("title");
    card.setAttribute("aria-label", error.message || "Refund eligibility unavailable.");
  }
}
