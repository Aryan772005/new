const db = require('../../database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

  try {
    const registrations = await db.getRegistrations();
    const headers = [
      'Pass ID', 'Team Name', 'Team Size', 'Leader Name', 'Leader Email', 'Leader Phone',
      'College / University', 'Primary Track', 'Status', 'Portfolio URL', 'Concept Brief', 'Registration Time'
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
    return res.status(200).send(csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
