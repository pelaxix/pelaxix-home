let selectedFile = null;
let loadedPdfBytes = null;
let loadedPdfDoc = null;
let pageCount = 0;

const pdfInput = document.querySelector("#pdfInput");
const dropZone = document.querySelector("#dropZone");
const statusMessage = document.querySelector("#statusMessage");
const fileName = document.querySelector("#fileName");
const fileMeta = document.querySelector("#fileMeta");
const splitButton = document.querySelector("#splitButton");
const clearButton = document.querySelector("#clearButton");
const selectedPagesArea = document.querySelector("#selectedPagesArea");
const pageRangeInput = document.querySelector("#pageRangeInput");
const splitModeRadios = document.querySelectorAll("input[name='splitMode']");
const outputFormatRadios = document.querySelectorAll("input[name='outputFormat']");

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

splitModeRadios.forEach((radio) => {
  radio.addEventListener("change", updateSelectedPagesVisibility);
});

splitButton.addEventListener("click", splitPdf);
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
    splitButton.disabled = false;
    clearButton.disabled = false;
    setStatus("PDF ready. Choose split options and download a ZIP.");
  } catch (error) {
    console.error(error);
    clearSelection();
    setStatus(`Could not read PDF: ${error.message}`);
  }
}

async function splitPdf() {
  if (!selectedFile || !loadedPdfBytes || !loadedPdfDoc) {
    setStatus("Choose a PDF first.");
    return;
  }

  const mode = getCheckedValue("splitMode");
  const outputFormat = getCheckedValue("outputFormat");

  let pageIndexes;
  try {
    pageIndexes = mode === "selected"
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

  splitButton.disabled = true;
  setStatus(`Creating ${outputFormat.toUpperCase()} files locally...`);

  try {
    const zip = new JSZip();
    const baseName = getBaseName(selectedFile.name);

    if (outputFormat === "pdf") {
      await addPdfPagesToZip(zip, baseName, pageIndexes);
    } else {
      await addPngPagesToZip(zip, baseName, pageIndexes);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `${baseName}-split-${outputFormat}.zip`);
    setStatus(`Created ZIP with ${pageIndexes.length} ${outputFormat.toUpperCase()} file${pageIndexes.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not split PDF: ${error.message}`);
  } finally {
    splitButton.disabled = false;
  }
}

async function addPdfPagesToZip(zip, baseName, pageIndexes) {
  for (const pageIndex of pageIndexes) {
    const newPdf = await PDFLib.PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(loadedPdfDoc, [pageIndex]);
    newPdf.addPage(copiedPage);
    newPdf.setTitle(`${baseName} page ${pageIndex + 1}`);
    newPdf.setProducer("Pelaxix PDF Tools");
    newPdf.setCreator("Pelaxix PDF Tools");
    newPdf.setCreationDate(new Date());
    newPdf.setModificationDate(new Date());
    const bytes = await newPdf.save();
    zip.file(`${baseName}-page-${String(pageIndex + 1).padStart(3, "0")}.pdf`, bytes);
  }
}

async function addPngPagesToZip(zip, baseName, pageIndexes) {
  if (!window.pdfjsLib) throw new Error("PDF renderer did not load.");

  const pdf = await pdfjsLib.getDocument({ data: loadedPdfBytes.slice(0) }).promise;

  for (const pageIndex of pageIndexes) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await canvasToBlob(canvas);
    zip.file(`${baseName}-page-${String(pageIndex + 1).padStart(3, "0")}.png`, blob);
  }
}

function parsePageRanges(value, totalPages) {
  const text = String(value || "").trim();
  if (!text) throw new Error("Enter pages to include, like 1-3, 7, 10-12.");

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
  selectedPagesArea.hidden = getCheckedValue("splitMode") !== "selected";
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
  splitButton.disabled = true;
  clearButton.disabled = true;
  setStatus("No PDF selected yet.");
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export page image."));
    }, "image/png");
  });
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
