const teamSelectEl = document.querySelector("#teamSearch");
const resetSelectionButton = document.querySelector("#showAllButton");

function addWorldCupTabs() {
  const hero = document.querySelector(".hero");
  if (!hero || hero.querySelector(".worldcup-tabs")) return;

  const nav = document.createElement("nav");
  nav.className = "worldcup-tabs";
  nav.setAttribute("aria-label", "World Cup navigation");

  const scheduleLink = document.createElement("a");
  scheduleLink.className = "active";
  scheduleLink.href = "/worldcup/";
  scheduleLink.textContent = "Schedule";

  const groupsLink = document.createElement("a");
  groupsLink.href = "/worldcup/groups/";
  groupsLink.textContent = "Groups";

  nav.append(scheduleLink, groupsLink);
  hero.appendChild(nav);
}

function keepResetButtonLabel() {
  if (!resetSelectionButton) return;
  resetSelectionButton.textContent = "Reset selection";
  resetSelectionButton.disabled = !teamSelectEl?.value;
}

addWorldCupTabs();

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
resultsScript.src = "results-loader.js?v=2";
resultsScript.onload = () => document.body.appendChild(calendarScript);
resultsScript.onerror = () => document.body.appendChild(calendarScript);
document.body.appendChild(resultsScript);
