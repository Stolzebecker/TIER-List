// Rangreihenverfahren – Mini-Anwendung
// Bilder unten (Pool) per Drag & Drop oben in eine eindeutige Reihenfolge
// bringen. Kommentare pro Bild und allgemein rechts. Vergroesserung ueber
// die Lupe an jeder Bildkarte. Alle 36 verfuegbaren Bilder sind auf 3 Level
// zu je 12 Bildern aufgeteilt (siehe README fuer die Aufteilungsmethode).

// JPEG-Dateigroessen (Byte) aus bildpool.csv, fuer den Export als
// Vergleichswert zur Rangreihe (Komplexitaets-Proxy, siehe README).
const IMAGE_JPEG_SIZES = {
  IMG_00001: 190644, IMG_00002: 106114, IMG_00003: 150812, IMG_00004: 108444,
  IMG_00005: 140699, IMG_00006: 154543, IMG_00007: 128484, IMG_00008: 130472,
  IMG_00010: 119481, IMG_00011: 121988, IMG_00012: 107375, IMG_00013: 102265,
  IMG_00014: 107432, IMG_00015: 90191, IMG_00016: 84677, IMG_00017: 108262,
  IMG_00018: 167870, IMG_00019: 110361, IMG_00020: 153174, IMG_00021: 93217,
  IMG_00022: 91459, IMG_00023: 126997, IMG_00024: 179315, IMG_00025: 141515,
  IMG_00026: 103282, IMG_00027: 88560, IMG_00028: 133789, IMG_00029: 107115,
  IMG_00031: 187058, IMG_00032: 88118, IMG_00033: 141188, IMG_00034: 117724,
  IMG_00035: 165219, IMG_00036: 84596, IMG_00037: 105709, IMG_00038: 144216,
};

// Alle 36 Bilder auf 3 Level zu je 12 Bildern aufgeteilt. Jedes Level
// enthaelt, wie schon die urspruengliche 12er-Pilotauswahl, Bilder ueber das
// gesamte JPEG-Dateigroessen-Spektrum verteilt (jedes 3. Bild der nach
// Groesse sortierten Liste), damit keine Level nur "einfache" oder nur
// "komplexe" Bilder enthaelt (vermeidet Boden-/Deckeneffekte pro Level).
const LEVELS = [
  ["IMG_00036", "IMG_00027", "IMG_00021", "IMG_00037", "IMG_00012", "IMG_00004",
   "IMG_00010", "IMG_00007", "IMG_00005", "IMG_00038", "IMG_00006", "IMG_00024"],
  ["IMG_00016", "IMG_00015", "IMG_00013", "IMG_00002", "IMG_00014", "IMG_00019",
   "IMG_00011", "IMG_00008", "IMG_00033", "IMG_00003", "IMG_00035", "IMG_00031"],
  ["IMG_00032", "IMG_00022", "IMG_00026", "IMG_00029", "IMG_00017", "IMG_00034",
   "IMG_00023", "IMG_00028", "IMG_00025", "IMG_00020", "IMG_00018", "IMG_00001"],
];

// URL der deployten Google-Apps-Script-Web-App (siehe README, Abschnitt
// "Zentrale Speicherung"). Leer = Dummy-Modus, Ergebnisse werden nur in die
// Konsole geloggt statt zentral gespeichert -- CSV-Download passiert in
// beiden Faellen zusaetzlich.
const SUBMIT_URL = "https://script.google.com/macros/s/AKfycbzihufA6kTn-kea5re-lGZUbtvg_IjZ7N5LsuGHzbCjMje4T0O29FHjsdbH_vfttf1u/exec";

const levelStates = LEVELS.map(() => ({
  order: [],            // Bild-IDs in Rangfolge (Index 0 = Rang 1)
  comments: {},          // Bild-ID -> Kommentartext
  generalComment: "",
  completed: false,
}));

let currentLevel = 0;
let activeImageId = null;

const levelBar = document.getElementById("level-bar");
const poolTrack = document.getElementById("pool-track");
const rankingTrack = document.getElementById("ranking-track");
const submitBtn = document.getElementById("submit-btn");
const statusMsg = document.getElementById("status-msg");
const activeLabel = document.getElementById("active-image-label");
const imageCommentField = document.getElementById("image-comment");
const generalCommentField = document.getElementById("general-comment");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");

