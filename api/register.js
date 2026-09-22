const db = require('../database');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

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
};
