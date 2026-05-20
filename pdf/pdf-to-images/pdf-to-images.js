let selectedFile = null;
let loadedPdfBytes = null;
let pdfDocument = null;
let pageCount = 0;

const pdfInput = document.querySelector("#pdfInput");
const dropZone = document.querySelector("#dropZone");
const statusMessage = document.querySelector("#statusMessage");
const fileName = document.querySelector("#fileName");
const fileMeta = document.querySelector("#fileMeta");
const exportButton = document.querySelector("#exportButton");
const clearButton = document.querySelector("#clearButton");
const selectedPagesArea = document.querySelector("#selectedPagesArea");
const pageRangeInput = document.querySelector("#pageRangeInput");
const pageModeRadios = document.querySelectorAll("input[name='pageMode']");

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
}

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

exportButton.addEventListener("click", exportImages);
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
    pdfDocument = await pdfjsLib.getDocument({ data: loadedPdfBytes.slice(0) }).promise;
    pageCount = pdfDocument.numPages;

    fileName.textContent = file.name;
    fileMeta.textContent = `${pageCount} page${pageCount === 1 ? "" : "s"} · ${formatBytes(file.size)}`;
    exportButton.disabled = false;
    clearButton.disabled = false;
    setStatus("PDF ready. Choose export options and download a ZIP.");
  } catch (error) {
    console.error(error);
    clearSelection();
    setStatus(`Could not read PDF: ${error.message}`);
  }
}

async function exportImages() {
  if (!selectedFile || !loadedPdfBytes || !pdfDocument) {
    setStatus("Choose a PDF first.");
    return;
  }

  const pageMode = getCheckedValue("pageMode");
  const imageFormat = getCheckedValue("imageFormat");
  const resolution = Number(getCheckedValue("resolution"));

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

  exportButton.disabled = true;
  setStatus(`Exporting ${pageIndexes.length} page${pageIndexes.length === 1 ? "" : "s"} locally...`);

  try {
    const zip = new JSZip();
    const baseName = getBaseName(selectedFile.name);
    const exportFormat = await getSupportedFormat(imageFormat);

    for (const pageIndex of pageIndexes) {
      const page = await pdfDocument.getPage(pageIndex + 1);
      const blob = await renderPageToImage(page, resolution, exportFormat.mimeType, exportFormat.quality);
      zip.file(`${baseName}-page-${String(pageIndex + 1).padStart(3, "0")}.${exportFormat.extension}`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `${baseName}-images-${exportFormat.extension}.zip`);
    setStatus(`Created ZIP with ${pageIndexes.length} ${exportFormat.label} image${pageIndexes.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not export images: ${error.message}`);
  } finally {
    exportButton.disabled = false;
  }
}

async function renderPageToImage(page, scale, mimeType, quality) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport }).promise;
  return canvasToBlob(canvas, mimeType, quality);
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export image."));
    }, mimeType, quality);
  });
}

async function getSupportedFormat(format) {
  if (format === "jpg") {
    return { mimeType: "image/jpeg", extension: "jpg", label: "JPG", quality: 0.92 };
  }

  if (format === "webp" && canvasSupportsType("image/webp")) {
    return { mimeType: "image/webp", extension: "webp", label: "WebP", quality: 0.92 };
  }

  if (format === "webp") {
    setStatus("This browser does not support WebP export, using PNG instead.");
  }

  return { mimeType: "image/png", extension: "png", label: "PNG", quality: undefined };
}

function canvasSupportsType(mimeType) {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL(mimeType).startsWith(`data:${mimeType}`);
}

function parsePageRanges(value, totalPages) {
  const text = String(value || "").trim();
  if (!text) throw new Error("Enter pages to export, like 1-3, 7, 10-12.");

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
  pdfDocument = null;
  pageCount = 0;
  fileName.textContent = "No file selected.";
  fileMeta.textContent = "Choose a PDF to see the page count.";
  pageRangeInput.value = "";
  exportButton.disabled = true;
  clearButton.disabled = true;
  setStatus("No PDF selected yet.");
}

function downloadBlob(blob, filename) {
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

function setStatus(message) {
  statusMessage.textContent = message;
}

updateSelectedPagesVisibility();
