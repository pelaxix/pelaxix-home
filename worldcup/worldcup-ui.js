const teamSelectEl = document.querySelector("#teamSearch");
const resetSelectionButton = document.querySelector("#showAllButton");

function keepResetButtonLabel() {
  if (!resetSelectionButton) return;
  resetSelectionButton.textContent = "Reset selection";
  resetSelectionButton.disabled = !teamSelectEl?.value;
}

if (teamSelectEl) {
  teamSelectEl.addEventListener("change", () => {
    render();
    keepResetButtonLabel();
  });
}

if (resetSelectionButton) {
  resetSelectionButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (teamSelectEl) teamSelectEl.value = "";
      render();
      keepResetButtonLabel();
    },
    true
  );
}

keepResetButtonLabel();

const calendarScript = document.createElement("script");
calendarScript.src = "worldcup-calendar.js?v=2";

const resultsScript = document.createElement("script");
resultsScript.src = "results-loader.js?v=1";
resultsScript.onload = () => document.body.appendChild(calendarScript);
resultsScript.onerror = () => document.body.appendChild(calendarScript);
document.body.appendChild(resultsScript);
