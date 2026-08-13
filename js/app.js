// Rangreihenverfahren – Mini-Anwendung
// Bilder im Pool per Klick auswaehlen, dann per Klick auf die Zielposition
// in der Rangreihe ablegen (Rang 1 = einfach, Rang 12 = komplex, siehe
// Farbverlauf/Legende). Kommentare pro Bild und allgemein rechts.
// Vergroesserung ueber die Lupe an jeder Bildkarte. Alle 36 verfuegbaren
// Bilder sind auf 3 Level zu je 12 Bildern aufgeteilt (siehe README fuer
// die Aufteilungsmethode).

// JPEG-Dateigroessen (Byte) aus bildpool.csv, werden mit an die
// Google-Tabelle uebermittelt als Vergleichswert zur Rangreihe.
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
// Konsole geloggt statt zentral gespeichert.
const SUBMIT_URL = "https://script.google.com/macros/s/AKfycbzihufA6kTn-kea5re-lGZUbtvg_IjZ7N5LsuGHzbCjMje4T0O29FHjsdbH_vfttf1u/exec";

const levelStates = LEVELS.map(() => ({
  order: [],            // Bild-IDs in Rangfolge (Index 0 = Rang 1 = einfach)
  comments: {},          // Bild-ID -> Kommentartext
  generalComment: "",
  completed: false,
}));

let currentLevel = 0;
let activeImageId = null;   // fuer welches Bild der Kommentar-Bereich rechts gilt
let selectedCard = null;    // aktuell "aufgenommene" Karte fuer die Platzierung

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
  selectedCard = null;

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
  updatePlacingState();
}

// --- Bildkarten ----------------------------------------------------------

function createCard(id) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = id;
  if (levelStates[currentLevel].comments[id]?.trim()) card.classList.add("commented");
  card.innerHTML = `
    <span class="rank-badge"></span>
    <img src="images/${id}.jpg" alt="Satellitenbild ${id}" loading="lazy">
    <button type="button" class="zoom-btn" title="Vergrößern">🔍</button>
  `;
  card.addEventListener("click", onCardClick);
  return card;
}

// --- Klick-Auswahl-Klick-Platzieren (ersetzt Drag & Drop) -------------------
//
// 1. Bild anklicken -> wird "aufgenommen" (blaue Umrandung), gleichzeitig als
//    aktives Bild fuer den Kommentar-Bereich rechts gesetzt.
// 2. Erneuter Klick auf dieselbe Karte -> Aufnahme abbrechen (Kommentarfeld
//    bleibt wie gewaehlt bestehen).
// 3. Bei aktiver Aufnahme: Klick auf eine andere Position in der Rangreihe
//    (obere/untere Haelfte einer Karte oder freie Flaeche darunter) legt das
//    aufgenommene Bild dort ab. Klick auf eine andere Pool-Karte waehlt
//    stattdessen diese neu aus. Klick auf freie Pool-Flaeche legt ein aus
//    der Rangreihe aufgenommenes Bild zurueck in den Pool.

function onCardClick(e) {
  if (e.target.closest(".zoom-btn")) {
    e.stopPropagation();
    openLightbox(e.currentTarget.dataset.id);
    return;
  }

  const card = e.currentTarget;
  const inRanking = card.parentElement === rankingTrack;

  if (card === selectedCard) {
    clearSelection();
    return;
  }

  if (selectedCard) {
    if (inRanking) {
      placeSelectedRelativeTo(card, e.clientY);
    } else {
      selectCard(card);
    }
    return;
  }

  selectCard(card);
}

rankingTrack.addEventListener("click", (e) => {
  if (e.target !== rankingTrack || !selectedCard) return;
  rankingTrack.appendChild(selectedCard);
  clearSelection();
  afterOrderChange();
});

poolTrack.addEventListener("click", (e) => {
  if (e.target !== poolTrack || !selectedCard) return;
  poolTrack.appendChild(selectedCard);
  clearSelection();
  afterOrderChange();
});

