/**
 =========================================================================
 GOOGLE APPS SCRIPT FOR DEBTOR MANAGEMENT SYSTEM (GOOGLE SHEETS DATABASE 100%)
 =========================================================================
 
 📌 วิธีใส่ข้อมูลลงชีตทันทีใน 10 วินาที:
 1. ในหน้าต่าง Apps Script นี้ ด้านบนจะมีช่องเลือกฟังก์ชัน (ข้างปุ่ม "เรียกใช้" หรือ "Run")
 2. เลือกฟังก์ชันชื่อ: "INITIALIZE_NOW"
 3. กดปุ่ม "เรียกใช้" (Run) 1 ครั้ง -> กดยอมรับสิทธิ์ (Review permissions -> Allow)
 4. กลับไปดูที่ Google Sheet ข้อมูลลูกหนี้และบันทึกงาน 21 รายการจะขึ้นในชีตทันที!
 
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

// Initial Seed Data (Original System Data from Excel)
const INITIAL_SEED = {
  users: [
    [1, 'admin', 'admin123', 'ผู้ดูแลระบบ', 'admin', '2026-05-01T00:00:00.000Z'],
    [2, 'NaphatDev', 'admin123', 'NaphatDev', 'admin', '2026-05-01T00:00:00.000Z']
  ],
  debtors: [
    [1, 'DB-001', 'นรรฐพล กาบแก้ว', '081-234-5678', 358500, '2026-05-01', 'ลูกหนี้งานหักค่าแรงประจำ', 'active', '2026-05-01T00:00:00.000Z', '2026-09-03T00:00:00.000Z']
  ],
  jobs: [
    [1, 1, '2026-09-03', 'จัดงานธรรมศาสตร์', 'จัดงาน rxtu 2ภาค', 2000, 0, 2000, 0, '', 1, '2026-09-03T00:00:00.000Z', '2026-09-03T00:00:00.000Z'],
    [2, 1, '2026-09-02', 'จัดงานลาดกระบัง', 'จัดงาน 4ภาค', 1500, 0, 1500, 0, '', 1, '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'],
    [3, 1, '2026-08-28', 'วัดปากบ่อ', 'จัดงานบวช', 1000, 0, 1000, 0, '', 1, '2026-08-28T00:00:00.000Z', '2026-08-28T00:00:00.000Z'],
    [4, 1, '2026-08-21', 'จัดงานขึ้นบ้านใหม่', 'ฉากงานขึ้นบ้านใหม่', 1500, 0, 1500, 0, '', 1, '2026-08-21T00:00:00.000Z', '2026-08-21T00:00:00.000Z'],
    [5, 1, '2026-08-14', 'จัดงานแต่งร้านส้มแก้ว', 'จัดฉากงานแต่ง', 1000, 0, 1000, 0, '', 1, '2026-08-14T00:00:00.000Z', '2026-08-14T00:00:00.000Z'],
    [6, 1, '2026-07-31', 'จัดงานมหาวิทยาลัยกรุงเทพธนบุรี', 'จัดงานเกษียณ', 1500, 0, 1500, 0, '', 1, '2026-07-31T00:00:00.000Z', '2026-07-31T00:00:00.000Z'],
    [7, 1, '2026-07-23', 'วัดงานวัดส้ม', 'จัดงานบวช', 1500, 1000, 500, 0, '', 1, '2026-07-23T00:00:00.000Z', '2026-07-23T00:00:00.000Z'],
    [8, 1, '2026-07-17', 'จัดงานบวชศาลายา', 'จัดงานบวชด่วน', 1500, 500, 1000, 0, '', 1, '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z'],
    [9, 1, '2026-07-17', 'งานทำบุญบ้านสมุทรสาคร', 'จัดงานทำบุญบ้าน', 1500, 0, 1500, 0, '', 1, '2026-07-17T00:00:00.000Z', '2026-07-17T00:00:00.000Z'],
    [10, 1, '2026-07-16', 'วัดงานบวชราชดำเนิน', 'จัดงานบวช', 1500, 0, 1500, 0, '', 1, '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'],
    [11, 1, '2026-07-09', 'สิงห์ เบเวอเรช', 'จัดพิธีส่งงานทำบุญ', 1000, 0, 1000, 0, '', 1, '2026-07-09T00:00:00.000Z', '2026-07-09T00:00:00.000Z'],
    [12, 1, '2026-07-04', 'วัดปากน้ำฝั่งใต้', 'จัดงานบวช', 1500, 0, 1500, 0, '', 1, '2026-07-04T00:00:00.000Z', '2026-07-04T00:00:00.000Z'],
    [13, 1, '2026-06-19', 'งานบวชหนองหล่ม', 'จัดงานบวชหนองหล่ม', 1500, 0, 1500, 0, '', 1, '2026-06-19T00:00:00.000Z', '2026-06-19T00:00:00.000Z'],
    [14, 1, '2026-06-08', 'สิงห์ เบเวอเรช', 'จัดฉากงาน QCC', 1000, 0, 1000, 0, '', 1, '2026-06-08T00:00:00.000Z', '2026-06-08T00:00:00.000Z'],
    [15, 1, '2026-06-05', 'งานบวชวัดบางโฉลง', 'จัดงานบวชวัดบางโฉลง', 1500, 0, 1500, 0, '', 1, '2026-06-05T00:00:00.000Z', '2026-06-05T00:00:00.000Z'],
    [16, 1, '2026-05-23', 'งาน bynior', 'จัดงานรับปริญญา', 1000, 0, 1000, 0, '', 1, '2026-05-23T00:00:00.000Z', '2026-05-23T00:00:00.000Z'],
    [17, 1, '2026-05-21', 'จัดงานบวชนพรรณ', 'จัดงานบวชสุพรรณบุรี', 1500, 0, 1500, 0, '', 1, '2026-05-21T00:00:00.000Z', '2026-05-21T00:00:00.000Z'],
    [18, 1, '2026-05-16', 'จัดงานบวชวัดกู้', 'จัดงานบวชวัดประสิทธิ์ อยุธยา', 1500, 0, 1500, 0, '', 1, '2026-05-16T00:00:00.000Z', '2026-05-16T00:00:00.000Z'],
    [19, 1, '2026-05-15', 'จัดงานบวชวัดชลนที', 'ฉากถ่ายรูป1ภาค', 1000, 0, 1000, 0, '', 1, '2026-05-15T00:00:00.000Z', '2026-05-15T00:00:00.000Z'],
    [20, 1, '2026-05-08', 'จัดงานบวช นครปฐม', 'จัดงานบวช นครปฐม', 1500, 0, 1500, 0, '', 1, '2026-05-08T00:00:00.000Z', '2026-05-08T00:00:00.000Z'],
    [21, 1, '2026-05-07', 'บวชบางโทรัด', 'จัดงานบวช', 1500, 0, 1500, 0, '', 1, '2026-05-07T00:00:00.000Z', '2026-05-07T00:00:00.000Z']
  ]
};

/**
 * 👉 ฟังก์ชันสร้างและใส่ข้อมูลลงชีตทันที (คลิกปุ่ม "เรียกใช้" / "Run" เพื่อรันฟังก์ชันนี้)
 */
