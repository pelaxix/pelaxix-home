(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';
  let editingHotspotId = null;
  let repositionState = null;

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

  function parseAngle(text) {
    const value = parseFloat(String(text || '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(value) ? value : 0;
  }

  function uid(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function renameScene(sceneId) {
    const project = readProject();
    const scene = project?.scenes.find(item => item.id === sceneId);
    if (!scene) return;

    const oldName = scene.name;
    const nextName = window.prompt('Scene name', oldName)?.trim();
    if (!nextName || nextName === oldName) return;

    scene.name = nextName;
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

  function ensureCreateDescriptionField() {
    const dialog = document.querySelector('#hotspotDialog');
    const labelField = dialog?.querySelector('#hotspotLabel')?.closest('.field');
    if (!dialog || !labelField) return;

    let field = dialog.querySelector('#infoDescriptionField');
    if (!field) {
      field = document.createElement('label');
      field.id = 'infoDescriptionField';
      field.className = 'field';
      field.innerHTML = `
        <span>Description</span>
        <textarea id="hotspotDescription" rows="4" maxlength="600" placeholder="e.g. This is a WWII-era clock that came with the house."></textarea>
      `;
      labelField.insertAdjacentElement('afterend', field);
    }

    const sync = () => {
      if (!dialog.open) return;
      const isInfo = dialog.querySelector('#hotspotType')?.value === 'info';
      field.hidden = !isInfo;
      if (isInfo) dialog.querySelector('#hotspotDescription').value = '';
    };

    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }

  function saveNewInfoHotspot(event) {
    const dialog = document.querySelector('#hotspotDialog');
    const type = dialog?.querySelector('#hotspotType')?.value;
    if (!dialog?.open || type !== 'info') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const project = readProject();
    const scene = currentScene(project);
    if (!project || !scene) return;

    scene.hotSpots = Array.isArray(scene.hotSpots) ? scene.hotSpots : [];
    scene.hotSpots.push({
      id: uid('hotspot'),
      type: 'info',
      pitch: parseAngle(document.querySelector('#pitchValue')?.textContent),
      yaw: parseAngle(document.querySelector('#yawValue')?.textContent),
      text: dialog.querySelector('#hotspotLabel')?.value.trim() || 'Info',
      description: dialog.querySelector('#hotspotDescription')?.value.trim() || '',
      targetSceneId: null,
    });

    writeProject(project);
    try { dialog.close(); } catch {}
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

        <label class="field" id="editDescriptionField" hidden>
          <span>Description</span>
          <textarea id="editHotspotDescription" rows="4" maxlength="600" placeholder="Add the detail shown when someone hovers over this marker."></textarea>
        </label>

        <div class="edit-position-card">
          <div>
            <strong>Hotspot position</strong>
            <span id="editPositionReadout">Pitch 0° · Yaw 0°</span>
          </div>
          <button id="editRepositionBtn" class="button ghost compact" type="button">Reposition on panorama</button>
        </div>

        <input id="editPitch" type="hidden" />
        <input id="editYaw" type="hidden" />

        <div class="dialog-actions">
          <button id="editHotspotCancel" class="button ghost" type="button">Cancel</button>
          <button class="button primary" type="submit">Save changes</button>
        </div>
      </form>`;

    document.body.append(dialog);

    const style = document.createElement('style');
    style.textContent = `
      #hotspotDialog textarea,
      #editHotspotDialog textarea {
        width:100%;
        resize:vertical;
        min-height:88px;
        max-height:220px;
        border:1px solid var(--line);
        border-radius:10px;
        color:var(--text);
        background:#0e0f13;
        padding:10px 11px;
        outline:none;
        font:inherit;
        line-height:1.45;
      }
      #hotspotDialog textarea:focus,
      #editHotspotDialog textarea:focus {
        border-color:rgba(216,255,98,.55);
        box-shadow:0 0 0 3px rgba(216,255,98,.07);
      }
      .edit-position-card {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        padding:12px;
        border:1px solid var(--line);
        border-radius:12px;
        background:rgba(255,255,255,.025);
      }
      .edit-position-card strong,
      .edit-position-card span { display:block; }
      .edit-position-card strong { font-size:12px; }
      .edit-position-card span { margin-top:3px; color:var(--muted); font-size:10px; }
      .hotspot-controls { display:flex; gap:3px; }
      .mini-button.edit-control { font-size:14px; }
      .reposition-hint {
        position:absolute;
        top:18px;
        left:50%;
        transform:translateX(-50%);
        z-index:30;
        display:flex;
        align-items:center;
        gap:10px;
        padding:10px 12px;
        border:1px solid rgba(216,255,98,.28);
        border-radius:12px;
        background:rgba(11,12,15,.94);
        color:var(--text);
        box-shadow:0 14px 40px rgba(0,0,0,.35);
        backdrop-filter:blur(14px);
        font-size:12px;
      }
      .reposition-hint .dot { width:8px; height:8px; border-radius:50%; background:var(--accent); box-shadow:0 0 0 4px rgba(216,255,98,.10); }
      .reposition-hint button { border:0; background:none; color:var(--accent); cursor:pointer; font-weight:700; padding:0; }
      body.repositioning-hotspot #viewer { cursor:crosshair !important; }
      @media (max-width:560px) {
        .edit-position-card { align-items:stretch; flex-direction:column; }
      }
    `;
    document.head.append(style);

    dialog.querySelector('#editHotspotClose').addEventListener('click', closeEditDialog);
    dialog.querySelector('#editHotspotCancel').addEventListener('click', closeEditDialog);
    dialog.querySelector('#editRepositionBtn').addEventListener('click', beginReposition);
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
    const descriptionField = dialog.querySelector('#editDescriptionField');
    const descriptionInput = dialog.querySelector('#editHotspotDescription');
    const labelInput = dialog.querySelector('#editHotspotLabel');
    const pitchInput = dialog.querySelector('#editPitch');
    const yawInput = dialog.querySelector('#editYaw');

    labelInput.value = hotspot.text || '';
    descriptionInput.value = hotspot.description || '';
    pitchInput.value = Number(hotspot.pitch).toFixed(1);
    yawInput.value = Number(hotspot.yaw).toFixed(1);
    updatePositionReadout(dialog, hotspot.pitch, hotspot.yaw);

    if (hotspot.type === 'scene') {
      targetField.hidden = false;
      descriptionField.hidden = true;
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
      descriptionField.hidden = false;
      targetSelect.innerHTML = '';
    }

    dialog.showModal();
    setTimeout(() => labelInput.focus(), 0);
  }

  function updatePositionReadout(dialog, pitch, yaw) {
    const readout = dialog.querySelector('#editPositionReadout');
    if (readout) readout.textContent = `Pitch ${Number(pitch).toFixed(1)}° · Yaw ${Number(yaw).toFixed(1)}°`;
  }

  function persistEditFieldsBeforeMove() {
    const project = readProject();
    const scene = currentScene(project);
    const hotspot = scene?.hotSpots?.find(item => item.id === editingHotspotId);
    const dialog = document.querySelector('#editHotspotDialog');
    if (!project || !scene || !hotspot || !dialog) return null;

    hotspot.text = dialog.querySelector('#editHotspotLabel').value.trim() || (hotspot.type === 'scene' ? 'Open scene' : 'Info');
    if (hotspot.type === 'info') {
      hotspot.description = dialog.querySelector('#editHotspotDescription').value.trim();
    } else {
      const targetSceneId = dialog.querySelector('#editTargetScene').value;
      if (targetSceneId) hotspot.targetSceneId = targetSceneId;
    }

    writeProject(project);
    return { hotspotId: hotspot.id, sceneId: scene.id };
  }

  function beginReposition() {
    const savedState = persistEditFieldsBeforeMove();
    if (!savedState) return;

    repositionState = savedState;
    editingHotspotId = null;

    const dialog = document.querySelector('#editHotspotDialog');
    if (dialog?.open) dialog.close();

    let hint = document.querySelector('#repositionHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'repositionHint';
      hint.className = 'reposition-hint';
      hint.innerHTML = '<span class="dot"></span><span>Click the new hotspot position</span><button type="button">Cancel</button>';
      document.querySelector('.viewer-panel')?.append(hint);
      hint.querySelector('button').addEventListener('click', cancelReposition);
    }

    hint.hidden = false;
    document.body.classList.add('repositioning-hotspot');
    document.querySelector('#viewer')?.addEventListener('click', applyReposition, true);
  }

  function cancelReposition() {
    document.querySelector('#viewer')?.removeEventListener('click', applyReposition, true);
    document.querySelector('#repositionHint')?.setAttribute('hidden', '');
    document.body.classList.remove('repositioning-hotspot');
    repositionState = null;
  }

  function applyReposition(event) {
    if (!repositionState) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const viewer = window.__pelaxixMainPanoViewer;
    if (!viewer?.mouseEventToCoords) {
      cancelReposition();
      window.alert('The panorama viewer is not ready yet. Try again in a moment.');
      return;
    }

    let coords;
    try {
      coords = viewer.mouseEventToCoords(event);
    } catch {
      cancelReposition();
      return;
    }

    const project = readProject();
    const scene = project?.scenes.find(item => item.id === repositionState.sceneId);
    const hotspot = scene?.hotSpots?.find(item => item.id === repositionState.hotspotId);
    if (!project || !scene || !hotspot) return cancelReposition();

    hotspot.pitch = clamp(coords[0], -90, 90);
    hotspot.yaw = normalizeYaw(coords[1]);
    writeProject(project);
    cancelReposition();
    location.reload();
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
    } else {
      hotspot.description = dialog.querySelector('#editHotspotDescription').value.trim();
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
        if (hotspot.type === 'scene') {
          meta.textContent = `→ ${target?.name || 'Missing scene'}`;
        } else {
          const detail = hotspot.description?.trim();
          meta.textContent = detail ? `Info · ${detail.length > 58 ? `${detail.slice(0, 58)}…` : detail}` : 'Info marker';
        }
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

  ensureCreateDescriptionField();
  document.querySelector('#hotspotForm')?.addEventListener('submit', saveNewInfoHotspot, true);

  const observer = new MutationObserver(() => enhanceUI());
  observer.observe(document.querySelector('#sceneList'), { childList: true });
  observer.observe(document.querySelector('#hotspotList'), { childList: true });

  enhanceUI();
})();