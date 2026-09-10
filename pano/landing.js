(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';
  const DB_NAME = 'pelaxix-pano-assets';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';

  let dbPromise = null;
  let createPreviewViewer = null;
  let createPreviewUrl = null;
  let editPreviewViewer = null;
  let editPreviewUrl = null;
  let activeEditHotspotId = null;

  patchPannellumSceneTargets();
  injectStyles();
  wireCreateDialog();
  watchForEditDialog();
  captureEditButtonClicks();

  function readProject() {
    try {
      const project = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return project && Array.isArray(project.scenes) ? project : null;
    } catch {
      return null;
    }
  }

  function writeProject(project) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  function currentScene(project) {
    return project?.scenes.find(scene => scene.id === project.currentSceneId) || null;
  }

  function getScene(project, sceneId) {
    return project?.scenes.find(scene => scene.id === sceneId) || null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeYaw(value) {
    return ((value + 180) % 360 + 360) % 360 - 180;
  }

  function parseAngle(text) {
    const value = parseFloat(String(text || '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(value) ? value : 0;
  }

  function uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function dbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function createSceneObjectUrl(sceneId) {
    const project = readProject();
    const scene = getScene(project, sceneId);
    if (!scene) return null;
    const blob = await dbGet(scene.assetKey);
    return blob ? URL.createObjectURL(blob) : null;
  }

  function patchPannellumSceneTargets() {
    if (!window.pannellum?.viewer || window.pannellum.__pelaxixLandingPatched) return;

    const originalViewer = window.pannellum.viewer.bind(window.pannellum);
    window.pannellum.viewer = (container, config) => {
      try {
        if (config?.scenes) {
          const project = readProject();
          if (project) {
            Object.entries(config.scenes).forEach(([sourceSceneId, sceneConfig]) => {
              const sourceScene = getScene(project, sourceSceneId);
              if (!sourceScene || !Array.isArray(sceneConfig.hotSpots)) return;

              sceneConfig.hotSpots.forEach(renderedHotspot => {
                const savedHotspot = sourceScene.hotSpots?.find(item => item.id === renderedHotspot.id);
                if (!savedHotspot || savedHotspot.type !== 'scene') return;

                if (typeof savedHotspot.targetPitch === 'number') renderedHotspot.targetPitch = savedHotspot.targetPitch;
                if (typeof savedHotspot.targetYaw === 'number') renderedHotspot.targetYaw = savedHotspot.targetYaw;
                if (typeof savedHotspot.targetHfov === 'number') renderedHotspot.targetHfov = savedHotspot.targetHfov;
              });
            });
          }
        }
      } catch (error) {
        console.warn('Could not apply saved landing views.', error);
      }
      return originalViewer(container, config);
    };

    window.pannellum.__pelaxixLandingPatched = true;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .landing-preview-block {
        display: grid;
        gap: 9px;
        margin-top: 2px;
      }
      .landing-preview-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: #d9dae0;
        font-size: 12px;
      }
      .landing-preview-chip {
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 999px;
        padding: 4px 8px;
        color: #9b9eaa;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .landing-preview {
        width: 100%;
        height: 210px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 13px;
        background: #0e0f13;
      }
      .landing-preview .pnlm-container {
        border-radius: 13px;
        background: #0e0f13;
      }
      .landing-preview-help {
        margin: 0;
        color: #9b9eaa;
        font-size: 10px;
        line-height: 1.45;
      }
      #hotspotDialog.dialog,
      #editHotspotDialog.dialog {
        width: min(560px, calc(100vw - 28px));
      }
      @media (max-width: 520px) {
        .landing-preview { height: 170px; }
      }
    `;
    document.head.append(style);
  }

  function makePreviewBlock(id) {
    const block = document.createElement('section');
    block.className = 'landing-preview-block';
    block.hidden = true;
    block.innerHTML = `
      <div class="landing-preview-heading">
        <span>Landing view in destination scene</span>
        <span class="landing-preview-chip">Drag to aim</span>
      </div>
      <div id="${id}" class="landing-preview" aria-label="Destination scene landing preview"></div>
      <p class="landing-preview-help">Move this preview until it shows exactly what the visitor should see after clicking the hotspot. The direction and zoom are saved automatically.</p>
    `;
    return block;
  }

  function wireCreateDialog() {
    const dialog = document.querySelector('#hotspotDialog');
    const form = document.querySelector('#hotspotForm');
    const targetField = document.querySelector('#targetField');
    const targetScene = document.querySelector('#targetScene');
    const hotspotType = document.querySelector('#hotspotType');

    if (!dialog || !form || !targetField || !targetScene || !hotspotType) return;

    const previewBlock = makePreviewBlock('createLandingPreview');
    targetField.insertAdjacentElement('afterend', previewBlock);

    const dialogObserver = new MutationObserver(() => {
      if (!dialog.open) {
        destroyCreatePreview();
        previewBlock.hidden = true;
        return;
      }

      if (hotspotType.value !== 'scene') {
        destroyCreatePreview();
        previewBlock.hidden = true;
        return;
      }

      previewBlock.hidden = false;
      setTimeout(() => initCreatePreview(targetScene.value), 0);
    });
    dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });

    targetScene.addEventListener('change', () => {
      if (!dialog.open || hotspotType.value !== 'scene') return;
      initCreatePreview(targetScene.value);
    });

    form.addEventListener('submit', event => {
      if (hotspotType.value !== 'scene') return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const project = readProject();
      const scene = currentScene(project);
      if (!project || !scene) return;

      const targetSceneId = targetScene.value;
      const target = getScene(project, targetSceneId);
      const label = document.querySelector('#hotspotLabel')?.value.trim() || target?.name || 'Open scene';
      const landing = captureCreateLandingView();

      scene.hotSpots = Array.isArray(scene.hotSpots) ? scene.hotSpots : [];
      scene.hotSpots.push({
        id: uid('hotspot'),
        type: 'scene',
        pitch: parseAngle(document.querySelector('#pitchValue')?.textContent),
        yaw: parseAngle(document.querySelector('#yawValue')?.textContent),
        text: label,
        targetSceneId,
        ...landing,
      });

      writeProject(project);
      destroyCreatePreview();
      try { dialog.close(); } catch {}
      location.reload();
    }, true);
  }

  async function initCreatePreview(sceneId, view = null) {
    destroyCreatePreview();
    if (!sceneId) return;

    createPreviewUrl = await createSceneObjectUrl(sceneId);
    if (!createPreviewUrl) return;

    createPreviewViewer = window.pannellum.viewer('createLandingPreview', {
      type: 'equirectangular',
      panorama: createPreviewUrl,
      autoLoad: true,
      showControls: true,
      draggable: true,
      mouseZoom: true,
      pitch: clamp(view?.pitch ?? 0, -90, 90),
      yaw: normalizeYaw(view?.yaw ?? 0),
      hfov: clamp(view?.hfov ?? 105, 50, 120),
    });
  }

  function captureCreateLandingView() {
    if (!createPreviewViewer) return { targetPitch: 0, targetYaw: 0, targetHfov: 105 };
    try {
      return {
        targetPitch: clamp(createPreviewViewer.getPitch(), -90, 90),
        targetYaw: normalizeYaw(createPreviewViewer.getYaw()),
        targetHfov: clamp(createPreviewViewer.getHfov(), 50, 120),
      };
    } catch {
      return { targetPitch: 0, targetYaw: 0, targetHfov: 105 };
    }
  }

  function destroyCreatePreview() {
    if (createPreviewViewer) {
      try { createPreviewViewer.destroy(); } catch {}
      createPreviewViewer = null;
    }
    if (createPreviewUrl) {
      URL.revokeObjectURL(createPreviewUrl);
      createPreviewUrl = null;
    }
  }

  function captureEditButtonClicks() {
    document.addEventListener('click', event => {
      const button = event.target.closest('#hotspotList .edit-control');
      if (!button) return;

      const card = button.closest('.hotspot-card');
      if (!card) return;

      const cards = [...document.querySelectorAll('#hotspotList .hotspot-card')];
      const index = cards.indexOf(card);
      const project = readProject();
      const scene = currentScene(project);
      activeEditHotspotId = scene?.hotSpots?.[index]?.id || null;
    }, true);
  }

  function watchForEditDialog() {
    const bodyObserver = new MutationObserver(() => {
      const dialog = document.querySelector('#editHotspotDialog');
      if (!dialog || dialog.dataset.landingEnhanced === 'true') return;
      enhanceEditDialog(dialog);
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });
    const existingDialog = document.querySelector('#editHotspotDialog');
    if (existingDialog) enhanceEditDialog(existingDialog);
  }

  function enhanceEditDialog(dialog) {
    dialog.dataset.landingEnhanced = 'true';

    const form = dialog.querySelector('#editHotspotForm');
    const targetField = dialog.querySelector('#editTargetField');
    const targetScene = dialog.querySelector('#editTargetScene');
    if (!form || !targetField || !targetScene) return;

    const previewBlock = makePreviewBlock('editLandingPreview');
    targetField.insertAdjacentElement('afterend', previewBlock);

    const dialogObserver = new MutationObserver(() => {
      if (!dialog.open) {
        destroyEditPreview();
        previewBlock.hidden = true;
        activeEditHotspotId = null;
        return;
      }

      const project = readProject();
      const scene = currentScene(project);
      const hotspot = scene?.hotSpots?.find(item => item.id === activeEditHotspotId);
      if (!hotspot || hotspot.type !== 'scene') {
        destroyEditPreview();
        previewBlock.hidden = true;
        return;
      }

      previewBlock.hidden = false;
      setTimeout(() => initEditPreview(targetScene.value || hotspot.targetSceneId, {
        pitch: typeof hotspot.targetPitch === 'number' ? hotspot.targetPitch : 0,
        yaw: typeof hotspot.targetYaw === 'number' ? hotspot.targetYaw : 0,
        hfov: typeof hotspot.targetHfov === 'number' ? hotspot.targetHfov : 105,
      }), 0);
    });
    dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });

    targetScene.addEventListener('change', () => {
      if (!dialog.open) return;
      previewBlock.hidden = false;
      initEditPreview(targetScene.value);
    });

    form.addEventListener('submit', event => {
      const project = readProject();
      const scene = currentScene(project);
      const hotspot = scene?.hotSpots?.find(item => item.id === activeEditHotspotId);
      if (!project || !scene || !hotspot || hotspot.type !== 'scene') return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const pitch = Number(dialog.querySelector('#editPitch')?.value);
      const yaw = Number(dialog.querySelector('#editYaw')?.value);
      const targetSceneId = targetScene.value;
      const target = getScene(project, targetSceneId);
      const label = dialog.querySelector('#editHotspotLabel')?.value.trim() || target?.name || 'Open scene';

      hotspot.pitch = Number.isFinite(pitch) ? clamp(pitch, -90, 90) : hotspot.pitch;
      hotspot.yaw = Number.isFinite(yaw) ? normalizeYaw(yaw) : hotspot.yaw;
      hotspot.text = label;
      hotspot.targetSceneId = targetSceneId;
      Object.assign(hotspot, captureEditLandingView());

      writeProject(project);
      destroyEditPreview();
      activeEditHotspotId = null;
      try { dialog.close(); } catch {}
      location.reload();
    }, true);
  }

  async function initEditPreview(sceneId, view = null) {
    destroyEditPreview();
    if (!sceneId) return;

    editPreviewUrl = await createSceneObjectUrl(sceneId);
    if (!editPreviewUrl) return;

    editPreviewViewer = window.pannellum.viewer('editLandingPreview', {
      type: 'equirectangular',
      panorama: editPreviewUrl,
      autoLoad: true,
      showControls: true,
      draggable: true,
      mouseZoom: true,
      pitch: clamp(view?.pitch ?? 0, -90, 90),
      yaw: normalizeYaw(view?.yaw ?? 0),
      hfov: clamp(view?.hfov ?? 105, 50, 120),
    });
  }

  function captureEditLandingView() {
    if (!editPreviewViewer) return { targetPitch: 0, targetYaw: 0, targetHfov: 105 };
    try {
      return {
        targetPitch: clamp(editPreviewViewer.getPitch(), -90, 90),
        targetYaw: normalizeYaw(editPreviewViewer.getYaw()),
        targetHfov: clamp(editPreviewViewer.getHfov(), 50, 120),
      };
    } catch {
      return { targetPitch: 0, targetYaw: 0, targetHfov: 105 };
    }
  }

  function destroyEditPreview() {
    if (editPreviewViewer) {
      try { editPreviewViewer.destroy(); } catch {}
      editPreviewViewer = null;
    }
    if (editPreviewUrl) {
      URL.revokeObjectURL(editPreviewUrl);
      editPreviewUrl = null;
    }
  }
})();