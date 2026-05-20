let selectedFile = null;
let loadedPdfBytes = null;
let loadedPdfDoc = null;
let pageCount = 0;

const pdfInput = document.querySelector("#pdfInput");
const dropZone = document.querySelector("#dropZone");
const statusMessage = document.querySelector("#statusMessage");
const fileName = document.querySelector("#fileName");
const fileMeta = document.querySelector("#fileMeta");
const rotateButton = document.querySelector("#rotateButton");
const clearButton = document.querySelector("#clearButton");
const selectedPagesArea = document.querySelector("#selectedPagesArea");
const pageRangeInput = document.querySelector("#pageRangeInput");
const pageModeRadios = document.querySelectorAll("input[name='pageMode']");

pdfInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  pdfInput.value = "";
  if (file) await loadPdf(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", async (event) => {
  const file = [...event.dataTransfer.files][0];
  if (file) await loadPdf(file);
});

pageModeRadios.forEach((radio) => {
  radio.addEventListener("change", updateSelectedPagesVisibility);
});

rotateButton.addEventListener("click", rotatePdf);
clearButton.addEventListener("click", clearSelection);

async function loadPdf(file) {
  if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
    setStatus("That file does not look like a PDF.");
    return;
  }

  setStatus("Reading PDF locally...");

  try {
    selectedFile = file;
    loadedPdfBytes = await file.arrayBuffer();
    loadedPdfDoc = await PDFLib.PDFDocument.load(loadedPdfBytes, { ignoreEncryption: false });
    pageCount = loadedPdfDoc.getPageCount();

    fileName.textContent = file.name;
    fileMeta.textContent = `${pageCount} page${pageCount === 1 ? "" : "s"} · ${formatBytes(file.size)}`;
    rotateButton.disabled = false;
    clearButton.disabled = false;
    setStatus("PDF ready. Choose rotation options and download a corrected PDF.");
  } catch (error) {
    console.error(error);
    clearSelection();
    setStatus(`Could not read PDF: ${error.message}`);
  }
}

async function rotatePdf() {
  if (!selectedFile || !loadedPdfBytes || !loadedPdfDoc) {
    setStatus("Choose a PDF first.");
    return;
  }

  const pageMode = getCheckedValue("pageMode");
  const rotationAmount = Number(getCheckedValue("rotation"));

  let pageIndexes;
  try {
    pageIndexes = pageMode === "selected"
      ? parsePageRanges(pageRangeInput.value, pageCount)
      : Array.from({ length: pageCount }, (_, index) => index);
  } catch (error) {
    setStatus(error.message);
    return;
  }

  if (!pageIndexes.length) {
    setStatus("No pages selected.");
    return;
  }

  rotateButton.disabled = true;
  setStatus("Rotating PDF locally...");

  try {
    const pdf = await PDFLib.PDFDocument.load(loadedPdfBytes.slice(0), { ignoreEncryption: false });
    const pages = pdf.getPages();

    pageIndexes.forEach((pageIndex) => {
      const page = pages[pageIndex];
      const currentRotation = page.getRotation().angle || 0;
      page.setRotation(PDFLib.degrees((currentRotation + rotationAmount) % 360));
    });

    const baseName = getBaseName(selectedFile.name);
    const rotationLabel = getRotationLabel(rotationAmount);
    const pageLabel = pageMode === "all" ? "all-pages" : getSafeRangeLabel(pageRangeInput.value);

    pdf.setTitle(`${baseName} rotated`);
    pdf.setProducer("Pelaxix PDF Tools");
    pdf.setCreator("Pelaxix PDF Tools");
    pdf.setModificationDate(new Date());

    const bytes = await pdf.save();
    downloadBytes(bytes, `${baseName}-rotated-${rotationLabel}-${pageLabel}.pdf`);
    setStatus(`Rotated ${pageIndexes.length} page${pageIndexes.length === 1 ? "" : "s"} successfully.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not rotate PDF: ${error.message}`);
  } finally {
    rotateButton.disabled = false;
  }
}

function parsePageRanges(value, totalPages) {
  const text = String(value || "").trim();
  if (!text) throw new Error("Enter pages to rotate, like 1-3, 7, 10-12.");

  const result = [];
  const seen = new Set();
  const parts = text.split(",").map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = part.match(/^\d+$/);

    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start > end) throw new Error(`Invalid range: ${part}. Start page must be before end page.`);
      addRange(start, end, totalPages, result, seen);
    } else if (singleMatch) {
      addPage(Number(part), totalPages, result, seen);
    } else {
      throw new Error(`Invalid page format: ${part}. Use formats like 1, 1-3, or 1-3, 7, 10-12.`);
    }
  }

  return result;
}

function addRange(start, end, totalPages, result, seen) {
  for (let page = start; page <= end; page += 1) {
    addPage(page, totalPages, result, seen);
  }
}

function addPage(page, totalPages, result, seen) {
  if (page < 1 || page > totalPages) {
    throw new Error(`Page ${page} is outside this PDF. Use pages 1 through ${totalPages}.`);
  }

  const index = page - 1;
  if (!seen.has(index)) {
    seen.add(index);
    result.push(index);
  }
}

function updateSelectedPagesVisibility() {
  selectedPagesArea.hidden = getCheckedValue("pageMode") !== "selected";
}

function getCheckedValue(name) {
  return document.querySelector(`input[name='${name}']:checked`)?.value;
}

function clearSelection() {
  selectedFile = null;
  loadedPdfBytes = null;
  loadedPdfDoc = null;
  pageCount = 0;
  fileName.textContent = "No file selected.";
  fileMeta.textContent = "Choose a PDF to see the page count.";
  pageRangeInput.value = "";
  rotateButton.disabled = true;
  clearButton.disabled = true;
  setStatus("No PDF selected yet.");
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getBaseName(filename) {
  return String(filename || "document")
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
}

function getSafeRangeLabel(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, "-")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned && cleaned.length <= 40 ? `pages-${cleaned}` : "selected-pages";
}

function getRotationLabel(value) {
  if (value === 90) return "90-right";
  if (value === 270) return "90-left";
  if (value === 180) return "180";
  return "rotated";
}

function setStatus(message) {
  statusMessage.textContent = message;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

updateSelectedPagesVisibility();