function placeSelectedRelativeTo(targetCard, clientY) {
  const rect = targetCard.getBoundingClientRect();
  const before = clientY - rect.top < rect.height / 2;
  rankingTrack.insertBefore(selectedCard, before ? targetCard : targetCard.nextSibling);
  clearSelection();
  afterOrderChange();
}

function selectCard(card) {
  if (selectedCard) selectedCard.classList.remove("selected");
  selectedCard = card;
  card.classList.add("selected");
  updatePlacingState();
  selectImageForComment(card.dataset.id);
}

function clearSelection() {
  if (selectedCard) selectedCard.classList.remove("selected");
  selectedCard = null;
  updatePlacingState();
}

function updatePlacingState() {
  rankingTrack.classList.toggle("placing", !!selectedCard);
  poolTrack.classList.toggle("placing", !!selectedCard);
}

function afterOrderChange() {
  updateRankBadges();
  updateSubmitState();
}

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
  if (e.key === "Escape") {
    closeLightbox();
    clearSelection();
  }
});

// --- Kommentare --------------------------------------------------------------

function selectImageForComment(id) {
  activeImageId = id;
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
  levelState.completed = result.ok;
  renderLevelBar();

  if (result.dummy) {
    statusMsg.textContent = "Danke! (Test-/Platzhaltermodus – keine SUBMIT_URL gesetzt, siehe README).";
  } else if (result.unverified) {
    statusMsg.textContent = "Danke! Bewertung an die Google-Tabelle gesendet (Übermittlung technisch nicht bestätigbar, siehe README).";
  } else if (result.ok) {
    statusMsg.textContent = "Danke! Bewertung an die Google-Tabelle übermittelt.";
  } else {
    statusMsg.textContent = "Fehler beim Übermitteln an die Google-Tabelle – bitte erneut versuchen.";
  }
  submitBtn.disabled = false;

  console.log("Ergebnis-Payload:", payload);
});

// ------------------------------------------------------------------------
// Sendet an die Google-Apps-Script-Web-App (siehe README, Abschnitt
// "Zentrale Speicherung" + apps-script/Code.gs), die jedes Bild der
// Rangfolge als eigene Zeile in eine Google-Tabelle schreibt. Solange
// SUBMIT_URL leer ist (noch nicht deployt), faellt dies auf ein Dummy
// zurueck, das nur in die Konsole loggt.
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

// --- Spalten-Resizer ---------------------------------------------------------
// Erlaubt, die Breite der Rangreihenfolge- und der Kommentare-Spalte per
// Ziehen anzupassen; der Bilder-Pool in der Mitte (1fr) nimmt den Rest ein.
// Bildgroessen skalieren automatisch mit (siehe cqw-Regeln in style.css,
// container-type: inline-size auf .ranking-zone/.pool-zone) -- dafuer ist
// hier keine JS-Logik noetig, nur die Spaltenbreite selbst wird gesetzt.

const layoutEl = document.querySelector(".layout");

function setupResizer(handle, cssVar, { min, max, invert }) {
  function currentWidth() {
    const raw = getComputedStyle(layoutEl).getPropertyValue(cssVar);
    return parseFloat(raw) || 0;
  }

  function applyDelta(delta) {
    const startWidth = currentWidth();
    const signedDelta = invert ? -delta : delta;
    const newWidth = Math.min(max, Math.max(min, startWidth + signedDelta));
    layoutEl.style.setProperty(cssVar, `${newWidth}px`);
  }

  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = currentWidth();
    handle.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev) {
      const delta = (invert ? -1 : 1) * (ev.clientX - startX);
      const newWidth = Math.min(max, Math.max(min, startWidth + delta));
      layoutEl.style.setProperty(cssVar, `${newWidth}px`);
    }

    function onUp() {
      handle.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  handle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { applyDelta(-20); e.preventDefault(); }
    if (e.key === "ArrowRight") { applyDelta(20); e.preventDefault(); }
  });
}

setupResizer(document.getElementById("resizer-1"), "--ranking-w", { min: 170, max: 520, invert: false });
setupResizer(document.getElementById("resizer-2"), "--comments-w", { min: 240, max: 620, invert: true });

renderLevelBar();
loadLevelIntoDom(currentLevel);
