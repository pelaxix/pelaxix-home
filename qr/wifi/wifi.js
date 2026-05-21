let currentValue = '';
let currentSvg = '';

const ssidInput = document.querySelector('#ssidInput');
const passwordInput = document.querySelector('#passwordInput');
const togglePasswordButton = document.querySelector('#togglePasswordButton');
const hiddenInput = document.querySelector('#hiddenInput');
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
ssidInput.addEventListener('keydown', handleEnter);
passwordInput.addEventListener('keydown', handleEnter);
downloadPngButton.addEventListener('click', downloadPng);
downloadSvgButton.addEventListener('click', downloadSvg);

togglePasswordButton.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  togglePasswordButton.textContent = isHidden ? 'Hide password' : 'Show password';
});

function handleEnter(event) {
  if (event.key === 'Enter') generateQr();
}

function generateQr() {
  const ssid = ssidInput.value.trim();
  const password = passwordInput.value;
  const securityType = getCheckedValue('securityType');

  if (!ssid) {
    setStatus('Enter a network name first.');
    return;
  }

  if (securityType !== 'nopass' && !password) {
    setStatus('Enter a password, or choose No password.');
    return;
  }

  if (typeof kjua !== 'function') {
    setStatus('QR library did not load. Refresh and try again.');
    return;
  }

  try {
    currentValue = buildWifiPayload(ssid, password, securityType, hiddenInput.checked);
    const svgNode = createQrNode('svg', 280);
    currentSvg = new XMLSerializer().serializeToString(svgNode);
    qrPreview.innerHTML = '';
    qrPreview.appendChild(svgNode);
    downloadPngButton.disabled = false;
    downloadSvgButton.disabled = false;
    setStatus(`Wi-Fi QR generated for ${ssid}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not generate QR: ${error.message}`);
  }
}

function buildWifiPayload(ssid, password, securityType, hidden) {
  const auth = securityType === 'nopass' ? 'nopass' : securityType;
  const safePassword = securityType === 'nopass' ? '' : escapeWifiValue(password);
  return `WIFI:T:${auth};S:${escapeWifiValue(ssid)};P:${safePassword};H:${hidden ? 'true' : 'false'};;`;
}

function escapeWifiValue(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/:/g, '\\:')
    .replace(/"/g, '\\"');
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
  const safe = ssidInput.value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'wifi';
  return `qr-wifi-${safe}.${extension}`;
}

function setStatus(message) {
  statusMessage.textContent = message;
}
