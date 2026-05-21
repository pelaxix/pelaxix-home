let currentValue = '';
let currentSvg = '';

const phoneInput = document.querySelector('#phoneInput');
const messageInput = document.querySelector('#messageInput');
const messageArea = document.querySelector('#messageArea');
const modeRadios = document.querySelectorAll("input[name='qrMode']");
const foregroundInput = document.querySelector('#foregroundInput');
const backgroundInput = document.querySelector('#backgroundInput');
const foregroundLabel = document.querySelector('#foregroundLabel');
const backgroundLabel = document.querySelector('#backgroundLabel');
const generateButton = document.querySelector('#generateButton');
const downloadPngButton = document.querySelector('#downloadPngButton');
const downloadSvgButton = document.querySelector('#downloadSvgButton');
const qrPreview = document.querySelector('#qrPreview');
const statusMessage = document.querySelector('#statusMessage');

modeRadios.forEach((radio) => radio.addEventListener('change', updateMode));

foregroundInput.addEventListener('input', () => {
  foregroundLabel.textContent = foregroundInput.value;
  if (currentValue) generateQr();
});

backgroundInput.addEventListener('input', () => {
  backgroundLabel.textContent = backgroundInput.value;
  if (currentValue) generateQr();
});

generateButton.addEventListener('click', generateQr);
phoneInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') generateQr();
});
downloadPngButton.addEventListener('click', downloadPng);
downloadSvgButton.addEventListener('click', downloadSvg);

function updateMode() {
  const mode = getCheckedValue('qrMode');
  messageArea.hidden = mode !== 'sms';
  setStatus(mode === 'sms' ? 'Enter a phone number. Message is optional.' : 'Enter a phone number to generate a QR code.');
  if (currentValue) generateQr();
}

function generateQr() {
  const phone = phoneInput.value.trim();
  const mode = getCheckedValue('qrMode');

  if (!phone) {
    setStatus('Enter a phone number first.');
    return;
  }

  if (typeof kjua !== 'function') {
    setStatus('QR library did not load. Refresh and try again.');
    return;
  }

  try {
    currentValue = mode === 'sms' ? buildSmsPayload(phone) : `tel:${cleanPhone(phone)}`;
    const svgNode = createQrNode('svg', 280);
    currentSvg = new XMLSerializer().serializeToString(svgNode);
    qrPreview.innerHTML = '';
    qrPreview.appendChild(svgNode);
    downloadPngButton.disabled = false;
    downloadSvgButton.disabled = false;
    setStatus(mode === 'sms' ? `SMS QR generated for ${phone}.` : `Phone QR generated for ${phone}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not generate QR: ${error.message}`);
  }
}

function buildSmsPayload(phone) {
  const cleaned = cleanPhone(phone);
  const message = messageInput.value.trim();
  return message ? `sms:${cleaned}?body=${encodeURIComponent(message)}` : `sms:${cleaned}`;
}

function cleanPhone(value) {
  return String(value || '').replace(/[^+0-9]/g, '');
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

function getCheckedValue(name) {
  return document.querySelector(`input[name='${name}']:checked`)?.value;
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
  const mode = getCheckedValue('qrMode');
  const safe = cleanPhone(phoneInput.value).replace(/[^a-zA-Z0-9-_]+/g, '-') || 'phone';
  return `qr-${mode}-${safe}.${extension}`;
}

function setStatus(message) {
  statusMessage.textContent = message;
}

updateMode();
