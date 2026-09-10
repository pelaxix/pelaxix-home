(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';

  const style = document.createElement('style');
  style.textContent = `
    #hotspotList .hotspot-card.pano-scene-row {
      border: 1px solid rgba(216,255,98,.42) !important;
      background: rgba(216,255,98,.025) !important;
    }

    #hotspotList .hotspot-card.pano-info-row {
      border: 1px solid rgba(168,255,204,.38) !important;
      background: rgba(168,255,204,.022) !important;
    }

    #hotspotList .hotspot-card.pano-scene-row:hover {
      border-color: rgba(216,255,98,.68) !important;
      background: rgba(216,255,98,.045) !important;
    }

    #hotspotList .hotspot-card.pano-info-row:hover {
      border-color: rgba(168,255,204,.64) !important;
      background: rgba(168,255,204,.04) !important;
    }
  `;
  document.head.append(style);

  function readProject() {
    try {
      const project = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return project && Array.isArray(project.scenes) ? project : null;
    } catch {
      return null;
    }
  }

  function applyRowAccents() {
    const list = document.querySelector('#hotspotList');
    const project = readProject();
    const scene = project?.scenes?.find(item => item.id === project.currentSceneId);
    if (!list || !scene || !Array.isArray(scene.hotSpots)) return;

    const cards = [...list.children].filter(item => item.classList.contains('hotspot-card'));
    cards.forEach((card, index) => {
      const hotspot = scene.hotSpots[index];
      if (!hotspot) return;
      const isScene = hotspot.type === 'scene';
      card.classList.toggle('pano-scene-row', isScene);
      card.classList.toggle('pano-info-row', !isScene);
    });
  }

  const list = document.querySelector('#hotspotList');
  if (list) {
    new MutationObserver(applyRowAccents).observe(list, { childList: true, subtree: true });
  }

  applyRowAccents();
})();