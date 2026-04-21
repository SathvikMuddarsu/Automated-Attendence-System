/**
 * camera.js — Shared webcam utilities
 * =====================================
 * Provides startCamera() and captureImage() used by both register and login pages.
 * Exposes `window.capturedImageData` (base64 PNG) for the auth scripts.
 */

let stream = null;          // MediaStream reference
window.capturedImageData = null;  // Exported: base64 PNG from last capture

/**
 * startCamera()
 * Request webcam access and pipe it into the <video> element.
 */
async function startCamera() {
  const video      = document.getElementById("video");
  const placeholder= document.getElementById("cameraPlaceholder");
  const overlay    = document.getElementById("cameraOverlay");
  const btnCamera  = document.getElementById("btnCamera");
  const btnCapture = document.getElementById("btnCapture");

  // Already running → toggle off
  if (stream) {
    stopCamera();
    return;
  }

  setStatus("Requesting camera access…", "info");

  try {
    // Ask for the highest available resolution (falls back gracefully)
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    video.style.display = "block";
    placeholder.classList.add("hidden");
    overlay && overlay.classList.remove("hidden");

    btnCamera.innerHTML  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Stop Camera`;
    btnCapture.disabled  = false;

    // Hide previous capture if re-starting camera
    const capturedImg = document.getElementById("capturedImg");
    if (capturedImg) { capturedImg.style.display = "none"; }
    window.capturedImageData = null;

    // Disable register/login button until a new capture is taken
    const btnAction = document.getElementById("btnRegister") || document.getElementById("btnLogin");
    if (btnAction) btnAction.disabled = true;

    setStatus("Camera ready. Position your face and capture.", "info");

  } catch (err) {
    // Common errors: NotAllowedError, NotFoundError
    let msg = "Camera error: " + err.message;
    if (err.name === "NotAllowedError")  msg = "Camera permission denied. Please allow access.";
    if (err.name === "NotFoundError")    msg = "No camera found on this device.";
    setStatus(msg, "error");
  }
}

/**
 * stopCamera()
 * Stop all tracks and reset the UI.
 */
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  const video      = document.getElementById("video");
  const placeholder= document.getElementById("cameraPlaceholder");
  const overlay    = document.getElementById("cameraOverlay");
  const btnCamera  = document.getElementById("btnCamera");
  const btnCapture = document.getElementById("btnCapture");

  video.srcObject  = null;
  video.style.display = "none";
  placeholder && placeholder.classList.remove("hidden");
  overlay     && overlay.classList.add("hidden");

  btnCamera.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Start Camera`;
  btnCapture.disabled = true;
}

/**
 * captureImage()
 * Draw the current video frame to a hidden canvas and export as base64 PNG.
 */
function captureImage() {
  const video       = document.getElementById("video");
  const canvas      = document.getElementById("canvas");
  const capturedImg = document.getElementById("capturedImg");
  const overlay     = document.getElementById("cameraOverlay");
  const btnAction   = document.getElementById("btnRegister") || document.getElementById("btnLogin");

  if (!stream || !video.readyState) {
    setStatus("Start the camera first.", "error");
    return;
  }

  // Match canvas to actual video resolution
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext("2d");
  // Mirror the image horizontally (so it feels natural, like a mirror)
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform

  // Export as base64 PNG
  window.capturedImageData = canvas.toDataURL("image/png");

  // Show the captured frame as a preview
  capturedImg.src          = window.capturedImageData;
  capturedImg.style.display= "block";
  video.style.display      = "none";
  overlay && overlay.classList.add("hidden");

  // Enable the register/login button
  if (btnAction) btnAction.disabled = false;

  // Flash effect on the frame
  flashCapture();

  setStatus("Image captured! Click the action button below.", "success");
}

/** Visual flash to confirm capture */
function flashCapture() {
  const frame = document.getElementById("cameraFrame");
  frame.style.boxShadow = "0 0 0 3px var(--accent), 0 0 24px rgba(0,255,136,0.4)";
  setTimeout(() => { frame.style.boxShadow = ""; }, 600);
}

/**
 * setStatus(message, type)
 * Show a status message in #statusMsg with type: 'info' | 'success' | 'error'
 */
function setStatus(message, type = "info") {
  const el = document.getElementById("statusMsg");
  if (!el) return;

  const icons = {
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
  };

  el.className  = `status-msg ${type}`;
  el.innerHTML  = (icons[type] || "") + " " + message;
  el.style.display = "flex";
}

/** Expose globally */
window.startCamera   = startCamera;
window.captureImage  = captureImage;
window.setStatus     = setStatus;
