# TIER-List — Rangreihenverfahren

Kleine Web-Anwendung für das Rangreihenverfahren (Tier-List-Übung) im Rahmen
der Experteninterviews/Pilotphase von Julian Stolz' Promotion (PH Heidelberg,
visuelle Komplexität von Fernerkundungsbildern).

Probandinnen und Probanden ziehen pro Level 12 Satellitenbilder per Drag &
Drop von der Bilder-Ablage (Mitte) in eine eindeutige Rangfolge (links,
vertikal, Rang 1 = oben). Jedes Bild lässt sich über die Lupe vergrößern.
Rechts können ein allgemeiner Kommentar sowie ein Kommentar pro
ausgewähltem Bild hinterlegt werden.

## Level & Bildauswahl

Alle 36 Bilder des Sentinel-2-Pools (siehe `../Satellitenbilder/`) werden
genutzt, aufgeteilt in **3 Level zu je 12 Bildern** (oben in der Leiste
umschaltbar, Fortschritt pro Level bleibt beim Wechseln erhalten). Jedes
Level enthält, wie ursprünglich die einzelne Pilot-Auswahl, Bilder über das
gesamte JPEG-Dateigrößen-Spektrum verteilt (jedes 3. Bild der nach Größe
sortierten Gesamtliste) — bewusste/purposive Stichprobe pro Level, damit
kein Level nur "einfache" oder nur "komplexe" Bilder enthält. Die genaue
Zuordnung steht in `js/app.js` (Konstante `LEVELS`).

## Datenerfassung

Die Seite ist eine rein statische Anwendung (HTML/CSS/JS, kein Build-Schritt)
für GitHub Pages und hat **keinen eigenen Server**. Beim Abschluss einer
Bewertung (pro Level) passiert aktuell zweierlei:

1. Ein simuliertes "Senden" an einen Server (`js/app.js`, Funktion
   `submitResults()`) — nur Konsolen-Log, kein echter Server angebunden.
2. Ein **automatischer CSV-Download** (`downloadResultsCsv()`) mit Rang,
   Bild-ID, JPEG-Dateigröße und Kommentar pro Bild sowie Level, Session-ID,
   Zeitstempel und allgemeinem Kommentar als Metadaten am Ende der Datei —
   damit sich Rangfolge und Dateigröße direkt gegenüberstellen lassen (z. B.
   in Excel/Numbers), auch ohne echten Server.

**Vor dem produktiven Einsatz** (echte Probandinnen/Probanden) muss
`submitResults()` durch einen echten `fetch()`-Aufruf gegen ein Backend
ersetzt werden (eigener kleiner Server, Google Apps Script Webhook,
Formspree o. Ä.) — unter Berücksichtigung der DSGVO-Anforderungen
(Pseudonymisierung, Speicherort, siehe Exposé). Der CSV-Download kann
parallel dazu bestehen bleiben oder entfernt werden.

## Lokal testen

Da die App `fetch`/Dateizugriffe über `images/` nutzt, am besten über einen
lokalen Server statt `file://` öffnen, z. B.:

```
python -m http.server 8000
```

und dann `http://localhost:8000` im Browser öffnen.

## GitHub Pages

Deployment über GitHub Pages aus dem `main`-Branch (Root). Die Datei
`.nojekyll` verhindert, dass GitHub Pages die Seite unnötig durch Jekyll
verarbeitet.
