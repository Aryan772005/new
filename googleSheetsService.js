const { google } = require('googleapis');
const { db } = require('./db');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const REGISTRATIONS_HEADERS = [
  'Registration ID', 'Registration Date', 'Category', 'Game', 'Registration Type',
  'Team Name', 'College', 'Captain Name', 'Captain Email', 'Captain Phone',
  'Player Count', 'Amount Paid (Rs)', 'Currency', 'Payment Method', 'Payment Status',
  'UTR / Transaction ID', 'Payment Screenshot', 'Submitted At', 'Verified At',
  'Verified By', 'Registration Status', 'Created At', 'Confirmed At'
];

const GAMING_HEADERS = [
  'Registration ID', 'Registration Date', 'Game', 'Team Name', 'College',
  'Captain Name', 'Captain Email', 'Captain Phone',
  'Player 1 Name', 'Player 1 IGN', 'Player 1 UID',
  'Player 2 Name', 'Player 2 IGN', 'Player 2 UID',
  'Player 3 Name', 'Player 3 IGN', 'Player 3 UID',
  'Player 4 Name', 'Player 4 IGN', 'Player 4 UID',
  'Player 5 Name', 'Player 5 IGN', 'Player 5 UID',
  'Total Players', 'Amount Paid (Rs)', 'Payment Method', 'Payment Status',
  'UTR / Transaction ID', 'Registration Status', 'Confirmed At'
];

const HACKATHON_HEADERS = [
  'Registration ID', 'Registration Date', 'Team Name', 'College', 'Primary Track',
  'Team Leader Name', 'Team Leader Email', 'Team Leader Phone',
  'Member 2 Name', 'Member 2 Email', 'Member 2 Phone',
  'Member 3 Name', 'Member 3 Email', 'Member 3 Phone',
  'Member 4 Name', 'Member 4 Email', 'Member 4 Phone',
  'Total Members', 'Amount Paid (Rs)', 'Payment Status',
  'Concept Brief', 'Portfolio URL', 'Registration Status', 'Confirmed At'
];

const PLAYERS_HEADERS = [
  'Registration ID', 'Player ID', 'Player Name', 'In-Game Name', 'Game UID',
  'Email', 'Phone', 'Role', 'Game', 'Created At'
];

function getGoogleAuthClient() {
  const fs = require('fs');
  const path = require('path');
  const keyFilePath = path.join(__dirname, 'service_account.json');
  if (fs.existsSync(keyFilePath)) {
    try {
      return new google.auth.GoogleAuth({ keyFile: keyFilePath, scopes: SCOPES });
    } catch (err) {
      console.warn('Warning loading service_account.json:', err.message);
    }
  }
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  if (!clientEmail || !privateKey) return null;
  privateKey = privateKey.replace(/\\n/g, '\n');
  try {
    return new google.auth.JWT({ email: clientEmail, key: privateKey, scopes: SCOPES });
  } catch (err) {
    console.error('Auth init error:', err.message);
    return null;
  }
}

function getSpreadsheetId() {
  return (process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
}

async function ensureWorksheetsAndHeaders(sheets, spreadsheetId) {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = (spreadsheet.data.sheets || []).map(s => s.properties.title);
    const neededSheets = ['Registrations', 'Players', 'Gaming Registrations', 'Hackathon Registrations'];
    const requests = neededSheets
      .filter(name => !existingSheets.includes(name))
      .map(name => ({ addSheet: { properties: { title: name } } }));

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
      console.log('[GoogleSheets] Created missing worksheets.');
    }

    const headerConfigs = [
      { sheet: 'Registrations', headers: REGISTRATIONS_HEADERS },
      { sheet: 'Players', headers: PLAYERS_HEADERS },
      { sheet: 'Gaming Registrations', headers: GAMING_HEADERS },
      { sheet: 'Hackathon Registrations', headers: HACKATHON_HEADERS }
    ];

    for (const { sheet, headers } of headerConfigs) {
      try {
        const checkRange = sheet + '!A1:A1';
        const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: checkRange });
        if (!res.data.values || res.data.values.length === 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: sheet + '!A1',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [headers] }
          });
          console.log('[GoogleSheets] Headers set for: ' + sheet);
        }
      } catch (e) {
        console.warn('[GoogleSheets] Header check for ' + sheet + ':', e.message);
      }
    }
  } catch (err) {
    console.warn('[GoogleSheets] Worksheet setup notice:', err.message);
  }
}

async function findRowInSheet(sheets, spreadsheetId, sheetName, registrationId) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetName + '!A:A' });
    const rows = res.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === registrationId) return i + 1;
    }
    return -1;
  } catch (err) {
    return -1;
  }
}

