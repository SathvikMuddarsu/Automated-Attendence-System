


/**
 * main.js — Home page animations
 */
document.addEventListener("DOMContentLoaded", () => {
  // Staggered entrance for feature cards
  const cards = document.querySelectorAll(".feature-card");
  cards.forEach((card, i) => {
    card.style.opacity   = "0";
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      card.style.opacity    = "1";
      card.style.transform  = "translateY(0)";
    }, 600 + i * 120);
  });
});