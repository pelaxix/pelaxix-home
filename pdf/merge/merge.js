const selectedFiles = [];

const pdfInput = document.querySelector("#pdfInput");
const dropZone = document.querySelector("#dropZone");
const fileList = document.querySelector("#fileList");
const mergeButton = document.querySelector("#mergeButton");
const clearButton = document.querySelector("#clearButton");
const statusMessage = document.querySelector("#statusMessage");

pdfInput.addEventListener("change", (event) => {
  addFiles([...event.target.files]);
  pdfInput.value = "";
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

dropZone.addEventListener("drop", (event) => {
  addFiles([...event.dataTransfer.files]);
});

mergeButton.addEventListener("click", mergePdfs);
clearButton.addEventListener("click", () => {
  selectedFiles.length = 0;
  renderFiles();
  setStatus("No files selected yet.");
});

function addFiles(files) {
  const pdfs = files.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  const skipped = files.length - pdfs.length;

  selectedFiles.push(...pdfs.map((file) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    file
  })));

  renderFiles();

  if (pdfs.length && skipped) {
    setStatus(`Added ${pdfs.length} PDF${pdfs.length === 1 ? "" : "s"}. Skipped ${skipped} non-PDF file${skipped === 1 ? "" : "s"}.`);
  } else if (pdfs.length) {
    setStatus(`Added ${pdfs.length} PDF${pdfs.length === 1 ? "" : "s"}.`);
  } else {
    setStatus("No PDF files were added.");
  }
}

function renderFiles() {
  fileList.innerHTML = selectedFiles.map((item, index) => `
    <li class="file-item">
      <div>
        <p class="file-name">${escapeHtml(index + 1)}. ${escapeHtml(item.file.name)}</p>
        <p class="file-meta">${formatBytes(item.file.size)}</p>
      </div>
      <div class="file-actions">
        <button class="icon-button" type="button" aria-label="Move ${escapeHtml(item.file.name)} up" data-action="up" data-id="${escapeHtml(item.id)}">↑</button>
        <button class="icon-button" type="button" aria-label="Move ${escapeHtml(item.file.name)} down" data-action="down" data-id="${escapeHtml(item.id)}">↓</button>
        <button class="icon-button" type="button" aria-label="Remove ${escapeHtml(item.file.name)}" data-action="remove" data-id="${escapeHtml(item.id)}">×</button>
      </div>
    </li>
  `).join("");

  fileList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handleFileAction(button.dataset.action, button.dataset.id));
  });

  const hasFiles = selectedFiles.length > 0;
  mergeButton.disabled = selectedFiles.length < 2;
  clearButton.disabled = !hasFiles;

  if (!hasFiles) {
    fileList.innerHTML = `<li class="file-item"><p class="file-meta">No PDFs selected.</p></li>`;
  }
}

function handleFileAction(action, id) {
  const index = selectedFiles.findIndex((item) => item.id === id);
  if (index === -1) return;

  if (action === "remove") {
    selectedFiles.splice(index, 1);
  }

  if (action === "up" && index > 0) {
    [selectedFiles[index - 1], selectedFiles[index]] = [selectedFiles[index], selectedFiles[index - 1]];
  }

  if (action === "down" && index < selectedFiles.length - 1) {
    [selectedFiles[index + 1], selectedFiles[index]] = [selectedFiles[index], selectedFiles[index + 1]];
  }

  renderFiles();
}

async function mergePdfs() {
  if (selectedFiles.length < 2) {
    setStatus("Add at least two PDFs to merge.");
    return;
  }

  mergeButton.disabled = true;
  setStatus("Merging PDFs locally in your browser...");

  try {
    const mergedPdf = await PDFLib.PDFDocument.create();

    for (const item of selectedFiles) {
      const bytes = await item.file.arrayBuffer();
      const pdf = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });
      const pageIndexes = pdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(pdf, pageIndexes);
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    mergedPdf.setTitle("Merged PDF");
    mergedPdf.setProducer("Pelaxix PDF Tools");
    mergedPdf.setCreator("Pelaxix PDF Tools");
    mergedPdf.setCreationDate(new Date());
    mergedPdf.setModificationDate(new Date());

    const mergedBytes = await mergedPdf.save();
    downloadBytes(mergedBytes, buildOutputName());
    setStatus(`Merged ${selectedFiles.length} PDFs successfully.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not merge PDFs: ${error.message}`);
  } finally {
    mergeButton.disabled = selectedFiles.length < 2;
  }
}

function buildOutputName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `merged-pelaxix-${yyyy}-${mm}-${dd}.pdf`;
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderFiles();
