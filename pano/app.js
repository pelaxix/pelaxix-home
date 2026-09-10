(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';
  const DB_NAME = 'pelaxix-pano-assets';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';

  const els = {
    fileInput: document.querySelector('#fileInput'),
    emptyFileInput: document.querySelector('#emptyFileInput'),
    sceneList: document.querySelector('#sceneList'),
    hotspotList: document.querySelector('#hotspotList'),
    sceneCount: document.querySelector('#sceneCount'),
    hotspotCount: document.querySelector('#hotspotCount'),
    addLinkBtn: document.querySelector('#addLinkBtn'),
    addInfoBtn: document.querySelector('#addInfoBtn'),
    fullscreenBtn: document.querySelector('#fullscreenBtn'),
    resetBtn: document.querySelector('#resetBtn'),
    emptyState: document.querySelector('#emptyState'),
    placementHint: document.querySelector('#placementHint'),
    placementText: document.querySelector('#placementText'),
    cancelPlacementBtn: document.querySelector('#cancelPlacementBtn'),
    sceneHud: document.querySelector('#sceneHud'),
    hudSceneName: document.querySelector('#hudSceneName'),
    hudSceneMeta: document.querySelector('#hudSceneMeta'),
    renameSceneBtn: document.querySelector('#renameSceneBtn'),
    dialog: document.querySelector('#hotspotDialog'),
    hotspotForm: document.querySelector('#hotspotForm'),
    hotspotType: document.querySelector('#hotspotType'),
    targetField: document.querySelector('#targetField'),
    targetScene: document.querySelector('#targetScene'),
    hotspotLabel: document.querySelector('#hotspotLabel'),
    pitchValue: document.querySelector('#pitchValue'),
    yawValue: document.querySelector('#yawValue'),
    dialogTitle: document.querySelector('#dialogTitle'),
    dialogClose: document.querySelector('#dialogClose'),
    dialogCancel: document.querySelector('#dialogCancel'),
    toast: document.querySelector('#toast'),
  };

  let dbPromise;
  let viewer = null;
  let objectUrls = [];
  let placementMode = null;
  let pendingCoords = null;
  let toastTimer = null;

  const defaultProject = () => ({
    startSceneId: null,
    currentSceneId: null,
    scenes: [],
  });

  let project = loadProject();

  function loadProject() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || !Array.isArray(parsed.scenes)) return defaultProject();
      parsed.scenes.forEach(scene => {
        if (!Array.isArray(scene.hotSpots)) scene.hotSpots = [];
      });
      return parsed;
    } catch {
      return defaultProject();
    }
  }

  function saveProject() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  function uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function cleanName(filename) {
    return filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled scene';
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

  async function dbSet(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
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

  async function dbDelete(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbClear() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function currentScene() {
    return project.scenes.find(scene => scene.id === project.currentSceneId) || null;
  }

  function showToast(message, type = 'ok') {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle('error', type === 'error');
    els.toast.classList.add('show');
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  async function addFiles(fileList) {
    const files = [...fileList].filter(file => file.type.startsWith('image/'));
    if (!files.length) return;

    const added = [];
    try {
      for (const file of files) {
        const id = uid('scene');
        await dbSet(id, file);
        added.push({
          id,
          name: cleanName(file.name),
          fileName: file.name,
          assetKey: id,
          hotSpots: [],
        });
      }

      project.scenes.push(...added);
      if (!project.startSceneId) project.startSceneId = added[0].id;
      project.currentSceneId = added[0].id;
      saveProject();
      renderSidebar();
      await rebuildViewer();
      showToast(`${added.length} panorama${added.length === 1 ? '' : 's'} added`);
    } catch (error) {
      console.error(error);
      showToast('Could not store that image in this browser.', 'error');
    } finally {
      els.fileInput.value = '';
      els.emptyFileInput.value = '';
    }
  }

  async function rebuildViewer(preserveView = false) {
    cancelPlacement();

    let view = null;
    if (viewer && preserveView) {
      try {
        view = { pitch: viewer.getPitch(), yaw: viewer.getYaw(), hfov: viewer.getHfov() };
      } catch { /* viewer may be between scenes */ }
    }

    if (viewer) {
      try { viewer.destroy(); } catch { /* noop */ }
      viewer = null;
    }
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];

    if (!project.scenes.length) {
      updateUI();
      return;
    }

    const missing = [];
    const scenesConfig = {};

    for (const scene of project.scenes) {
      const blob = await dbGet(scene.assetKey);
      if (!blob) {
        missing.push(scene.id);
        continue;
      }
      const url = URL.createObjectURL(blob);
      objectUrls.push(url);
      scenesConfig[scene.id] = {
        type: 'equirectangular',
        panorama: url,
        title: scene.name,
        autoLoad: true,
        hotSpots: scene.hotSpots.map(hotspot => hotspotToPannellum(hotspot)),
      };
    }

    if (missing.length) {
      project.scenes = project.scenes.filter(scene => !missing.includes(scene.id));
      if (!project.scenes.some(scene => scene.id === project.startSceneId)) project.startSceneId = project.scenes[0]?.id || null;
      if (!project.scenes.some(scene => scene.id === project.currentSceneId)) project.currentSceneId = project.startSceneId;
      saveProject();
      renderSidebar();
      if (!project.scenes.length) {
        updateUI();
        return;
      }
    }

    const initialScene = project.scenes.some(scene => scene.id === project.currentSceneId)
      ? project.currentSceneId
      : project.startSceneId || project.scenes[0].id;

    viewer = pannellum.viewer('viewer', {
      default: {
        firstScene: initialScene,
        sceneFadeDuration: 450,
        autoLoad: true,
        showControls: true,
      },
      scenes: scenesConfig,
    });

    viewer.on('scenechange', sceneId => {
      project.currentSceneId = sceneId;
      saveProject();
      renderSidebar();
      updateUI();
    });

    viewer.on('mouseup', event => {
      if (!placementMode || !viewer) return;
      const [pitch, yaw] = viewer.mouseEventToCoords(event);
      pendingCoords = { pitch, yaw };
      openHotspotDialog(placementMode, pitch, yaw);
      cancelPlacement(false);
    });

    if (view) {
      viewer.on('load', () => viewer.lookAt(view.pitch, view.yaw, view.hfov, 0));
    }

    updateUI();
  }

  function hotspotToPannellum(hotspot) {
    if (hotspot.type === 'scene') {
      return {
        id: hotspot.id,
        pitch: hotspot.pitch,
        yaw: hotspot.yaw,
        type: 'scene',
        text: hotspot.text || 'Open scene',
        sceneId: hotspot.targetSceneId,
        targetPitch: 'same',
        targetYaw: 'same',
      };
    }
    return {
      id: hotspot.id,
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      type: 'info',
      text: hotspot.text || 'Info',
    };
  }

  function renderSidebar() {
    els.sceneCount.textContent = project.scenes.length;
    els.sceneList.innerHTML = '';

    if (!project.scenes.length) {
      els.sceneList.innerHTML = '<div class="empty-list">No scenes yet.</div>';
    } else {
      project.scenes.forEach(scene => {
        const card = document.createElement('div');
        card.className = `scene-card${scene.id === project.currentSceneId ? ' active' : ''}`;

        const main = document.createElement('button');
        main.type = 'button';
        main.className = 'scene-main';
        const name = document.createElement('span');
        name.className = 'scene-name';
        name.textContent = scene.name;
        const meta = document.createElement('span');
        meta.className = 'scene-meta';
        meta.textContent = `${scene.hotSpots.length} hotspot${scene.hotSpots.length === 1 ? '' : 's'}${scene.id === project.startSceneId ? ' · Start' : ''}`;
        main.append(name, meta);
        main.addEventListener('click', () => selectScene(scene.id));

        const controls = document.createElement('div');
        controls.className = 'scene-controls';

        const star = document.createElement('button');
        star.type = 'button';
        star.className = `mini-button${scene.id === project.startSceneId ? ' start' : ''}`;
        star.title = 'Set as starting scene';
        star.textContent = '★';
        star.addEventListener('click', () => setStartScene(scene.id));

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'mini-button';
        remove.title = 'Delete scene';
        remove.textContent = '×';
        remove.addEventListener('click', () => deleteScene(scene.id));

        controls.append(star, remove);
        card.append(main, controls);
        els.sceneList.append(card);
      });
    }

    renderHotspots();
  }

  function renderHotspots() {
    const scene = currentScene();
    const hotSpots = scene?.hotSpots || [];
    els.hotspotCount.textContent = hotSpots.length;
    els.hotspotList.innerHTML = '';

    if (!scene) {
      els.hotspotList.innerHTML = '<div class="empty-list">Select a scene first.</div>';
      return;
    }
    if (!hotSpots.length) {
      els.hotspotList.innerHTML = '<div class="empty-list">No hotspots in this scene.</div>';
      return;
    }

    hotSpots.forEach(hotspot => {
      const item = document.createElement('div');
      item.className = 'hotspot-card';
      const text = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = hotspot.text || (hotspot.type === 'scene' ? 'Scene link' : 'Info');
      const meta = document.createElement('span');
      const target = project.scenes.find(scene => scene.id === hotspot.targetSceneId);
      meta.textContent = hotspot.type === 'scene' ? `→ ${target?.name || 'Missing scene'}` : 'Info marker';
      text.append(title, meta);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mini-button';
      remove.title = 'Delete hotspot';
      remove.textContent = '×';
      remove.addEventListener('click', () => deleteHotspot(hotspot.id));
      item.append(text, remove);
      els.hotspotList.append(item);
    });
  }

  function updateUI() {
    const scene = currentScene();
    const hasScenes = project.scenes.length > 0;
    els.emptyState.hidden = hasScenes;
    els.sceneHud.hidden = !scene;
    els.addInfoBtn.disabled = !scene;
    els.addLinkBtn.disabled = !scene || project.scenes.length < 2;

    if (scene) {
      els.hudSceneName.textContent = scene.name;
      els.hudSceneMeta.textContent = `${scene.hotSpots.length} hotspot${scene.hotSpots.length === 1 ? '' : 's'}${scene.id === project.startSceneId ? ' · starting scene' : ''}`;
    }
  }

  function selectScene(sceneId) {
    project.currentSceneId = sceneId;
    saveProject();
    renderSidebar();
    updateUI();
    if (viewer && viewer.getScene() !== sceneId) viewer.loadScene(sceneId);
  }

  function setStartScene(sceneId) {
    project.startSceneId = sceneId;
    saveProject();
    renderSidebar();
    updateUI();
    showToast('Starting scene updated');
  }

  async function deleteScene(sceneId) {
    const scene = project.scenes.find(item => item.id === sceneId);
    if (!scene) return;
    if (!window.confirm(`Delete “${scene.name}” and any links pointing to it?`)) return;

    await dbDelete(scene.assetKey);
    project.scenes = project.scenes.filter(item => item.id !== sceneId);
    project.scenes.forEach(item => {
      item.hotSpots = item.hotSpots.filter(hotspot => hotspot.targetSceneId !== sceneId);
    });

    if (project.startSceneId === sceneId) project.startSceneId = project.scenes[0]?.id || null;
    if (project.currentSceneId === sceneId) project.currentSceneId = project.startSceneId || project.scenes[0]?.id || null;
    saveProject();
    renderSidebar();
    await rebuildViewer();
    showToast('Scene deleted');
  }

  async function deleteHotspot(hotspotId) {
    const scene = currentScene();
    if (!scene) return;
    scene.hotSpots = scene.hotSpots.filter(hotspot => hotspot.id !== hotspotId);
    saveProject();
    renderSidebar();
    await rebuildViewer(true);
    showToast('Hotspot deleted');
  }

  function beginPlacement(type) {
    if (!viewer || !currentScene()) return;
    if (type === 'scene' && project.scenes.length < 2) {
      showToast('Add a second scene before creating a scene link.', 'error');
      return;
    }
    placementMode = type;
    els.placementText.textContent = type === 'scene'
      ? 'Click where the link to another scene should appear'
      : 'Click where the info marker should appear';
    els.placementHint.hidden = false;
    document.body.classList.add('placing-hotspot');
  }

  function cancelPlacement(clearCoords = true) {
    placementMode = null;
    if (clearCoords) pendingCoords = null;
    els.placementHint.hidden = true;
    document.body.classList.remove('placing-hotspot');
  }

  function openHotspotDialog(type, pitch, yaw) {
    const scene = currentScene();
    if (!scene) return;
    els.hotspotType.value = type;
    els.pitchValue.textContent = `${pitch.toFixed(1)}°`;
    els.yawValue.textContent = `${yaw.toFixed(1)}°`;
    els.hotspotLabel.value = '';

    if (type === 'scene') {
      els.dialogTitle.textContent = 'Connect this scene';
      els.targetField.hidden = false;
      els.targetScene.innerHTML = '';
      project.scenes.filter(item => item.id !== scene.id).forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        els.targetScene.append(option);
      });
      const firstTarget = project.scenes.find(item => item.id === els.targetScene.value);
      els.hotspotLabel.value = firstTarget?.name || '';
    } else {
      els.dialogTitle.textContent = 'Add an info marker';
      els.targetField.hidden = true;
      els.hotspotLabel.placeholder = 'e.g. Original fireplace, 1924';
    }

    els.dialog.showModal();
    setTimeout(() => els.hotspotLabel.focus(), 0);
  }

  async function submitHotspot(event) {
    event.preventDefault();
    const scene = currentScene();
    if (!scene || !pendingCoords) return;

    const type = els.hotspotType.value;
    const targetSceneId = type === 'scene' ? els.targetScene.value : null;
    const target = project.scenes.find(item => item.id === targetSceneId);
    const text = els.hotspotLabel.value.trim() || (type === 'scene' ? target?.name || 'Open scene' : 'Info');

    scene.hotSpots.push({
      id: uid('hotspot'),
      type,
      pitch: pendingCoords.pitch,
      yaw: pendingCoords.yaw,
      text,
      targetSceneId,
    });

    pendingCoords = null;
    saveProject();
    els.dialog.close();
    renderSidebar();
    await rebuildViewer(true);
    showToast('Hotspot added');
  }

  function closeDialog() {
    pendingCoords = null;
    if (els.dialog.open) els.dialog.close();
  }

  async function renameCurrentScene() {
    const scene = currentScene();
    if (!scene) return;
    const nextName = window.prompt('Scene name', scene.name)?.trim();
    if (!nextName || nextName === scene.name) return;
    scene.name = nextName;
    saveProject();
    renderSidebar();
    await rebuildViewer(true);
    showToast('Scene renamed');
  }

  async function resetProject() {
    if (!project.scenes.length) return;
    if (!window.confirm('Clear this entire local tour? The panoramas stored in this browser will be removed.')) return;
    await dbClear();
    localStorage.removeItem(STORAGE_KEY);
    project = defaultProject();
    renderSidebar();
    await rebuildViewer();
    showToast('Local tour cleared');
  }

  els.fileInput.addEventListener('change', event => addFiles(event.target.files));
  els.emptyFileInput.addEventListener('change', event => addFiles(event.target.files));
  els.addLinkBtn.addEventListener('click', () => beginPlacement('scene'));
  els.addInfoBtn.addEventListener('click', () => beginPlacement('info'));
  els.cancelPlacementBtn.addEventListener('click', () => cancelPlacement());
  els.hotspotForm.addEventListener('submit', submitHotspot);
  els.dialogClose.addEventListener('click', closeDialog);
  els.dialogCancel.addEventListener('click', closeDialog);
  els.targetScene.addEventListener('change', () => {
    const target = project.scenes.find(item => item.id === els.targetScene.value);
    if (target) els.hotspotLabel.value = target.name;
  });
  els.renameSceneBtn.addEventListener('click', renameCurrentScene);
  els.resetBtn.addEventListener('click', resetProject);
  els.fullscreenBtn.addEventListener('click', () => {
    if (viewer) viewer.toggleFullscreen();
    else showToast('Add a panorama first.', 'error');
  });
  window.addEventListener('beforeunload', () => objectUrls.forEach(url => URL.revokeObjectURL(url)));

  renderSidebar();
  updateUI();
  rebuildViewer().catch(error => {
    console.error(error);
    showToast('Could not restore the local tour.', 'error');
  });
})();
