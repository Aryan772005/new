const { createClient } = require('@libsql/client');
require('dotenv').config();

async function ensureColumnExists(client, tableName, columnName, columnDef) {
  try {
    const pragmaRes = await client.execute(`PRAGMA table_info(${tableName})`);
    const columns = pragmaRes.rows || [];
    const hasColumn = columns.some((col) => {
      const name = col && (col.name !== undefined ? col.name : col[1]);
      return String(name || '').toLowerCase() === String(columnName).toLowerCase();
    });
    if (!hasColumn) {
      await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
      console.log(`➕ Added missing column '${columnName}' to '${tableName}' table.`);
    }
  } catch (e) {
    if (!e.message.toLowerCase().includes('duplicate column')) {
      console.warn(`Migration check notice for ${tableName}.${columnName}:`, e.message);
    }
  }
}

async function run() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if(!tursoUrl) return console.log('No turso url');
  const remoteDb = createClient({url: tursoUrl, authToken: tursoToken});
  
  try {
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS registrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT UNIQUE NOT NULL,
          pass_id TEXT,
          category TEXT DEFAULT 'GENERAL',
          game TEXT DEFAULT 'HACKATHON',
          registration_type TEXT DEFAULT 'TEAM',
          team_name TEXT,
          team_size INTEGER DEFAULT 1,
          college TEXT NOT NULL,
          college_name TEXT,
          captain_name TEXT NOT NULL,
          captain_email TEXT NOT NULL,
          captain_phone TEXT NOT NULL,
          leader_name TEXT,
          leader_email TEXT,
          leader_phone TEXT,
          primary_track TEXT,
          portfolio_url TEXT,
          concept_brief TEXT,
          primary_email TEXT,
          primary_phone TEXT,
          player_count INTEGER NOT NULL DEFAULT 1,
          total_amount REAL NOT NULL DEFAULT 0,
          amount REAL DEFAULT 0,
          fee_per_person REAL NOT NULL DEFAULT 50,
          currency TEXT DEFAULT 'INR',
          payment_method TEXT DEFAULT 'UPI',
          payment_status TEXT NOT NULL DEFAULT 'PENDING',
          registration_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
          status TEXT DEFAULT 'pending',
          utr_transaction_id TEXT,
          payment_screenshot_url TEXT,
          submitted_at DATETIME,
          verified_at DATETIME,
          verified_by TEXT,
          verification_notes TEXT,
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          order_id TEXT,
          payment_id TEXT,
          email_status TEXT DEFAULT 'PENDING',
          email_sent_at DATETIME,
          email_attempts INTEGER DEFAULT 0,
          last_email_error TEXT,
          google_sheets_sync_status TEXT DEFAULT 'PENDING',
          google_sheets_synced_at DATETIME,
          google_sheets_sync_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          confirmed_at DATETIME
        );
      `);
      console.log('created registrations');
      
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS registration_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT NOT NULL,
          event_id TEXT NOT NULL,
          event_name TEXT NOT NULL,
          category TEXT NOT NULL,
          registration_type TEXT NOT NULL,
          team_name TEXT,
          track TEXT,
          amount REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT NOT NULL,
          registration_event_id INTEGER,
          full_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          college TEXT,
          in_game_name TEXT,
          game_uid TEXT,
          role TEXT NOT NULL DEFAULT 'MEMBER',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT NOT NULL,
          player_index INTEGER NOT NULL,
          name TEXT NOT NULL,
          full_name TEXT,
          in_game_name TEXT,
          game_uid TEXT,
          email TEXT,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'PLAYER',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT NOT NULL,
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          razorpay_signature TEXT,
          signature TEXT,
          order_id TEXT,
          payment_id TEXT,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'INR',
          status TEXT NOT NULL DEFAULT 'PENDING',
          method TEXT DEFAULT 'UPI',
          provider TEXT NOT NULL DEFAULT 'UPI',
          utr_transaction_id TEXT,
          payment_screenshot_url TEXT,
          submitted_at DATETIME,
          verified_at DATETIME,
          verified_by TEXT,
          verification_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await remoteDb.execute(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          registration_type TEXT NOT NULL,
          min_participants INTEGER NOT NULL DEFAULT 1,
          max_participants INTEGER NOT NULL DEFAULT 1,
          fee REAL NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          configuration TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await ensureColumnExists(remoteDb, 'registrations', 'registration_id', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'pass_id', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'leader_name', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'leader_email', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'leader_phone', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'college_name', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'primary_track', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'portfolio_url', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'concept_brief', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'status', "TEXT DEFAULT 'pending'");
      await ensureColumnExists(remoteDb, 'registrations', 'category', "TEXT DEFAULT 'GENERAL'");
      await ensureColumnExists(remoteDb, 'registrations', 'game', "TEXT DEFAULT 'HACKATHON'");
      await ensureColumnExists(remoteDb, 'registrations', 'registration_type', "TEXT DEFAULT 'TEAM'");
      await ensureColumnExists(remoteDb, 'registrations', 'college', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'captain_name', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'captain_email', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'captain_phone', 'TEXT');
      await ensureColumnExists(remoteDb, 'registrations', 'player_count', 'INTEGER DEFAULT 1');
      await ensureColumnExists(remoteDb, 'registrations', 'total_amount', 'REAL DEFAULT 0');
      await ensureColumnExists(remoteDb, 'registrations', 'fee_per_person', 'REAL DEFAULT 50');
      await ensureColumnExists(remoteDb, 'registrations', 'payment_status', "TEXT DEFAULT 'PENDING'");
      await ensureColumnExists(remoteDb, 'registrations', 'registration_status', "TEXT DEFAULT 'PENDING_PAYMENT'");
      await ensureColumnExists(remoteDb, 'registrations', 'google_sheets_sync_status', "TEXT DEFAULT 'PENDING'");
      await ensureColumnExists(remoteDb, 'registrations', 'google_sheets_synced_at', 'DATETIME');
      await ensureColumnExists(remoteDb, 'registrations', 'google_sheets_sync_error', 'TEXT');
      await ensureColumnExists(remoteDb, 'players', 'full_name', 'TEXT');
      
      console.log('Tables created successfully on Turso!');
  } catch(e) {
      console.log('Error creating tables:', e);
  }
}
run();
