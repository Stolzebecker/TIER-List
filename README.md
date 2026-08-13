# TIER-List — Rangreihenverfahren

Kleine Web-Anwendung für das Rangreihenverfahren (Tier-List-Übung) im Rahmen
der Experteninterviews/Pilotphase von Julian Stolz' Promotion (PH Heidelberg,
visuelle Komplexität von Fernerkundungsbildern).

Probandinnen und Probanden ziehen 12 Satellitenbilder per Drag & Drop von der
Bilder-Ablage (unten) in eine eindeutige Rangfolge (oben, Rang 1 = links).
Jedes Bild lässt sich über die Lupe vergrößern. Rechts können ein
allgemeiner Kommentar sowie ein Kommentar pro ausgewähltem Bild hinterlegt
werden.

## Bildauswahl

Die 12 Bilder wurden aus dem 36 Bilder umfassenden Sentinel-2-Pool (siehe
`../Satellitenbilder/`) so ausgewählt, dass die JPEG-Dateigröße (Proxy für
visuelle Komplexität, siehe Fortschrittsdokumentation Bildakquise) möglichst
gleichmäßig über das gesamte Spektrum verteilt ist — bewusste/purposive
Stichprobe, keine Zufallsauswahl:

| Bild | JPEG-Größe (Byte) |
|---|---|
| IMG_00036 | 84.596 |
| IMG_00027 | 88.560 |
| IMG_00021 | 93.217 |
| IMG_00002 | 106.114 |
| IMG_00014 | 107.432 |
| IMG_00019 | 110.361 |
| IMG_00011 | 121.988 |
| IMG_00008 | 130.472 |
| IMG_00033 | 141.188 |
| IMG_00020 | 153.174 |
| IMG_00018 | 167.870 |
| IMG_00001 | 190.644 |

## Datenerfassung — aktuell nur Platzhalter

Die Seite ist eine rein statische Anwendung (HTML/CSS/JS, kein Build-Schritt)
für GitHub Pages und hat **keinen eigenen Server**. Beim Abschluss einer
Bewertung wird das Ergebnis (Rangfolge, Bild- und allgemeine Kommentare)
aktuell nur simuliert "gesendet" und in der Browser-Konsole ausgegeben
(`js/app.js`, Funktion `submitResults()`), sonst gehen die Daten beim
Schließen der Seite verloren.

**Vor dem produktiven Einsatz** muss `submitResults()` durch einen echten
`fetch()`-Aufruf gegen ein Backend ersetzt werden (eigener kleiner Server,
Google Apps Script Webhook, Formspree o. Ä.) — unter Berücksichtigung der
DSGVO-Anforderungen (Pseudonymisierung, Speicherort, siehe Exposé).

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