// --- Level-Umschaltung -------------------------------------------------------

function renderLevelBar() {
  levelBar.innerHTML = "";
  LEVELS.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-btn" + (i === currentLevel ? " active" : "");
    btn.textContent = (levelStates[i].completed ? "✓ " : "") + `Level ${i + 1}`;
    btn.addEventListener("click", () => switchLevel(i));
    levelBar.appendChild(btn);
  });
}

function switchLevel(index) {
  if (index === currentLevel) return;
  saveDomIntoLevelState(currentLevel);
  currentLevel = index;
  loadLevelIntoDom(currentLevel);
  renderLevelBar();
}

function saveDomIntoLevelState(index) {
  levelStates[index].order = [...rankingTrack.children].map((c) => c.dataset.id);
}

function loadLevelIntoDom(index) {
  const levelState = levelStates[index];
  const images = LEVELS[index];

  poolTrack.innerHTML = "";
  rankingTrack.innerHTML = "";

  const unranked = images.filter((id) => !levelState.order.includes(id));
  levelState.order.forEach((id) => rankingTrack.appendChild(createCard(id)));
  unranked.forEach((id) => poolTrack.appendChild(createCard(id)));

  activeImageId = null;
  activeLabel.textContent = "Bildkommentar – kein Bild ausgewählt";
  imageCommentField.disabled = true;
  imageCommentField.value = "";
  generalCommentField.value = levelState.generalComment;
  statusMsg.textContent = "";

  updateRankBadges();
  updateSubmitState();
}

// --- Bildkarten & Drag & Drop -----------------------------------------------

