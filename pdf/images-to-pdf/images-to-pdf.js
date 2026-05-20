const selectedImages = [];
let pendingDeleteId = null;
let pendingDeleteTimer = null;

const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const imageList = document.querySelector("#imageList");
const downloadButton = document.querySelector("#downloadButton");
const clearButton = document.querySelector("#clearButton");
const statusMessage = document.querySelector("#statusMessage");

const PAGE_SIZES = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 }
};
const AUTO_MARGIN = 0;
const FIXED_MARGIN = 36;

imageInput.addEventListener("change", async (event) => {
  await addFiles([...event.target.files]);
  imageInput.value = "";
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
  await addFiles([...event.dataTransfer.files]);
});

downloadButton.addEventListener("click", createPdf);
clearButton.addEventListener("click", () => {
  selectedImages.length = 0;
  clearPendingDelete(false);
  renderImages();
  setStatus("No images selected yet.");
});

async function addFiles(files) {
  const imageFiles = files.filter((file) => isSupportedImage(file));
  const skipped = files.length - imageFiles.length;

  if (!imageFiles.length) {
    setStatus("No supported image files were added.");
    return;
  }

  setStatus("Reading images locally...");

  let added = 0;
  for (const file of imageFiles) {
    try {
      const imageInfo = await readImageFile(file);
      selectedImages.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        file,
        ...imageInfo
      });
      added += 1;
    } catch (error) {
      console.error(error);
    }
  }

  renderImages();

  if (added && skipped) {
    setStatus(`Added ${added} image${added === 1 ? "" : "s"}. Skipped ${skipped} unsupported file${skipped === 1 ? "" : "s"}.`);
  } else if (added) {
    setStatus(`Added ${added} image${added === 1 ? "" : "s"}.`);
  } else {
    setStatus("Could not read the selected images.");
  }
}

function isSupportedImage(file) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(name);
}

async function readImageFile(file) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  return {
    dataUrl,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height
  };
}

function renderImages() {
  clearPendingDelete(false);

  if (!selectedImages.length) {
    imageList.innerHTML = `<li class="file-item"><p class="file-meta">No images selected.</p></li>`;
    downloadButton.disabled = true;
    clearButton.disabled = true;
    return;
  }

  imageList.innerHTML = selectedImages.map((item, index) => `
    <li class="file-item page-item">
      <div>
        <p class="file-name">${index + 1}. ${escapeHtml(item.file.name)}</p>
        <p class="file-meta">${item.width} × ${item.height} · ${formatBytes(item.file.size)}</p>
      </div>
      <div class="file-actions">
        <button class="icon-button" type="button" aria-label="Move ${escapeHtml(item.file.name)} up" data-action="up" data-id="${escapeHtml(item.id)}" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-button" type="button" aria-label="Move ${escapeHtml(item.file.name)} down" data-action="down" data-id="${escapeHtml(item.id)}" ${index === selectedImages.length - 1 ? "disabled" : ""}>↓</button>
        <button class="icon-button delete-button" type="button" aria-label="Arm delete for ${escapeHtml(item.file.name)}" data-action="delete" data-id="${escapeHtml(item.id)}">×</button>
      </div>
    </li>
  `).join("");

  imageList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handleImageAction(button.dataset.action, button.dataset.id));
  });

  downloadButton.disabled = false;
  clearButton.disabled = false;
}

function handleImageAction(action, id) {
  const index = selectedImages.findIndex((item) => item.id === id);
  if (index === -1) return;

  if (action !== "delete") clearPendingDelete(false);

  if (action === "up" && index > 0) {
    [selectedImages[index - 1], selectedImages[index]] = [selectedImages[index], selectedImages[index - 1]];
    renderImages();
    return;
  }

  if (action === "down" && index < selectedImages.length - 1) {
    [selectedImages[index + 1], selectedImages[index]] = [selectedImages[index], selectedImages[index + 1]];
    renderImages();
    return;
  }

  if (action === "delete") handleDelete(id);
}

