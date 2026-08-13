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

// Tutorial vor Level 1: 9 domaenenfremde Beispielbilder (Schreibtisch-Szenen,
// 3 Unordnungs-/Informationsdichte-Stufen x 3 Darstellungsstile), liegen in
// images/tutorial/. Rein zum Vertrautmachen mit der Sortier-Mechanik und der
// Kernbotschaft "komplex != viel" -- keine Musterloesung, keine Uebermittlung.
const TUTORIAL_IMAGES = ["T1A", "T1B", "T1C", "T2A", "T2B", "T2C", "T3A", "T3B", "T3C"];

// JPEG-Dateigroessen (Byte) der Tutorial-Bilder, analog zu IMAGE_JPEG_SIZES
// oben -- auch hier soll der Kompressionsgroessen-Ansatz als Vergleichswert
// zur Rangfolge nutzbar sein.
const TUTORIAL_JPEG_SIZES = {
  T1A: 13375, T1B: 15760, T1C: 30950,
  T2A: 18192, T2B: 21081, T2C: 38038,
  T3A: 42744, T3B: 56067, T3C: 70343,
};
const tutorialState = { order: [], comments: {}, generalComment: "", completed: false };
let tutorialMode = true;

let currentLevel = 0;
let activeImageId = null;   // fuer welches Bild der Kommentar-Bereich rechts gilt
let selectedCard = null;    // aktuell "aufgenommene" Karte fuer die Platzierung

// Liefert je nach Modus (Tutorial vor Level 1 vs. echtes Level) die aktuell
// gueltige Bilderliste bzw. den zugehoerigen State/Bildordner -- die
// eigentliche Sortier-/Klick-Logik weiter unten bleibt dadurch fuer beide
// Modi identisch, ohne Code zu verdoppeln.
function currentImages() {
  return tutorialMode ? TUTORIAL_IMAGES : LEVELS[currentLevel];
}
function currentState() {
  return tutorialMode ? tutorialState : levelStates[currentLevel];
}
function imageFolder() {
  return tutorialMode ? "images/tutorial" : "images";
}

const levelBar = document.getElementById("level-bar");
const legendText = document.getElementById("legend-text");
const legendTagEasy = document.getElementById("legend-tag-easy");
const legendTagHard = document.getElementById("legend-tag-hard");
const poolTrack = document.getElementById("pool-track");
const rankingTrack = document.getElementById("ranking-track");
const submitBtn = document.getElementById("submit-btn");
const statusMsg = document.getElementById("status-msg");
const activeLabel = document.getElementById("active-image-label");
const imageCommentField = document.getElementById("image-comment");
const generalCommentField = document.getElementById("general-comment");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const completionScreen = document.getElementById("completion-screen");
const tutorialModal = document.getElementById("tutorial-modal");
const tutorialModalVideo = document.getElementById("tutorial-modal-video");

// --- Tutorial vor Level 1 -----------------------------------------------------

function finishTutorial() {
  tutorialMode = false;
  document.querySelector(".layout").classList.remove("tutorial-active");
  levelBar.classList.remove("hidden");
  legendText.textContent = "Bild auswählen, dann Zielposition anklicken";
  legendTagEasy.textContent = "einfach";
  legendTagHard.textContent = "komplex";
  submitBtn.textContent = "Bewertung abschließen";
  renderLevelBar();
  loadCurrentIntoDom();
}

document.getElementById("intro-continue-btn").addEventListener("click", () => {
  document.getElementById("intro-screen").classList.add("hidden");
  document.querySelector(".page").classList.remove("hidden");
});

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
  saveDomIntoCurrentState();
  currentLevel = index;
  loadCurrentIntoDom();
  renderLevelBar();
}

function saveDomIntoCurrentState() {
  currentState().order = [...rankingTrack.children].map((c) => c.dataset.id);
}

function loadCurrentIntoDom() {
  const state = currentState();
  const images = currentImages();

  poolTrack.innerHTML = "";
  rankingTrack.innerHTML = "";
  selectedCard = null;

  const unranked = images.filter((id) => !state.order.includes(id));
  state.order.forEach((id) => rankingTrack.appendChild(createCard(id)));
  unranked.forEach((id) => poolTrack.appendChild(createCard(id)));

  activeImageId = null;
  activeLabel.textContent = "Bildkommentar – kein Bild ausgewählt";
  imageCommentField.disabled = true;
  imageCommentField.value = "";
  generalCommentField.value = state.generalComment;
  statusMsg.textContent = state.completed ? "Diese Bewertung wurde bereits übermittelt." : "";

  updateRankBadges();
  updateSubmitState();
  updatePlacingState();
}

