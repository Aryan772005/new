const nodemailer = require('nodemailer');
const { db } = require('./db');

/**
 * CRAFTCON '26 GAMING ARENA — TRANSACTIONAL EMAIL SERVICE
 * Handles HTML & Plain Text Confirmation Emails & Organizer Notifications
 */

async function getTransporter() {
  const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

  if (provider === 'smtp' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return null; // Fallback to console / mock logging
}

/**
 * Generates Branded HTML Email Template
 */
function buildHtmlEmail(reg, players) {
  const isSquad = reg.registration_type === 'squad';

  let playersRowsHtml = '';
  if (isSquad && players && players.length > 0) {
    playersRowsHtml = players.map(p => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
        <td style="padding: 10px; color: #ffb703; font-weight: bold;">${p.role || 'PLAYER'}</td>
        <td style="padding: 10px; color: #ffffff;">${p.name || p.full_name}</td>
        <td style="padding: 10px; color: #00f2fe;">${p.in_game_name || 'N/A'}</td>
        <td style="padding: 10px; color: #70e000;">${p.game_uid || 'N/A'}</td>
      </tr>
    `).join('');
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>CRAFTCON 2K26 Registration Confirmation</title>
  </head>
  <body style="margin:0; padding:0; background-color:#09090e; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#e2e8f0;">
    <div style="max-width:650px; margin:20px auto; background-color:#12121c; border:2px solid #9d4edd; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(157,78,221,0.3);">
      
      <!-- Header Banner -->
      <div style="background:linear-gradient(135deg, #1e0936 0%, #3c096c 100%); padding:30px 20px; text-align:center; border-bottom:3px solid #ffb703;">
        <h1 style="margin:0; color:#ffb703; font-size:26px; text-transform:uppercase; letter-spacing:2px; text-shadow:0 0 10px rgba(255,183,3,0.5);">
          🎮 CRAFTCON 2K26 GAMING ARENA
        </h1>
        <p style="margin:8px 0 0; color:#70e000; font-size:16px; font-weight:bold;">
          REGISTRATION CONFIRMED ✓
        </p>
      </div>

      <!-- Main Content -->
      <div style="padding:30px 25px;">
        <p style="font-size:16px; color:#ffffff;">Congratulations <strong>${reg.captain_name}</strong>,</p>
        <p style="font-size:15px; color:#94a3b8; line-height:1.6;">
          Your registration for <strong>CRAFTCON 2K26 Gaming Arena</strong> has been successfully processed and verified!
        </p>

        <!-- Registration Voucher Card -->
        <div style="background:rgba(245,166,35,0.08); border:2px dashed #ffb703; border-radius:10px; padding:20px; text-align:center; margin:25px 0;">
          <div style="font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px;">YOUR REGISTRATION ID</div>
          <div style="font-size:24px; color:#ffb703; font-weight:bold; font-family:monospace; letter-spacing:2px; margin:8px 0;">
            ${reg.registration_id}
          </div>
          <div style="font-size:13px; color:#70e000; font-weight:bold;">STATUS: CONFIRMED & PAID</div>
        </div>

        <!-- Summary Details Table -->
        <h3 style="color:#ffffff; border-bottom:1px solid #334155; padding-bottom:8px; margin-top:30px;">REGISTRATION SUMMARY</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:25px; font-size:14px;">
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Selected Game:</td>
            <td style="padding:8px 0; color:#ffffff; font-weight:bold; text-align:right;">${reg.game}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Category:</td>
            <td style="padding:8px 0; color:#ffffff; font-weight:bold; text-align:right;">${(reg.category || 'ONLINE').toUpperCase()} GAMING</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Registration Type:</td>
            <td style="padding:8px 0; color:#ffffff; font-weight:bold; text-align:right;">${(reg.registration_type || 'SOLO').toUpperCase()}</td>
          </tr>
          ${isSquad ? `
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Team Name:</td>
            <td style="padding:8px 0; color:#ffb703; font-weight:bold; text-align:right;">${reg.team_name}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Institution / College:</td>
            <td style="padding:8px 0; color:#ffffff; text-align:right;">${reg.college}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Players Registered:</td>
            <td style="padding:8px 0; color:#ffffff; text-align:right;">${reg.player_count} Player(s)</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Total Amount Paid:</td>
            <td style="padding:8px 0; color:#70e000; font-weight:bold; font-size:16px; text-align:right;">₹${reg.total_amount || reg.amount} INR</td>
          </tr>
          ${reg.payment_id || reg.razorpay_payment_id ? `
          <tr>
            <td style="padding:8px 0; color:#94a3b8;">Payment Reference ID:</td>
            <td style="padding:8px 0; color:#00f2fe; font-family:monospace; text-align:right;">${reg.payment_id || reg.razorpay_payment_id}</td>
          </tr>
          ` : ''}
        </table>

        ${isSquad && players && players.length > 0 ? `
        <!-- Roster Table -->
        <h3 style="color:#ffffff; border-bottom:1px solid #334155; padding-bottom:8px;">ROSTER PARTICIPANTS</h3>
        <table style="width:100%; border-collapse:collapse; background-color:#09090e; border-radius:8px; overflow:hidden; font-size:13px; margin-bottom:25px;">
          <thead>
            <tr style="background-color:#1e1e2d; text-align:left; color:#94a3b8;">
              <th style="padding:10px;">ROLE</th>
              <th style="padding:10px;">NAME</th>
              <th style="padding:10px;">IN-GAME NAME</th>
              <th style="padding:10px;">GAME UID</th>
            </tr>
          </thead>
          <tbody>
            ${playersRowsHtml}
          </tbody>
        </table>
        ` : ''}

        <!-- Event Information -->
        <div style="background-color:#181826; border-left:4px solid #00f2fe; padding:15px; border-radius:4px; margin-top:25px;">
          <h4 style="margin:0 0 10px; color:#00f2fe;">📍 TOURNAMENT EVENT DETAILS</h4>
          <p style="margin:4px 0; font-size:13px; color:#cbd5e1;"><strong>Event:</strong> CRAFTCON 2K26 Gaming Arena</p>
          <p style="margin:4px 0; font-size:13px; color:#cbd5e1;"><strong>Date:</strong> 26–27 October 2026</p>
          <p style="margin:4px 0; font-size:13px; color:#cbd5e1;"><strong>Time:</strong> 10:00 AM Onwards</p>
          <p style="margin:4px 0; font-size:13px; color:#cbd5e1;"><strong>Venue:</strong> Desh Bhagat University Campus</p>
          <p style="margin:4px 0; font-size:13px; color:#cbd5e1;"><strong>Organized By:</strong> Faculty of Engineering, Technology & Computing</p>
        </div>

        <p style="font-size:13px; color:#94a3b8; text-align:center; margin-top:30px;">
          Please show this Registration ID (<strong>${reg.registration_id}</strong>) at the reporting desk on event day.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#09090e; padding:15px 20px; text-align:center; font-size:12px; color:#64748b; border-top:1px solid #1e1e2d;">
        &copy; 2026 CRAFTCON Gaming Arena • Desh Bhagat University. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Generates Plain-Text Fallback Email Body
 */
function buildTextEmail(reg, players) {
  let rosterText = '';
  if (players && players.length > 0) {
    rosterText = players.map(p => ` - ${p.role}: ${p.name || p.full_name} (IGN: ${p.in_game_name || 'N/A'}, UID: ${p.game_uid || 'N/A'})`).join('\n');
  }

  return `
CRAFTCON 2K26 GAMING ARENA — REGISTRATION CONFIRMED

Congratulations ${reg.captain_name},

Your registration for CRAFTCON 2K26 Gaming Arena has been successfully confirmed.

REGISTRATION DETAILS
--------------------------------------------------
Registration ID: ${reg.registration_id}
Game:            ${reg.game}
Category:        ${(reg.category || 'ONLINE').toUpperCase()} GAMING
Type:            ${(reg.registration_type || 'SOLO').toUpperCase()}
Team Name:       ${reg.team_name || 'N/A'}
College:         ${reg.college}
Players:         ${reg.player_count}
Amount Paid:     ₹${reg.total_amount || reg.amount} INR
Payment Status:  PAID
Payment Ref:     ${reg.payment_id || reg.razorpay_payment_id || 'N/A'}

ROSTER PARTICIPANTS
--------------------------------------------------
${rosterText || 'Solo Participant'}

EVENT INFORMATION
--------------------------------------------------
Event:        CRAFTCON 2K26 Gaming Arena
Date:         26–27 October 2026
Time:         10:00 AM onwards
Venue:        Desh Bhagat University
Organized By: Faculty of Engineering, Technology and Computing

Please keep your Registration ID for event entry communication.
`;
}

/**
 * Main Email Dispatcher Method
 */
async function sendRegistrationConfirmation(registrationId) {
  try {
    if (!db) {
      console.warn('[EmailService] DB client not initialized.');
      return { success: false, error: 'Database client not ready' };
    }

    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [registrationId]
    });
    const reg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;

    if (!reg) {
      console.warn(`[EmailService] Registration ${registrationId} not found.`);
      return { success: false, error: 'Registration not found' };
    }

    const playersRes = await db.execute({
      sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
      args: [registrationId]
    });
    const players = playersRes.rows || [];

    const htmlContent = buildHtmlEmail(reg, players);
    const textContent = buildTextEmail(reg, players);

    const fromAddress = process.env.EMAIL_FROM || 'CRAFTCON 2K26 <no-reply@craftcon2026.edu>';
    const toAddress = reg.captain_email;

    const transporter = await getTransporter();

    if (transporter) {
      // Send via SMTP / Nodemailer
      await transporter.sendMail({
        from: fromAddress,
        to: toAddress,
        subject: `CRAFTCON 2K26 Gaming Arena — Registration Confirmed (${reg.registration_id})`,
        html: htmlContent,
        text: textContent
      });

      console.log(`✉️ Email successfully sent to ${toAddress} for ${registrationId}`);
    } else {
      // Mock / Console Fallback Mode
      console.log('\n============================================================');
      console.log(`✉️ MOCK EMAIL SENT [${new Date().toISOString()}]`);
      console.log(`To: ${toAddress}`);
      console.log(`Subject: CRAFTCON 2K26 Gaming Arena — Registration Confirmed (${reg.registration_id})`);
      console.log('------------------------------------------------------------');
      console.log(textContent);
      console.log('============================================================\n');
    }

    // Update DB email status
    await db.execute({
      sql: `UPDATE registrations 
            SET email_status = 'SENT', email_sent_at = CURRENT_TIMESTAMP, email_attempts = email_attempts + 1, last_email_error = NULL
            WHERE registration_id = ?`,
      args: [registrationId]
    });

    // Send Internal Admin Notification if configured
    if (process.env.ADMIN_EMAIL && transporter) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: process.env.ADMIN_EMAIL,
          subject: `[ADMIN ALERT] New Confirmed Registration: ${reg.registration_id} (${reg.game})`,
          text: `New Registration Confirmed!\n\nID: ${reg.registration_id}\nGame: ${reg.game}\nTeam: ${reg.team_name}\nCollege: ${reg.college}\nAmount: ₹${reg.total_amount || reg.amount}`
        });
      } catch (adminErr) {
        console.warn('Failed to send admin email alert:', adminErr.message);
      }
    }

    return { success: true };

  } catch (error) {
    console.error(`❌ Failed to send confirmation email for ${registrationId}:`, error.message);

    // Record email failure state in DB without throwing
    try {
      if (db) {
        await db.execute({
          sql: `UPDATE registrations 
                SET email_status = 'FAILED', email_attempts = email_attempts + 1, last_email_error = ?
                WHERE registration_id = ?`,
          args: [error.message, registrationId]
        });
      }
    } catch (dbErr) {
      console.error('Failed to update email status in DB:', dbErr.message);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Sends notification when user submits payment proof (Pending Verification)
 */
async function sendPaymentProofSubmittedEmail(registrationId) {
  try {
    if (!db) return { success: false, error: 'Database client not ready' };

    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [registrationId]
    });
    const reg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;
    if (!reg) return { success: false, error: 'Registration not found' };

    const fromAddress = process.env.EMAIL_FROM || 'CRAFTCON 2K26 <no-reply@craftcon2026.edu>';
    const toAddress = reg.captain_email;

    const htmlContent = `
      <div style="max-width:600px; margin:20px auto; background-color:#12121c; border:2px solid #f5a623; border-radius:12px; padding:25px; color:#ffffff; font-family:sans-serif;">
        <h2 style="color:#f5a623; margin-top:0;">📋 PAYMENT PROOF RECEIVED</h2>
        <p>Dear <strong>${reg.captain_name}</strong>,</p>
        <p>We have received your payment proof for <strong>${reg.game}</strong>.</p>
        <div style="background:rgba(245,166,35,0.1); border:1px dashed #f5a623; padding:15px; border-radius:8px; margin:15px 0;">
          <div><strong>Registration ID:</strong> ${reg.registration_id}</div>
          <div><strong>UTR / Transaction ID:</strong> ${reg.utr_transaction_id || 'Submitted'}</div>
          <div><strong>Amount Payable:</strong> ₹${reg.total_amount || reg.amount} INR</div>
          <div><strong>Status:</strong> <span style="color:#f5a623; font-weight:bold;">PENDING VERIFICATION</span></div>
        </div>
        <p style="color:#94a3b8; font-size:14px;">
          Our organizing team will verify your UTR and payment screenshot against the bank statement. You will receive your official <strong>Registration Confirmed Pass</strong> as soon as verification is complete.
        </p>
        <p style="color:#64748b; font-size:12px; margin-top:20px;">
          &copy; 2026 CRAFTCON Gaming Arena • Desh Bhagat University
        </p>
      </div>
    `;

    const textContent = `
CRAFTCON 2K26 GAMING ARENA — PAYMENT PROOF RECEIVED

Dear ${reg.captain_name},

Your payment proof for ${reg.game} has been received.

Registration ID: ${reg.registration_id}
UTR / Transaction ID: ${reg.utr_transaction_id || 'Submitted'}
Amount: ₹${reg.total_amount || reg.amount} INR
Status: PENDING VERIFICATION

Our team is verifying your payment. Your official confirmed pass will be emailed once verified.
`;

    const transporter = await getTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: fromAddress,
        to: toAddress,
        subject: `CRAFTCON 2K26 — Payment Proof Received (${reg.registration_id})`,
        html: htmlContent,
        text: textContent
      });
      console.log(`✉️ Payment proof submission email sent to ${toAddress} for ${registrationId}`);
    } else {
      console.log(`✉️ [MOCK EMAIL] Payment proof submission email sent to ${toAddress} for ${registrationId}`);
    }
    return { success: true };
  } catch (err) {
    console.warn(`⚠️ Failed to send payment proof submitted email for ${registrationId}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendRegistrationConfirmation,
  sendPaymentProofSubmittedEmail,
  buildHtmlEmail,
  buildTextEmail
};
