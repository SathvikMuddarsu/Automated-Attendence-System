/**
 * login.js — Handle face-based login
 * =====================================
 * Sends the captured image to POST /login.
 * On success, redirects to result.html with matched user data.
 */

async function loginUser() {
  const imageData = window.capturedImageData;
  const btnLogin  = document.getElementById("btnLogin");

  // ── Validation ──────────────────────────────────────────────
  if (!imageData) {
    setStatus("Please capture your face image first.", "error");
    return;
  }

  // ── Loading state ───────────────────────────────────────────
  btnLogin.disabled = true;
  btnLogin.innerHTML = `<span class="spinner"></span> Authenticating…`;
  setStatus("Matching face against database…", "info");

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData })
    });

    const result = await response.json();

    if (result.success) {
      sessionStorage.setItem("authResult", JSON.stringify({
  success:       true,
  username:      result.username,
  message:       result.message,
  action:        "Login",
  confidence:    result.confidence,
  already_marked: result.already_marked,
  time:          result.time
}));
      window.location.href = "/result-page";
    } else {
      setStatus(result.message || "Authentication failed.", "error");
      resetButton();
    }

  } catch (err) {
    setStatus("Network error. Is the server running? (" + err.message + ")", "error");
    resetButton();
  }
}

function resetButton() {
  const btn = document.getElementById("btnLogin");
  btn.disabled = false;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
    </svg>
    Authenticate`;
}

window.loginUser = loginUser;
