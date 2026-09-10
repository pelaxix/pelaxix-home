(() => {
  'use strict';

  const STORAGE_KEY = 'pelaxix-pano-project-v1';

  patchPannellumTooltips();
  injectStyles();

  function readProject() {
    try {
      const project = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return project && Array.isArray(project.scenes) ? project : null;
    } catch {
      return null;
    }
  }

  function patchPannellumTooltips() {
    if (!window.pannellum?.viewer || window.pannellum.__pelaxixTooltipPatched) return;

    const originalViewer = window.pannellum.viewer.bind(window.pannellum);
    window.pannellum.viewer = (container, config) => {
      try {
        if (config?.scenes) {
          const project = readProject();
          if (project) {
            Object.entries(config.scenes).forEach(([sceneId, sceneConfig]) => {
              const savedScene = project.scenes.find(scene => scene.id === sceneId);
              if (!savedScene || !Array.isArray(sceneConfig.hotSpots)) return;

              sceneConfig.hotSpots.forEach(renderedHotspot => {
                const savedHotspot = savedScene.hotSpots?.find(item => item.id === renderedHotspot.id);
                if (!savedHotspot || savedHotspot.type !== 'info') return;

                renderedHotspot.customTooltipFunc = buildInfoTooltip;
                renderedHotspot.customTooltipFuncArgs = {
                  title: savedHotspot.text || 'Info',
                  description: savedHotspot.description || '',
                };
              });
            });
          }
        }
      } catch (error) {
        console.warn('Could not apply rich info tooltips.', error);
      }

      return originalViewer(container, config);
    };

    window.pannellum.__pelaxixTooltipPatched = true;
  }

  function buildInfoTooltip(hotSpotDiv, args) {
    const data = Array.isArray(args) ? args[0] || {} : args || {};
    const tip = document.createElement('span');
    tip.className = 'pano-rich-info-tooltip';

    const title = document.createElement('strong');
    title.textContent = data.title || 'Info';
    tip.append(title);

    if (data.description) {
      const description = document.createElement('small');
      description.textContent = data.description;
      tip.append(description);
    }

    hotSpotDiv.append(tip);
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #viewer .pano-rich-info-tooltip {
        position:absolute;
        left:50%;
        bottom:calc(100% + 12px);
        transform:translateX(-50%);
        width:max-content;
        max-width:280px;
        min-width:120px;
        padding:9px 11px;
        border:1px solid rgba(168,255,204,.22);
        border-radius:10px;
        background:rgba(10,11,14,.94);
        color:#f4f5f7;
        box-shadow:0 10px 28px rgba(0,0,0,.34);
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
        opacity:0;
        visibility:hidden;
        pointer-events:none;
        transition:opacity .14s ease, transform .14s ease, visibility .14s ease;
        text-align:left;
        white-space:normal;
        z-index:20;
      }
      #viewer .pano-rich-info-tooltip::after {
        content:'';
        position:absolute;
        top:100%;
        left:50%;
        transform:translateX(-50%);
        border:6px solid transparent;
        border-top-color:rgba(10,11,14,.94);
      }
      #viewer .pano-rich-info-tooltip strong {
        display:block;
        color:#b8ffd7;
        font-family:Inter, ui-sans-serif, system-ui, sans-serif;
        font-size:11px;
        font-weight:750;
        line-height:1.25;
      }
      #viewer .pano-rich-info-tooltip small {
        display:block;
        margin-top:4px;
        color:#d3d5da;
        font-family:Inter, ui-sans-serif, system-ui, sans-serif;
        font-size:10px;
        font-weight:450;
        line-height:1.4;
      }
      #viewer .pnlm-hotspot-base.pnlm-info:hover .pano-rich-info-tooltip {
        opacity:1;
        visibility:visible;
        transform:translateX(-50%) translateY(-2px);
      }
    `;
    document.head.append(style);
  }
})();