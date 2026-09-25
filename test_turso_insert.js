const { createClient } = require('@libsql/client');
require('dotenv').config();

async function run() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;
  if(!tursoUrl) return console.log('No turso url');
  const remoteDb = createClient({url: tursoUrl, authToken: tursoToken});
  
  try {
      const registrationId = 'TEST-' + Date.now();
      const res = await remoteDb.batch([
        {
          sql: `INSERT INTO registrations (
            registration_id, pass_id, category, game, registration_type, team_name,
            college, captain_name, captain_email, captain_phone, player_count,
            total_amount, amount, fee_per_person, currency, payment_method, payment_status, registration_status,
            primary_track, portfolio_url, concept_brief,
            confirmed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'INR', 'FREE', 'VERIFIED', 'CONFIRMED', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            registrationId,
            registrationId,
            'HACKATHON',
            'HACKATHON',
            'TEAM',
            'TestTeam',
            'TestCollege',
            'TestCaptain',
            'test@test.com',
            '1234567890',
            2,
            'SOFTWARE',
            'url',
            'brief'
          ]
        }
      ]);
      console.log('Insert successful:', res);
  } catch(e) {
      console.error('Insert failed:', e.message);
  }
}
run();