function INITIALIZE_NOW() {
  ensureTablesExist(true);
  SpreadsheetApp.getActiveSpreadsheet().toast('สร้างตารางและบันทึกข้อมูลลูกหนี้เรียบร้อยแล้ว!', 'สำเร็จ', 5);
}

function onOpen() {
  ensureTablesExist();
}

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
    if (e && e.parameter && e.parameter.payload) {
      try {
        contents = JSON.parse(decodeURIComponent(e.parameter.payload));
      } catch (err) {
        try { contents = JSON.parse(e.parameter.payload); } catch (e2) {}
      }
    } else if (e && e.postData && e.postData.contents) {
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

    if (action === 'push') {
      const state = contents.state || {};
      if (state.debtors && Array.isArray(state.debtors)) writeTableData('debtors', state.debtors);
      if (state.jobs && Array.isArray(state.jobs)) writeTableData('jobs', state.jobs);
      if (state.transactions && Array.isArray(state.transactions)) writeTableData('debt_transactions', state.transactions);
      return jsonResponse({ status: 'ok', message: 'Data pushed to Google Sheets successfully', state: fetchFullState() });
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
      ensureTablesExist(true);
      return jsonResponse({ status: 'ok', message: 'Spreadsheet initialized successfully with seed data', state: fetchFullState() });
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

function ensureTablesExist(forcePopulate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMAS).forEach(function(tableName) {
    let sheet = ss.getSheetByName(tableName);
    if (!sheet) {
      sheet = ss.insertSheet(tableName);
    }
    const headers = SCHEMAS[tableName];
    const lastRow = sheet.getLastRow();

    if (lastRow === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    }

    if (lastRow <= 1 || forcePopulate) {
      if (forcePopulate && lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
      }
      if (INITIAL_SEED[tableName] && INITIAL_SEED[tableName].length > 0) {
        INITIAL_SEED[tableName].forEach(function(row) {
          sheet.appendRow(row);
        });
      }
    }
  });

  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
}

function writeTableData(tableName, items) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  if (!sheet) sheet = ss.insertSheet(tableName);

  const headers = SCHEMAS[tableName];
  sheet.clearContents();
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');

  items.forEach(function(item) {
    const rowValues = headers.map(function(h) {
      return item[h] !== undefined ? item[h] : '';
    });
    sheet.appendRow(rowValues);
  });
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
  const type = payload.type;
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
