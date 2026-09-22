const db = require('../../database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  const session = await db.validateSession(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  if (req.method === 'POST') {
    try {
      const registration = await db.registerTeam(req.body);
      return res.status(201).json({ success: true, registration });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  try {
    const { search = '', track = '', status = '', sort = 'newest' } = req.query;
    const registrations = await db.getRegistrations({ search, track, status, sort });
    return res.json({ success: true, registrations, count: registrations.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
