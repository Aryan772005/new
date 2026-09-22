const db = require('../../../database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS');
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

  const id = parseInt(req.query.id, 10);
  if (!id) {
    return res.status(400).json({ success: false, error: 'Invalid ID' });
  }

  if (req.method === 'PATCH') {
    try {
      const { status } = req.body || {};
      const updated = await db.updateRegistrationStatus(id, status);
      return res.json({ success: true, registration: updated });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await db.deleteRegistration(id);
      return res.json({ success: true, message: 'Deleted successfully.' });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
};
