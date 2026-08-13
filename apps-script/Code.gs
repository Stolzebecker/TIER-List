/**
 * Empfaengt die Ergebnisse der Rangreihenverfahren-Mini-App (TIER-List) per
 * POST und schreibt sie zeilenweise (ein Bild pro Zeile) in das aktive
 * Google Sheet. Nicht direkt ausfuehren -- wird ueber die Web-App-URL vom
 * Browser der Probandin/des Probanden aufgerufen (siehe README fuer die
 * Deployment-Schritte).
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getOrCreateSheet_();
    ensureHeader_(sheet);

    var order = data.order || [];
    order.forEach(function (imageId, i) {
      sheet.appendRow([
        new Date(),
        data.timestamp || "",
        data.level || "",
        data.sessionId || "",
        i + 1,
        imageId,
        (data.imageSizes && data.imageSizes[imageId] != null) ? data.imageSizes[imageId] : "",
        (data.imageComments && data.imageComments[imageId]) || "",
        data.generalComment || "",
      ]);
    });

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, rows: order.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Ergebnisse");
  if (!sheet) sheet = ss.insertSheet("Ergebnisse");
  return sheet;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    "empfangen_am", "timestamp_client", "level", "session_id",
    "rank", "image_id", "jpeg_filesize_bytes", "comment", "general_comment",
  ]);
}
