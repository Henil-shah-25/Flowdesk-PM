/**
 * Flowdesk - Google Apps Script Backend
 * Acts as the high-performance REST/JSON API backed by Google Sheets.
 * Features Server-Side In-Memory Caching (CacheService) and Batch List.
 */

const TOKEN_PROPERTY_KEY = 'FLOWDESK_API_TOKEN';
const CACHE_PREFIX = 'FLOWDESK_CACHE_TAB_';
const CACHE_TTL_SECONDS = 30; // Max 30 seconds for static reference data

// Volatile tables that change constantly across devices and must NEVER be served from a stale multi-minute cache
const VOLATILE_TABS = ['Tasks', 'Projects', 'Stages', 'Subtasks', 'Notes', 'TimeLogs', 'Ideas', 'Leave', 'Messages'];

const SCHEMAS = {
  Projects: ['id', 'parent_id', 'name', 'type', 'color', 'status', 'due_date', 'archived', 'created_at'],
  Departments: ['id', 'project_id', 'parent_id', 'name', 'color', 'enabled', 'order'],
  Stages: ['id', 'department_id', 'project_id', 'name', 'kind', 'color', 'order', 'description', 'wip_limit', 'is_archived', 'created_at', 'updated_at'],
  Tasks: ['id', 'project_id', 'department_id', 'stage_id', 'title', 'description', 'priority', 'estimate_min', 'actual_min', 'due_date', 'order', 'done_at', 'recurring', 'source', 'template_id', 'assignee_id', 'created_at', 'linked_project_id', 'linked_task_id'],
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

function jsonResponse(data, status = 200, executionTimeMs = 0) {
  const output = ContentService.createTextOutput(JSON.stringify({
    status: status === 200 ? 'success' : 'error',
    data: status === 200 ? data : null,
    error: status !== 200 ? data : null,
    execution_time_ms: executionTimeMs,
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

// ─── CACHE SERVICE HELPERS ───
function getCachedTab(tab) {
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get(CACHE_PREFIX + tab);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore cache retrieval failure
  }
  return null;
}

function setCachedTab(tab, data) {
  try {
    const str = JSON.stringify(data);
    // Google CacheService individual item limit is 100KB (102,400 bytes)
    if (str.length < 95000) {
      CacheService.getScriptCache().put(CACHE_PREFIX + tab, str, CACHE_TTL_SECONDS);
    }
  } catch (e) {
    // Ignore cache storage failure
  }
}

function invalidateTabCache(tab) {
  try {
    CacheService.getScriptCache().remove(CACHE_PREFIX + tab);
  } catch (e) {
    // Ignore cache invalidation failure
  }
}

function incrementTabRevision(tab) {
  try {
    const props = PropertiesService.getScriptProperties();
    const current = Number(props.getProperty('REV_' + tab) || 0);
    props.setProperty('REV_' + tab, String(current + 1));
    props.setProperty('LAST_MODIFIED_' + tab, new Date().toISOString());
  } catch (e) {
    // Ignore property failure
  }
}

function actionSyncCheck() {
  const props = PropertiesService.getScriptProperties();
  const revisions = {};
  const lastModified = {};
  Object.keys(SCHEMAS).forEach(tab => {
    revisions[tab] = Number(props.getProperty('REV_' + tab) || 0);
    lastModified[tab] = props.getProperty('LAST_MODIFIED_' + tab) || '';
  });
  return { revisions, lastModified, serverTime: new Date().toISOString() };
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
  const expected = SCHEMAS[tab] || [];
  const existingSet = new Set(validHeaders.map(h => h.toLowerCase()));
  const missing = expected.filter(h => !existingSet.has(h.toLowerCase()));
  if (missing.length > 0) {
    const startCol = validHeaders.length + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    sheet.getRange(1, startCol, 1, missing.length).setFontWeight('bold');
    return [...validHeaders, ...missing];
  }
  return validHeaders.length > 0 ? validHeaders : expected;
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
  const isVolatile = VOLATILE_TABS.includes(tab);

  // Volatile tables (Tasks, Projects, Stages, etc.) must NEVER be served from a stale script cache
  if (!isVolatile) {
    const cached = getCachedTab(tab);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
  }

  const sheet = getSheet(tab);
  const rows = getRowsAsObjects(sheet, tab);
  const cleanRows = rows.map(({ _rowIndex, ...rest }) => rest);
  
  // Only store static reference tables in script cache
  if (!isVolatile) {
    setCachedTab(tab, cleanRows);
  }
  return cleanRows;
}

function actionBatchList(tabs) {
  const tabList = Array.isArray(tabs) ? tabs : Object.keys(SCHEMAS);
  const result = {};
  tabList.forEach(t => {
    if (SCHEMAS[t]) {
      result[t] = actionList(t);
    }
  });
  return result;
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
  
  // Invalidate cache and increment server revision
  invalidateTabCache(tab);
  incrementTabRevision(tab);
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
  
  // Invalidate cache and increment server revision
  invalidateTabCache(tab);
  incrementTabRevision(tab);
  
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
  invalidateTabCache(tab);
  incrementTabRevision(tab);
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
  
  // Invalidate cache and increment server revision
  invalidateTabCache(tab);
  incrementTabRevision(tab);
  return results;
}

function actionBatchDelete(tab, ids) {
  const sheet = getSheet(tab);
  const headers = getSheetHeaders(sheet, tab);
  const rows = getRowsAsObjects(sheet, tab);
  const idSet = new Set((ids || []).map(String));
  
  const remaining = rows.filter(r => !idSet.has(String(r.id)) && !(tab === 'Settings' && idSet.has(String(r.key))));
  const deletedCount = rows.length - remaining.length;
  
  if (deletedCount === 0) {
    return { deleted: 0, ids: ids };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow > 1 && lastCol > 0) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  if (remaining.length > 0) {
    const values = remaining.map(row => headers.map(h => row[h] !== undefined ? row[h] : ''));
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
  }

  // Invalidate cache and increment server revision
  invalidateTabCache(tab);
  incrementTabRevision(tab);
  return { deleted: deletedCount, ids: ids };
}

function handleRequest(action, payload) {
  const { tab, row, id, patch, rows, ids, tabs } = payload;
  
  switch (action) {
    case 'ping':
      return { ok: true };
    case 'syncCheck':
      return actionSyncCheck();
    case 'list':
      return actionList(tab);
    case 'batchList':
      return actionBatchList(tabs);
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
  const startTime = new Date().getTime();
  try {
    const params = (e && e.parameter) || {};
    const token = params.token;
    
    const auth = validateAuth(token);
    if (!auth.ok) {
      return jsonResponse(auth.error, 401, new Date().getTime() - startTime);
    }
    
    const action = params.action || 'list';
    const payload = {
      tab: params.tab,
      id: params.id,
      tabs: params.tabs ? params.tabs.split(',') : undefined
    };
    
    const result = handleRequest(action, payload);
    return jsonResponse(result, 200, new Date().getTime() - startTime);
  } catch (err) {
    return jsonResponse(err.message || String(err), 500, new Date().getTime() - startTime);
  }
}

/**
 * Main POST entrypoint.
 * Using text/plain payload to avoid CORS preflight options.
 */
function doPost(e) {
  const startTime = new Date().getTime();
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return jsonResponse('Invalid JSON body: ' + parseErr.message, 400, new Date().getTime() - startTime);
      }
    } else if (e && e.parameter) {
      body = e.parameter;
    }
    
    const token = body.token || (e && e.parameter && e.parameter.token);
    const auth = validateAuth(token);
    if (!auth.ok) {
      return jsonResponse(auth.error, 401, new Date().getTime() - startTime);
    }
    
    const action = body.action;
    if (!action) {
      return jsonResponse('Missing "action" parameter', 400, new Date().getTime() - startTime);
    }
    
    const result = handleRequest(action, body);
    return jsonResponse(result, 200, new Date().getTime() - startTime);
  } catch (err) {
    return jsonResponse(err.message || String(err), 500, new Date().getTime() - startTime);
  }
}
