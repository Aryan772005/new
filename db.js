const { createClient } = require('@libsql/client');
require('dotenv').config();

/**
 * CRAFTCON '26 PLATFORM — CENTRALIZED TURSO / libSQL DATABASE CLIENT
 * Primary Source of Truth: Turso Cloud / libSQL Relational Database.
 */

const tursoUrl = (process.env.TURSO_DATABASE_URL || '').trim();
const tursoToken = (process.env.TURSO_AUTH_TOKEN || '').trim() || undefined;

if (!tursoUrl && (process.env.VERCEL || process.env.NODE_ENV === 'production')) {
  console.warn('⚠️ [Turso] TURSO_DATABASE_URL environment variable is missing in production deployment!');
}

const db = createClient({
  url: tursoUrl || 'file:craftcon_gaming.db',
  ...(tursoToken ? { authToken: tursoToken } : {})
});

console.log(`⚡ Initialized Turso/libSQL client (${tursoUrl ? 'Turso Cloud: ' + tursoUrl : 'Local File Mode'})`);

let isInitialized = false;
let initPromise = null;

async function ensureColumnExists(tableName, columnName, columnDef) {
  try {
    const pragmaRes = await db.execute(`PRAGMA table_info(${tableName})`);
    const columns = pragmaRes.rows || [];
    const hasColumn = columns.some(col => (col.name || col[1]) === columnName);
    if (!hasColumn) {
      await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
      console.log(`➕ Added missing column '${columnName}' to '${tableName}' table.`);
    }
  } catch (e) {
    console.warn(`Migration check warning for ${tableName}.${columnName}:`, e.message);
  }
}

/**
 * Initializes Database Tables & Relational Schemas
 */
async function initDb() {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!db) {
        throw new Error('Database client is not initialized.');
      }

      // 1. REGISTRATIONS TABLE (Primary Master Record)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS registrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          registration_id TEXT UNIQUE NOT NULL,
          category TEXT DEFAULT 'GENERAL',
          game TEXT DEFAULT 'HACKATHON',
          registration_type TEXT DEFAULT 'TEAM',
          team_name TEXT,
          college TEXT NOT NULL,
          captain_name TEXT NOT NULL,
          captain_email TEXT NOT NULL,
          captain_phone TEXT NOT NULL,
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

      // 2. REGISTRATION EVENTS TABLE (Relational Events Entity for Multi-Event Registrations)
      await db.execute(`
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

      // 3. PARTICIPANTS TABLE (Relational Members Roster)
      await db.execute(`
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

      // 4. PLAYERS TABLE (Backward-Compatible Roster View)
      await db.execute(`
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

      // 5. PAYMENTS TABLE
      await db.execute(`
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

      // 6. EVENTS REGISTRY TABLE
      await db.execute(`
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

      // Ensure All Migration Columns Exist Dynamically
      await ensureColumnExists('registrations', 'primary_email', 'TEXT');
      await ensureColumnExists('registrations', 'primary_phone', 'TEXT');
      await ensureColumnExists('registrations', 'amount', 'REAL');
      await ensureColumnExists('registrations', 'currency', "TEXT DEFAULT 'INR'");
      await ensureColumnExists('registrations', 'payment_method', "TEXT DEFAULT 'UPI'");
      await ensureColumnExists('registrations', 'utr_transaction_id', 'TEXT');
      await ensureColumnExists('registrations', 'payment_screenshot_url', 'TEXT');
      await ensureColumnExists('registrations', 'submitted_at', 'DATETIME');
      await ensureColumnExists('registrations', 'verified_at', 'DATETIME');
      await ensureColumnExists('registrations', 'verified_by', 'TEXT');
      await ensureColumnExists('registrations', 'verification_notes', 'TEXT');
      await ensureColumnExists('registrations', 'updated_at', 'DATETIME');
      await ensureColumnExists('registrations', 'google_sheets_sync_status', "TEXT DEFAULT 'PENDING'");
      await ensureColumnExists('registrations', 'google_sheets_synced_at', 'DATETIME');
      await ensureColumnExists('registrations', 'google_sheets_sync_error', 'TEXT');
      await ensureColumnExists('players', 'full_name', 'TEXT');
      await ensureColumnExists('payments', 'signature', 'TEXT');
      await ensureColumnExists('payments', 'utr_transaction_id', 'TEXT');
      await ensureColumnExists('payments', 'payment_screenshot_url', 'TEXT');
      await ensureColumnExists('payments', 'submitted_at', 'DATETIME');
      await ensureColumnExists('payments', 'verified_by', 'TEXT');
      await ensureColumnExists('payments', 'verification_notes', 'TEXT');
      await ensureColumnExists('payments', 'updated_at', 'DATETIME');

      // Create Unique Indexes for Idempotency
      try {
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_rzp_pay ON registrations(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;");
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_rzp_pay ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;");
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_utr ON registrations(utr_transaction_id) WHERE utr_transaction_id IS NOT NULL;");
        await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_utr ON payments(utr_transaction_id) WHERE utr_transaction_id IS NOT NULL;");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_reg_events_reg_id ON registration_events(registration_id);");
        await db.execute("CREATE INDEX IF NOT EXISTS idx_part_reg_id ON participants(registration_id);");
      } catch (idxErr) {
        console.warn('Index creation notice:', idxErr.message);
      }

      isInitialized = true;
      console.log('✅ Turso/libSQL Relational Schema initialized (registrations, registration_events, participants, players, payments, events).');
      return true;
    } catch (err) {
      console.error('⚠️ Database schema initialization warning:', err.message);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Health Check Helper
 */
async function testDbConnection() {
  try {
    if (!db) return false;
    const res = await db.execute('SELECT 1 as alive');
    return res && res.rows && res.rows.length > 0;
  } catch (err) {
    console.error('Database health check error:', err.message);
    return false;
  }
}

module.exports = {
  db,
  initDb,
  testDbConnection
};
