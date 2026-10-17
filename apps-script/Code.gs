/**
 * Kraken Shift Tracker — Google Sheets backend.
 * Paste this into Extensions > Apps Script of your Google Sheet, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone with the link).
 * Copy the deployment URL into NEXT_PUBLIC_SHEETS_WEBAPP_URL in the app's env.
 */

var PLAYERS_SHEET = "Players";
var GAMES_SHEET = "Games";
var SHIFTS_SHEET = "Shifts";

// Run this once from the Apps Script editor (select "setupSheets" in the
// function dropdown, click Run) to create the Players, Games, and Shifts
// tabs with their column headers right away. Not required — each tab is
// also created automatically the first time the app uses it — but handy if
// you want to see the sheet structure before you start using the app.
function setupSheets() {
  playersSheet_();
  gamesSheet_();
  shiftsSheet_();
}

function getSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

// Columns are looked up by header name rather than fixed position, and
// missing columns are created on the fly — sheets that predate a given
// column self-heal the first time they're read or written.
function ensureColumn_(sheet, header) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = headers.indexOf(header);
  if (idx !== -1) return idx + 1;
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue(header);
  return col;
}

function setCell_(sheet, row, col, header, value) {
  var cell = sheet.getRange(row, col);
  if (header === "Date") cell.setNumberFormat("@");
  cell.setValue(value);
}

function appendRowByHeaders_(sheet, valuesByHeader) {
  var row = sheet.getLastRow() + 1;
  Object.keys(valuesByHeader).forEach(function (header) {
    var col = ensureColumn_(sheet, header);
    setCell_(sheet, row, col, header, valuesByHeader[header]);
  });
}

function setRowByHeaders_(sheet, row, valuesByHeader) {
  Object.keys(valuesByHeader).forEach(function (header) {
    var col = ensureColumn_(sheet, header);
    setCell_(sheet, row, col, header, valuesByHeader[header]);
  });
}

function playersSheet_() {
  return getSheet_(PLAYERS_SHEET, ["Id", "Name", "Number", "IsGoalie", "CreatedAt"]);
}

function gamesSheet_() {
  return getSheet_(GAMES_SHEET, [
    "Id",
    "Date",
    "ShiftSize",
    "PresentPlayerIds",
    "GoalieId",
    "Status",
    "CreatedAt",
  ]);
}

function shiftsSheet_() {
  return getSheet_(SHIFTS_SHEET, ["Id", "GameId", "ShiftNumber", "Players", "Timestamp"]);
}

function newId_() {
  return Utilities.getUuid();
}

function rowsToObjects_(data) {
  if (data.length < 2) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

function findRowById_(sheet, id) {
  var data = sheet.getDataRange().getValues();
  var idCol = data[0].indexOf("Id");
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) return i + 1;
  }
  return -1;
}

function doGet(e) {
  var action = e.parameter.action;
  var result;
  if (action === "players") {
    result = rowsToObjects_(playersSheet_().getDataRange().getValues());
  } else if (action === "games") {
    result = rowsToObjects_(gamesSheet_().getDataRange().getValues());
  } else if (action === "shifts") {
    var all = rowsToObjects_(shiftsSheet_().getDataRange().getValues());
    if (e.parameter.gameId) {
      all = all.filter(function (row) {
        return String(row.GameId) === String(e.parameter.gameId);
      });
    }
    result = all;
  } else {
    result = { error: "unknown action" };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var result;

  if (body.action === "addPlayer") {
    var id = newId_();
    appendRowByHeaders_(playersSheet_(), {
      Id: id,
      Name: body.name,
      Number: body.number || "",
      IsGoalie: !!body.isGoalie,
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true, id: id };
  } else if (body.action === "updatePlayer") {
    var pSheet = playersSheet_();
    var pRow = findRowById_(pSheet, body.id);
    if (pRow === -1) {
      result = { error: "player not found" };
    } else {
      var pUpdates = {};
      if (body.name !== undefined) pUpdates.Name = body.name;
      if (body.number !== undefined) pUpdates.Number = body.number;
      if (body.isGoalie !== undefined) pUpdates.IsGoalie = !!body.isGoalie;
      setRowByHeaders_(pSheet, pRow, pUpdates);
      result = { ok: true };
    }
  } else if (body.action === "deletePlayer") {
    var pSheet2 = playersSheet_();
    var pRow2 = findRowById_(pSheet2, body.id);
    if (pRow2 === -1) {
      result = { error: "player not found" };
    } else {
      pSheet2.deleteRow(pRow2);
      result = { ok: true };
    }
  } else if (body.action === "startGame") {
    var gId = newId_();
    appendRowByHeaders_(gamesSheet_(), {
      Id: gId,
      Date: body.date,
      ShiftSize: body.shiftSize,
      PresentPlayerIds: (body.presentPlayerIds || []).join(","),
      GoalieId: body.goalieId || "",
      Status: "in_progress",
      CreatedAt: new Date().toISOString(),
    });
    result = { ok: true, id: gId };
  } else if (body.action === "logShift") {
    var sId = newId_();
    appendRowByHeaders_(shiftsSheet_(), {
      Id: sId,
      GameId: body.gameId,
      ShiftNumber: body.shiftNumber,
      Players: (body.playerNames || []).join(","),
      Timestamp: new Date().toISOString(),
    });
    result = { ok: true, id: sId };
  } else if (body.action === "endGame") {
    var gSheet = gamesSheet_();
    var gRow = findRowById_(gSheet, body.gameId);
    if (gRow === -1) {
      result = { error: "game not found" };
    } else {
      setRowByHeaders_(gSheet, gRow, { Status: "completed" });
      result = { ok: true };
    }
  } else {
    result = { error: "unknown action" };
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}
