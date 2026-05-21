const batchInput = document.querySelector('#batchInput');
const lineCount = document.querySelector('#lineCount');
const foregroundInput = document.querySelector('#foregroundInput');
const backgroundInput = document.querySelector('#backgroundInput');
const foregroundLabel = document.querySelector('#foregroundLabel');
const backgroundLabel = document.querySelector('#backgroundLabel');
const generateButton = document.querySelector('#generateButton');
const clearButton = document.querySelector('#clearButton');
const previewList = document.querySelector('#previewList');
const statusMessage = document.querySelector('#statusMessage');

const MAX_ITEMS = 100;

batchInput.addEventListener('input', updatePreview);
foregroundInput.addEventListener('input', () => {
  foregroundLabel.textContent = foregroundInput.value;
});
backgroundInput.addEventListener('input', () => {
  backgroundLabel.textContent = backgroundInput.value;
});
generateButton.addEventListener('click', createZip);
clearButton.addEventListener('click', () => {
  batchInput.value = '';
  updatePreview();
  setStatus('Paste one item per line to create a batch of QR codes.');
});

async function createZip() {
  const items = getItems();
  const outputType = getCheckedValue('outputType');

  if (!items.length) {
    setStatus('Paste at least one item first.');
    return;
  }

  if (items.length > MAX_ITEMS) {
    setStatus(`Too many items. Keep it to ${MAX_ITEMS} QR codes or fewer.`);
    return;
  }

  if (typeof kjua !== 'function' || typeof JSZip !== 'function') {
    setStatus('A required library did not load. Refresh and try again.');
    return;
  }

  generateButton.disabled = true;
  setStatus(`Creating ${items.length} QR code${items.length === 1 ? '' : 's'} locally...`);

  try {
    const zip = new JSZip();

    for (let index = 0; index < items.length; index += 1) {
      const value = normalizeItem(items[index]);
      const fileBase = buildFileBase(index, value);

      if (outputType === 'svg') {
        const svgNode = createQrNode(value, 'svg', 512);
        const svg = new XMLSerializer().serializeToString(svgNode);
        zip.file(`${fileBase}.svg`, svg);
      } else {
        const canvas = createQrNode(value, 'canvas', 1024);
        const blob = await canvasToBlob(canvas);
        zip.file(`${fileBase}.png`, blob);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, `batch-qr-${outputType}.zip`);
    setStatus(`Created ZIP with ${items.length} ${outputType.toUpperCase()} QR code${items.length === 1 ? '' : 's'}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not create ZIP: ${error.message}`);
  } finally {
    generateButton.disabled = false;
  }
}

function getItems() {
  return batchInput.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeItem(value) {
  const type = getCheckedValue('qrType');
  const text = String(value || '').trim();
  if (type !== 'link') return text;
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

function createQrNode(text, renderMode, size) {
  return kjua({
    render: renderMode,
    text,
    size,
    fill: foregroundInput.value,
    back: backgroundInput.value,
    quiet: 2,
    ecLevel: 'M'
  });
}

function updatePreview() {
  const items = getItems();
  lineCount.textContent = `${items.length} line${items.length === 1 ? '' : 's'}${items.length > MAX_ITEMS ? ` · over ${MAX_ITEMS} limit` : ''}`;

  if (!items.length) {
    previewList.innerHTML = `<p class="helper-text">Your first few items will appear here before export.</p>`;
    return;
  }

  const previewItems = items.slice(0, 8);
  previewList.innerHTML = `<div class="batch-preview-list">${previewItems.map((item, index) => `
    <p><strong>${index + 1}.</strong> ${escapeHtml(normalizeItem(item))}</p>
  `).join('')}${items.length > 8 ? `<p class="helper-text">...and ${items.length - 8} more.</p>` : ''}</div>`;
}

function buildFileBase(index, value) {
  const label = value
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'qr';
  return `qr-${String(index + 1).padStart(3, '0')}-${label}`;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export PNG.'));
    }, 'image/png');
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getCheckedValue(name) {
  return document.querySelector(`input[name='${name}']:checked`)?.value;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setStatus(message) {
  statusMessage.textContent = message;
}

updatePreview();
