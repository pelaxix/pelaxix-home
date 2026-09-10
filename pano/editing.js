(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';
  let editingHotspotId = null;

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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizeYaw(value) {
    return ((value + 180) % 360 + 360) % 360 - 180;
  }

  function renameScene(sceneId) {
    const project = readProject();
    const scene = project?.scenes.find(item => item.id === sceneId);
    if (!scene) return;

    const oldName = scene.name;
    const nextName = window.prompt('Scene name', oldName)?.trim();
    if (!nextName || nextName === oldName) return;

    scene.name = nextName;

    // Keep labels that were automatically inherited from the destination name in sync.
    project.scenes.forEach(sourceScene => {
      (sourceScene.hotSpots || []).forEach(hotspot => {
        if (hotspot.type === 'scene' && hotspot.targetSceneId === sceneId && hotspot.text === oldName) {
          hotspot.text = nextName;
        }
      });
    });

    writeProject(project);
    location.reload();
  }

  function ensureEditDialog() {
    if (document.querySelector('#editHotspotDialog')) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'editHotspotDialog';
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <form id="editHotspotForm">
        <div class="dialog-heading">
          <div>
            <span class="eyebrow">Existing hotspot</span>
            <h2>Edit hotspot</h2>
          </div>
          <button id="editHotspotClose" class="icon-button" type="button" aria-label="Close">×</button>
        </div>

        <label class="field" id="editTargetField">
          <span>Destination scene</span>
          <select id="editTargetScene"></select>
        </label>

        <label class="field">
          <span>Label</span>
          <input id="editHotspotLabel" type="text" maxlength="80" />
        </label>

        <div class="edit-coordinate-grid">
          <label class="field">
            <span>Pitch</span>
            <div class="number-with-unit">
              <input id="editPitch" type="number" min="-90" max="90" step="0.1" required />
              <span>°</span>
            </div>
          </label>
          <label class="field">
            <span>Yaw</span>
            <div class="number-with-unit">
              <input id="editYaw" type="number" min="-180" max="180" step="0.1" required />
              <span>°</span>
            </div>
          </label>
        </div>

        <p class="edit-help">Pitch moves the hotspot up/down. Yaw moves it left/right around the panorama.</p>

        <div class="dialog-actions">
          <button id="editHotspotCancel" class="button ghost" type="button">Cancel</button>
          <button class="button primary" type="submit">Save changes</button>
        </div>
      </form>`;

    document.body.append(dialog);

    const style = document.createElement('style');
    style.textContent = `
      .edit-coordinate-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .number-with-unit { position:relative; }
      .number-with-unit input { padding-right:30px; }
      .number-with-unit > span { position:absolute; right:11px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:12px; pointer-events:none; }
      .edit-help { margin:-5px 0 0; color:var(--muted); font-size:11px; line-height:1.45; }
      .hotspot-controls { display:flex; gap:3px; }
      .mini-button.edit-control { font-size:14px; }
      @media (max-width:520px) { .edit-coordinate-grid { grid-template-columns:1fr; } }
    `;
    document.head.append(style);

    dialog.querySelector('#editHotspotClose').addEventListener('click', closeEditDialog);
    dialog.querySelector('#editHotspotCancel').addEventListener('click', closeEditDialog);
    dialog.querySelector('#editHotspotForm').addEventListener('submit', saveHotspotChanges);
  }

  function closeEditDialog() {
    editingHotspotId = null;
    const dialog = document.querySelector('#editHotspotDialog');
    if (dialog?.open) dialog.close();
  }

  function openHotspotEditor(hotspotId) {
    ensureEditDialog();

    const project = readProject();
    const scene = currentScene(project);
    const hotspot = scene?.hotSpots?.find(item => item.id === hotspotId);
    if (!project || !scene || !hotspot) return;

    editingHotspotId = hotspotId;

    const dialog = document.querySelector('#editHotspotDialog');
    const targetField = dialog.querySelector('#editTargetField');
    const targetSelect = dialog.querySelector('#editTargetScene');
    const labelInput = dialog.querySelector('#editHotspotLabel');
    const pitchInput = dialog.querySelector('#editPitch');
    const yawInput = dialog.querySelector('#editYaw');

    labelInput.value = hotspot.text || '';
    pitchInput.value = Number(hotspot.pitch).toFixed(1);
    yawInput.value = Number(hotspot.yaw).toFixed(1);

    if (hotspot.type === 'scene') {
      targetField.hidden = false;
      targetSelect.innerHTML = '';
      project.scenes.filter(item => item.id !== scene.id).forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        option.selected = item.id === hotspot.targetSceneId;
        targetSelect.append(option);
      });
    } else {
      targetField.hidden = true;
      targetSelect.innerHTML = '';
    }

    dialog.showModal();
    setTimeout(() => labelInput.focus(), 0);
  }

  function saveHotspotChanges(event) {
    event.preventDefault();

    const project = readProject();
    const scene = currentScene(project);
    const hotspot = scene?.hotSpots?.find(item => item.id === editingHotspotId);
    if (!project || !scene || !hotspot) return closeEditDialog();

    const dialog = document.querySelector('#editHotspotDialog');
    const pitch = Number(dialog.querySelector('#editPitch').value);
    const yaw = Number(dialog.querySelector('#editYaw').value);
    if (!Number.isFinite(pitch) || !Number.isFinite(yaw)) return;

    hotspot.pitch = clamp(pitch, -90, 90);
    hotspot.yaw = normalizeYaw(yaw);
    hotspot.text = dialog.querySelector('#editHotspotLabel').value.trim() || (hotspot.type === 'scene' ? 'Open scene' : 'Info');

    if (hotspot.type === 'scene') {
      const targetSceneId = dialog.querySelector('#editTargetScene').value;
      if (targetSceneId) hotspot.targetSceneId = targetSceneId;
    }

    writeProject(project);
    closeEditDialog();
    location.reload();
  }

  function enhanceScenes(project) {
    const cards = [...document.querySelectorAll('#sceneList .scene-card')];
    cards.forEach((card, index) => {
      if (card.dataset.editEnhanced === 'true') return;
      const scene = project.scenes[index];
      const controls = card.querySelector('.scene-controls');
      if (!scene || !controls) return;

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'mini-button edit-control';
      edit.title = 'Rename scene';
      edit.setAttribute('aria-label', `Rename ${scene.name}`);
      edit.textContent = '✎';
      edit.addEventListener('click', event => {
        event.stopPropagation();
        renameScene(scene.id);
      });

      controls.prepend(edit);
      card.dataset.editEnhanced = 'true';
    });
  }

  function enhanceHotspots(project) {
    const scene = currentScene(project);
    if (!scene) return;

    const cards = [...document.querySelectorAll('#hotspotList .hotspot-card')];
    cards.forEach((card, index) => {
      if (card.dataset.editEnhanced === 'true') return;
      const hotspot = scene.hotSpots?.[index];
      const remove = card.querySelector(':scope > .mini-button');
      const meta = card.querySelector('span');
      if (!hotspot || !remove) return;

      if (meta) {
        const target = project.scenes.find(item => item.id === hotspot.targetSceneId);
        const destination = hotspot.type === 'scene' ? `→ ${target?.name || 'Missing scene'}` : 'Info marker';
        meta.textContent = `${destination} · P ${Number(hotspot.pitch).toFixed(1)}° · Y ${Number(hotspot.yaw).toFixed(1)}°`;
      }

      const controls = document.createElement('div');
      controls.className = 'hotspot-controls';

      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'mini-button edit-control';
      edit.title = 'Edit hotspot';
      edit.setAttribute('aria-label', 'Edit hotspot');
      edit.textContent = '✎';
      edit.addEventListener('click', () => openHotspotEditor(hotspot.id));

      card.append(controls);
      controls.append(edit, remove);
      card.dataset.editEnhanced = 'true';
    });
  }

  function enhanceUI() {
    const project = readProject();
    if (!project) return;
    ensureEditDialog();
    enhanceScenes(project);
    enhanceHotspots(project);
  }

  // app.js redraws the sidebar after scene changes and edits, so re-apply the controls when needed.
  const observer = new MutationObserver(() => enhanceUI());
  observer.observe(document.querySelector('#sceneList'), { childList: true });
  observer.observe(document.querySelector('#hotspotList'), { childList: true });

  enhanceUI();
})();