let scanner = null;
let cameraRunning = false;

const imageInput = document.querySelector('#imageInput');
const startCameraButton = document.querySelector('#startCameraButton');
const stopCameraButton = document.querySelector('#stopCameraButton');
const statusMessage = document.querySelector('#statusMessage');
const resultText = document.querySelector('#resultText');
const copyButton = document.querySelector('#copyButton');
const openLinkButton = document.querySelector('#openLinkButton');
const readerElementId = 'reader';

imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  imageInput.value = '';
  if (file) await scanImage(file);
});

startCameraButton.addEventListener('click', startCamera);
stopCameraButton.addEventListener('click', stopCamera);
copyButton.addEventListener('click', copyResult);

async function scanImage(file) {
  if (typeof Html5Qrcode !== 'function') {
    setStatus('Scanner library did not load. Refresh and try again.');
    return;
  }

  setStatus('Scanning image locally...');

  try {
    if (!scanner) scanner = new Html5Qrcode(readerElementId);
    const decoded = await scanner.scanFile(file, true);
    handleDecodedText(decoded);
    setStatus('QR code found in image.');
  } catch (error) {
    console.error(error);
    setStatus('Could not find a QR code in that image. Try a clearer or closer image.');
  }
}

async function startCamera() {
  if (typeof Html5Qrcode !== 'function') {
    setStatus('Scanner library did not load. Refresh and try again.');
    return;
  }

  try {
    if (!scanner) scanner = new Html5Qrcode(readerElementId);
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        handleDecodedText(decodedText);
        setStatus('QR code scanned.');
      }
    );

    cameraRunning = true;
    startCameraButton.disabled = true;
    stopCameraButton.disabled = false;
    setStatus('Camera scanner is running. Point it at a QR code.');
  } catch (error) {
    console.error(error);
    setStatus(`Could not start camera: ${error.message || error}`);
  }
}

async function stopCamera() {
  if (!scanner || !cameraRunning) return;

  try {
    await scanner.stop();
    await scanner.clear();
    cameraRunning = false;
    startCameraButton.disabled = false;
    stopCameraButton.disabled = true;
    setStatus('Camera scanner stopped.');
  } catch (error) {
    console.error(error);
    setStatus(`Could not stop camera: ${error.message || error}`);
  }
}

function handleDecodedText(text) {
  resultText.value = text;
  copyButton.disabled = false;

  if (/^https?:\/\//i.test(text)) {
    openLinkButton.href = text;
    openLinkButton.hidden = false;
  } else {
    openLinkButton.href = '#';
    openLinkButton.hidden = true;
  }
}

async function copyResult() {
  const text = resultText.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    setStatus('Copied result to clipboard.');
  } catch {
    resultText.select();
    document.execCommand('copy');
    setStatus('Copied result to clipboard.');
  }
}

function setStatus(message) {
  statusMessage.textContent = message;
}