// --- Bildkarten ----------------------------------------------------------

function createCard(id) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = id;
  if (currentState().comments[id]?.trim()) card.classList.add("commented");
  const altText = tutorialMode ? `Beispielbild ${id}` : `Satellitenbild ${id}`;
  card.innerHTML = `
    <span class="rank-badge"></span>
    <img src="${imageFolder()}/${id}.jpg" alt="${altText}" loading="lazy">
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

  if (card === selectedCard) {
    e.stopPropagation();
    clearSelection();
    return;
  }

  if (!selectedCard) {
    // Aufnehmen einer Karte ist hier bereits vollstaendig behandelt -- die
    // Klick-Handler von rankingTrack/poolTrack duerfen NICHT nochmal auf
    // denselben (bubbelnden) Klick reagieren, sonst wuerde eine gerade erst
    // aufgenommene Ranking-Karte im selben Klick sofort wieder abgelegt und
    // die Auswahl direkt danach geloescht (Bug: Reihenfolge liess sich nach
    // dem ersten Einsortieren nicht mehr aendern).
    e.stopPropagation();
    selectCard(card);
    return;
  }

  const inRanking = card.parentElement === rankingTrack;
  if (!inRanking) {
    // Klick auf eine andere Pool-Karte waehrend etwas ausgewaehlt ist -> Neuauswahl.
    e.stopPropagation();
    selectCard(card);
    return;
  }

  // Klick auf eine andere Ranking-Karte waehrend etwas ausgewaehlt ist: hier
  // NICHT platzieren (welche Kartenhaelfte getroffen wurde ist unzuverlaessig,
  // v. a. bei kleinen kompakten Zeilen). Stattdessen an den Track-weiten
  // Click-Handler unten durchreichen (bubble), der die exakte Position anhand
  // der Y-Koordinate relativ zu ALLEN Karten berechnet -- unabhaengig davon,
  // ob genau eine Karte oder die Luecke zwischen zwei Karten getroffen wurde.
}

rankingTrack.addEventListener("click", (e) => {
  if (!selectedCard) return;
  const target = getInsertionTarget(rankingTrack, e.clientY);
  if (target) {
    rankingTrack.insertBefore(selectedCard, target);
  } else {
    rankingTrack.appendChild(selectedCard);
  }
  clearSelection();
  afterOrderChange();
});

poolTrack.addEventListener("click", (e) => {
  if (e.target !== poolTrack || !selectedCard) return;
  poolTrack.appendChild(selectedCard);
  clearSelection();
  afterOrderChange();
});

// Ermittelt, VOR welcher Karte die ausgewaehlte Karte eingefuegt werden soll,
// anhand der vertikalen Mausposition relativ zur Bildschirmmitte jeder
// bestehenden Karte (die ausgewaehlte Karte selbst wird ausgeklammert).
// Rueckgabe null bedeutet "ans Ende anhaengen" (Klick unterhalb der letzten
// Karte bzw. keine Karten vorhanden).
function getInsertionTarget(container, clientY) {
  const cards = [...container.querySelectorAll(".card")].filter((c) => c !== selectedCard);
  return cards.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = clientY - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
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
  // Einmal erfolgreich uebermittelte Levels bleiben dauerhaft gesperrt (auch
  // nach einem Levelwechsel und zurueck) -- verhindert Mehrfach-Zeilen im
  // Google Sheet durch mehrfaches Klicken/erneutes Absenden.
  submitBtn.disabled = currentState().completed || rankingTrack.children.length !== currentImages().length;
}

// --- Lightbox / Vergroesserung ---------------------------------------------

function openLightbox(id) {
  lightboxImg.src = `${imageFolder()}/${id}.jpg`;
  lightboxImg.alt = tutorialMode ? `Vergrößertes Beispielbild ${id}` : `Vergrößertes Satellitenbild ${id}`;
  lightbox.classList.remove("hidden");
}

function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxImg.src = "";
}

// --- Abschluss-Popup nach allen 3 Leveln --------------------------------------

function showCompletionScreen() {
  completionScreen.classList.remove("hidden");
}

document.getElementById("completion-close-btn").addEventListener("click", () => {
  completionScreen.classList.add("hidden");
});

// --- Tutorial-Video: jederzeit ueber den Button in der Topleiste erneut
// aufrufbar, waehrend der eigentlichen Aufgabe (Uebung wie echte Level) ---

document.getElementById("tutorial-open-btn").addEventListener("click", () => {
  tutorialModal.classList.remove("hidden");
  tutorialModalVideo.currentTime = 0;
  tutorialModalVideo.play();
});

document.getElementById("tutorial-close-btn").addEventListener("click", () => {
  tutorialModal.classList.add("hidden");
  tutorialModalVideo.pause();
});

document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeLightbox();
    clearSelection();
    if (!tutorialModal.classList.contains("hidden")) {
      tutorialModal.classList.add("hidden");
      tutorialModalVideo.pause();
    }
  }
});

// --- Kommentare --------------------------------------------------------------

function selectImageForComment(id) {
  activeImageId = id;
  activeLabel.textContent = `Bildkommentar – ${id}`;
  imageCommentField.disabled = false;
  imageCommentField.value = currentState().comments[id] || "";
  imageCommentField.focus();
}

imageCommentField.addEventListener("input", () => {
  if (!activeImageId) return;
  currentState().comments[activeImageId] = imageCommentField.value;
  const card = document.querySelector(`.card[data-id="${activeImageId}"]`);
  if (card) card.classList.toggle("commented", imageCommentField.value.trim().length > 0);
});

generalCommentField.addEventListener("input", (e) => {
  currentState().generalComment = e.target.value;
});

// --- Absenden ----------------------------------------------------------------

submitBtn.addEventListener("click", async () => {
  saveDomIntoCurrentState();
  const state = currentState();

  // Tutorial-Rangfolge wird genauso wie ein echtes Level uebermittelt (level:
  // "tutorial" statt Levelnummer), damit sie sich in der Tabelle unterscheiden
  // laesst -- Julian moechte auch diese Warmwerd-Rangfolgen als Datenpunkt.
  const payload = {
    sessionId: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
    timestamp: new Date().toISOString(),
    level: tutorialMode ? "tutorial" : currentLevel + 1,
    order: state.order,
    imageComments: state.comments,
    generalComment: state.generalComment,
  };

  submitBtn.disabled = true;
  statusMsg.textContent = "Wird übermittelt...";

  const result = await submitResults(payload);
  state.completed = result.ok;

  if (result.dummy) {
    statusMsg.textContent = "Danke! (Test-/Platzhaltermodus – keine SUBMIT_URL gesetzt, siehe README).";
  } else if (result.unverified) {
    statusMsg.textContent = "Danke! Bewertung an die Google-Tabelle gesendet (Übermittlung technisch nicht bestätigbar, siehe README).";
  } else if (result.ok) {
    statusMsg.textContent = "Danke! Bewertung an die Google-Tabelle übermittelt.";
  } else {
    statusMsg.textContent = "Fehler beim Übermitteln an die Google-Tabelle – bitte erneut versuchen.";
  }
  // Statt pauschal wieder freizugeben: bei Erfolg bleibt der Button ueber
  // state.completed dauerhaft gesperrt (siehe updateSubmitState), bei einem
  // Fehler wird er wieder klickbar, damit ein erneuter Versuch moeglich ist.
  updateSubmitState();

  console.log("Ergebnis-Payload:", payload);

  // Tutorial-Uebermittlung laeuft best-effort (per no-cors ohnehin nicht
  // zuverlaessig auslesbar, siehe submitResults()) -- ein Netzwerkfehler soll
  // Teilnehmende nicht von den echten Leveln abhalten, daher immer weiter.
  if (tutorialMode) {
    finishTutorial();
    return;
  }

  renderLevelBar();

  if (result.ok && levelStates.every((s) => s.completed)) {
    showCompletionScreen();
  }
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

  // Tutorial- und echte Level-Bilder liegen in getrennten Groessen-Tabellen
  // (verschiedene ID-Namensraeume), daher Auswahl anhand des Levels im Payload.
  const sizeTable = payload.level === "tutorial" ? TUTORIAL_JPEG_SIZES : IMAGE_JPEG_SIZES;
  const enrichedPayload = {
    ...payload,
    imageSizes: Object.fromEntries(payload.order.map((id) => [id, sizeTable[id] ?? null])),
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

// Start immer mit dem Tutorial (9 domaenenfremde Beispielbilder) vor Level 1
// (siehe TUTORIAL_IMAGES weiter oben); Level-Umschaltung ergibt hier keinen
// Sinn und bleibt daher bis finishTutorial() versteckt.
levelBar.classList.add("hidden");
document.querySelector(".layout").classList.add("tutorial-active");
legendText.textContent = "Bild auswählen, dann Zielposition anklicken – zum Ausprobieren, keine Bewertung";
legendTagEasy.textContent = "leicht zu erfassen";
legendTagHard.textContent = "schwer zu erfassen";
submitBtn.textContent = "Weiter zu Level 1";
loadCurrentIntoDom();
