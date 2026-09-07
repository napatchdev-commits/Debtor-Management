/**
 =========================================================================
 GOOGLE APPS SCRIPT FOR DEBTOR MANAGEMENT SYSTEM (GOOGLE SHEETS DATABASE)
 =========================================================================
 Instructions:
 1. Open your Google Spreadsheet on Google Drive (https://drive.google.com).
 2. Click "Extensions" (ส่วนขยาย) -> "Apps Script".
 3. Delete any default code in Code.gs, then COPY and PASTE this entire script.
 4. Click Save (💾).
 5. Click "Deploy" (ทำให้ใช้งานได้) -> "New deployment" (การทำให้ใช้งานได้ใหม่).
 6. Select type: "Web app" (เว็บแอป).
 7. Execute as: "Me" (ฉัน).
 8. Who has access: "Anyone" (ทุกคน).
 9. Click "Deploy" and copy the Web App URL (https://script.google.com/macros/s/.../exec).
 =========================================================================
 */

// Table Names & Header Schemas
const SCHEMAS = {
  users: ['id', 'username', 'password', 'name', 'role', 'created_at'],
  debtors: ['id', 'code', 'name', 'phone', 'initial_debt', 'start_date', 'note', 'status', 'created_at', 'updated_at'],
  jobs: ['id', 'debtor_id', 'job_date', 'location', 'description', 'wage', 'advance_withdraw', 'debt_deduction', 'net_wage', 'note', 'created_by', 'created_at', 'updated_at'],
  debt_transactions: ['id', 'debtor_id', 'job_id', 'transaction_date', 'deducted_amount', 'debt_before', 'debt_after', 'created_by', 'created_at'],
  audit_logs: ['id', 'user_id', 'username', 'action', 'details', 'created_at']
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    ensureTablesExist();

    let contents = {};
    if (e && e.postData && e.postData.contents) {
      try {
        contents = JSON.parse(e.postData.contents);
      } catch (err) {
        contents = {};
      }
    }

    const action = (e && e.parameter && e.parameter.action) || contents.action || 'pull';

    if (action === 'pull') {
      return jsonResponse({
        status: 'ok',
        state: fetchFullState()
      });
    }

    if (action === 'run') {
      const result = executeRun(contents);
      return jsonResponse({ status: 'ok', ...result });
    }

    if (action === 'get') {
      const rows = executeGet(contents);
      return jsonResponse({ status: 'ok', data: rows });
    }

    if (action === 'init') {
      return jsonResponse({ status: 'ok', message: 'Spreadsheet initialized successfully', state: fetchFullState() });
    }

    return jsonResponse({ status: 'ok', state: fetchFullState() });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message || String(err) });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureTablesExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMAS).forEach(function(tableName) {
    let sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
    }
    const headers = SCHEMAS[tableName];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
      
      // Default admin user if initializing users table
      if (tableName === 'users') {
        sheet.appendRow([1, 'admin', 'admin123', 'ผู้ดูแลระบบ', 'admin', new Date().toISOString()]);
      }
    }
  });

  // Remove default "Sheet1" or "แผ่น1" if other sheets exist
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
}

function getSheetDataObjects(tableName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const objects = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0 || row[0] === '' || row[0] === null || row[0] === undefined) continue;

    const obj = {};
    headers.forEach(function(header, colIdx) {
      let val = row[colIdx];
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      obj[header] = val;
    });

    if (obj.id !== undefined && obj.id !== null && obj.id !== '') {
      obj.id = Number(obj.id);
    }
    objects.push(obj);
  }

  return objects;
}

function fetchFullState() {
  const debtors = getSheetDataObjects('debtors').map(function(d) {
    const initial = Number(d.initial_debt) || 0;
    return {
      ...d,
      id: Number(d.id),
      initial_debt: initial,
      paid_amount: Number(d.paid_amount) || 0,
      remaining_debt: Number(d.remaining_debt) !== undefined ? Number(d.remaining_debt) : initial
    };
  });

  const jobs = getSheetDataObjects('jobs').map(function(j) {
    return {
      ...j,
      id: Number(j.id),
      debtor_id: Number(j.debtor_id),
      wage: Number(j.wage) || 0,
      advance_withdraw: Number(j.advance_withdraw) || 0,
      debt_deduction: Number(j.debt_deduction) || 0,
      net_wage: Number(j.net_wage) || 0
    };
  });

  const transactions = getSheetDataObjects('debt_transactions').map(function(t) {
    return {
      ...t,
      id: Number(t.id),
      debtor_id: Number(t.debtor_id),
      job_id: Number(t.job_id),
      deducted_amount: Number(t.deducted_amount) || 0,
      debt_before: Number(t.debt_before) || 0,
      debt_after: Number(t.debt_after) || 0
    };
  });

  const users = getSheetDataObjects('users').map(function(u) {
    return { ...u, id: Number(u.id) };
  });

  const audit_logs = getSheetDataObjects('audit_logs').map(function(a) {
    return { ...a, id: Number(a.id) };
  });

  return {
    debtors: debtors,
    jobs: jobs,
    transactions: transactions,
    users: users,
    audit_logs: audit_logs
  };
}

function executeGet(params) {
  const table = params.table;
  const rows = getSheetDataObjects(table);

  if (!params.where) return rows;

  return rows.filter(function(row) {
    return Object.keys(params.where).every(function(key) {
      return String(row[key]) === String(params.where[key]);
    });
  });
}

function executeRun(payload) {
  const type = payload.type; // 'INSERT', 'UPDATE', 'DELETE'
  const table = payload.table;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(table);
  if (!sheet) throw new Error('Sheet not found: ' + table);

  const headers = SCHEMAS[table];

  if (type === 'INSERT') {
    const dataObjects = getSheetDataObjects(table);
    let maxId = 0;
    dataObjects.forEach(function(o) {
      const numId = Number(o.id) || 0;
      if (numId > maxId) maxId = numId;
    });
    const newId = maxId + 1;

    const rowData = payload.data || {};
    rowData.id = newId;
    if (!rowData.created_at) rowData.created_at = new Date().toISOString();

    const rowValues = headers.map(function(h) {
      return rowData[h] !== undefined ? rowData[h] : '';
    });

    sheet.appendRow(rowValues);
    return { lastID: newId, changes: 1 };
  }

  if (type === 'UPDATE') {
    const targetId = Number(payload.id);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    if (values.length <= 1) return { changes: 0 };

    const updateData = payload.data || {};
    let changes = 0;

    for (let r = 1; r < values.length; r++) {
      if (Number(values[r][0]) === targetId) {
        headers.forEach(function(header, c) {
          if (updateData[header] !== undefined) {
            sheet.getRange(r + 1, c + 1).setValue(updateData[header]);
          }
        });
        changes++;
      }
    }
    return { changes: changes };
  }

  if (type === 'DELETE') {
    const field = payload.field || 'id';
    const targetVal = Number(payload.value);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    let deletedCount = 0;

    // Delete from bottom to top to preserve row indexes
    for (let r = values.length - 1; r >= 1; r--) {
      const fieldIdx = headers.indexOf(field);
      const colVal = Number(values[r][fieldIdx >= 0 ? fieldIdx : 0]);
      if (colVal === targetVal) {
        sheet.deleteRow(r + 1);
        deletedCount++;
      }
    }
    return { changes: deletedCount };
  }

  return { changes: 0 };
}
