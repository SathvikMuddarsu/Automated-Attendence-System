/**
 * result.js — Display authentication result
 * ============================================
 * Reads JSON from sessionStorage (set by register.js or login.js)
 * and renders a success or failure card.
 */

document.addEventListener("DOMContentLoaded", () => {
  const raw = sessionStorage.getItem("authResult");

  // If no result in storage (user navigated here directly), redirect home
  if (!raw) {
    window.location.href = "/";
    return;
  }

  const data = JSON.parse(raw);
  sessionStorage.removeItem("authResult"); // Consume — prevent stale display on refresh

  const card       = document.getElementById("resultCard");
  const icon       = document.getElementById("resultIcon");
  const title      = document.getElementById("resultTitle");
  const message    = document.getElementById("resultMessage");
  const metaDiv    = document.getElementById("resultMeta");
  const metaUser   = document.getElementById("metaUser");
  const metaConf   = document.getElementById("metaConfidence");
  const metaTime   = document.getElementById("metaTime");
  const btnTryAgain= document.getElementById("btnTryAgain");

  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (data.success) {
    card.classList.add("success");
    icon.classList.add("success");
    icon.textContent = "✓";
    title.textContent   = data.action === "Login" ? "Access Granted" : "Registered!";
    message.textContent = data.message;

    // Meta block (only meaningful for login with confidence)
    if (data.username) {
      metaUser.textContent = data.username;
      metaConf.textContent = data.confidence ? data.confidence + "%" : (data.action === "Registration" ? "N/A" : "—");
      metaTime.textContent = now;
      metaDiv.style.display = "flex";
    }

    // Change "Try Again" to a more useful action on success
    if (data.action === "Registration") {
      btnTryAgain.textContent = "Login Now →";
      btnTryAgain.href        = "/login-page";
    } else {
      btnTryAgain.textContent = "Login Again →";
      btnTryAgain.href        = "/login-page";
    }

  } else {
    card.classList.add("error");
    icon.classList.add("error");
    icon.textContent    = "✕";
    title.textContent   = "Access Denied";
    message.textContent = data.message || "Face not recognized.";
    metaDiv.style.display = "none";
    btnTryAgain.textContent = "Try Again";
    btnTryAgain.href        = "/login-page";
  }

  // Animate card in
  card.style.opacity   = "0";
  card.style.transform = "translateY(24px)";
  requestAnimationFrame(() => {
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    card.style.opacity    = "1";
    card.style.transform  = "translateY(0)";
  });
});
