const db = require('../../database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

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
};
