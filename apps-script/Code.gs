/**
 * Flowdesk - Google Apps Script Backend
 * Acts as the REST/JSON API backed by Google Sheets.
 */

const TOKEN_PROPERTY_KEY = 'FLOWDESK_API_TOKEN';

const SCHEMAS = {
  Projects: ['id', 'parent_id', 'name', 'type', 'color', 'status', 'due_date', 'archived', 'created_at'],
  Departments: ['id', 'project_id', 'parent_id', 'name', 'color', 'enabled', 'order'],
  Stages: ['id', 'department_id', 'name', 'kind', 'color', 'order'],
  Tasks: ['id', 'project_id', 'department_id', 'stage_id', 'title', 'description', 'priority', 'estimate_min', 'actual_min', 'due_date', 'order', 'done_at', 'recurring', 'source', 'template_id', 'created_at'],
  Ideas: ['id', 'title', 'body', 'color', 'x', 'y', 'w', 'h', 'rotation', 'z', 'status', 'project_id', 'department_id', 'stage_id', 'created_at'],
  TimeLogs: ['id', 'task_id', 'project_id', 'mode', 'start', 'end', 'duration_min'],
  Templates: ['id', 'department_name', 'sub_name', 'group_name', 'task_title', 'description', 'priority', 'estimate_min', 'order', 'subtasks'],
  Subtasks: ['id', 'task_id', 'title', 'done', 'order', 'created_at'],
  Notes: ['id', 'task_id', 'body', 'created_at'],
  Settings: ['key', 'value'],
  Teams: ['id', 'name', 'color', 'description', 'created_at'],
  Members: ['id', 'team_id', 'name', 'email', 'role', 'avatar', 'created_at'],
  Messages: ['id', 'channel_id', 'sender_id', 'sender_name', 'content', 'created_at'],
  Leave: ['id', 'member_id', 'type', 'start_date', 'end_date', 'status', 'reason', 'created_at']
};

/**
 * Initializes all required tabs with header rows if they do not exist.
 * Adds any missing columns to existing tabs at the end without deleting data,
 * reordering columns, or clearing rows.
 * Run this function once from the Apps Script editor.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.keys(SCHEMAS).forEach(tabName => {
    let sheet = ss.getSheetByName(tabName);
    const expectedHeaders = SCHEMAS[tabName];
    
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const currentHeaders = (lastRow > 0 && lastCol > 0)
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim())
      : [];
      
    const nonEmptyHeaders = currentHeaders.filter(Boolean);
    if (nonEmptyHeaders.length === 0) {
      // Empty sheet - initialize with schema headers
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else {
      // Existing sheet with data - add missing columns to the end without deleting data, reordering, or clearing rows
      const existingSet = new Set(currentHeaders.map(h => h.toLowerCase()));
      const missingHeaders = expectedHeaders.filter(h => !existingSet.has(h.toLowerCase()));
      
      if (missingHeaders.length > 0) {
        const startCol = currentHeaders.length + 1;
        sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
        sheet.getRange(1, startCol, 1, missingHeaders.length).setFontWeight('bold');
      }
      sheet.setFrozenRows(1);
    }
  });

  // Remove default "Sheet1" if empty and extra tabs exist
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1 && sheet1.getLastRow() === 0) {
    try {
      ss.deleteSheet(sheet1);
    } catch (e) {
      // Ignore if sheet cannot be deleted
    }
  }

  Logger.log('Flowdesk setup completed successfully.');
}

/**
 * Helper to set or update API token in Script Properties.
 */
function setApiToken(token) {
  PropertiesService.getScriptProperties().setProperty(TOKEN_PROPERTY_KEY, token);
  Logger.log('Token saved successfully.');
}

function getExpectedToken() {
  return PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY_KEY);
}

function jsonResponse(data, status = 200) {
  const output = ContentService.createTextOutput(JSON.stringify({
    status: status === 200 ? 'success' : 'error',
    data: status === 200 ? data : null,
    error: status !== 200 ? data : null,
    timestamp: new Date().toISOString()
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function validateAuth(token) {
  const expected = getExpectedToken();
  if (!expected) {
    return { ok: false, error: 'FLOWDESK_API_TOKEN is not set in Script Properties.' };
  }
  if (!token || token !== expected) {
    return { ok: false, error: 'Unauthorized: Invalid or missing token.' };
  }
  return { ok: true };
}

function getSheet(tab) {
  if (!SCHEMAS[tab]) {
    throw new Error('Invalid tab name: ' + tab);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tab);
  if (!sheet) {
    throw new Error('Tab not found in spreadsheet: ' + tab);
  }
  return sheet;
}

function getSheetHeaders(sheet, tab) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    return SCHEMAS[tab] || [];
  }
  const rowHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const validHeaders = rowHeaders.filter(Boolean);
  return validHeaders.length > 0 ? rowHeaders : (SCHEMAS[tab] || []);
}

function getRowsAsObjects(sheet, tab) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) {
    return [];
  }
  
  const headers = getSheetHeaders(sheet, tab);
  const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  
  return data.map((row, rowIndex) => {
    const obj = { _rowIndex: rowIndex + 2 };
    headers.forEach((h, colIndex) => {
      if (h) {
        let val = row[colIndex];
        if (val instanceof Date) {
          val = val.toISOString();
        }
        obj[h] = val;
      }
    });
    return obj;
  });
}

function actionList(tab) {
  const sheet = getSheet(tab);
  const rows = getRowsAsObjects(sheet, tab);
  // remove internal _rowIndex before returning
  return rows.map(({ _rowIndex, ...rest }) => rest);
}

