let currentValue = '';
let currentSvg = '';

const toInput = document.querySelector('#toInput');
const subjectInput = document.querySelector('#subjectInput');
const bodyInput = document.querySelector('#bodyInput');
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
[toInput, subjectInput, bodyInput].forEach((field) => {
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && field !== bodyInput) generateQr();
  });
});

downloadPngButton.addEventListener('click', downloadPng);
downloadSvgButton.addEventListener('click', downloadSvg);

function generateQr() {
  const to = toInput.value.trim();

  if (!to) {
    setStatus('Enter a recipient email address first.');
    return;
  }

  if (typeof kjua !== 'function') {
    setStatus('QR library did not load. Refresh and try again.');
    return;
  }

  try {
    currentValue = buildMailto();
    const svgNode = createQrNode('svg', 280);
    currentSvg = new XMLSerializer().serializeToString(svgNode);
    qrPreview.innerHTML = '';
    qrPreview.appendChild(svgNode);
    downloadPngButton.disabled = false;
    downloadSvgButton.disabled = false;
    setStatus(`Email QR generated for ${to}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not generate QR: ${error.message}`);
  }
}

function buildMailto() {
  const to = encodeURIComponent(toInput.value.trim());
  const params = new URLSearchParams();
  const subject = subjectInput.value.trim();
  const body = bodyInput.value.trim();

  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);

  const query = params.toString();
  return query ? `mailto:${to}?${query}` : `mailto:${to}`;
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
  const safe = toInput.value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'email';
  return `qr-email-${safe}.${extension}`;
}

function setStatus(message) {
  statusMessage.textContent = message;
}
