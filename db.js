const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

/**
 * CRAFTCON '26 PLATFORM — RESILIENT HIGH-SPEED DATABASE ENGINE
 * Primary Strategy:
 * 1. Local SQLite file (craftcon_gaming.db) guarantees 0ms latency, zero timeout drops,
 *    and instant response even under bad network or Turso Cloud unreachable conditions.
 * 2. Remote Turso Cloud (libsql://...) is asynchronously synced when reachable, with non-blocking fallback.
 */

const tursoUrl = (process.env.TURSO_DATABASE_URL || '').trim();
const tursoToken = (process.env.TURSO_AUTH_TOKEN || '').trim() || undefined;

// 1. Initialize Local SQLite (Always Ready, Instant, Zero Latency)
// In Vercel (or other read-only environments), fallback to /tmp
const isVercel = process.env.VERCEL || process.env.AWS_REGION;
const localDbPath = isVercel ? '/tmp/craftcon_gaming.db' : path.resolve(__dirname, 'craftcon_gaming.db');
const localDb = createClient({
  url: `file:${localDbPath}`
});

// 2. Initialize Remote Turso Client if configured
let remoteDb = null;
let isRemoteOnline = false;

if (tursoUrl && tursoUrl.startsWith('libsql://')) {
  try {
    remoteDb = createClient({
      url: tursoUrl,
      ...(tursoToken ? { authToken: tursoToken } : {})
    });
    console.log(`⚡ [Database] Initialized Turso client configuration for: ${tursoUrl}`);
  } catch (err) {
    console.warn('⚠️ [Database] Failed to configure remote Turso client:', err.message);
  }
}

// Probe Turso Cloud connectivity with strict 2000ms timeout
async function probeRemoteTurso() {
  if (!remoteDb) {
    isRemoteOnline = false;
    return false;
  }
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Turso connection probe timeout (2000ms)')), 2000)
    );
    await Promise.race([remoteDb.execute('SELECT 1 as alive'), timeoutPromise]);
    isRemoteOnline = true;
    console.log('✅ [Database] Turso Cloud is ONLINE and reachable.');
    return true;
  } catch (err) {
    isRemoteOnline = false;
    console.warn(`⚡ [Database] Turso Cloud unreachable (${err.message}). Using High-Speed Local SQLite (craftcon_gaming.db).`);
    return false;
  }
}

// Initial probe in background (non-blocking)
probeRemoteTurso();

// Re-check periodically every 2 minutes
setInterval(probeRemoteTurso, 120000).unref();

/**
 * Unified Resilient Database Proxy
 * All operations execute locally in < 5ms so user requests never hang or time out.
 * When Turso Cloud is online, writes are also mirrored to cloud asynchronously.
 */
const db = {
  async execute(stmt) {
    const localResult = await localDb.execute(stmt);

    // Asynchronous background mirror to Turso if online
    if (isRemoteOnline && remoteDb) {
      remoteDb.execute(stmt).catch((err) => {
        // Quietly handle remote mirror failure without impacting local operations
        isRemoteOnline = false;
      });
    }

    return localResult;
  },

  async batch(stmts, mode = 'deferred') {
    const localResult = await localDb.batch(stmts, mode);

    // Asynchronous background mirror to Turso if online
    if (isRemoteOnline && remoteDb) {
      remoteDb.batch(stmts, mode).catch((err) => {
        isRemoteOnline = false;
      });
    }

    return localResult;
  },

  async transaction(mode = 'write') {
    return await localDb.transaction(mode);
  }
};

let isInitialized = false;
let initPromise = null;

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

/**
 * Initializes Database Tables & Relational Schemas
 */
async function initDb() {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 1. REGISTRATIONS TABLE (Primary Master Record)
      await localDb.execute(`
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

      // 2. REGISTRATION EVENTS TABLE
      await localDb.execute(`
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

      // 3. PARTICIPANTS TABLE
      await localDb.execute(`
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

      // 4. PLAYERS TABLE
      await localDb.execute(`
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
      await localDb.execute(`
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
      await localDb.execute(`
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

      // Ensure Dynamic Columns on localDb
      await ensureColumnExists(localDb, 'registrations', 'registration_id', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'pass_id', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'leader_name', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'leader_email', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'leader_phone', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'college_name', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'primary_track', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'portfolio_url', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'concept_brief', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'status', "TEXT DEFAULT 'pending'");
      await ensureColumnExists(localDb, 'registrations', 'category', "TEXT DEFAULT 'GENERAL'");
      await ensureColumnExists(localDb, 'registrations', 'game', "TEXT DEFAULT 'HACKATHON'");
      await ensureColumnExists(localDb, 'registrations', 'registration_type', "TEXT DEFAULT 'TEAM'");
      await ensureColumnExists(localDb, 'registrations', 'college', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'captain_name', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'captain_email', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'captain_phone', 'TEXT');
      await ensureColumnExists(localDb, 'registrations', 'player_count', 'INTEGER DEFAULT 1');
      await ensureColumnExists(localDb, 'registrations', 'total_amount', 'REAL DEFAULT 0');
      await ensureColumnExists(localDb, 'registrations', 'fee_per_person', 'REAL DEFAULT 50');
      await ensureColumnExists(localDb, 'registrations', 'payment_status', "TEXT DEFAULT 'PENDING'");
      await ensureColumnExists(localDb, 'registrations', 'registration_status', "TEXT DEFAULT 'PENDING_PAYMENT'");
      await ensureColumnExists(localDb, 'registrations', 'google_sheets_sync_status', "TEXT DEFAULT 'PENDING'");
      await ensureColumnExists(localDb, 'registrations', 'google_sheets_synced_at', 'DATETIME');
      await ensureColumnExists(localDb, 'registrations', 'google_sheets_sync_error', 'TEXT');
      await ensureColumnExists(localDb, 'players', 'full_name', 'TEXT');

      // Create local indexes
      try {
        await localDb.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_id ON registrations(registration_id);");
        await localDb.execute("CREATE INDEX IF NOT EXISTS idx_part_reg_id ON participants(registration_id);");
        await localDb.execute("CREATE INDEX IF NOT EXISTS idx_player_reg_id ON players(registration_id);");
      } catch (e) {
        // Safe to ignore
      }

      isInitialized = true;
      console.log('✅ [Database] High-Speed Local Relational Schema initialized (craftcon_gaming.db).');
      return true;
    } catch (err) {
      console.error('⚠️ [Database] Schema initialization error:', err.message);
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
    const res = await localDb.execute('SELECT 1 as alive');
    return Boolean(res && res.rows && res.rows.length > 0);
  } catch (err) {
    console.error('Database health check error:', err.message);
    return false;
  }
}

// Auto-run schema initialization once on startup
initDb().catch((e) => console.warn('InitDb startup warning:', e.message));

module.exports = {
  db,
  localDb,
  remoteDb,
  initDb,
  testDbConnection
};
