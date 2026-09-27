const { db } = require('./db');
const crypto = require('crypto');
async function test() {
  try {
    const finalRegistrationId = 'CRAFT26-LUDO-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const finalPassId = 'PASS-' + finalRegistrationId;
    const finalOrderId = 'order_xyz';
    const finalPaymentId = 'pay_xyz';
    const totalAmount = 1;
    const feePerPerson = 1;
    
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
          finalRegistrationId, finalPassId, 'GAMING', 'LUDO', 'SOLO', 'Solo: Aryan', 1,
          'DBU', 'DBU', 'Aryan', 'a@a.com', '123',
          'Aryan', 'a@a.com', '123', 1, totalAmount, totalAmount, feePerPerson,
          finalOrderId, finalPaymentId, finalOrderId, finalPaymentId
        ]
      },
      {
        sql: 'INSERT OR REPLACE INTO payments (' +
                'registration_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, signature,' +
                'order_id, payment_id, amount, currency, status, method, provider, verified_at, updated_at' +
              ') ' +
              "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'CAPTURED', 'RAZORPAY', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        args: [
          finalRegistrationId, finalOrderId, finalPaymentId, 'sandbox', 'sandbox',
          finalOrderId, finalPaymentId, totalAmount, 'RAZORPAY'
        ]
      },
      {
        sql: 'INSERT INTO players (registration_id, player_index, name, full_name, in_game_name, game_uid, email, phone, role) ' +
             'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          finalRegistrationId, 1, 'Aryan', 'Aryan', 'N/A', 'N/A', 'a@a.com', '123', 'CAPTAIN'
        ]
      }
    ]);
    console.log('Batch Insert Success');
  } catch(e) {
    console.error('Insert Failed:', e.message);
  }
}
test();
