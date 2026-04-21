/**
 * result.js — Display authentication result
 * Fixed: handles missing sessionStorage gracefully
 */

document.addEventListener("DOMContentLoaded", () => {
  const raw = sessionStorage.getItem("authResult");

  const card       = document.getElementById("resultCard");
  const icon       = document.getElementById("resultIcon");
  const title      = document.getElementById("resultTitle");
  const message    = document.getElementById("resultMessage");
  const metaDiv    = document.getElementById("resultMeta");
  const metaUser   = document.getElementById("metaUser");
  const metaConf   = document.getElementById("metaConfidence");
  const metaTime   = document.getElementById("metaTime");
  const btnTryAgain= document.getElementById("btnTryAgain");

  // If no data found, show a default error instead of blank page
  if (!raw) {
    card.classList.add("error");
    icon.classList.add("error");
    icon.textContent    = "✕";
    title.textContent   = "No Result Found";
    message.textContent = "Please go back and try registering or logging in again.";
    metaDiv.style.display = "none";
    btnTryAgain.textContent = "Try Again";
    btnTryAgain.href        = "/login-page";
    animateCard(card);
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch(e) {
    card.classList.add("error");
    icon.classList.add("error");
    icon.textContent    = "✕";
    title.textContent   = "Something went wrong";
    message.textContent = "Could not read result data. Please try again.";
    metaDiv.style.display = "none";
    animateCard(card);
    return;
  }

  sessionStorage.removeItem("authResult"); // consume it

  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  if (data.success) {
    card.classList.add("success");
    icon.classList.add("success");
    icon.textContent = "✓";

    // Title based on action
    if (data.action === "Registration") {
      title.textContent = "Registered!";
    } else if (data.already_marked) {
      title.textContent = "Already Marked!";
    } else {
      title.textContent = "Attendance Marked!";
    }

    message.textContent = data.message || "Success!";

    // Show meta info
    if (data.username) {
      metaUser.textContent = data.username;
      metaConf.textContent = data.confidence ? data.confidence + "%" : "N/A";
      metaTime.textContent = data.time || now;
      metaDiv.style.display = "flex";
    }

    // Button actions
    if (data.action === "Registration") {
      btnTryAgain.textContent = "Mark Attendance →";
      btnTryAgain.href        = "/login-page";
    } else {
      btnTryAgain.textContent = "View Attendance →";
      btnTryAgain.href        = "/attendance-page";
    }

  } else {
    card.classList.add("error");
    icon.classList.add("error");
    icon.textContent    = "✕";
    title.textContent   = "Not Recognized";
    message.textContent = data.message || "Face not recognized. Please try again.";
    metaDiv.style.display = "none";
    btnTryAgain.textContent = "Try Again";
    btnTryAgain.href        = "/login-page";
  }

  animateCard(card);
});

function animateCard(card) {
  card.style.opacity   = "0";
  card.style.transform = "translateY(24px)";
  requestAnimationFrame(() => {
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    card.style.opacity    = "1";
    card.style.transform  = "translateY(0)";
  });
}