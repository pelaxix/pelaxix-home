let selectedFile = null;
let loadedPdfBytes = null;
let loadedPdfDoc = null;
let pageOrder = [];
let pendingDeleteId = null;
let pendingDeleteTimer = null;

const pdfInput = document.querySelector("#pdfInput");
const dropZone = document.querySelector("#dropZone");
const statusMessage = document.querySelector("#statusMessage");
const fileName = document.querySelector("#fileName");
const fileMeta = document.querySelector("#fileMeta");
const pageList = document.querySelector("#pageList");
const downloadButton = document.querySelector("#downloadButton");
const resetButton = document.querySelector("#resetButton");
const clearButton = document.querySelector("#clearButton");

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

downloadButton.addEventListener("click", downloadReorderedPdf);
resetButton.addEventListener("click", resetToOriginal);
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
    const pageCount = loadedPdfDoc.getPageCount();

    pageOrder = Array.from({ length: pageCount }, (_, index) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}-${Math.random()}`,
      originalIndex: index
    }));

    fileName.textContent = file.name;
    fileMeta.textContent = `${pageCount} page${pageCount === 1 ? "" : "s"} · ${formatBytes(file.size)}`;
    setButtonsEnabled(true);
    renderPages();
    setStatus("PDF ready. Reorder or remove pages, then download a new PDF.");
  } catch (error) {
    console.error(error);
    clearSelection();
    setStatus(`Could not read PDF: ${error.message}`);
  }
}

function renderPages() {
  clearPendingDelete(false);

  if (!pageOrder.length) {
    pageList.innerHTML = `<li class="file-item"><p class="file-meta">No pages in the output PDF. Reset to original or choose another file.</p></li>`;
    downloadButton.disabled = true;
    return;
  }

  pageList.innerHTML = pageOrder.map((page, index) => `
    <li class="file-item page-item">
      <div>
        <p class="file-name">Output page ${index + 1}</p>
        <p class="file-meta">Original page ${page.originalIndex + 1}</p>
      </div>
      <div class="file-actions">
        <button class="icon-button" type="button" aria-label="Move original page ${page.originalIndex + 1} up" data-action="up" data-id="${escapeHtml(page.id)}" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-button" type="button" aria-label="Move original page ${page.originalIndex + 1} down" data-action="down" data-id="${escapeHtml(page.id)}" ${index === pageOrder.length - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-button delete-button" type="button" aria-label="Arm delete for original page ${page.originalIndex + 1}" data-action="delete" data-id="${escapeHtml(page.id)}">×</button>
      </div>
    </li>
  `).join("");

  pageList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handlePageAction(button.dataset.action, button.dataset.id));
  });

  downloadButton.disabled = false;
}

function handlePageAction(action, id) {
  const index = pageOrder.findIndex((page) => page.id === id);
  if (index === -1) return;

  if (action !== "delete") clearPendingDelete(false);

  if (action === "up" && index > 0) {
    [pageOrder[index - 1], pageOrder[index]] = [pageOrder[index], pageOrder[index - 1]];
    renderPages();
    return;
  }

  if (action === "down" && index < pageOrder.length - 1) {
    [pageOrder[index + 1], pageOrder[index]] = [pageOrder[index], pageOrder[index + 1]];
    renderPages();
    return;
  }

  if (action === "delete") {
    handleDelete(id);
  }
}

function handleDelete(id) {
  if (pendingDeleteId === id) {
    pageOrder = pageOrder.filter((page) => page.id !== id);
    clearPendingDelete(false);
    renderPages();
    setStatus("Page removed from the output PDF. The original file is unchanged.");
    return;
  }

  clearPendingDelete(false);
  pendingDeleteId = id;
  const button = pageList.querySelector(`[data-action="delete"][data-id="${cssEscape(id)}"]`);
  if (button) {
    button.textContent = "Delete?";
    button.classList.add("confirm-delete");
    button.setAttribute("aria-label", "Confirm delete page from output PDF");
  }

  pendingDeleteTimer = window.setTimeout(() => {
    clearPendingDelete(true);
  }, 3000);
}

function clearPendingDelete(updateButton = true) {
  if (pendingDeleteTimer) {
    window.clearTimeout(pendingDeleteTimer);
    pendingDeleteTimer = null;
  }

  if (updateButton && pendingDeleteId) {
    const button = pageList.querySelector(`[data-action="delete"][data-id="${cssEscape(pendingDeleteId)}"]`);
    if (button) {
      button.textContent = "×";
      button.classList.remove("confirm-delete");
      button.setAttribute("aria-label", "Arm delete for page");
    }
  }

  pendingDeleteId = null;
}

async function downloadReorderedPdf() {
  if (!selectedFile || !loadedPdfBytes || !loadedPdfDoc) {
    setStatus("Choose a PDF first.");
    return;
  }

  if (!pageOrder.length) {
    setStatus("There are no pages to download. Reset to original or choose another file.");
    return;
  }

  downloadButton.disabled = true;
  setStatus("Creating new PDF locally...");

  try {
    const newPdf = await PDFLib.PDFDocument.create();
    const pageIndexes = pageOrder.map((page) => page.originalIndex);
    const copiedPages = await newPdf.copyPages(loadedPdfDoc, pageIndexes);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const baseName = getBaseName(selectedFile.name);
    newPdf.setTitle(`${baseName} reordered pages`);
    newPdf.setProducer("Pelaxix PDF Tools");
    newPdf.setCreator("Pelaxix PDF Tools");
    newPdf.setCreationDate(new Date());
    newPdf.setModificationDate(new Date());

    const bytes = await newPdf.save();
    downloadBytes(bytes, `${baseName}-reordered.pdf`);
    setStatus(`Created new PDF with ${pageOrder.length} page${pageOrder.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not create PDF: ${error.message}`);
  } finally {
    downloadButton.disabled = pageOrder.length === 0;
  }
}

function resetToOriginal() {
  if (!loadedPdfDoc) return;
  const pageCount = loadedPdfDoc.getPageCount();
  pageOrder = Array.from({ length: pageCount }, (_, index) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${index}-${Math.random()}`,
    originalIndex: index
  }));
  renderPages();
  setStatus("Reset to original page order.");
}

function clearSelection() {
  selectedFile = null;
  loadedPdfBytes = null;
  loadedPdfDoc = null;
  pageOrder = [];
  clearPendingDelete(false);
  fileName.textContent = "No file selected.";
  fileMeta.textContent = "Choose a PDF to see the page count.";
  pageList.innerHTML = "";
  setButtonsEnabled(false);
  setStatus("No PDF selected yet.");
}

function setButtonsEnabled(enabled) {
  downloadButton.disabled = !enabled;
  resetButton.disabled = !enabled;
  clearButton.disabled = !enabled;
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(value);
  return String(value).replace(/"/g, "\\\"");
}
