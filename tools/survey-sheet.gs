/**
 * Ohmpere survey receiver (Google Apps Script).
 * Writes residents' survey answers to the "Residents" tab and building questionnaires
 * to the "Buildings" tab of the "Ohmpere surveys" Google Sheet (SHEET_ID below).
 * New questions get their own column automatically.
 *
 * Setup: see "Surveys" in the repository README.
 */
var SHEET_ID = "1yNNgNrAwZa9msYAaBgIVjgvvPjUUVIeFE5P3kikjX2g";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var p = (e && e.parameter) || {};
    var data = JSON.parse(p.payload || "{}");
    var tab = p.form === "building" ? "Buildings" : "Residents";
    var ss = SpreadsheetApp.openById(SHEET_ID);
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
    SpreadsheetApp.flush(); // make sure the header row is written before choosing the next row
    var next = Math.max(sh.getLastRow(), 1) + 1;
    sh.getRange(next, 1, 1, row.length).setValues([row]);
    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Ohmpere survey receiver is running.");
}

/** Run once from the editor: creates the two tabs and removes the empty default one. */
function setup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ["Residents", "Buildings"].forEach(function (n) {
    if (!ss.getSheetByName(n)) ss.insertSheet(n);
  });
  var s1 = ss.getSheetByName("Sheet1");
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);
}