function getDateStr(reg) {
  return reg.confirmed_at
    ? String(reg.confirmed_at).split('T')[0]
    : (reg.created_at ? String(reg.created_at).split('T')[0] : new Date().toISOString().split('T')[0]);
}

function buildGamingRow(reg, players) {
  const playerCols = [];
  for (let i = 0; i < 5; i++) {
    const p = players[i];
    if (p) {
      playerCols.push(p.full_name || p.name || '', p.in_game_name || 'N/A', p.game_uid || 'N/A');
    } else {
      playerCols.push('', '', '');
    }
  }
  return [
    reg.registration_id, getDateStr(reg), reg.game || 'BGMI',
    reg.team_name || '', reg.college || '',
    reg.captain_name || '', reg.captain_email || '', reg.captain_phone || '',
    ...playerCols,
    reg.player_count || players.length || 0,
    reg.total_amount || reg.amount || 0,
    reg.payment_method || 'UPI',
    reg.payment_status || 'VERIFIED',
    reg.utr_transaction_id || reg.razorpay_payment_id || 'N/A',
    reg.registration_status || 'CONFIRMED',
    String(reg.confirmed_at || reg.created_at || new Date().toISOString())
  ];
}

function buildHackathonRow(reg, players) {
  const memberCols = [];
  for (let i = 1; i < 4; i++) {
    const p = players[i];
    if (p) {
      memberCols.push(p.full_name || p.name || '', p.email || '', p.phone || '');
    } else {
      memberCols.push('', '', '');
    }
  }
  return [
    reg.registration_id, getDateStr(reg),
    reg.team_name || '', reg.college || '',
    reg.primary_track || 'Open Innovation',
    reg.captain_name || '', reg.captain_email || '', reg.captain_phone || '',
    ...memberCols,
    reg.player_count || players.length || 0,
    reg.total_amount || reg.amount || 0,
    reg.payment_status || 'FREE',
    reg.concept_brief || '', reg.portfolio_url || '',
    reg.registration_status || 'CONFIRMED',
    String(reg.confirmed_at || reg.created_at || new Date().toISOString())
  ];
}

function buildLegacyRow(reg) {
  return [
    reg.registration_id, getDateStr(reg),
    reg.category || (reg.game === 'HACKATHON' ? 'HACKATHON' : 'GAMING'),
    reg.game || 'BGMI', reg.registration_type || 'Squad',
    reg.team_name || '', reg.college || '',
    reg.captain_name || '', reg.captain_email || '', reg.captain_phone || '',
    reg.player_count || 0, reg.total_amount || reg.amount || 0,
    reg.currency || 'INR', reg.payment_method || 'UPI',
    reg.payment_status || 'VERIFIED',
    reg.utr_transaction_id || reg.razorpay_payment_id || 'N/A',
    reg.payment_screenshot_url ? 'Screenshot Uploaded' : 'N/A',
    String(reg.submitted_at || ''), String(reg.verified_at || ''),
    reg.verified_by || 'Admin', reg.registration_status || 'CONFIRMED',
    String(reg.created_at || new Date().toISOString()),
    String(reg.confirmed_at || new Date().toISOString())
  ];
}

async function upsertRow(sheets, spreadsheetId, sheetName, registrationId, row) {
  const rowIdx = await findRowInSheet(sheets, spreadsheetId, sheetName, registrationId);
  if (rowIdx > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetName + '!A' + rowIdx,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });
    console.log('[GoogleSheets] Updated row in ' + sheetName + ' at ' + rowIdx);
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName + '!A:AE',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });
    console.log('[GoogleSheets] Appended row to ' + sheetName);
  }
  return rowIdx;
}

