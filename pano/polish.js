(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';

  injectStyles();
  fixCreateDialog();
  fixEditDialog();
  observeDialogs();
  observeHotspotList();
  enhanceHotspotList();

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Cleaner hotspot markers: remove Pannellum's sprite artwork entirely. */
      #viewer .pnlm-hotspot-base.pnlm-scene,
      #viewer .pnlm-hotspot-base.pnlm-info {
        background-image: none !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        display: flex !important;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        cursor: pointer;
        transition: background-color .15s ease, border-color .15s ease, box-shadow .15s ease, filter .15s ease, transform .15s ease;
      }

      /* Scene link: same glassy family as the info marker, but lime + upward navigation arrow. */
      #viewer .pnlm-hotspot-base.pnlm-scene {
        width: 36px !important;
        height: 36px !important;
        margin: -18px 0 0 -18px !important;
        border: 1px solid rgba(216,255,98,.62) !important;
        border-radius: 999px !important;
        background: rgba(10,12,15,.86) !important;
        color: #ddff79 !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.30), 0 0 0 3px rgba(216,255,98,.08) !important;
      }

      #viewer .pnlm-hotspot-base.pnlm-scene::before {
        content: '↑';
        display: block;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        font-size: 21px;
        font-weight: 700;
        line-height: 1;
        margin-top: -2px;
      }

      #viewer .pnlm-hotspot-base.pnlm-scene:hover {
        background: rgba(27,31,18,.96) !important;
        border-color: rgba(216,255,98,.95) !important;
        box-shadow: 0 10px 28px rgba(0,0,0,.36), 0 0 0 4px rgba(216,255,98,.12) !important;
      }

      #viewer .pnlm-hotspot-base.pnlm-info {
        width: 34px !important;
        height: 34px !important;
        margin: -17px 0 0 -17px !important;
        border: 1px solid rgba(168,255,204,.58) !important;
        border-radius: 999px !important;
        background: rgba(10,12,15,.86) !important;
        color: #b8ffd7 !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.30), 0 0 0 3px rgba(168,255,204,.08) !important;
      }

      #viewer .pnlm-hotspot-base.pnlm-info::before {
        content: 'i';
        display: block;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 21px;
        font-weight: 700;
        line-height: 1;
        margin-top: -1px;
      }

      #viewer .pnlm-hotspot-base.pnlm-info:hover {
        background: rgba(21,28,25,.96) !important;
        border-color: rgba(168,255,204,.92) !important;
        box-shadow: 0 10px 28px rgba(0,0,0,.36), 0 0 0 4px rgba(168,255,204,.12) !important;
      }

      /* Mirror the panorama marker language in the hotspot list. */
      #hotspotList .hotspot-card.pano-typed-hotspot {
        grid-template-columns: 28px minmax(0,1fr) auto;
      }

      #hotspotList .pano-hotspot-kind {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        align-self: center;
        flex: 0 0 28px;
        background: rgba(10,12,15,.86);
        box-shadow: 0 5px 14px rgba(0,0,0,.24);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        pointer-events: none;
      }

      #hotspotList .pano-hotspot-kind.scene {
        border: 1px solid rgba(216,255,98,.62);
        color: #ddff79;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        font-size: 17px;
        font-weight: 750;
        line-height: 1;
        padding-bottom: 2px;
      }

      #hotspotList .pano-hotspot-kind.info {
        border: 1px solid rgba(168,255,204,.58);
        color: #b8ffd7;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
        padding-bottom: 1px;
      }

      /* Make the hover labels feel like part of Pano Lab too. */
      #viewer .pnlm-tooltip span {
        border-radius: 9px !important;
        border: 1px solid rgba(255,255,255,.10) !important;
        background: rgba(10,11,14,.92) !important;
        color: #f4f5f7 !important;
        box-shadow: 0 8px 24px rgba(0,0,0,.28) !important;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
        font-size: 11px !important;
        font-weight: 650 !important;
        padding: 7px 9px !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      /* Defensive visibility rule so an info marker can never expose scene-only controls. */
      #targetField[hidden],
      #editTargetField[hidden],
      .landing-preview-block[hidden] {
        display: none !important;
      }
    `;
    document.head.append(style);
  }

  function readProject() {
    try {
      const project = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return project && Array.isArray(project.scenes) ? project : null;
    } catch {
      return null;
    }
  }

  function currentScene(project) {
    return project?.scenes.find(scene => scene.id === project.currentSceneId) || null;
  }

  function enhanceHotspotList() {
    const list = document.querySelector('#hotspotList');
    const project = readProject();
    const scene = currentScene(project);
    if (!list || !scene || !Array.isArray(scene.hotSpots)) return;

    const cards = [...list.children].filter(item => item.classList.contains('hotspot-card'));
    cards.forEach((card, index) => {
      const hotspot = scene.hotSpots[index];
      if (!hotspot) return;

      let badge = card.querySelector('.pano-hotspot-kind');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'pano-hotspot-kind';
        badge.setAttribute('aria-hidden', 'true');
        card.prepend(badge);
      }

      const isScene = hotspot.type === 'scene';
      badge.classList.toggle('scene', isScene);
      badge.classList.toggle('info', !isScene);
      badge.textContent = isScene ? '↑' : 'i';
      card.classList.add('pano-typed-hotspot');
    });
  }

  function observeHotspotList() {
    const list = document.querySelector('#hotspotList');
    if (!list) return;

    const observer = new MutationObserver(() => enhanceHotspotList());
    observer.observe(list, { childList: true, subtree: true });
  }

  function fixCreateDialog() {
    const dialog = document.querySelector('#hotspotDialog');
    const type = document.querySelector('#hotspotType');
    const targetField = document.querySelector('#targetField');
    if (!dialog || !type || !targetField) return;

    const sync = () => {
      if (!dialog.open) return;
      const isSceneLink = type.value === 'scene';
      targetField.hidden = !isSceneLink;

      const preview = dialog.querySelector('.landing-preview-block');
      if (preview && !isSceneLink) preview.hidden = true;
    };

    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    observer.observe(type, { attributes: true, attributeFilter: ['value'] });

    document.querySelector('#addLinkBtn')?.addEventListener('click', () => setTimeout(sync, 0));
    document.querySelector('#addInfoBtn')?.addEventListener('click', () => setTimeout(sync, 0));
  }

  function fixEditDialog() {
    const dialog = document.querySelector('#editHotspotDialog');
    if (!dialog || dialog.dataset.polishVisibilityWired === 'true') return;
    dialog.dataset.polishVisibilityWired = 'true';

    const sync = () => {
      if (!dialog.open) return;
      const targetField = dialog.querySelector('#editTargetField');
      const targetScene = dialog.querySelector('#editTargetScene');
      if (!targetField || !targetScene) return;

      // editing.js empties this select for info markers and populates it for scene links.
      const isSceneLink = targetScene.options.length > 0;
      targetField.hidden = !isSceneLink;

      const preview = dialog.querySelector('.landing-preview-block');
      if (preview && !isSceneLink) preview.hidden = true;
    };

    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    const targetScene = dialog.querySelector('#editTargetScene');
    if (targetScene) observer.observe(targetScene, { childList: true });
    setTimeout(sync, 0);
  }

  function observeDialogs() {
    const observer = new MutationObserver(() => {
      fixCreateDialog();
      fixEditDialog();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();