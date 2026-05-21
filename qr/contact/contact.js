let currentValue = '';
let currentSvg = '';

const fields = {
  firstName: document.querySelector('#firstNameInput'),
  lastName: document.querySelector('#lastNameInput'),
  organization: document.querySelector('#organizationInput'),
  title: document.querySelector('#titleInput'),
  phone: document.querySelector('#phoneInput'),
  email: document.querySelector('#emailInput'),
  website: document.querySelector('#websiteInput'),
  address: document.querySelector('#addressInput'),
  notes: document.querySelector('#notesInput')
};

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
Object.values(fields).forEach((field) => {
  field.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') generateQr();
  });
});
downloadPngButton.addEventListener('click', downloadPng);
downloadSvgButton.addEventListener('click', downloadSvg);

function generateQr() {
  const firstName = fields.firstName.value.trim();
  const lastName = fields.lastName.value.trim();

  if (!firstName && !lastName) {
    setStatus('Enter at least a first or last name.');
    return;
  }

  if (typeof kjua !== 'function') {
    setStatus('QR library did not load. Refresh and try again.');
    return;
  }

  try {
    currentValue = buildVCard();
    const svgNode = createQrNode('svg', 280);
    currentSvg = new XMLSerializer().serializeToString(svgNode);
    qrPreview.innerHTML = '';
    qrPreview.appendChild(svgNode);
    downloadPngButton.disabled = false;
    downloadSvgButton.disabled = false;
    setStatus('Contact QR generated.');
  } catch (error) {
    console.error(error);
    setStatus(`Could not generate QR: ${error.message}`);
  }
}

function buildVCard() {
  const firstName = fields.firstName.value.trim();
  const lastName = fields.lastName.value.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
    `FN:${escapeVCard(fullName)}`
  ];

  addLine(lines, 'ORG', fields.organization.value);
  addLine(lines, 'TITLE', fields.title.value);
  addLine(lines, 'TEL;TYPE=CELL', fields.phone.value);
  addLine(lines, 'EMAIL;TYPE=INTERNET', fields.email.value);
  addLine(lines, 'URL', normalizeWebsite(fields.website.value));
  addLine(lines, 'ADR;TYPE=WORK', fields.address.value ? `;;${fields.address.value};;;;` : '');
  addLine(lines, 'NOTE', fields.notes.value);
  lines.push('END:VCARD');
  return lines.join('\n');
}

function addLine(lines, key, value) {
  const text = String(value || '').trim();
  if (text) lines.push(`${key}:${escapeVCard(text)}`);
}

function normalizeWebsite(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
  return `https://${text}`;
}

function escapeVCard(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
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
  const name = [fields.firstName.value, fields.lastName.value]
    .join(' ')
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'contact';
  return `qr-contact-${name}.${extension}`;
}

function setStatus(message) {
  statusMessage.textContent = message;
}
