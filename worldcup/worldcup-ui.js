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
calendarScript.src = "worldcup-calendar.js?v=1";
document.body.appendChild(calendarScript);