function createCard(id) {
  const card = document.createElement("div");
  card.className = "card";
  card.draggable = true;
  card.dataset.id = id;
  if (levelStates[currentLevel].comments[id]?.trim()) card.classList.add("commented");
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

function getDragAfterElement(container, x, y, vertical) {
  const cards = [...container.querySelectorAll(".card:not(.dragging)")];
  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = vertical
        ? y - box.top - box.height / 2
        : x - box.left - box.width / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

[rankingTrack, poolTrack].forEach((track) => {
  const vertical = track === rankingTrack;
  track.addEventListener("dragover", (e) => {
    e.preventDefault();
    track.classList.add("drag-over");
    const dragging = document.querySelector(".dragging");
    if (!dragging) return;
    const afterEl = getDragAfterElement(track, e.clientX, e.clientY, vertical);
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
  submitBtn.disabled = rankingTrack.children.length !== LEVELS[currentLevel].length;
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
  activeImageId = id;
  document.querySelectorAll(".card").forEach((c) => c.classList.toggle("selected", c.dataset.id === id));
  activeLabel.textContent = `Bildkommentar – ${id}`;
  imageCommentField.disabled = false;
  imageCommentField.value = levelStates[currentLevel].comments[id] || "";
  imageCommentField.focus();
}

imageCommentField.addEventListener("input", () => {
  if (!activeImageId) return;
  levelStates[currentLevel].comments[activeImageId] = imageCommentField.value;
  const card = document.querySelector(`.card[data-id="${activeImageId}"]`);
  if (card) card.classList.toggle("commented", imageCommentField.value.trim().length > 0);
});

generalCommentField.addEventListener("input", (e) => {
  levelStates[currentLevel].generalComment = e.target.value;
});

// --- Absenden ----------------------------------------------------------------

submitBtn.addEventListener("click", async () => {
  saveDomIntoLevelState(currentLevel);
  const levelState = levelStates[currentLevel];

  const payload = {
    sessionId: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
    timestamp: new Date().toISOString(),
    level: currentLevel + 1,
    order: levelState.order,
    imageComments: levelState.comments,
    generalComment: levelState.generalComment,
  };

  submitBtn.disabled = true;
  statusMsg.textContent = "Wird übermittelt...";

  const result = await submitResults(payload);
  downloadResultsCsv(payload);
  levelState.completed = result.ok;
  renderLevelBar();

  if (result.dummy) {
    statusMsg.textContent = "Danke! (Test-/Platzhaltermodus – keine SUBMIT_URL gesetzt, siehe README) und als CSV heruntergeladen.";
  } else if (result.unverified) {
    statusMsg.textContent = "Danke! Bewertung an die Google-Tabelle gesendet (Übermittlung technisch nicht bestätigbar, siehe README) und zusätzlich als CSV heruntergeladen.";
  } else if (result.ok) {
    statusMsg.textContent = "Danke! Bewertung an die Google-Tabelle übermittelt und zusätzlich als CSV heruntergeladen.";
  } else {
    statusMsg.textContent = "Fehler beim Übermitteln an die Google-Tabelle – CSV wurde trotzdem heruntergeladen.";
  }
  submitBtn.disabled = false;

  console.log("Ergebnis-Payload:", payload);
});

// --- Ergebnisexport (CSV) -----------------------------------------------
// Laedt Rangfolge + Dateigroesse + Kommentare als CSV herunter, damit sich
// Rang und JPEG-Kompressionsgroesse (Komplexitaets-Proxy) direkt
// gegenueberstellen lassen (z. B. in Excel/Numbers).

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildResultsCsv(payload) {
  const header = ["rank", "image_id", "jpeg_filesize_bytes", "comment"].join(",");
  const rows = payload.order.map((id, i) => {
    const rank = i + 1;
    const size = IMAGE_JPEG_SIZES[id] ?? "";
    const comment = csvEscape(payload.imageComments[id] || "");
    return [rank, id, size, comment].join(",");
  });
  const meta = [
    "",
    `level,${payload.level}`,
    `session_id,${payload.sessionId}`,
    `timestamp,${payload.timestamp}`,
    `general_comment,${csvEscape(payload.generalComment)}`,
  ];
  return [header, ...rows, ...meta].join("\n");
}

function downloadResultsCsv(payload) {
  const csv = buildResultsCsv(payload);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rangreihe_ergebnis_level${payload.level}_${payload.sessionId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------------
// Sendet an die Google-Apps-Script-Web-App (siehe README, Abschnitt
// "Zentrale Speicherung" + apps-script/Code.gs), die jedes Bild der
// Rangfolge als eigene Zeile in eine Google-Tabelle schreibt. Solange
// SUBMIT_URL leer ist (noch nicht deployt), faellt dies auf ein Dummy
// zurueck, das nur in die Konsole loggt -- der CSV-Download passiert davon
// unabhaengig in jedem Fall (siehe submitBtn-Handler oben).
//
// Content-Type bewusst auf dem fetch()-Default (text/plain) belassen: ein
// expliziter "application/json"-Header wuerde einen CORS-Preflight
// ausloesen, den Apps-Script-Web-Apps nicht sauber beantworten. Der Body
// ist trotzdem valides JSON, e.postData.contents in Code.gs parst ihn ganz
// normal mit JSON.parse().
//
// mode: "no-cors" ist hier bewusst gesetzt, nicht nur eine Falloption:
// Apps-Script-Web-Apps senden bei /exec keinen
// Access-Control-Allow-Origin-Header, ein regulaerer fetch() wirft daher
// IMMER einen CORS-Fehler, obwohl der Request server-seitig ankommt und
// doPost() ausgefuehrt wird (verifiziert: Zeilen landen im Sheet). Mit
// no-cors wird die Antwort "opaque" -- wir koennen also nicht lesen, ob
// doPost() intern ok:true oder ok:false zurueckgegeben hat, sondern nur,
// ob der Request ueberhaupt rausgegangen ist (kein Netzwerkfehler). Ein
// echtes ok/Fehler-Feedback braeuchte einen eigenen Server statt Apps
// Script, oder einen Cloudflare-Worker/kleinen Proxy davor.
// ------------------------------------------------------------------------
async function submitResults(payload) {
  if (!SUBMIT_URL) {
    console.log("[DUMMY SUBMIT – keine SUBMIT_URL gesetzt]", payload);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { ok: true, dummy: true };
  }

  const enrichedPayload = {
    ...payload,
    imageSizes: Object.fromEntries(payload.order.map((id) => [id, IMAGE_JPEG_SIZES[id] ?? null])),
  };

  try {
    await fetch(SUBMIT_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(enrichedPayload),
    });
    return { ok: true, dummy: false, unverified: true };
  } catch (err) {
    console.error("Uebermittlung an Google Sheet fehlgeschlagen:", err);
    return { ok: false, dummy: false };
  }
}

renderLevelBar();
loadLevelIntoDom(currentLevel);