function actionCreate(tab, row) {
  const sheet = getSheet(tab);
  const headers = getSheetHeaders(sheet, tab);
  
  const newRow = { ...row };
  if (!newRow.id) {
    newRow.id = Utilities.getUuid();
  }
  if (headers.includes('created_at') && !newRow.created_at) {
    newRow.created_at = new Date().toISOString();
  }
  
  const rowValues = headers.map(h => newRow[h] !== undefined ? newRow[h] : '');
  sheet.appendRow(rowValues);
  
  return newRow;
}

function actionUpdate(tab, id, patch) {
  const sheet = getSheet(tab);
  const headers = getSheetHeaders(sheet, tab);
  const rows = getRowsAsObjects(sheet, tab);
  
  const target = rows.find(r => String(r.id) === String(id) || (tab === 'Settings' && String(r.key) === String(id)));
  if (!target) {
    throw new Error('Record not found with ID: ' + id);
  }
  
  const updated = { ...target, ...patch, id: target.id || id };
  const rowIndex = target._rowIndex;
  const rowValues = headers.map(h => updated[h] !== undefined ? updated[h] : '');
  
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  
  const { _rowIndex, ...cleanUpdated } = updated;
  return cleanUpdated;
}

function actionDelete(tab, id) {
  const sheet = getSheet(tab);
  const rows = getRowsAsObjects(sheet, tab);
  
  const target = rows.find(r => String(r.id) === String(id) || (tab === 'Settings' && String(r.key) === String(id)));
  if (!target) {
    throw new Error('Record not found with ID: ' + id);
  }
  
  sheet.deleteRow(target._rowIndex);
  return { deleted: true, id: id };
}

function actionBatchUpdate(tab, rows) {
  const sheet = getSheet(tab);
  const headers = getSheetHeaders(sheet, tab);
  const existingRows = getRowsAsObjects(sheet, tab);
  
  const existingMap = new Map();
  existingRows.forEach(r => {
    const key = tab === 'Settings' ? String(r.key) : String(r.id);
    existingMap.set(key, r);
  });
  
  const results = [];
  const toAppend = [];
  
  rows.forEach(item => {
    const key = tab === 'Settings' ? String(item.key) : String(item.id);
    if (key && existingMap.has(key)) {
      const existing = existingMap.get(key);
      const merged = { ...existing, ...item };
      const rowValues = headers.map(h => merged[h] !== undefined ? merged[h] : '');
      sheet.getRange(existing._rowIndex, 1, 1, headers.length).setValues([rowValues]);
      const { _rowIndex, ...clean } = merged;
      results.push(clean);
    } else {
      const newItem = { ...item };
      if (!newItem.id && tab !== 'Settings') {
        newItem.id = Utilities.getUuid();
      }
      if (headers.includes('created_at') && !newItem.created_at) {
        newItem.created_at = new Date().toISOString();
      }
      toAppend.push(newItem);
      results.push(newItem);
    }
  });
  
  if (toAppend.length > 0) {
    const valuesToAppend = toAppend.map(item => headers.map(h => item[h] !== undefined ? item[h] : ''));
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, valuesToAppend.length, headers.length).setValues(valuesToAppend);
  }
  
  return results;
}

function actionBatchDelete(tab, ids) {
  const sheet = getSheet(tab);
  const rows = getRowsAsObjects(sheet, tab);
  const idSet = new Set((ids || []).map(String));
  
  // Find rows to delete (matching ids), delete from bottom up to avoid index shifting
  const rowsToDelete = rows
    .filter(r => idSet.has(String(r.id)) || (tab === 'Settings' && idSet.has(String(r.key))))
    .sort((a, b) => b._rowIndex - a._rowIndex);
    
  rowsToDelete.forEach(r => {
    sheet.deleteRow(r._rowIndex);
  });
  
  return { deleted: rowsToDelete.length, ids: ids };
}

function handleRequest(action, payload) {
  const { tab, row, id, patch, rows, ids } = payload;
  
  switch (action) {
    case 'ping':
      return { ok: true };
    case 'list':
      return actionList(tab);
    case 'create':
      return actionCreate(tab, row);
    case 'update':
      return actionUpdate(tab, id, patch);
    case 'delete':
      return actionDelete(tab, id);
    case 'batchUpdate':
      return actionBatchUpdate(tab, rows);
    case 'batchDelete':
      return actionBatchDelete(tab, ids || payload.row_ids || []);
    default:
      throw new Error('Unknown action: ' + action);
  }
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const token = params.token;
    
    const auth = validateAuth(token);
    if (!auth.ok) {
      return jsonResponse(auth.error, 401);
    }
    
    const action = params.action || 'list';
    const payload = {
      tab: params.tab,
      id: params.id
    };
    
    const result = handleRequest(action, payload);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse(err.message || String(err), 500);
  }
}

/**
 * Main POST entrypoint.
 * Using text/plain payload to avoid CORS preflight options.
 */
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return jsonResponse('Invalid JSON body: ' + parseErr.message, 400);
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    
    const token = body.token || (e && e.parameter && e.parameter.token);
    const auth = validateAuth(token);
    if (!auth.ok) {
      return jsonResponse(auth.error, 401);
    }
    
    const action = body.action;
    if (!action) {
      return jsonResponse('Missing "action" parameter', 400);
    }
    
    const result = handleRequest(action, body);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse(err.message || String(err), 500);
  }
}
