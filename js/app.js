// Rangreihenverfahren – Mini-Anwendung
// Bilder unten (Pool) per Drag & Drop oben in eine eindeutige Reihenfolge
// bringen. Kommentare pro Bild und allgemein rechts. Vergroesserung ueber
// die Lupe an jeder Bildkarte.

const IMAGES = [
  "IMG_00001", "IMG_00002", "IMG_00008", "IMG_00011",
  "IMG_00014", "IMG_00018", "IMG_00019", "IMG_00020",
  "IMG_00021", "IMG_00027", "IMG_00033", "IMG_00036",
];

const state = {
  comments: {},       // id -> Kommentartext
  generalComment: "",
  activeImageId: null,
};

const poolTrack = document.getElementById("pool-track");
const rankingTrack = document.getElementById("ranking-track");
const submitBtn = document.getElementById("submit-btn");
const statusMsg = document.getElementById("status-msg");
const activeLabel = document.getElementById("active-image-label");
const imageCommentField = document.getElementById("image-comment");
const generalCommentField = document.getElementById("general-comment");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

function createCard(id) {
  const card = document.createElement("div");
  card.className = "card";
  card.draggable = true;
  card.dataset.id = id;
  card.innerHTML = `
    <span class="rank-badge"></span>
    <img src="images/${id}.jpg" alt="Satellitenbild ${id}" loading="lazy">
    <button type="button" class="zoom-btn" title="Vergrößern">🔍</button>
  `;

  card.addEventListener("dragstart", onDragStart);
  card.addEventListener("dragend", onDragEnd);
  card.addEventListener("click", (e) => {
    if (e.target.closest(".zoom-btn")) {
      openLightbox(id);
      return;
    }
    selectImageForComment(id);
  });

  return card;
}

IMAGES.forEach((id) => poolTrack.appendChild(createCard(id)));

// --- Drag & Drop -----------------------------------------------------------

function onDragStart(e) {
  e.currentTarget.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", e.currentTarget.dataset.id);
}

function onDragEnd(e) {
  e.currentTarget.classList.remove("dragging");
  document.querySelectorAll(".track").forEach((t) => t.classList.remove("drag-over"));
  updateRankBadges();
  updateSubmitState();
}

function getDragAfterElement(container, x) {
  const cards = [...container.querySelectorAll(".card:not(.dragging)")];
  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

[rankingTrack, poolTrack].forEach((track) => {
  track.addEventListener("dragover", (e) => {
    e.preventDefault();
    track.classList.add("drag-over");
    const dragging = document.querySelector(".dragging");
    if (!dragging) return;
    const afterEl = getDragAfterElement(track, e.clientX);
    if (afterEl == null) {
      track.appendChild(dragging);
    } else {
      track.insertBefore(dragging, afterEl);
    }
    updateRankBadges();
  });

  track.addEventListener("dragleave", (e) => {
    if (e.target === track) track.classList.remove("drag-over");
  });

  track.addEventListener("drop", (e) => {
    e.preventDefault();
    track.classList.remove("drag-over");
  });
});

function updateRankBadges() {
  [...rankingTrack.children].forEach((card, i) => {
    card.querySelector(".rank-badge").textContent = i + 1;
  });
  [...poolTrack.children].forEach((card) => {
    card.querySelector(".rank-badge").textContent = "";
  });
}

function updateSubmitState() {
  submitBtn.disabled = rankingTrack.children.length !== IMAGES.length;
}

// --- Lightbox / Vergroesserung ---------------------------------------------

function openLightbox(id) {
  lightboxImg.src = `images/${id}.jpg`;
  lightboxImg.alt = `Vergrößertes Satellitenbild ${id}`;
  lightbox.classList.remove("hidden");
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxImg.src = "";
}

document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

// --- Kommentare --------------------------------------------------------------

function selectImageForComment(id) {
  state.activeImageId = id;
  document.querySelectorAll(".card").forEach((c) => c.classList.toggle("selected", c.dataset.id === id));
  activeLabel.textContent = `Bildkommentar – ${id}`;
  imageCommentField.disabled = false;
  imageCommentField.value = state.comments[id] || "";
  imageCommentField.focus();
}

imageCommentField.addEventListener("input", () => {
  if (!state.activeImageId) return;
  const id = state.activeImageId;
  state.comments[id] = imageCommentField.value;
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (card) card.classList.toggle("commented", imageCommentField.value.trim().length > 0);
});

generalCommentField.addEventListener("input", (e) => {
  state.generalComment = e.target.value;
});

// --- Absenden ----------------------------------------------------------------

submitBtn.addEventListener("click", async () => {
  const order = [...rankingTrack.children].map((c) => c.dataset.id);
  const payload = {
    sessionId: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
    timestamp: new Date().toISOString(),
    order,
    imageComments: state.comments,
    generalComment: state.generalComment,
  };

  submitBtn.disabled = true;
  statusMsg.textContent = "Wird übermittelt...";

  const result = await submitResults(payload);

  statusMsg.textContent = result.ok
    ? "Danke! Bewertung übermittelt (Test-/Platzhaltermodus – noch kein echter Server angebunden)."
    : "Fehler beim Übermitteln – bitte erneut versuchen.";
  submitBtn.disabled = false;

  console.log("Ergebnis-Payload:", payload);
});

// ------------------------------------------------------------------------
// Platzhalter fuer die spaetere echte Server-Anbindung. Fuer den Testbetrieb
// reicht dieses Dummy: es simuliert eine Netzwerkanfrage und loggt die
// Nutzdaten in die Konsole. Vor dem produktiven Einsatz hier durch einen
// echten fetch()-Aufruf gegen ein Backend ersetzen (z. B. eigener kleiner
// Server, Google Apps Script Webhook, Formspree o. Ae.) und dabei die
// DSGVO-Anforderungen (Pseudonymisierung, Speicherort) beruecksichtigen.
// ------------------------------------------------------------------------
async function submitResults(payload) {
  console.log("[DUMMY SUBMIT]", payload);
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: true, dummy: true };
}

updateRankBadges();
updateSubmitState();
