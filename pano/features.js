(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';
  const DB_NAME = 'pelaxix-pano-assets';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';

  let dbPromise = null;
  let thumbUrls = [];
  let draggedSceneId = null;
  let autoRotateOn = false;
  let titleTimer = null;

  patchPannellum();
  injectStyles();
  injectBuilderTools();
  injectViewerTools();
  observeSceneList();
  updateSceneCards();
  updateTourStatus();
  wireKeyboardShortcuts();

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
    updateTourStatus();
  }

  function currentScene(project) {
    return project?.scenes.find(scene => scene.id === project.currentSceneId) || null;
  }

  function patchPannellum() {
    if (!window.pannellum?.viewer || window.pannellum.__pelaxixFeaturesPatched) return;

    const previousViewer = window.pannellum.viewer.bind(window.pannellum);
    window.pannellum.viewer = (container, config) => {
      try {
        if (config?.scenes) {
          const project = readProject();
          if (project) {
            Object.entries(config.scenes).forEach(([sceneId, sceneConfig]) => {
              const savedScene = project.scenes.find(scene => scene.id === sceneId);
              if (!savedScene) return;
              if (typeof savedScene.startPitch === 'number') sceneConfig.pitch = savedScene.startPitch;
              if (typeof savedScene.startYaw === 'number') sceneConfig.yaw = savedScene.startYaw;
              if (typeof savedScene.startHfov === 'number') sceneConfig.hfov = savedScene.startHfov;
            });
          }
        }
      } catch (error) {
        console.warn('Could not apply saved scene starting views.', error);
      }

      const instance = previousViewer(container, config);
      const element = typeof container === 'string' ? document.getElementById(container) : container;
      if (container === 'viewer' || element?.id === 'viewer') {
        window.__pelaxixMainPanoViewer = instance;
      }
      return instance;
    };

    window.pannellum.__pelaxixFeaturesPatched = true;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .tour-name-wrap { display:grid; gap:6px; }
      .tour-name-wrap span { color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.1em; font-weight:700; }
      .tour-name-input { width:100%; border:1px solid var(--line); border-radius:10px; color:var(--text); background:#0e0f13; padding:9px 10px; outline:none; font-weight:650; }
      .tour-name-input:focus { border-color:rgba(216,255,98,.55); box-shadow:0 0 0 3px rgba(216,255,98,.07); }
      .pano-tool-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .pano-tool-grid .button { padding:8px 9px; font-size:11px; }
      .scene-card.pano-featured { grid-template-columns:48px minmax(0,1fr) auto; cursor:grab; }
      .scene-card.pano-featured:active { cursor:grabbing; }
      .scene-card.pano-drag-over { outline:1px solid var(--accent); background:rgba(216,255,98,.09); }
      .pano-scene-thumb { width:48px; height:36px; object-fit:cover; border-radius:8px; background:#0b0c10; border:1px solid rgba(255,255,255,.08); pointer-events:none; }
      .pano-scene-thumb.placeholder { display:grid; place-items:center; color:var(--muted); font-size:9px; }
      .pano-scene-order { color:var(--muted); font-size:9px; margin-right:4px; }
      .scene-hud .pano-hud-actions { display:flex; gap:6px; align-items:center; }
      .pano-top-button { border:1px solid var(--line); border-radius:10px; background:rgba(255,255,255,.04); color:var(--muted); padding:8px 10px; cursor:pointer; font-size:11px; font-weight:650; }
      .pano-top-button:hover, .pano-top-button.active { color:var(--text); background:rgba(255,255,255,.08); }
      .pano-top-button.active { border-color:rgba(216,255,98,.28); color:var(--accent); }
      .pano-tour-status { white-space:nowrap; }
      body.pano-preview-mode .sidebar { display:none; }
      body.pano-preview-mode .workspace { grid-template-columns:1fr; }
      body.pano-preview-mode .scene-hud { display:none !important; }
      body.pano-preview-mode .placement-hint { display:none !important; }
      body.pano-preview-mode #fullscreenBtn { display:none; }
      .pano-shortcut-hint { color:var(--muted); font-size:10px; line-height:1.4; text-align:center; }
      @media (max-width:760px) {
        .scene-card.pano-featured { grid-template-columns:40px minmax(0,1fr) auto; }
        .pano-scene-thumb { width:40px; height:32px; }
        .pano-tour-status { display:none; }
        .pano-top-button { padding:7px 8px; }
      }
    `;
    document.head.append(style);
  }

  function injectBuilderTools() {
    const intro = document.querySelector('.sidebar-section.intro');
    if (!intro || document.querySelector('#panoTourName')) return;

    const project = readProject();
    const nameWrap = document.createElement('label');
    nameWrap.className = 'tour-name-wrap';
    nameWrap.innerHTML = `
      <span>Tour name</span>
      <input id="panoTourName" class="tour-name-input" type="text" maxlength="80" placeholder="My virtual tour" />
    `;
    const nameInput = nameWrap.querySelector('input');
    nameInput.value = project?.title || 'My virtual tour';
    nameInput.addEventListener('input', () => {
      clearTimeout(titleTimer);
      titleTimer = setTimeout(() => {
        const latest = readProject();
        if (!latest) return;
        latest.title = nameInput.value.trim() || 'My virtual tour';
        writeProject(latest);
        document.title = `${latest.title} · Pano Lab`;
      }, 250);
    });

    const toolGrid = document.createElement('div');
    toolGrid.className = 'pano-tool-grid';
    toolGrid.innerHTML = `
      <button id="panoExportBtn" class="button ghost" type="button">Export tour</button>
      <button id="panoImportBtn" class="button ghost" type="button">Import tour</button>
      <input id="panoImportInput" type="file" accept=".zip,.pano,application/zip" hidden />
    `;

    const upload = intro.querySelector('.upload-button');
    intro.insertBefore(nameWrap, upload);
    intro.insertBefore(toolGrid, upload);

    toolGrid.querySelector('#panoExportBtn').addEventListener('click', exportTourBundle);
    toolGrid.querySelector('#panoImportBtn').addEventListener('click', () => toolGrid.querySelector('#panoImportInput').click());
    toolGrid.querySelector('#panoImportInput').addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (file) importTourBundle(file);
      event.target.value = '';
    });

    const footer = document.querySelector('.sidebar-footer');
    if (footer && !footer.querySelector('.pano-shortcut-hint')) {
      const hint = document.createElement('div');
      hint.className = 'pano-shortcut-hint';
      hint.textContent = 'Tip: use [ and ] to jump between scenes.';
      footer.append(hint);
    }
  }

  function injectViewerTools() {
    const topActions = document.querySelector('.top-actions');
    if (topActions && !document.querySelector('#panoPreviewBtn')) {
      const status = document.createElement('span');
      status.id = 'panoTourStatus';
      status.className = 'pill pano-tour-status';
      topActions.insertBefore(status, topActions.firstChild);

      const spin = document.createElement('button');
      spin.id = 'panoSpinBtn';
      spin.className = 'pano-top-button';
      spin.type = 'button';
      spin.textContent = 'Auto spin';
      spin.addEventListener('click', toggleAutoRotate);
      topActions.insertBefore(spin, document.querySelector('#fullscreenBtn'));

      const preview = document.createElement('button');
      preview.id = 'panoPreviewBtn';
      preview.className = 'pano-top-button';
      preview.type = 'button';
      preview.textContent = 'Preview';
      preview.addEventListener('click', togglePreviewMode);
      topActions.insertBefore(preview, spin);
    }

    const hud = document.querySelector('#sceneHud');
    const rename = document.querySelector('#renameSceneBtn');
    if (hud && rename && !document.querySelector('#panoSetStartViewBtn')) {
      const actions = document.createElement('div');
      actions.className = 'pano-hud-actions';
      rename.replaceWith(actions);
      actions.append(rename);

      const setView = document.createElement('button');
      setView.id = 'panoSetStartViewBtn';
      setView.className = 'hud-button';
      setView.type = 'button';
      setView.textContent = 'Set start view';
      setView.title = 'Use the view you are looking at as this scene’s default opening direction';
      setView.addEventListener('click', saveCurrentSceneView);
      actions.prepend(setView);
    }
  }

  function updateTourStatus() {
    const status = document.querySelector('#panoTourStatus');
    if (!status) return;
    const project = readProject();
    const sceneCount = project?.scenes?.length || 0;
    const linkCount = (project?.scenes || []).reduce((sum, scene) => sum + (scene.hotSpots || []).filter(h => h.type === 'scene').length, 0);
    status.textContent = `${sceneCount} scene${sceneCount === 1 ? '' : 's'} · ${linkCount} link${linkCount === 1 ? '' : 's'}`;
  }

  function showLocalToast(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('error');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function togglePreviewMode() {
    const enabled = document.body.classList.toggle('pano-preview-mode');
    const button = document.querySelector('#panoPreviewBtn');
    if (button) {
      button.classList.toggle('active', enabled);
      button.textContent = enabled ? 'Exit preview' : 'Preview';
    }
    setTimeout(() => window.__pelaxixMainPanoViewer?.resize?.(), 100);
  }

  function toggleAutoRotate() {
    const viewer = window.__pelaxixMainPanoViewer;
    if (!viewer) return showLocalToast('Add a panorama first.');
    autoRotateOn = !autoRotateOn;
    const button = document.querySelector('#panoSpinBtn');
    try {
      if (autoRotateOn) viewer.startAutoRotate(2, viewer.getPitch());
      else viewer.stopAutoRotate();
    } catch {
      autoRotateOn = false;
    }
    if (button) button.classList.toggle('active', autoRotateOn);
  }

  function saveCurrentSceneView() {
    const project = readProject();
    const scene = currentScene(project);
    const viewer = window.__pelaxixMainPanoViewer;
    if (!project || !scene || !viewer) return;

    try {
      scene.startPitch = viewer.getPitch();
      scene.startYaw = viewer.getYaw();
      scene.startHfov = viewer.getHfov();
      writeProject(project);
      showLocalToast(`Start view saved for ${scene.name}`);
    } catch {
      showLocalToast('Could not save this view.');
    }
  }

  function observeSceneList() {
    const list = document.querySelector('#sceneList');
    if (!list) return;
    const observer = new MutationObserver(() => {
      updateSceneCards();
      updateTourStatus();
    });
    observer.observe(list, { childList: true });
  }

  async function updateSceneCards() {
    const list = document.querySelector('#sceneList');
    const project = readProject();
    if (!list || !project) return;

    thumbUrls.forEach(url => URL.revokeObjectURL(url));
    thumbUrls = [];

    const cards = [...list.querySelectorAll('.scene-card')];
    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      const scene = project.scenes[index];
      if (!scene) continue;

      card.classList.add('pano-featured');
      card.dataset.sceneId = scene.id;
      card.draggable = true;
      card.title = 'Drag to reorder scenes';

      let thumb = card.querySelector('.pano-scene-thumb');
      if (!thumb) {
        thumb = document.createElement('img');
        thumb.className = 'pano-scene-thumb';
        thumb.alt = '';
        thumb.draggable = false;
        card.prepend(thumb);
      }

      const blob = await dbGet(scene.assetKey).catch(() => null);
      if (blob && card.isConnected) {
        const url = URL.createObjectURL(blob);
        thumbUrls.push(url);
        thumb.src = url;
      }

      const meta = card.querySelector('.scene-meta');
      if (meta && !meta.dataset.orderAdded) {
        meta.dataset.orderAdded = 'true';
      }

      card.ondragstart = event => {
        if (event.target.closest('button')) {
          event.preventDefault();
          return;
        }
        draggedSceneId = scene.id;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', scene.id);
      };
      card.ondragover = event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        card.classList.add('pano-drag-over');
      };
      card.ondragleave = () => card.classList.remove('pano-drag-over');
      card.ondrop = event => {
        event.preventDefault();
        card.classList.remove('pano-drag-over');
        const sourceId = draggedSceneId || event.dataTransfer.getData('text/plain');
        reorderScenes(sourceId, scene.id);
      };
      card.ondragend = () => {
        draggedSceneId = null;
        list.querySelectorAll('.pano-drag-over').forEach(el => el.classList.remove('pano-drag-over'));
      };
    }
  }

  function reorderScenes(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const project = readProject();
    if (!project) return;
    const from = project.scenes.findIndex(scene => scene.id === sourceId);
    const to = project.scenes.findIndex(scene => scene.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = project.scenes.splice(from, 1);
    project.scenes.splice(to, 0, moved);
    writeProject(project);
    location.reload();
  }

  function wireKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || document.querySelector('dialog[open]')) return;
      if (event.key === '[') jumpScene(-1);
      if (event.key === ']') jumpScene(1);
      if (event.key.toLowerCase() === 'p') togglePreviewMode();
    });
  }

  function jumpScene(offset) {
    const project = readProject();
    if (!project?.scenes?.length) return;
    const currentIndex = Math.max(0, project.scenes.findIndex(scene => scene.id === project.currentSceneId));
    const nextIndex = (currentIndex + offset + project.scenes.length) % project.scenes.length;
    const next = project.scenes[nextIndex];
    project.currentSceneId = next.id;
    writeProject(project);
    try {
      window.__pelaxixMainPanoViewer?.loadScene(next.id);
    } catch {
      location.reload();
    }
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

  async function dbPut(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
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

  function extensionFor(scene, blob) {
    const filename = scene.fileName || '';
    const dot = filename.lastIndexOf('.');
    if (dot >= 0 && dot < filename.length - 1) return filename.slice(dot).toLowerCase();
    if (blob?.type === 'image/png') return '.png';
    if (blob?.type === 'image/webp') return '.webp';
    return '.jpg';
  }

  function safeFilename(value) {
    return String(value || 'pano-tour').trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'pano-tour';
  }

  async function exportTourBundle() {
    const project = readProject();
    if (!project?.scenes?.length) return showLocalToast('There is no tour to export yet.');
    if (!window.JSZip) return showLocalToast('Export library did not load.');

    const button = document.querySelector('#panoExportBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Packing…';
    }

    try {
      const zip = new JSZip();
      const assets = [];
      for (const scene of project.scenes) {
        const blob = await dbGet(scene.assetKey);
        if (!blob) throw new Error(`Missing image for ${scene.name}`);
        const path = `assets/${scene.assetKey}${extensionFor(scene, blob)}`;
        zip.file(path, blob);
        assets.push({
          key: scene.assetKey,
          path,
          type: blob.type || 'image/jpeg',
          fileName: scene.fileName || `${scene.name}${extensionFor(scene, blob)}`,
        });
      }

      zip.file('project.json', JSON.stringify({
        format: 'pelaxix-pano',
        version: 1,
        exportedAt: new Date().toISOString(),
        project,
        assets,
      }, null, 2));

      const bundle = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
      const url = URL.createObjectURL(bundle);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename(project.title)}.pano.zip`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      showLocalToast('Tour bundle exported.');
    } catch (error) {
      console.error(error);
      showLocalToast('Could not export the tour.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Export tour';
      }
    }
  }

  async function importTourBundle(file) {
    if (!window.JSZip) return showLocalToast('Import library did not load.');
    if (!window.confirm('Importing will replace the current local tour in this browser. Continue?')) return;

    const button = document.querySelector('#panoImportBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Importing…';
    }

    try {
      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file('project.json');
      if (!manifestFile) throw new Error('project.json missing');
      const manifest = JSON.parse(await manifestFile.async('string'));
      if (manifest.format !== 'pelaxix-pano' || !manifest.project || !Array.isArray(manifest.project.scenes) || !Array.isArray(manifest.assets)) {
        throw new Error('Not a Pano Lab bundle');
      }

      const restored = [];
      for (const asset of manifest.assets) {
        const entry = zip.file(asset.path);
        if (!entry) throw new Error(`Missing ${asset.path}`);
        const bytes = await entry.async('uint8array');
        restored.push({ key: asset.key, blob: new Blob([bytes], { type: asset.type || 'image/jpeg' }) });
      }

      await dbClear();
      for (const asset of restored) await dbPut(asset.key, asset.blob);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manifest.project));
      location.reload();
    } catch (error) {
      console.error(error);
      showLocalToast('That file could not be imported as a Pano Lab tour.');
      if (button) {
        button.disabled = false;
        button.textContent = 'Import tour';
      }
    }
  }

  window.addEventListener('beforeunload', () => thumbUrls.forEach(url => URL.revokeObjectURL(url)));
})();