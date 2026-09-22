require('dotenv').config();
const dns = require('node:dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let client;

if (isTurso) {
  const { createClient } = require('@libsql/client');
  let tursoUrl = process.env.TURSO_DATABASE_URL.trim();
  if (tursoUrl.startsWith('libsql://')) {
    tursoUrl = tursoUrl.replace('libsql://', 'https://');
  }

  client = createClient({
    url: tursoUrl,
    authToken: process.env.TURSO_AUTH_TOKEN.trim()
  });
  console.log('⚡ Connected to Turso Cloud SQLite Database (AWS Mumbai)');
} else {
  // Use local file SQLite for offline local dev
  const { createClient } = require('@libsql/client');
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  client = createClient({
    url: `file:${path.join(dataDir, 'craftcon.db')}`
  });
  console.log('📁 Connected to Local SQLite Database (data/craftcon.db)');
}

// Password hashing utility using standard crypto
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return check === hash;
}

// Initialize Tables
async function initDb() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pass_id TEXT UNIQUE NOT NULL,
      team_name TEXT UNIQUE NOT NULL COLLATE NOCASE,
      team_size INTEGER NOT NULL,
      leader_name TEXT NOT NULL,
      leader_email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      leader_phone TEXT NOT NULL,
      college_name TEXT NOT NULL,
      primary_track TEXT NOT NULL,
      portfolio_url TEXT,
      concept_brief TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'organizer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );
  `);

  // Check and seed default admin
  const checkAdmin = await client.execute({
    sql: 'SELECT id FROM admins WHERE username = ?',
    args: ['admin']
  });

  if (checkAdmin.rows.length === 0) {
    const { hash, salt } = hashPassword('CraftCon2026!Admin');
    await client.execute({
      sql: 'INSERT OR IGNORE INTO admins (username, password_hash, salt, role) VALUES (?, ?, ?, ?)',
      args: ['admin', hash, salt, 'lead_organizer']
    });
    console.log('[DB] Seeded default admin account (Username: admin)');
  }

  // Check demo data
  const checkTeams = await client.execute('SELECT COUNT(*) as count FROM registrations');
  const count = Number(checkTeams.rows[0]?.count || 0);

  if (count === 0) {
    const seedTeams = [
      {
        pass_id: 'CFT-2048-DBU',
        team_name: 'Netherite Architects',
        team_size: 4,
        leader_name: 'Aryan Singh Tariani',
        leader_email: 'aryansinghtariani@gmail.com',
        leader_phone: '+91 94750 02048',
        college_name: 'Desh Bhagat University',
        primary_track: 'Track 01 — The End (AI & Agents)',
        portfolio_url: 'https://github.com/Aryan772005',
        concept_brief: 'Autonomous multi-agent orchestration engine for automated hackathon team formation and smart code reviews.',
        status: 'approved'
      },
      {
        pass_id: 'CFT-7714-DBU',
        team_name: 'Redstone Logic Guild',
        team_size: 4,
        leader_name: 'Rounak Kumar',
        leader_email: 'roukumar55@gmail.com',
        leader_phone: '+91 70615 59601',
        college_name: 'Desh Bhagat University',
        primary_track: 'Track 03 — Redstone Lab (IoT & Hardware)',
        portfolio_url: 'https://github.com/rounak-craft',
        concept_brief: 'Smart agricultural sensor network transmitting telemetry using low-power LoRa mesh radios.',
        status: 'checked_in'
      },
      {
        pass_id: 'CFT-9182-DBU',
        team_name: 'Ender Pearl Pioneers',
        team_size: 3,
        leader_name: 'Simran Kaur',
        leader_email: 'simran.kaur@punjabtech.edu',
        leader_phone: '+91 98142 88721',
        college_name: 'Punjab Technical University',
        primary_track: 'Track 02 — The Overworld (ClimateTech)',
        portfolio_url: 'https://github.com/simran-k/green-harvest',
        concept_brief: 'AI computer vision model running on edge devices to spot crop blights and optimize automated irrigation.',
        status: 'confirmed'
      },
      {
        pass_id: 'CFT-5420-DBU',
        team_name: 'Wither Wardens',
        team_size: 2,
        leader_name: 'Harpreet Singh',
        leader_email: 'hsingh@thapar.edu',
        leader_phone: '+91 99881 22334',
        college_name: 'Thapar Institute of Engineering',
        primary_track: 'Track 04 — The Deep Dark (Security & Web3)',
        portfolio_url: 'https://github.com/hsingh-sec',
        concept_brief: 'Zero-knowledge credential verification system for tamper-proof college diplomas and hackathon certificates.',
        status: 'confirmed'
      }
    ];

    for (const team of seedTeams) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO registrations (
          pass_id, team_name, team_size, leader_name, leader_email, leader_phone,
          college_name, primary_track, portfolio_url, concept_brief, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          team.pass_id,
          team.team_name,
          team.team_size,
          team.leader_name,
          team.leader_email,
          team.leader_phone,
          team.college_name,
          team.primary_track,
          team.portfolio_url,
          team.concept_brief,
          team.status
        ]
      });
    }
    console.log('[DB] Seeded initial demo hackathon squads into Turso Cloud');
  }
}

// Auto init on load
initDb().catch(console.error);

// Unique pass ID helper
async function generateUniquePassId() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const passId = `CFT-${randomCode}-DBU`;
    const check = await client.execute({
      sql: 'SELECT id FROM registrations WHERE pass_id = ?',
      args: [passId]
    });
    if (check.rows.length === 0) {
      return passId;
    }
  }
  return `CFT-${Date.now().toString().slice(-4)}-DBU`;
}

// ---------------- API Methods ---------------- //

async function registerTeam(data) {
  const {
    team_name,
    team_size,
    leader_name,
    leader_email,
    leader_phone,
    college_name,
    primary_track,
    portfolio_url = '',
    concept_brief = ''
  } = data;

  if (!team_name?.trim() || !leader_name?.trim() || !leader_email?.trim() || !leader_phone?.trim() || !college_name?.trim()) {
    throw new Error('All required fields must be provided.');
  }

  let finalTeamName = team_name.trim();
  const checkTeam = await client.execute({
    sql: 'SELECT id FROM registrations WHERE team_name = ?',
    args: [finalTeamName]
  });
  if (checkTeam.rows.length > 0) {
    finalTeamName = `${finalTeamName} #${Math.floor(10 + Math.random() * 90)}`;
  }

  const pass_id = await generateUniquePassId();

  await client.execute({
    sql: `INSERT INTO registrations (
      pass_id, team_name, team_size, leader_name, leader_email, leader_phone,
      college_name, primary_track, portfolio_url, concept_brief, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    args: [
      pass_id,
      finalTeamName,
      parseInt(team_size, 10) || 4,
      leader_name.trim(),
      leader_email.trim(),
      leader_phone.trim(),
      college_name.trim(),
      primary_track?.trim() || 'Track 01 — The End (AI & Agents)',
      portfolio_url?.trim() || '',
      concept_brief?.trim() || ''
    ]
  });

  const getRecord = await client.execute({
    sql: 'SELECT * FROM registrations WHERE pass_id = ?',
    args: [pass_id]
  });

  return getRecord.rows[0];
}

async function authenticateAdmin(username, password) {
  if (!username || !password) {
    throw new Error('Username and password are required.');
  }

  const res = await client.execute({
    sql: 'SELECT * FROM admins WHERE username = ?',
    args: [username.trim()]
  });

  const user = res.rows[0];
  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    throw new Error('Invalid Admin ID or Password.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await client.execute({
    sql: 'INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)',
    args: [token, user.username, expiresAt]
  });

  return {
    token,
    username: user.username,
    role: user.role,
    expiresAt
  };
}

async function validateSession(token) {
  if (!token) return null;
  const res = await client.execute({
    sql: 'SELECT s.token, s.username, s.expires_at, a.role FROM sessions s JOIN admins a ON s.username = a.username WHERE s.token = ?',
    args: [token]
  });

  const session = res.rows[0];
  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    await client.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
    return null;
  }

  return { username: session.username, role: session.role };
}

async function logoutSession(token) {
  if (!token) return;
  await client.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
}

async function getRegistrations({ search = '', track = '', status = '', sort = 'newest' } = {}) {
  let query = 'SELECT * FROM registrations WHERE 1=1';
  const params = [];

  if (search.trim()) {
    query += ` AND (
      team_name LIKE ? OR 
      leader_name LIKE ? OR 
      leader_email LIKE ? OR 
      leader_phone LIKE ? OR 
      college_name LIKE ? OR 
      pass_id LIKE ?
    )`;
    const wildcard = `%${search.trim()}%`;
    params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
  }

  if (track.trim() && track !== 'all') {
    query += ' AND primary_track LIKE ?';
    params.push(`%${track.trim()}%`);
  }

  if (status.trim() && status !== 'all') {
    query += ' AND status = ?';
    params.push(status.trim());
  }

  if (sort === 'oldest') {
    query += ' ORDER BY id ASC';
  } else if (sort === 'team_asc') {
    query += ' ORDER BY team_name COLLATE NOCASE ASC';
  } else {
    query += ' ORDER BY id DESC';
  }

  const res = await client.execute({ sql: query, args: params });
  return res.rows;
}

async function getStats() {
  const countTeamsRes = await client.execute('SELECT COUNT(*) as count FROM registrations');
  const totalTeams = Number(countTeamsRes.rows[0]?.count || 0);

  const buildersRes = await client.execute('SELECT COALESCE(SUM(team_size), 0) as count FROM registrations');
  const totalBuilders = Number(buildersRes.rows[0]?.count || 0);

  const checkinRes = await client.execute("SELECT COUNT(*) as count FROM registrations WHERE status = 'checked_in'");
  const checkedIn = Number(checkinRes.rows[0]?.count || 0);

  const approvedRes = await client.execute("SELECT COUNT(*) as count FROM registrations WHERE status = 'approved'");
  const approved = Number(approvedRes.rows[0]?.count || 0);

  const confirmedRes = await client.execute("SELECT COUNT(*) as count FROM registrations WHERE status = 'confirmed'");
  const confirmed = Number(confirmedRes.rows[0]?.count || 0);

  const tracksRes = await client.execute(`
    SELECT primary_track, COUNT(*) as count, SUM(team_size) as builders 
    FROM registrations 
    GROUP BY primary_track 
    ORDER BY count DESC
  `);

  const collegesRes = await client.execute('SELECT COUNT(DISTINCT college_name) as count FROM registrations');
  const uniqueColleges = Number(collegesRes.rows[0]?.count || 0);

  const recentRes = await client.execute('SELECT id, pass_id, team_name, leader_name, primary_track, status, created_at FROM registrations ORDER BY id DESC LIMIT 5');

  return {
    totalTeams,
    totalBuilders,
    checkedIn,
    approved,
    confirmed,
    uniqueColleges,
    tracks: tracksRes.rows,
    recent: recentRes.rows
  };
}

async function updateRegistrationStatus(id, newStatus) {
  const allowed = ['confirmed', 'approved', 'waitlist', 'checked_in', 'rejected'];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  await client.execute({
    sql: 'UPDATE registrations SET status = ? WHERE id = ?',
    args: [newStatus, id]
  });

  const res = await client.execute({
    sql: 'SELECT * FROM registrations WHERE id = ?',
    args: [id]
  });

  if (res.rows.length === 0) {
    throw new Error('Registration record not found.');
  }

  return res.rows[0];
}

async function deleteRegistration(id) {
  await client.execute({
    sql: 'DELETE FROM registrations WHERE id = ?',
    args: [id]
  });
  return true;
}

module.exports = {
  client,
  initDb,
  registerTeam,
  authenticateAdmin,
  validateSession,
  logoutSession,
  getRegistrations,
  getStats,
  updateRegistrationStatus,
  deleteRegistration
};
