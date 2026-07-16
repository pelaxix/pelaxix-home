(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const titles = {
    compress: ['Compress Video', 'Reduce file size with adjustable quality and an optional resolution cap.'],
    resize: ['Resize Video', 'Set new dimensions and choose how the original frame should fit.'],
    trim: ['Trim Video', 'Keep only the section between your selected start and end times.'],
    convert: ['Convert Video', 'Create an MP4 or WebM copy using codecs available in your browser.'],
    rotate: ['Rotate Video', 'Rotate the picture clockwise and export a corrected copy.'],
    crop: ['Crop Video', 'Keep a rectangular section of the original frame.'],
    fps: ['Change Frame Rate', 'Export the clip at a standard frame rate.'],
    mute: ['Mute Video', 'Remove the audio track from the exported video.'],
    audio: ['Extract Audio', 'Save the primary audio track as a WAV file.'],
    metadata: ['Remove Metadata', 'Create a copy without common descriptive metadata tags.'],
    thumbnail: ['Video Thumbnail', 'Capture one frame and download it as an image.'],
    merge: ['Merge Videos', 'Join clips locally. This beta export runs in real time.'],
  };

  const el = {
    title: $('#page-title'), description: $('#page-description'), drop: $('#drop-zone'), dropTitle: $('#drop-title'),
    dropHelp: $('#drop-help'), input: $('#file-input'), list: $('#file-list'), preview: $('#preview'), metadata: $('#metadata-grid'),
    operation: $('#operation'), settings: $('#settings-panel'), process: $('#process-button'), cancel: $('#cancel-button'),
    clear: $('#clear-button'), track: $('#progress-track'), bar: $('#progress-bar'), status: $('#status'),
    download: $('#download-link'), mergeNote: $('#merge-note'), canvas: $('#merge-canvas'),
  };

  const state = { files: [], input: null, info: null, previewUrl: null, downloadUrl: null, conversion: null, recorder: null, activeVideo: null, cancelled: false, busy: false };
  const tool = () => titles[el.operation.value] ? el.operation.value : 'compress';
  const M = () => {
    if (!window.Mediabunny) throw new Error('The video engine could not be loaded. Check your connection and reload.');
    return window.Mediabunny;
  };
  const base = (name) => name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'video';
  const bytes = (value) => {
    if (!value) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3);
    return `${(value / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
  };
  const duration = (seconds) => {
    if (!Number.isFinite(seconds)) return 'Unknown';
    const total = Math.max(0, Math.round(seconds));
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  };
  const status = (message, type = '') => { el.status.textContent = message; el.status.className = `status-message${type ? ` ${type}` : ''}`; };
  const progress = (value) => {
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    el.bar.style.width = `${pct}%`;
    el.track.setAttribute('aria-valuenow', String(pct));
  };
  const clearDownload = () => {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
    state.downloadUrl = null; el.download.href = '#'; el.download.classList.remove('visible'); el.download.removeAttribute('download');
  };
  const offer = (blob, filename) => {
    clearDownload(); state.downloadUrl = URL.createObjectURL(blob); el.download.href = state.downloadUrl;
    el.download.download = filename; el.download.textContent = `Download ${filename}`; el.download.classList.add('visible');
  };
  const busy = (value) => {
    state.busy = value; el.cancel.disabled = !value; el.input.disabled = value; el.clear.disabled = value; el.operation.disabled = value;
    el.settings.classList.toggle('processing-lock', value); renderFiles();
  };

  function updateTool() {
    const current = tool(), [title, description] = titles[current];
    el.title.textContent = title; el.description.textContent = description; document.title = `${title} | Pelaxix`;
    document.querySelectorAll('.option-group').forEach((group) => group.classList.toggle('visible', (group.dataset.options || '').split(/\s+/).includes(current)));
    const merge = current === 'merge';
    el.input.multiple = merge; el.dropTitle.textContent = merge ? 'Drop two or more videos here' : 'Drop a video here';
    el.dropHelp.textContent = merge ? 'Choose clips in the order they should play. You can add more afterward.' : 'MP4, MOV, WebM, MKV, and other formats supported by your browser.';
    el.mergeNote.classList.toggle('visible', merge);
    el.process.textContent = current === 'thumbnail' ? 'Create thumbnail' : merge ? 'Merge videos' : 'Process video';
    if (!merge && state.files.length > 1) selectFiles([state.files[0]]); else renderFiles();
  }

  async function inspect(file) {
    const lib = M(), input = new lib.Input({ source: new lib.BlobSource(file), formats: lib.ALL_FORMATS });
    if (!(await input.canRead())) throw new Error('This file format could not be read by the browser video engine.');
    const video = await input.getPrimaryVideoTrack(), audio = await input.getPrimaryAudioTrack();
    const info = { input, video, audio, duration: await input.getDurationFromMetadata() ?? await input.computeDuration(), mime: await input.getMimeType() };
    if (video) [info.width, info.height, info.rotation, info.videoCodec] = await Promise.all([video.getDisplayWidth(), video.getDisplayHeight(), video.getRotation(), video.getCodec()]);
    if (audio) info.audioCodec = await audio.getCodec();
    return info;
  }

  function renderMetadata() {
    el.metadata.innerHTML = '';
    if (!state.info) return;
    const rows = [['Duration', duration(state.info.duration)], ['Dimensions', state.info.width ? `${state.info.width} × ${state.info.height}` : 'Audio only'], ['Video codec', state.info.videoCodec || 'None'], ['Audio codec', state.info.audioCodec || 'None'], ['Rotation', state.info.rotation ? `${state.info.rotation}°` : '0°'], ['Detected type', state.info.mime || 'Unknown']];
    rows.forEach(([label, value]) => {
      const item = document.createElement('div'); item.className = 'metadata-item';
      const strong = document.createElement('strong'), span = document.createElement('span'); strong.textContent = label; span.textContent = value;
      item.append(strong, span); el.metadata.append(item);
    });
  }

  function renderFiles() {
    el.list.innerHTML = '';
    state.files.forEach((file, index) => {
      const item = document.createElement('li'); item.className = 'file-item';
      const details = document.createElement('div'), name = document.createElement('p'), meta = document.createElement('p'), remove = document.createElement('button');
      name.className = 'file-name'; name.textContent = `${index + 1}. ${file.name}`; meta.className = 'file-meta'; meta.textContent = `${bytes(file.size)}${file.type ? ` · ${file.type}` : ''}`;
      remove.type = 'button'; remove.className = 'button secondary'; remove.textContent = 'Remove'; remove.disabled = state.busy;
      remove.onclick = () => selectFiles(state.files.filter((_, i) => i !== index));
      details.append(name, meta); item.append(details, remove); el.list.append(item);
    });
    el.process.disabled = state.busy || !state.files.length || (tool() === 'merge' && state.files.length < 2);
  }

  async function selectFiles(files) {
    const valid = Array.from(files || []).filter((file) => file?.type?.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi|ts)$/i.test(file?.name || ''));
    state.files = tool() === 'merge' ? valid : valid.slice(0, 1);
    state.input?.dispose?.(); state.input = null; state.info = null; clearDownload(); progress(0);
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null; el.preview.removeAttribute('src'); el.preview.classList.remove('visible'); renderFiles(); renderMetadata();
    if (!state.files.length) return status('Choose a video to begin.');
    state.previewUrl = URL.createObjectURL(state.files[0]); el.preview.src = state.previewUrl; el.preview.classList.add('visible'); status('Reading video information...');
    try {
      state.info = await inspect(state.files[0]); state.input = state.info.input; renderMetadata();
      $('#trim-end').placeholder = Number.isFinite(state.info.duration) ? state.info.duration.toFixed(2) : 'End of video';
      status(tool() === 'merge' && state.files.length < 2 ? 'Add at least one more video to merge.' : 'Ready to process.', 'success');
    } catch (error) { console.error(error); status(error.message || 'Could not inspect this file.', 'error'); }
  }

  function number(selector, required = false) {
    const input = $(selector), raw = input.value.trim();
    if (!raw) { if (required) throw new Error(`Enter a value for ${input.previousElementSibling?.textContent || selector}.`); return undefined; }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || (required && value <= 0)) throw new Error('Enter valid positive numbers.');
    return value;
  }

  function output(lib, format) {
    const target = new lib.BufferTarget();
    return format === 'webm'
      ? { file: new lib.Output({ format: new lib.WebMOutputFormat(), target }), target, ext: 'webm', mime: 'video/webm' }
      : { file: new lib.Output({ format: new lib.Mp4OutputFormat(), target }), target, ext: 'mp4', mime: 'video/mp4' };
  }

  async function convert(current) {
    const lib = M(); if (!state.input) throw new Error('Choose a readable video first.');
    if (current === 'thumbnail') return thumbnail(lib);
    let out;
    const options = { input: state.input };
    if (current === 'audio') {
      if (!state.info.audio) throw new Error('This file does not contain an audio track.');
      const target = new lib.BufferTarget(); out = { file: new lib.Output({ format: new lib.WavOutputFormat(), target }), target, ext: 'wav', mime: 'audio/wav' }; options.video = { discard: true };
    } else out = output(lib, $('#format').value);
    options.output = out.file;
    const q = $('#quality').value === 'high' ? lib.QUALITY_HIGH : $('#quality').value === 'low' ? lib.QUALITY_LOW : lib.QUALITY_MEDIUM;
    if (current === 'compress') { const height = number('#compress-height'); options.video = { bitrate: q, forceTranscode: true, ...(height ? { height } : {}) }; options.audio = { bitrate: q, forceTranscode: true }; }
    if (current === 'resize') { const width = number('#width'), height = number('#height'); if (!width && !height) throw new Error('Enter a width, a height, or both.'); options.video = { width, height, fit: $('#fit').value, bitrate: q, forceTranscode: true }; }
    if (current === 'trim') { const start = number('#trim-start') ?? 0, end = number('#trim-end'); if (end !== undefined && end <= start) throw new Error('End time must be later than start time.'); options.trim = { start, ...(end !== undefined ? { end } : {}) }; }
    if (current === 'convert') { options.video = { bitrate: q }; options.audio = { bitrate: q }; }
    if (current === 'rotate') options.video = { rotate: Number($('#rotation').value), bitrate: q, forceTranscode: true };
    if (current === 'crop') options.video = { crop: { left: number('#crop-left') ?? 0, top: number('#crop-top') ?? 0, width: number('#crop-width', true), height: number('#crop-height', true) }, bitrate: q, forceTranscode: true };
    if (current === 'fps') options.video = { frameRate: Number($('#fps').value), bitrate: q, forceTranscode: true };
    if (current === 'mute') options.audio = { discard: true };
    if (current === 'metadata') options.tags = {};
    const job = await lib.Conversion.init(options); state.conversion = job;
    if (!job.isValid) throw new Error((job.discardedTracks || []).map((item) => item.reason).filter(Boolean).join('; ') || 'This conversion is not supported by your browser.');
    if (job.discardedTracks?.length && !['mute', 'audio'].includes(current)) throw new Error(`The browser would drop part of this file: ${job.discardedTracks.map((item) => item.reason || 'unsupported track').join('; ')}`);
    job.onProgress = (value) => { progress(value * 100); status(`Processing locally... ${Math.round(value * 100)}%`); };
    await job.execute(); if (state.cancelled) throw new Error('Processing was cancelled.');
    if (!out.target.buffer) throw new Error('The browser did not produce an output file.');
    const blob = new Blob([out.target.buffer], { type: out.mime }); offer(blob, `${base(state.files[0].name)}-${current}.${out.ext}`); progress(100); status(`Finished. New file size: ${bytes(blob.size)}.`, 'success');
  }

  const canvasBlob = (canvas, mime) => 'convertToBlob' in canvas ? canvas.convertToBlob({ type: mime, quality: 0.92 }) : new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not create the image.')), mime, 0.92));
  async function thumbnail(lib) {
    const video = state.info?.video; if (!video) throw new Error('This file does not contain a video track.');
    if (!(await video.canDecode())) throw new Error('Your browser cannot decode this video track.');
    const requested = number('#thumbnail-time') ?? 0, first = await video.getFirstTimestamp();
    const result = await new lib.CanvasSink(video, { width: number('#thumbnail-width') || 1280 }).getCanvas(Math.max(requested, first));
    if (!result) throw new Error('No frame was available at that timestamp.');
    const jpg = $('#thumbnail-format').value === 'jpeg', blob = await canvasBlob(result.canvas, jpg ? 'image/jpeg' : 'image/png');
    offer(blob, `${base(state.files[0].name)}-thumbnail-${requested.toFixed(2)}.${jpg ? 'jpg' : 'png'}`); progress(100); status(`Thumbnail created from ${result.timestamp.toFixed(2)} seconds.`, 'success');
  }

  const wait = (target, event, error = 'error') => new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error(`Media failed while waiting for ${event}.`)); };
    const cleanup = () => { target.removeEventListener(event, done); target.removeEventListener(error, fail); };
    target.addEventListener(event, done, { once: true }); target.addEventListener(error, fail, { once: true });
  });
  const waitEnded = (video) => new Promise((resolve, reject) => {
    const timer = setInterval(() => { if (state.cancelled) { cleanup(); reject(new Error('Processing was cancelled.')); } }, 100);
    const cleanup = () => { clearInterval(timer); video.removeEventListener('ended', done); video.removeEventListener('error', fail); };
    const done = () => { cleanup(); resolve(); }, fail = () => { cleanup(); reject(new Error('A clip could not be played during merge.')); };
    video.addEventListener('ended', done, { once: true }); video.addEventListener('error', fail, { once: true });
  });

  async function merge() {
    if (state.files.length < 2) throw new Error('Choose at least two videos to merge.');
    if (!window.MediaRecorder) throw new Error('This browser does not support local merge recording.');
    const [width, height] = $('#merge-resolution').value.split('x').map(Number), fps = Number($('#merge-fps').value), canvas = el.canvas, ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = width; canvas.height = height;
    const canvasStream = canvas.captureStream(fps), audioContext = new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume();
    const destination = audioContext.createMediaStreamDestination(), stream = new MediaStream([...canvasStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const mime = candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '', recorder = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 5000000, audioBitsPerSecond: 160000 } : undefined);
    state.recorder = recorder; const chunks = []; recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data); const stopped = wait(recorder, 'stop'); recorder.start(1000);
    let completed = 0, total = 0;
    for (const file of state.files) { const url = URL.createObjectURL(file), video = document.createElement('video'); video.src = url; video.preload = 'metadata'; await wait(video, 'loadedmetadata'); if (Number.isFinite(video.duration)) total += video.duration; video.removeAttribute('src'); URL.revokeObjectURL(url); }
    try {
      for (let index = 0; index < state.files.length; index += 1) {
        const url = URL.createObjectURL(state.files[index]), video = document.createElement('video'); video.src = url; video.preload = 'auto'; video.playsInline = true; await wait(video, 'loadedmetadata');
        const source = audioContext.createMediaElementSource(video); source.connect(destination); const clipDuration = Number.isFinite(video.duration) ? video.duration : 0; let frame;
        const draw = () => { const scale = Math.min(width / video.videoWidth, height / video.videoHeight), w = video.videoWidth * scale, h = video.videoHeight * scale; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height); ctx.drawImage(video, (width - w) / 2, (height - h) / 2, w, h); const pct = total ? ((completed + video.currentTime) / total) * 100 : 0; progress(pct); status(`Merging clip ${index + 1} of ${state.files.length}... ${Math.round(pct)}%`); if (!video.ended && !state.cancelled) frame = requestAnimationFrame(draw); };
        state.activeVideo = video; const ended = waitEnded(video); await video.play(); draw(); await ended; cancelAnimationFrame(frame); completed += clipDuration; source.disconnect(); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); state.activeVideo = null;
      }
    } finally { state.activeVideo?.pause(); state.activeVideo = null; if (recorder.state !== 'inactive') recorder.stop(); }
    await stopped; canvasStream.getTracks().forEach((track) => track.stop()); await audioContext.close(); if (state.cancelled) throw new Error('Processing was cancelled.');
    const type = recorder.mimeType || mime || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm', blob = new Blob(chunks, { type }); offer(blob, `merged-video.${ext}`); progress(100); status(`Finished merging ${state.files.length} clips. New file size: ${bytes(blob.size)}.`, 'success');
  }

  async function run() {
    if (state.busy) return; state.cancelled = false; clearDownload(); progress(0); busy(true); status(tool() === 'merge' ? 'Preparing local merge...' : 'Preparing local conversion...');
    try { if (tool() === 'merge') await merge(); else await convert(tool()); }
    catch (error) { console.error(error); progress(0); status(error.message || 'Processing failed.', 'error'); }
    finally { state.conversion = null; state.recorder = null; busy(false); updateTool(); }
  }
  async function cancel() { state.cancelled = true; status('Cancelling...'); if (state.conversion) try { await state.conversion.cancel(); } catch (error) { console.warn(error); } state.activeVideo?.pause(); if (state.recorder && state.recorder.state !== 'inactive') state.recorder.stop(); }
  function clear() { state.files = []; state.input?.dispose?.(); state.input = null; state.info = null; if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; el.preview.removeAttribute('src'); el.preview.classList.remove('visible'); el.input.value = ''; renderFiles(); renderMetadata(); clearDownload(); progress(0); status('Choose a video to begin.'); }

  ['dragenter', 'dragover'].forEach((name) => el.drop.addEventListener(name, (event) => { event.preventDefault(); el.drop.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((name) => el.drop.addEventListener(name, (event) => { event.preventDefault(); el.drop.classList.remove('dragging'); }));
  el.drop.addEventListener('drop', (event) => selectFiles(tool() === 'merge' ? [...state.files, ...event.dataTransfer.files] : event.dataTransfer.files));
  el.input.addEventListener('change', () => { selectFiles(tool() === 'merge' ? [...state.files, ...el.input.files] : el.input.files); el.input.value = ''; });
  el.operation.addEventListener('change', updateTool); el.process.addEventListener('click', run); el.cancel.addEventListener('click', cancel); el.clear.addEventListener('click', clear);
  window.addEventListener('beforeunload', () => { if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl); });
  const requested = new URLSearchParams(location.search).get('tool'); if (titles[requested]) el.operation.value = requested; updateTool();
})();
