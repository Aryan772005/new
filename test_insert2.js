const { db } = require('./db');
const crypto = require('crypto');
async function test() {
  try {
    const finalRegistrationId = 'CRAFT26-LUDO-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const finalPassId = 'PASS-' + finalRegistrationId;
    
    await db.batch([
      {
        sql: 'INSERT INTO registrations (' +
          'registration_id, pass_id, category, game, registration_type, team_name, team_size,' +
          'college, college_name, captain_name, captain_email, captain_phone,' +
          'leader_name, leader_email, leader_phone, player_count,' +
          'total_amount, amount, fee_per_person, currency,' +
          'payment_method, payment_status, registration_status, status,' +
          'razorpay_order_id, razorpay_payment_id, order_id, payment_id,' +
          'confirmed_at, created_at, updated_at' +
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'RAZORPAY', 'PAID', 'CONFIRMED', 'confirmed', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        args: [
          finalRegistrationId, finalPassId, 'GAMING', 'LUDO', 'SOLO', 'Solo: Aryan Singh', 1,
          'Test College', 'Test College', 'Aryan Singh', 'test@test.com', '9876543210',
          'Aryan Singh', 'test@test.com', '9876543210', 1, 1, 1, 1,
          'order_xyz', 'pay_xyz', 'order_xyz', 'pay_xyz'
        ]
      }
    ]);
    console.log('Registration Insert Success');
  } catch(e) {
    console.error('Insert Failed:', e.message);
  }
}
test();
