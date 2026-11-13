/**
 * Ohmpere survey receiver (Google Apps Script).
 * Writes residents' survey answers to the "Residents" tab and building questionnaires
 * to the "Buildings" tab of the Google Sheet this script is attached to.
 * New questions get their own column automatically.
 *
 * Setup: see "Surveys" in the repository README.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = (e && e.parameter) || {};
    var data = JSON.parse(p.payload || "{}");
    var tab = p.form === "building" ? "Buildings" : "Residents";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(tab) || ss.insertSheet(tab);

    var lastCol = sh.getLastColumn();
    var headers = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    Object.keys(data).forEach(function (k) {
      if (headers.indexOf(k) === -1) headers.push(k);
    });
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sh.setFrozenRows(1);

    var row = headers.map(function (h) {
      var v = data[h] == null ? "" : String(data[h]);
      return /^[=+\-@]/.test(v) ? "'" + v : v; // stop formulas being injected
    });
    sh.appendRow(row);
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Ohmpere survey receiver is running.");
}
