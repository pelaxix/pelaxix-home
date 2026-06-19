const teamSelectEl = document.querySelector("#teamSearch");
const resetSelectionButton = document.querySelector("#showAllButton");
const WORLD_CUP_TEAM_FILTER_KEY = "worldcupSelectedTeam";

function isPageReload() {
  const navigationEntry = performance.getEntriesByType?.("navigation")?.[0];
  return navigationEntry?.type === "reload" || performance.navigation?.type === 1;
}

function clearFilterOnReload() {
  if (!isPageReload()) return;
  try {
    sessionStorage.removeItem(WORLD_CUP_TEAM_FILTER_KEY);
  } catch {
  }
}

function savedTeamFilter() {
  try {
    return sessionStorage.getItem(WORLD_CUP_TEAM_FILTER_KEY) || "";
  } catch {
    return "";
  }
}

function saveTeamFilter(value) {
  try {
    if (value) {
      sessionStorage.setItem(WORLD_CUP_TEAM_FILTER_KEY, value);
    } else {
      sessionStorage.removeItem(WORLD_CUP_TEAM_FILTER_KEY);
    }
  } catch {
  }
}

function applySavedTeamFilter() {
  if (!teamSelectEl) return;
  const savedValue = savedTeamFilter();
  if (savedValue && Array.from(teamSelectEl.options).some((option) => option.value === savedValue)) {
    teamSelectEl.value = savedValue;
    render();
  }
}

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
  const hasSelection = Boolean(teamSelectEl?.value);
  resetSelectionButton.textContent = "Reset selection";
  resetSelectionButton.disabled = !hasSelection;
  resetSelectionButton.hidden = !hasSelection;
}

clearFilterOnReload();
addWorldCupTabs();
applySavedTeamFilter();
keepResetButtonLabel();

if (teamSelectEl) {
  teamSelectEl.addEventListener("change", () => {
    saveTeamFilter(teamSelectEl.value);
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
      saveTeamFilter("");
      render();
      keepResetButtonLabel();
    },
    true
  );
}

const calendarScript = document.createElement("script");
calendarScript.src = "worldcup-calendar.js?v=3";

const resultsScript = document.createElement("script");
resultsScript.src = "results-loader.js?v=7";
resultsScript.onload = () => document.body.appendChild(calendarScript);
resultsScript.onerror = () => document.body.appendChild(calendarScript);
document.body.appendChild(resultsScript);
