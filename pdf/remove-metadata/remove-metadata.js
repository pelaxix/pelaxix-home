const statusMessage = document.querySelector('#statusMessage');
const cleanButton = document.querySelector('#cleanButton');
const clearButton = document.querySelector('#clearButton');
const fileName = document.querySelector('#fileName');
const fileMeta = document.querySelector('#fileMeta');
const pdfInput = document.querySelector('#pdfInput');
const dropZone = document.querySelector('#dropZone');
let selectedFile = null;
let loadedPdfBytes = null;

function setStatus(message) { statusMessage.textContent = message; }

pdfInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  pdfInput.value = '';
  if (file) await loadPdf(file);
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
  });
});

dropZone.addEventListener('drop', async (event) => {
  const file = [...event.dataTransfer.files][0];
  if (file) await loadPdf(file);
});

async function loadPdf(file) {
  if (!(file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
    setStatus('That file does not look like a PDF.');
    return;
  }
  try {
    selectedFile = file;
    loadedPdfBytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(loadedPdfBytes, { ignoreEncryption: false });
    fileName.textContent = file.name;
    fileMeta.textContent = `${pdf.getPageCount()} page${pdf.getPageCount() === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    showMeta(pdf);
    cleanButton.disabled = false;
    clearButton.disabled = false;
    setStatus('PDF ready.');
  } catch (error) {
    setStatus(`Could not read PDF: ${error.message}`);
  }
}

cleanButton.addEventListener('click', async () => {
  if (!loadedPdfBytes || !selectedFile) return;
  cleanButton.disabled = true;
  try {
    const pdf = await PDFLib.PDFDocument.load(loadedPdfBytes.slice(0), { ignoreEncryption: false });
    pdf.setTitle('');
    pdf.setAuthor('');
    pdf.setSubject('');
    pdf.setKeywords([]);
    pdf.setCreator('');
    pdf.setProducer('');
    pdf.setCreationDate(new Date());
    pdf.setModificationDate(new Date());
    const bytes = await pdf.save();
    downloadBytes(bytes, `${baseName(selectedFile.name)}-metadata-removed.pdf`);
    setStatus('Created cleaned copy.');
  } catch (error) {
    setStatus(`Could not create copy: ${error.message}`);
  } finally {
    cleanButton.disabled = false;
  }
});

clearButton.addEventListener('click', () => {
  selectedFile = null;
  loadedPdfBytes = null;
  fileName.textContent = 'No file selected.';
  fileMeta.textContent = 'Choose a PDF to inspect common metadata.';
  ['metaTitle','metaAuthor','metaSubject','metaKeywords','metaCreator','metaProducer','metaCreationDate','metaModificationDate'].forEach(id => document.querySelector(`#${id}`).textContent = '-');
  cleanButton.disabled = true;
  clearButton.disabled = true;
  setStatus('No PDF selected yet.');
});

function showMeta(pdf) {
  setText('metaTitle', pdf.getTitle());
  setText('metaAuthor', pdf.getAuthor());
  setText('metaSubject', pdf.getSubject());
  const keywords = pdf.getKeywords();
  setText('metaKeywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
  setText('metaCreator', pdf.getCreator());
  setText('metaProducer', pdf.getProducer());
  setText('metaCreationDate', formatDate(pdf.getCreationDate()));
  setText('metaModificationDate', formatDate(pdf.getModificationDate()));
}

function setText(id, value) { document.querySelector(`#${id}`).textContent = value ? String(value) : 'Not found'; }
function formatDate(value) { return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toLocaleString() : value; }
function baseName(filename) { return String(filename || 'document').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'document'; }
function formatBytes(bytes) { const units = ['B','KB','MB','GB']; let size = bytes; let i = 0; while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; } return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`; }
function downloadBytes(bytes, filename) { const blob = new Blob([bytes], { type: 'application/pdf' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
