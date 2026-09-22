require('dotenv').config();
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(__dirname));

// Route aliases
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin authentication middleware
async function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing Admin Token.' });
  }

  const session = await db.validateSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid. Please sign in again.' });
  }

  req.admin = session;
  req.token = token;
  next();
}

// ---------------- PUBLIC API ROUTES ---------------- //

/**
 * Public Team Registration Endpoint
 */
app.post('/api/register', async (req, res) => {
  try {
    const registration = await db.registerTeam(req.body);
    return res.status(201).json({
      success: true,
      message: 'Squad successfully registered! Digital Hacker Pass issued.',
      registration
    });
  } catch (err) {
    const isConflict = err.message.includes('already been');
    return res.status(isConflict ? 409 : 400).json({
      success: false,
      error: err.message
    });
  }
});

// ---------------- ADMIN AUTH ROUTES ---------------- //

/**
 * Admin Login
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const session = await db.authenticateAdmin(username, password);
    return res.json({
      success: true,
      message: 'Organizer authentication successful.',
      ...session
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * Verify Current Admin Session
 */
app.get('/api/admin/me', requireAdmin, (req, res) => {
  res.json({
    success: true,
    user: req.admin
  });
});

/**
 * Admin Logout
 */
app.post('/api/admin/logout', requireAdmin, async (req, res) => {
  await db.logoutSession(req.token);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// ---------------- ADMIN DASHBOARD ROUTES ---------------- //

/**
 * Registration Statistics Overview
 */
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * List / Search Registrations with Filters
 */
app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  try {
    const { search = '', track = '', status = '', sort = 'newest' } = req.query;
    const registrations = await db.getRegistrations({ search, track, status, sort });
    res.json({ success: true, registrations, count: registrations.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update Registration Status
 */
app.patch('/api/admin/registrations/:id/status', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const updated = await db.updateRegistrationStatus(id, status);
    res.json({ success: true, registration: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Organizer manual registration
 */
app.post('/api/admin/registrations', requireAdmin, async (req, res) => {
  try {
    const registration = await db.registerTeam(req.body);
    res.status(201).json({ success: true, registration });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Delete a Registration Record
 */
app.delete('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.deleteRegistration(id);
    res.json({ success: true, message: 'Registration deleted successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * Export Registrations to CSV
 */
app.get('/api/admin/export-csv', requireAdmin, async (req, res) => {
  try {
    const registrations = await db.getRegistrations();
    
    const headers = [
      'Pass ID',
      'Team Name',
      'Team Size',
      'Leader Name',
      'Leader Email',
      'Leader Phone',
      'College / University',
      'Primary Track',
      'Status',
      'Portfolio URL',
      'Concept Brief',
      'Registration Time'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = registrations.map(r => [
      escapeCsv(r.pass_id),
      escapeCsv(r.team_name),
      escapeCsv(r.team_size),
      escapeCsv(r.leader_name),
      escapeCsv(r.leader_email),
      escapeCsv(r.leader_phone),
      escapeCsv(r.college_name),
      escapeCsv(r.primary_track),
      escapeCsv(r.status),
      escapeCsv(r.portfolio_url),
      escapeCsv(r.concept_brief),
      escapeCsv(r.created_at)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="craftcon_26_registrations_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server locally if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 CRAFTCON '26 Server is running on port ${PORT}`);
    console.log(`🌐 Public Website:  http://localhost:${PORT}`);
    console.log(`🛡️  Admin Portal:    http://localhost:${PORT}/admin`);
    console.log(`🔑 Admin ID:        admin`);
    console.log(`🔒 Admin Password:  CraftCon2026!Admin`);
    console.log('====================================================');
  });
}

// Export for Vercel Serverless
module.exports = app;
