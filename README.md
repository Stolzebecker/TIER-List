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
Bewertung (pro Level) passiert zweierlei:

1. **Übermittlung an eine zentrale Google-Tabelle** über eine Google-Apps-
   Script-Web-App (`apps-script/Code.gs`, siehe Einrichtung unten) — jedes
   Bild der Rangfolge landet als eigene Zeile (Rang, Bild-ID, JPEG-
   Dateigröße, Kommentar, Level, Session-ID, Zeitstempel, allgemeiner
   Kommentar) in einem Sheet, das nur du siehst. Solange die Web-App-URL
   noch nicht eingetragen ist (`SUBMIT_URL` in `js/app.js`), läuft das im
   Dummy-Modus: nur Konsolen-Log, keine echte Übermittlung.
2. Zusätzlich immer ein **automatischer CSV-Download** (`downloadResultsCsv()`)
   mit denselben Daten für den lokalen Schnellblick — unabhängig davon, ob
   die Google-Tabelle erreichbar ist.

### Einrichtung der Google-Tabelle (einmalig, ca. 10 Minuten)

1. Neues Google Sheet anlegen (sheets.new).
2. **Erweiterungen → Apps Script** öffnen, den Beispielcode löschen und den
   Inhalt von [`apps-script/Code.gs`](apps-script/Code.gs) einfügen. Speichern.
3. **Bereitstellen → Neue Bereitstellung → Typ: Web-App**.
   - Ausführen als: **Ich** (dein Google-Konto)
   - Zugriff: **Jeder** ("Anyone") — wichtig, sonst verlangt Apps Script
     einen Google-Login von jeder Probandin/jedem Probanden und die App
     bekommt einen Redirect statt einer Antwort.
4. Bereitstellen, die generierte **Web-App-URL** kopieren (endet auf `/exec`).
5. Diese URL in `js/app.js` bei `const SUBMIT_URL = "";` eintragen.
6. Beim ersten echten Aufruf fragt Google einmalig nach Berechtigung für
   das Script (Zugriff aufs eigene Sheet) — das bestätigst du einmalig in
   deinem eigenen Google-Konto, nicht die Probandinnen/Probanden.

**DSGVO-Hinweis:** Die Tabelle liegt in deinem Google-Konto/-Workspace —
für den produktiven Feldeinsatz (echte Teilnehmende) prüfen, ob das mit
eurer DSGVO-Dokumentation (Auftragsverarbeitung durch Google, Speicherort)
vereinbar ist, analog zur bereits im Exposé mitgedachten
Pseudonymisierung/Speicherort-Frage.

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
