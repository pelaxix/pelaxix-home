let currentValue = '';
let currentSvg = '';

const linkInput = document.querySelector('#linkInput');
const foregroundInput = document.querySelector('#foregroundInput');
const backgroundInput = document.querySelector('#backgroundInput');
const foregroundLabel = document.querySelector('#foregroundLabel');
const backgroundLabel = document.querySelector('#backgroundLabel');
const generateButton = document.querySelector('#generateButton');
const downloadPngButton = document.querySelector('#downloadPngButton');
const downloadSvgButton = document.querySelector('#downloadSvgButton');
const qrPreview = document.querySelector('#qrPreview');
const statusMessage = document.querySelector('#statusMessage');

foregroundInput.addEventListener('input', () => {
  foregroundLabel.textContent = foregroundInput.value;
  if (currentValue) generateQr();
});

backgroundInput.addEventListener('input', () => {
  backgroundLabel.textContent = backgroundInput.value;
  if (currentValue) generateQr();
});

generateButton.addEventListener('click', generateQr);
linkInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') generateQr();
});

downloadPngButton.addEventListener('click', downloadPng);
downloadSvgButton.addEventListener('click', downloadSvg);

function generateQr() {
  const normalizedLink = normalizeLink(linkInput.value);

  if (!normalizedLink) {
    setStatus('Enter a link first.');
    return;
  }

  if (typeof kjua !== 'function') {
    setStatus('QR library did not load. Refresh and try again.');
    return;
  }

  try {
    currentValue = normalizedLink;
    const svgNode = createQrNode('svg', 280);
    currentSvg = new XMLSerializer().serializeToString(svgNode);
    qrPreview.innerHTML = '';
    qrPreview.appendChild(svgNode);
    downloadPngButton.disabled = false;
    downloadSvgButton.disabled = false;
    setStatus(`QR generated for ${normalizedLink}`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not generate QR: ${error.message}`);
  }
}

function createQrNode(renderMode, size) {
  return kjua({
    render: renderMode,
    text: currentValue,
    size,
    fill: foregroundInput.value,
    back: backgroundInput.value,
    quiet: 2,
    ecLevel: 'M'
  });
}

function normalizeLink(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

function downloadPng() {
  if (!currentValue) return;

  try {
    const canvas = createQrNode('canvas', 1024);
    const dataUrl = canvas.toDataURL('image/png');
    downloadUrl(dataUrl, buildFileName('png'));
  } catch (error) {
    setStatus(`Could not download PNG: ${error.message}`);
  }
}

function downloadSvg() {
  if (!currentSvg) return;
  const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, buildFileName('svg'));
  URL.revokeObjectURL(url);
}

function downloadUrl(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function buildFileName(extension) {
  const safe = currentValue
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'link';
  return `qr-${safe}.${extension}`;
}

function setStatus(message) {
  statusMessage.textContent = message;
}
