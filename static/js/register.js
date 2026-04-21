/**
 * register.js — Handle user registration
 * =========================================
 * Sends the captured image + username to POST /register.
 * On success, redirects to result.html with success data.
 * On failure, shows error in the status bar.
 */

async function registerUser() {
  const username  = document.getElementById("username").value.trim();
  const imageData = window.capturedImageData;
  const btnRegister = document.getElementById("btnRegister");

  // ── Client-side validation ──────────────────────────────────
  if (!username) {
    setStatus("Please enter a username.", "error");
    document.getElementById("username").focus();
    return;
  }
  if (username.length < 2 || username.length > 32) {
    setStatus("Username must be 2–32 characters.", "error");
    return;
  }
  if (!imageData) {
    setStatus("Please capture your face image first.", "error");
    return;
  }

  // ── Loading state ───────────────────────────────────────────
  btnRegister.disabled = true;
  btnRegister.innerHTML = `<span class="spinner"></span> Registering…`;
  setStatus("Uploading and encoding face… this may take a moment.", "info");

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, image: imageData })
    });

    const result = await response.json();

    if (result.success) {
      // Pass result to result page via sessionStorage
      sessionStorage.setItem("authResult", JSON.stringify({
        success:    true,
        username:   result.username,
        message:    result.message,
        action:     "Registration",
        confidence: null
      }));
      window.location.href = "/result-page";
    } else {
      // Show error inline
      setStatus(result.message || "Registration failed.", "error");
      resetButton();
    }

  } catch (err) {
    setStatus("Network error. Is the server running? (" + err.message + ")", "error");
    resetButton();
  }
}

function resetButton() {
  const btn = document.getElementById("btnRegister");
  btn.disabled = false;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    Register Now`;
}

window.registerUser = registerUser;