async function syncConfirmedRegistration(registrationId) {
  if (!registrationId) return { success: false, error: 'Registration ID required.' };

  try {
    const regRes = await db.execute({ sql: 'SELECT * FROM registrations WHERE registration_id = ?', args: [registrationId] });
    if (!regRes.rows || regRes.rows.length === 0) return { success: false, error: 'Registration not found.' };

    const reg = regRes.rows[0];
    if (reg.registration_status === 'CANCELLED') return { success: false, error: 'Registration is cancelled.' };

    const playersRes = await db.execute({ sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC', args: [registrationId] });
    const players = playersRes.rows || [];

    const auth = getGoogleAuthClient();
    const spreadsheetId = getSpreadsheetId();

    if (!auth || !spreadsheetId) {
      const reason = !spreadsheetId ? 'Missing GOOGLE_SHEETS_SPREADSHEET_ID' : 'Missing credentials';
      await db.execute({ sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_sync_error = ?, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?', args: ['PENDING', reason, registrationId] });
      return { success: false, error: reason, status: 'PENDING' };
    }

    const sheets = google.sheets({ version: 'v4', auth });
    await ensureWorksheetsAndHeaders(sheets, spreadsheetId);

    const isHackathon = (reg.category === 'HACKATHON') || (reg.game === 'HACKATHON') || (!reg.category && reg.total_amount === 0);

    // 1. Legacy Registrations sheet
    const legacyRowIdx = await upsertRow(sheets, spreadsheetId, 'Registrations', registrationId, buildLegacyRow(reg));

    // 2. Category-specific sheet
    if (isHackathon) {
      await upsertRow(sheets, spreadsheetId, 'Hackathon Registrations', registrationId, buildHackathonRow(reg, players));
    } else {
      await upsertRow(sheets, spreadsheetId, 'Gaming Registrations', registrationId, buildGamingRow(reg, players));
    }

    // 3. Players sheet (only on first sync)
    if (players.length > 0 && legacyRowIdx <= 0) {
      const playerRows = players.map((p, idx) => [
        registrationId, 'P' + (p.player_index || idx + 1),
        p.full_name || p.name || '', p.in_game_name || 'N/A', p.game_uid || 'N/A',
        p.email || reg.captain_email || '', p.phone || reg.captain_phone || '',
        p.role || (idx === 0 ? 'Captain' : 'Player'), reg.game || 'HACKATHON',
        String(p.created_at || new Date().toISOString())
      ]);
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: 'Players!A:J',
        valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS',
        requestBody: { values: playerRows }
      });
    }

    await db.execute({ sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_synced_at = CURRENT_TIMESTAMP, google_sheets_sync_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?', args: ['SYNCED', registrationId] });
    console.log('[GoogleSheets] Synced: ' + registrationId);
    return { success: true, registrationId, status: 'SYNCED' };

  } catch (err) {
    console.error('[GoogleSheets Error]:', err.message);
    try {
      await db.execute({ sql: 'UPDATE registrations SET google_sheets_sync_status = ?, google_sheets_sync_error = ?, updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?', args: ['FAILED', err.message, registrationId] });
    } catch (e) {}
    return { success: false, error: err.message, status: 'FAILED' };
  }
}

async function syncAllPendingRegistrations() {
  try {
    const res = await db.execute("SELECT registration_id FROM registrations WHERE (google_sheets_sync_status = 'PENDING' OR google_sheets_sync_status = 'FAILED' OR google_sheets_sync_status IS NULL)");
    const rows = res.rows || [];
    console.log('[GoogleSheets] Syncing ' + rows.length + ' pending registrations...');
    const results = [];
    for (const row of rows) {
      results.push({ registrationId: row.registration_id, result: await syncConfirmedRegistration(row.registration_id) });
    }
    return { success: true, total: rows.length, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testGoogleSheetsConnection() {
  const fs = require('fs'), path = require('path');
  const hasKeyFile = fs.existsSync(path.join(__dirname, 'service_account.json'));
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const spreadsheetId = getSpreadsheetId();
  const hasEmail = Boolean(clientEmail) || hasKeyFile;
  const hasKey = Boolean(rawPrivateKey) || hasKeyFile;
  const hasSheetId = Boolean(spreadsheetId);

  if ((!hasKeyFile && (!clientEmail || !rawPrivateKey)) || !hasSheetId) {
    const missing = [];
    if (!hasKeyFile && !clientEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    if (!hasKeyFile && !rawPrivateKey) missing.push('GOOGLE_PRIVATE_KEY');
    if (!hasSheetId) missing.push('GOOGLE_SHEETS_SPREADSHEET_ID');
    return { success: false, error: 'Missing: ' + missing.join(', '), diagnostics: { hasKeyFile, hasEmail, hasKey } };
  }

  const auth = getGoogleAuthClient();
  if (!auth) return { success: false, error: 'Failed to create auth client.', diagnostics: { hasEmail, hasKey, hasSheetId } };

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = (spreadsheet.data.sheets || []).map(s => s.properties.title);
    const title = spreadsheet.data.properties ? spreadsheet.data.properties.title : 'Untitled';
    await ensureWorksheetsAndHeaders(sheets, spreadsheetId);
    return {
      success: true, googleSheets: 'connected', spreadsheetTitle: title, worksheets: sheetTitles,
      hasRegistrations: sheetTitles.includes('Registrations'),
      hasPlayers: sheetTitles.includes('Players'),
      hasGamingSheet: sheetTitles.includes('Gaming Registrations'),
      hasHackathonSheet: sheetTitles.includes('Hackathon Registrations')
    };
  } catch (err) {
    return { success: false, error: 'Google Sheets Error: ' + err.message, diagnostics: { hasEmail, hasKey, hasSheetId } };
  }
}

module.exports = { getGoogleAuthClient, getSpreadsheetId, syncConfirmedRegistration, syncAllPendingRegistrations, testGoogleSheetsConnection };