function handleDelete(id) {
  if (pendingDeleteId === id) {
    const index = selectedImages.findIndex((item) => item.id === id);
    const name = index >= 0 ? selectedImages[index].file.name : "Image";
    selectedImages.splice(index, 1);
    clearPendingDelete(false);
    renderImages();
    setStatus(`${name} removed from the output PDF. Original file is unchanged.`);
    return;
  }

  clearPendingDelete(false);
  pendingDeleteId = id;
  const button = imageList.querySelector(`[data-action="delete"][data-id="${cssEscape(id)}"]`);
  if (button) {
    button.textContent = "Delete?";
    button.classList.add("confirm-delete");
    button.setAttribute("aria-label", "Confirm delete image from output PDF");
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
    const button = imageList.querySelector(`[data-action="delete"][data-id="${cssEscape(pendingDeleteId)}"]`);
    if (button) {
      button.textContent = "×";
      button.classList.remove("confirm-delete");
      button.setAttribute("aria-label", "Arm delete for image");
    }
  }

  pendingDeleteId = null;
}

async function createPdf() {
  if (!selectedImages.length) {
    setStatus("Add at least one image first.");
    return;
  }

  downloadButton.disabled = true;
  setStatus("Creating PDF locally...");

  try {
    const pageSize = getCheckedValue("pageSize");
    const pdf = await PDFLib.PDFDocument.create();

    for (const item of selectedImages) {
      await addImagePage(pdf, item, pageSize);
    }

    pdf.setTitle("Images to PDF");
    pdf.setProducer("Pelaxix PDF Tools");
    pdf.setCreator("Pelaxix PDF Tools");
    pdf.setCreationDate(new Date());
    pdf.setModificationDate(new Date());

    const bytes = await pdf.save();
    downloadBytes(bytes, buildOutputName());
    setStatus(`Created one PDF with ${selectedImages.length} image${selectedImages.length === 1 ? "" : "s"}.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not create PDF: ${error.message}`);
  } finally {
    downloadButton.disabled = selectedImages.length === 0;
  }
}

async function addImagePage(pdf, item, pageSize) {
  const pngBytes = await imageToPngBytes(item.dataUrl, item.width, item.height);
  const embeddedImage = await pdf.embedPng(pngBytes);

  const dimensions = getPageDimensions(pageSize, item.width, item.height);
  const page = pdf.addPage([dimensions.width, dimensions.height]);
  const margin = pageSize === "auto" ? AUTO_MARGIN : FIXED_MARGIN;
  const maxWidth = dimensions.width - margin * 2;
  const maxHeight = dimensions.height - margin * 2;
  const fit = fitInside(item.width, item.height, maxWidth, maxHeight);
  const x = (dimensions.width - fit.width) / 2;
  const y = (dimensions.height - fit.height) / 2;

  page.drawImage(embeddedImage, {
    x,
    y,
    width: fit.width,
    height: fit.height
  });
}

function getPageDimensions(pageSize, imageWidth, imageHeight) {
  if (pageSize === "auto") return { width: imageWidth, height: imageHeight };

  const base = PAGE_SIZES[pageSize] || PAGE_SIZES.letter;
  const isLandscapeImage = imageWidth > imageHeight;
  return isLandscapeImage
    ? { width: base.height, height: base.width }
    : { width: base.width, height: base.height };
}

function fitInside(width, height, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: width * scale,
    height: height * scale
  };
}

async function imageToPngBytes(dataUrl, width, height) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToBlob(canvas);
  return blob.arrayBuffer();
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not convert image."));
    }, "image/png");
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = src;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function getCheckedValue(name) {
  return document.querySelector(`input[name='${name}']:checked`)?.value;
}

function buildOutputName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `images-to-pdf-${yyyy}-${mm}-${dd}.pdf`;
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

renderImages();
