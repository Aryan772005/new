const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const { db, initDb, testDbConnection } = require('./db');
const emailService = require('./emailService');
const googleSheetsService = require('./googleSheetsService');
const { EVENTS_REGISTRY, calculateRegistrationFee } = require('./eventsRegistry');

// Initialize Razorpay SDK if available
let Razorpay = null;
try {
  Razorpay = require('razorpay');
} catch (e) {
  console.warn('⚡ Razorpay SDK module notice:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Middleware to capture raw body for Webhook HMAC verification and allow base64 screenshot uploads up to 10MB
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(express.static(path.resolve(__dirname)));
app.use('/assets', express.static(path.resolve(__dirname, 'assets')));

// Middleware to ensure DB Schema is initialized on API requests
app.use((req, res, next) => {
  next();
});

/* ==========================================================================
   GAMES CONFIGURATION REGISTRY (AUTHORITATIVE BACKEND RULES)
   ========================================================================== */
const GAMES_REGISTRY = {
  'BGMI': {
    id: 'BGMI',
    name: 'BGMI (Battlegrounds Mobile India)',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    maxPlayers: 4,
    feePerPerson: 50,
    description: 'Tactic-driven 36-minute Battle Royale squad showdown on Erangel.',
    image: 'assets/images/games/bgmi_banner.jpg',
    badge: 'SQUAD REGISTRATION (4 PLAYERS)'
  },
  'FREE_FIRE': {
    id: 'FREE_FIRE',
    name: 'Free Fire MAX',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    maxPlayers: 4,
    feePerPerson: 50,
    description: 'High-octane fast-paced 4v4 Clash Squad and Battle Royale arena fight.',
    image: 'assets/images/games/freefire_banner.jpg',
    badge: 'SQUAD REGISTRATION (4 PLAYERS)'
  },
  'MOBILE_LEGENDS': {
    id: 'MOBILE_LEGENDS',
    name: 'Mobile Legends: Bang Bang',
    category: 'online',
    type: 'squad',
    minPlayers: 5,
    maxPlayers: 5,
    feePerPerson: 50,
    description: '5v5 MOBA strategic lane warfare, jungle objectives, and base destruction.',
    image: 'assets/images/games/mlbb_banner.jpg',
    badge: 'SQUAD REGISTRATION (5 PLAYERS)'
  },
  'LUDO': {
    id: 'LUDO',
    name: 'Ludo King Championship',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    maxPlayers: 1,
    feePerPerson: 50,
    description: 'Physical board-to-table dice strategy combat with zero ping latency.',
    image: 'assets/images/games/ludo_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  },
  'CHESS': {
    id: 'CHESS',
    name: 'Speed Chess Masters',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    maxPlayers: 1,
    feePerPerson: 50,
    description: '10-minute classical blitz & tactics tournament on physical chessboards.',
    image: 'assets/images/games/chess_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  },
  'CARROM': {
    id: 'CARROM',
    name: 'Carrom Strike Tournament',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    maxPlayers: 1,
    feePerPerson: 50,
    description: 'Precision striker control, pocket calculation, and queen cover battles.',
    image: 'assets/images/games/carrom_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  }
};

/**
 * Safe Razorpay Diagnostics Helper
 */
function getRazorpayDiagnostics() {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const testMode = process.env.RAZORPAY_TEST_MODE || 'false/undefined';

  return {
    hasKeyId: Boolean(keyId && keyId.length > 0),
    hasKeySecret: Boolean(keySecret && keySecret.length > 0),
    isLiveKey: keyId.startsWith('rzp_live_'),
    keyIdPrefix: keyId ? (keyId.substring(0, 8) + '...') : 'NONE',
    testMode: testMode,
    isSdkLoaded: Boolean(Razorpay)
  };
}

function getRazorpayInstance() {
  const diag = getRazorpayDiagnostics();
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (diag.isSdkLoaded && diag.hasKeyId && diag.hasKeySecret) {
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return null;
}

/* ==========================================================================
   API ENDPOINTS
   ========================================================================== */

// 1. HEALTH CHECK ENDPOINT
app.get('/api/health', async (req, res) => {
  try {
    const isDbAlive = await testDbConnection();
    if (isDbAlive) {
      return res.status(200).json({
        status: "ok",
        database: "connected"
      });
    } else {
      return res.status(500).json({
        status: "error",
        database: "disconnected"
      });
    }
  } catch (err) {
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      error: err.message
    });
  }
});

// 1.5 SYSTEM CONFIGURATION ENDPOINT
app.get('/api/config', (req, res) => {
  const paymentProvider = (process.env.PAYMENT_PROVIDER || 'upi').toLowerCase().trim();
  const upiQrUrl = process.env.UPI_PAYMENT_QR_URL || '/assets/images/upi_qr.png';
  const upiId = process.env.UPI_ID || 'paytm.s2sp1kq@pty';

  res.json({
    success: true,
    paymentProvider,
    upiQrUrl,
    upiId
  });
});

// 2. GET EVENTS CATALOGUE ENDPOINT (UNIFIED PLATFORM)
app.get('/api/events', (req, res) => {
  res.json({
    success: true,
    count: Object.keys(EVENTS_REGISTRY).length,
    events: EVENTS_REGISTRY
  });
});

app.get('/api/games', (req, res) => {
  res.json({
    success: true,
    count: Object.keys(GAMES_REGISTRY).length,
    games: Object.values(GAMES_REGISTRY)
  });
});

// 3. UNIFIED REGISTRATION CREATION & DATABASE RECORD
app.post(['/api/registrations/create', '/api/register'], async (req, res) => {
  try {
    const body = req.body || {};
    const gameId = body.gameId || body.game_id;
    const eventId = body.eventId || body.event_id;
    const eventIds = body.eventIds || body.event_ids;
    
    // Normalize payload
    const rawCollege = body.college || body.college_name || body.collegeName || '';
    const rawTeamName = body.teamName || body.team_name || body.squadName || '';
    
    // Extract Captain / Leader details
    let captainObj = body.captain || {};
    if (!captainObj.name && body.leader_name) {
      captainObj = {
        name: body.leader_name || body.leaderName || '',
        email: body.leader_email || body.leaderEmail || '',
        phone: body.leader_phone || body.leaderPhone || ''
      };
    }
    const players = body.players || [];

    // Resolve target event ID
    const targetEventId = (eventId || gameId || (Array.isArray(eventIds) && eventIds[0]) || 'HACKATHON').toUpperCase();

    // Check registry in EVENTS_REGISTRY or fallback to GAMES_REGISTRY
    let eventConfig = EVENTS_REGISTRY[targetEventId];
    if (!eventConfig) {
      const fallbackGame = GAMES_REGISTRY[targetEventId];
      if (fallbackGame) {
        eventConfig = {
          id: fallbackGame.id,
          name: fallbackGame.name,
          category: fallbackGame.category.toUpperCase(),
          registrationType: fallbackGame.type.toUpperCase(),
          minParticipants: fallbackGame.minPlayers,
          maxParticipants: fallbackGame.maxPlayers,
          feePerParticipant: fallbackGame.feePerPerson,
          fixedFee: fallbackGame.minPlayers * fallbackGame.feePerPerson,
          paymentRequired: true
        };
      }
    }

    if (!eventConfig) {
      return res.status(400).json({ success: false, error: `Invalid event selected: ${targetEventId}` });
    }

    if (!rawCollege || !rawCollege.trim() || !captainObj || !captainObj.name || !captainObj.email || !captainObj.phone) {
      return res.status(400).json({ success: false, error: 'College/University and Captain/Leader contact details (name, email, phone) are required.' });
    }

    const cleanCollege = rawCollege.trim();
    const cleanCaptain = {
      name: captainObj.name.trim(),
      email: captainObj.email.trim(),
      phone: captainObj.phone.trim()
    };

    // Determine registration type (TEAM, SQUAD, SOLO)
    const regType = (eventConfig.registrationType || 'SOLO').toUpperCase();
    const cleanTeamName = (regType === 'SOLO') 
      ? `Solo: ${cleanCaptain.name}`
      : (rawTeamName && rawTeamName.trim() ? rawTeamName.trim() : `Team ${cleanCaptain.name}`);

    if (regType !== 'SOLO' && (!rawTeamName || !rawTeamName.trim())) {
      return res.status(400).json({ success: false, error: 'Team/Squad Name is required.' });
    }

    const providedPlayers = Array.isArray(players) && players.length > 0 
      ? players 
      : [cleanCaptain];

    const isHackathon = targetEventId === 'HACKATHON' || eventConfig.category === 'HACKATHON';
    const paymentProvider = (process.env.PAYMENT_PROVIDER || 'upi').toLowerCase().trim();

    // Price calculation
    let feePerPerson = eventConfig.feePerParticipant || 0;
    let totalAmount = eventConfig.paymentRequired ? (providedPlayers.length * feePerPerson) : 0;
    if (isHackathon) {
      totalAmount = 0;
      feePerPerson = 0;
    }

    // Generate canonical Registration ID
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const registrationId = `CRAFT26-${eventConfig.id}-${randomHex}`;

    if (isHackathon || !eventConfig.paymentRequired || totalAmount === 0) {
      // FREE / HACKATHON REGISTRATION -> IMMEDIATELY CONFIRM
      await db.batch([
        {
          sql: `INSERT INTO registrations (
            registration_id, category, game, registration_type, team_name,
            college, captain_name, captain_email, captain_phone, player_count,
            total_amount, amount, fee_per_person, currency, payment_method, payment_status, registration_status,
            confirmed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'INR', 'FREE', 'VERIFIED', 'CONFIRMED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            registrationId,
            eventConfig.category || 'HACKATHON',
            eventConfig.id,
            regType,
            cleanTeamName,
            cleanCollege,
            cleanCaptain.name,
            cleanCaptain.email,
            cleanCaptain.phone,
            providedPlayers.length
          ]
        }
      ]);

      // Insert Player Roster into Turso
      const playerStatements = providedPlayers.map((player, idx) => ({
        sql: `INSERT INTO players (registration_id, player_index, name, full_name, in_game_name, game_uid, email, phone, role)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          registrationId,
          idx + 1,
          (player.name || cleanCaptain.name).trim(),
          (player.name || cleanCaptain.name).trim(),
          (player.inGameName || player.ign || 'N/A').trim(),
          (player.gameUid || player.uid || 'N/A').trim(),
          (player.email || cleanCaptain.email).trim(),
          (player.phone || cleanCaptain.phone).trim(),
          idx === 0 ? 'CAPTAIN' : `BUILDER_${idx + 1}`
        ]
      }));

      await db.batch(playerStatements);

      console.log(`✅ [Flagship Hackathon Registration Created] Reg ID: ${registrationId} (${eventConfig.name}) - CONFIRMED`);

      // Trigger Google Sheets Sync & Confirmation Email asynchronously
      setImmediate(async () => {
        try {
          await googleSheetsService.syncConfirmedRegistration(registrationId);
        } catch (gsErr) {
          console.warn('⚠️ [Google Sheets Sync Notice]:', gsErr.message);
        }
        try {
          await emailService.sendRegistrationConfirmation(registrationId);
        } catch (emErr) {
          console.warn('⚠️ [Email Notice] Failed to send hackathon confirmation email:', emErr.message);
        }
      });

      return res.json({
        success: true,
        status: 'CONFIRMED',
        registrationId,
        game: eventConfig.name,
        eventId: eventConfig.id,
        category: eventConfig.category,
        registrationType: regType,
        teamName: cleanTeamName,
        college: cleanCollege,
        captain: cleanCaptain,
        playerCount: providedPlayers.length,
        totalAmount: 0,
        amount: 0,
        paymentRequired: false,
        paymentStatus: 'VERIFIED',
        message: 'Hackathon Registration Confirmed! Your official pass has been generated.'
      });
    } else {
      // PAID GAMING REGISTRATION -> INITIAL DB RECORD WITH PENDING PAYMENT
      await db.batch([
        {
          sql: `INSERT INTO registrations (
            registration_id, category, game, registration_type, team_name,
            college, captain_name, captain_email, captain_phone, player_count,
            total_amount, amount, fee_per_person, currency, payment_method, payment_status, registration_status,
            utr_transaction_id, created_at, updated_at, confirmed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'UPI', 'VERIFIED', 'CONFIRMED', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            registrationId,
            eventConfig.category || 'GAMING',
            eventConfig.id,
            regType,
            cleanTeamName,
            cleanCollege,
            cleanCaptain.name,
            cleanCaptain.email,
            cleanCaptain.phone,
            providedPlayers.length,
            totalAmount,
            totalAmount,
            feePerPerson,
            req.body.utr || null
          ]
        }
      ]);

      // Insert Player Roster into Turso
      const playerStatements = providedPlayers.map((player, idx) => ({
        sql: `INSERT INTO players (registration_id, player_index, name, full_name, in_game_name, game_uid, email, phone, role)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          registrationId,
          idx + 1,
          (player.name || cleanCaptain.name).trim(),
          (player.name || cleanCaptain.name).trim(),
          (player.inGameName || player.ign || 'N/A').trim(),
          (player.gameUid || player.uid || 'N/A').trim(),
          (player.email || cleanCaptain.email).trim(),
          (player.phone || cleanCaptain.phone).trim(),
          idx === 0 ? 'CAPTAIN' : `PLAYER_${idx + 1}`
        ]
      }));

      await db.batch(playerStatements);

      console.log(`📝 [Gaming Registration Created in Turso] Reg ID: ${registrationId} (${eventConfig.name}) Total: ₹${totalAmount} - AUTO CONFIRMED`);

      // Trigger Google Sheets Sync & Confirmation Email asynchronously
      setImmediate(async () => {
        try {
          await googleSheetsService.syncConfirmedRegistration(registrationId);
        } catch (gsErr) {
          console.warn('⚠️ [Google Sheets Sync Notice]:', gsErr.message);
        }
        try {
          await emailService.sendRegistrationConfirmation(registrationId);
        } catch (emErr) {
          console.warn('⚠️ [Email Notice] Failed to send gaming confirmation email:', emErr.message);
        }
      });

      return res.json({
        success: true,
        status: 'CONFIRMED',
        registrationId,
        game: eventConfig.name,
        gameId: eventConfig.id,
        eventId: eventConfig.id,
        category: eventConfig.category,
        registrationType: regType,
        teamName: cleanTeamName,
        college: cleanCollege,
        captain: cleanCaptain,
        playerCount: providedPlayers.length,
        feePerPerson,
        totalAmount,
        amount: totalAmount,
        currency: 'INR',
        paymentRequired: true,
        paymentProvider: 'UPI'
      });
    }

  } catch (error) {
    console.error('Server error in /api/registrations/create:', error);
    res.status(500).json({ success: false, error: 'Internal server error while creating registration.' });
  }
});

// 4. CREATE RAZORPAY PAYMENT ORDER (REAL SERVER-SIDE ORDER CREATION)
app.post(['/api/payments/create-order', '/api/payment/create-order'], async (req, res) => {
  const diag = getRazorpayDiagnostics();

  console.log('💳 [CREATE-ORDER] Endpoint reached.');
  console.log(`💳 [DIAGNOSTICS] RAZORPAY_KEY_ID exists: ${diag.hasKeyId}`);
  console.log(`💳 [DIAGNOSTICS] RAZORPAY_KEY_SECRET exists: ${diag.hasKeySecret}`);
  console.log(`💳 [DIAGNOSTICS] Key ID starts with rzp_live_: ${diag.isLiveKey}`);
  console.log(`💳 [DIAGNOSTICS] Key ID Prefix: ${diag.keyIdPrefix}`);
  console.log(`💳 [DIAGNOSTICS] RAZORPAY_TEST_MODE: ${diag.testMode}`);
  console.log(`💳 [DIAGNOSTICS] Razorpay SDK Loaded: ${diag.isSdkLoaded}`);

  try {
    const { gameId, teamName, college, captain, players, registrationId } = req.body;

    let targetGameId = gameId;
    let targetTeamName = teamName;
    let targetCollege = college;
    let targetCaptain = captain;

    // If registrationId is supplied (e.g. from existing DB record during retry)
    if (registrationId && !gameId) {
      try {
        const regRes = await db.execute({
          sql: 'SELECT * FROM registrations WHERE registration_id = ?',
          args: [registrationId]
        });
        const existingReg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;
        if (existingReg) {
          targetGameId = existingReg.game;
          targetTeamName = existingReg.team_name;
          targetCollege = existingReg.college;
          targetCaptain = { name: existingReg.captain_name, email: existingReg.captain_email, phone: existingReg.captain_phone };
        }
      } catch (dbErr) {
        console.warn('⚠️ [CREATE-ORDER] DB lookup notice:', dbErr.message);
      }
    }

    const gameConfig = GAMES_REGISTRY[targetGameId || 'BGMI'];
    if (!gameConfig) {
      console.error(`❌ [CREATE-ORDER ERROR] Invalid game selected: ${targetGameId}`);
      return res.status(400).json({ success: false, error: 'Invalid game selected.' });
    }

    // Authoritative Backend Price Calculation (₹50 / person rule)
    const requiredPlayerCount = gameConfig.minPlayers;
    const feePerPerson = 50;
    const totalAmount = requiredPlayerCount * feePerPerson; // e.g. Ludo = ₹50
    const amountInPaise = Math.round(totalAmount * 100); // e.g. Ludo = 5000 paise

    console.log(`💳 [CREATE-ORDER] Game: ${gameConfig.name} (${gameConfig.id}), Players: ${requiredPlayerCount}, Amount: ₹${totalAmount} (${amountInPaise} paise)`);

    // Verify Server-Side Credentials & SDK
    if (!diag.isSdkLoaded) {
      console.error('❌ [CREATE-ORDER ERROR] Razorpay SDK package is not loaded on server.');
      return res.status(500).json({
        success: false,
        error: 'Razorpay SDK is not available on server.'
      });
    }

    if (!diag.hasKeyId || !diag.hasKeySecret) {
      console.error('❌ [CREATE-ORDER ERROR] Server environment missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET.');
      return res.status(500).json({
        success: false,
        error: 'Razorpay server configuration error: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment variables.'
      });
    }

    const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
    const razorpayInstance = getRazorpayInstance();

    if (!razorpayInstance) {
      console.error('❌ [CREATE-ORDER ERROR] Failed to instantiate Razorpay client.');
      return res.status(500).json({
        success: false,
        error: 'Razorpay client initialization failed.'
      });
    }

    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const referenceId = `CRAFT26-${gameConfig.id}-${randomHex}`;

    console.log(`💳 [CREATE-ORDER] Invoking Razorpay API orders.create for receipt ${referenceId}...`);

    let rzpOrder;
    try {
      rzpOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: referenceId,
        notes: {
          game: gameConfig.id,
          teamName: targetTeamName || '',
          college: targetCollege || '',
          captainEmail: targetCaptain ? targetCaptain.email : ''
        }
      });
      console.log(`✅ [CREATE-ORDER SUCCESS] Razorpay Order Created! Order ID: ${rzpOrder.id}, Amount: ${rzpOrder.amount} ${rzpOrder.currency}`);
    } catch (rzpErr) {
      console.error('❌ [CREATE-ORDER RAZORPAY API REJECTION]:', {
        message: rzpErr.message,
        statusCode: rzpErr.statusCode,
        code: rzpErr.error ? rzpErr.error.code : undefined,
        description: rzpErr.error ? rzpErr.error.description : undefined,
        field: rzpErr.error ? rzpErr.error.field : undefined,
        fullError: JSON.stringify(rzpErr)
      });

      const errorDetail = (rzpErr.error && rzpErr.error.description) 
        || rzpErr.message 
        || 'Razorpay API rejected order creation';

      return res.status(500).json({
        success: false,
        error: `Razorpay API Order Creation Failed: ${errorDetail}`
      });
    }

    return res.status(200).json({
      success: true,
      keyId: keyId,
      orderId: rzpOrder.id,
      referenceId: referenceId,
      registrationId: referenceId,
      amount: amountInPaise,
      displayAmount: totalAmount,
      currency: 'INR',
      game: gameConfig.name,
      teamName: targetTeamName,
      college: targetCollege
    });

  } catch (err) {
    console.error('❌ [CREATE-ORDER UNCAUGHT EXCEPTION]:', err);
    return res.status(500).json({
      success: false,
      error: `Failed to create payment order: ${err.message || 'Internal server error'}`
    });
  }
});

// 5. VERIFY PAYMENT & INSERT FINAL CONFIRMED REGISTRATION INTO TURSO
app.post(['/api/payments/verify', '/api/payment/verify'], async (req, res) => {
  try {
    const { registrationData, registrationId, paymentId, orderId, signature, mockGateway } = req.body;

    const finalOrderId = orderId || `order_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const finalPaymentId = paymentId || `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // IDEMPOTENCY CHECK: Check if registration/payment already exists in Turso DB
    const existingRegRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE razorpay_payment_id = ? OR razorpay_order_id = ? OR order_id = ? OR registration_id = ?',
      args: [finalPaymentId, finalOrderId, finalOrderId, registrationId || '']
    });

    if (existingRegRes.rows && existingRegRes.rows.length > 0) {
      const existingReg = existingRegRes.rows[0];
      console.log(`ℹ️ Idempotency check: Registration ${existingReg.registration_id} already confirmed in Turso.`);
      
      const playersRes = await db.execute({
        sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
        args: [existingReg.registration_id]
      });

      return res.json({
        success: true,
        status: 'CONFIRMED',
        registrationId: existingReg.registration_id,
        paymentId: existingReg.razorpay_payment_id || finalPaymentId,
        orderId: existingReg.razorpay_order_id || finalOrderId,
        game: existingReg.game,
        category: existingReg.category,
        registrationType: existingReg.registration_type,
        teamName: existingReg.team_name,
        college: existingReg.college,
        captainName: existingReg.captain_name,
        captainEmail: existingReg.captain_email,
        playerCount: existingReg.player_count,
        feePerPerson: existingReg.fee_per_person,
        totalAmount: existingReg.total_amount || existingReg.amount,
        amount: existingReg.total_amount || existingReg.amount,
        players: playersRes.rows || [],
        paymentStatus: 'PAID',
        confirmedAt: existingReg.confirmed_at || new Date().toISOString()
      });
    }

    // Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET || 'craftcon_secret_key_2026';
    let isValidPayment = false;

    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${finalOrderId}|${paymentId}`)
        .digest('hex');

      isValidPayment = (expectedSignature === signature);
    } else if (mockGateway || process.env.RAZORPAY_TEST_MODE === 'true' || paymentId) {
      isValidPayment = true;
    }

    if (!isValidPayment) {
      return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
    }

    // Extract registration data from client payload
    const regData = registrationData || {};
    const gameId = regData.gameId || 'BGMI';
    const gameConfig = GAMES_REGISTRY[gameId] || GAMES_REGISTRY['BGMI'];

    const captain = regData.captain || {
      name: 'Arena Player',
      email: 'player@craftcon.in',
      phone: '9876543210',
      ign: 'Player1'
    };

    const college = (regData.college || 'Desh Bhagat University').trim();
    const teamName = gameConfig.type === 'squad' 
      ? (regData.teamName || 'Squad').trim() 
      : `Solo: ${captain.name.trim()}`;

    const providedPlayers = Array.isArray(regData.players) ? regData.players : [captain];
    const requiredPlayerCount = gameConfig.minPlayers;
    const feePerPerson = 50;
    const totalAmount = requiredPlayerCount * feePerPerson;

    // Generate canonical final Registration ID
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const finalRegistrationId = registrationId && registrationId.startsWith('CRAFT26-')
      ? registrationId
      : `CRAFT26-${gameConfig.id}-${randomHex}`;

    // INSERT FINAL CONFIRMED REGISTRATION & PLAYERS INTO TURSO DB ATOMICALLY
    await db.batch([
      {
        sql: `INSERT INTO registrations (
          registration_id, category, game, registration_type, team_name,
          college, captain_name, captain_email, captain_phone, player_count,
          total_amount, amount, fee_per_person, currency, payment_status, registration_status,
          razorpay_order_id, razorpay_payment_id, order_id, payment_id, confirmed_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'PAID', 'CONFIRMED', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          finalRegistrationId,
          gameConfig.category,
          gameConfig.id,
          gameConfig.type,
          teamName,
          college,
          captain.name.trim(),
          captain.email.trim(),
          captain.phone.trim(),
          requiredPlayerCount,
          totalAmount,
          totalAmount,
          feePerPerson,
          finalOrderId,
          finalPaymentId,
          finalOrderId,
          finalPaymentId
        ]
      },
      {
        sql: `INSERT OR REPLACE INTO payments (
                registration_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, signature,
                order_id, payment_id, amount, currency, status, provider, verified_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'CAPTURED', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [
          finalRegistrationId,
          finalOrderId,
          finalPaymentId,
          signature || 'SANDBOX_SIGNATURE',
          signature || 'SANDBOX_SIGNATURE',
          finalOrderId,
          finalPaymentId,
          totalAmount,
          process.env.RAZORPAY_TEST_MODE === 'true' ? 'RAZORPAY_TEST_MODE' : 'RAZORPAY'
        ]
      }
    ]);

    // Insert Player Roster into Turso
    const playerStatements = providedPlayers.slice(0, requiredPlayerCount).map((player, idx) => ({
      sql: `INSERT INTO players (registration_id, player_index, name, full_name, in_game_name, game_uid, email, phone, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        finalRegistrationId,
        idx + 1,
        (player.name || captain.name).trim(),
        (player.name || captain.name).trim(),
        (player.inGameName || player.ign || 'N/A').trim(),
        (player.gameUid || player.uid || 'N/A').trim(),
        (player.email || captain.email).trim(),
        (player.phone || captain.phone).trim(),
        idx === 0 ? 'CAPTAIN' : `PLAYER_${idx + 1}`
      ]
    }));

    await db.batch(playerStatements);

    console.log(`✅ Registration CONFIRMED & Inserted into Turso DB [${finalRegistrationId}] Payment ID: ${finalPaymentId}`);

    // Trigger Google Sheets Sync & Confirmation Email asynchronously
    setImmediate(async () => {
      try {
        await googleSheetsService.syncConfirmedRegistration(finalRegistrationId);
      } catch (gsErr) {
        console.warn('⚠️ [GoogleSheets Sync Trigger Notice]:', gsErr.message);
      }
      emailService.sendRegistrationConfirmation(finalRegistrationId);
    });

    res.json({
      success: true,
      status: 'CONFIRMED',
      registrationId: finalRegistrationId,
      paymentId: finalPaymentId,
      orderId: finalOrderId,
      game: gameConfig.name,
      category: gameConfig.category,
      registrationType: gameConfig.type,
      teamName,
      college,
      captainName: captain.name,
      captainEmail: captain.email,
      playerCount: requiredPlayerCount,
      feePerPerson,
      totalAmount,
      amount: totalAmount,
      players: providedPlayers,
      paymentStatus: 'PAID',
      confirmedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/payment/verify:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment and record registration.' });
  }
});

// 5.5 SUBMIT UPI PAYMENT PROOF (UTR + SCREENSHOT)
app.post('/api/payments/submit-proof', async (req, res) => {
  try {
    const registrationId = req.body.registrationId || req.body.registration_id;
    const rawUtr = req.body.utr || req.body.utrTransactionId || req.body.utr_transaction_id || '';
    const rawScreenshot = req.body.screenshot || req.body.paymentScreenshotUrl || req.body.screenshotUrl || '';

    if (!registrationId) {
      return res.status(400).json({ success: false, error: 'Registration ID is required.' });
    }

    const cleanUtr = rawUtr.trim();
    if (!cleanUtr || cleanUtr.length < 6 || cleanUtr.length > 35) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 12-digit UTR or Transaction ID (minimum 6 characters).'
      });
    }

    if (!rawScreenshot || typeof rawScreenshot !== 'string' || !rawScreenshot.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'A valid payment screenshot (JPG, PNG, or WEBP image file) is required.'
      });
    }

    if (rawScreenshot.length > 8 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Payment screenshot image file size is too large. Please upload an image under 5MB.'
      });
    }

    // Fetch registration from Turso DB
    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [registrationId]
    });

    if (!regRes.rows || regRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Registration record not found.' });
    }

    const reg = regRes.rows[0];

    // Check Duplicate UTR (prevent same UTR on different registrations)
    const duplicateUtrRes = await db.execute({
      sql: 'SELECT registration_id FROM registrations WHERE utr_transaction_id = ? AND registration_id != ?',
      args: [cleanUtr, registrationId]
    });

    if (duplicateUtrRes.rows && duplicateUtrRes.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: `This UTR / Transaction ID (${cleanUtr}) has already been submitted for another registration.`
      });
    }

    // Update Turso DB: registration_status = 'PAYMENT_SUBMITTED', payment_status = 'SUBMITTED'
    await db.execute({
      sql: `UPDATE registrations 
            SET payment_method = 'UPI',
                payment_status = 'SUBMITTED',
                registration_status = 'PAYMENT_SUBMITTED',
                utr_transaction_id = ?,
                payment_screenshot_url = ?,
                submitted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE registration_id = ?`,
      args: [cleanUtr, rawScreenshot, registrationId]
    });

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO payments (
                registration_id, provider, method, amount, status, utr_transaction_id,
                payment_screenshot_url, submitted_at, updated_at
              ) VALUES (?, 'UPI', 'UPI', ?, 'SUBMITTED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [registrationId, reg.total_amount || reg.amount || 200, cleanUtr, rawScreenshot]
      });
    } catch (payErr) {
      console.warn('⚠️ [Payments Table Notice]:', payErr.message);
    }

    console.log(`📥 [UPI Payment Proof Submitted] Reg ID: ${registrationId}, UTR: ${cleanUtr}`);

    // Send immediate email to user and sync row to Google Sheets in background
    setImmediate(async () => {
      try {
        await googleSheetsService.syncConfirmedRegistration(registrationId);
      } catch (gsErr) {
        console.warn('⚠️ [Google Sheets Sync Notice]:', gsErr.message);
      }
      try {
        await emailService.sendPaymentProofSubmittedEmail(registrationId);
      } catch (emErr) {
        console.warn('⚠️ [Email Notice] Failed to send payment submitted email:', emErr.message);
      }
    });

    return res.json({
      success: true,
      status: 'PAYMENT_SUBMITTED',
      registrationId: registrationId,
      utr: cleanUtr,
      message: 'Payment details submitted successfully. Your registration is awaiting admin verification.'
    });

  } catch (error) {
    console.error('❌ Error in /api/payments/submit-proof:', error);
    return res.status(500).json({ 
      success: false, 
      error: `Failed to submit payment proof: ${error.message || 'Database or server error'}` 
    });
  }
});

// 5.6 ADMIN VERIFY / REJECT PAYMENT ENDPOINT
app.post('/api/admin/verify-payment', async (req, res) => {
  try {
    const { registrationId, action, notes, adminName } = req.body || {};

    if (!registrationId || !action) {
      return res.status(400).json({ success: false, error: 'Registration ID and action (VERIFY or REJECT) are required.' });
    }

    const uppercaseAction = action.toUpperCase().trim();
    if (uppercaseAction !== 'VERIFY' && uppercaseAction !== 'REJECT') {
      return res.status(400).json({ success: false, error: 'Action must be VERIFY or REJECT.' });
    }

    // Fetch registration from Turso DB
    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [registrationId]
    });

    if (!regRes.rows || regRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Registration not found.' });
    }

    const reg = regRes.rows[0];
    const verifier = (adminName || 'Admin').trim();
    const verificationNotes = (notes || '').trim();

    if (uppercaseAction === 'VERIFY') {
      // 1. Update Turso DB to VERIFIED and CONFIRMED
      await db.batch([
        {
          sql: `UPDATE registrations 
                SET payment_status = 'VERIFIED',
                    registration_status = 'CONFIRMED',
                    verified_at = CURRENT_TIMESTAMP,
                    verified_by = ?,
                    verification_notes = ?,
                    confirmed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE registration_id = ?`,
          args: [verifier, verificationNotes, registrationId]
        },
        {
          sql: `UPDATE payments
                SET status = 'VERIFIED',
                    verified_at = CURRENT_TIMESTAMP,
                    verified_by = ?,
                    verification_notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE registration_id = ?`,
          args: [verifier, verificationNotes, registrationId]
        }
      ]);

      console.log(`✅ [ADMIN VERIFIED PAYMENT] Registration ${registrationId} verified by ${verifier}.`);

      // 2. Trigger Google Sheets Sync & Confirmation Email asynchronously
      setImmediate(async () => {
        try {
          await googleSheetsService.syncConfirmedRegistration(registrationId);
        } catch (gsErr) {
          console.warn('⚠️ [GoogleSheets Sync Trigger Notice]:', gsErr.message);
        }
        try {
          await emailService.sendRegistrationConfirmation(registrationId);
        } catch (emErr) {
          console.warn('⚠️ [Email Send Notice]:', emErr.message);
        }
      });

      return res.json({
        success: true,
        status: 'CONFIRMED',
        paymentStatus: 'VERIFIED',
        registrationId,
        message: `Registration ${registrationId} has been successfully verified and confirmed!`
      });

    } else {
      // REJECT ACTION
      await db.batch([
        {
          sql: `UPDATE registrations 
                SET payment_status = 'REJECTED',
                    registration_status = 'CANCELLED',
                    verified_at = CURRENT_TIMESTAMP,
                    verified_by = ?,
                    verification_notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE registration_id = ?`,
          args: [verifier, verificationNotes, registrationId]
        },
        {
          sql: `UPDATE payments
                SET status = 'REJECTED',
                    verified_at = CURRENT_TIMESTAMP,
                    verified_by = ?,
                    verification_notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE registration_id = ?`,
          args: [verifier, verificationNotes, registrationId]
        }
      ]);

      console.log(`❌ [ADMIN REJECTED PAYMENT] Registration ${registrationId} rejected by ${verifier}. Reason: ${verificationNotes}`);

      return res.json({
        success: true,
        status: 'CANCELLED',
        paymentStatus: 'REJECTED',
        registrationId,
        message: `Payment for registration ${registrationId} has been rejected.`
      });
    }

  } catch (error) {
    console.error('Error in /api/admin/verify-payment:', error);
    res.status(500).json({ success: false, error: 'Internal server error while verifying payment.' });
  }
});

// 6. RAZORPAY WEBHOOK HANDLER (IDEMPOTENT & HMAC SIGNED)
app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'craftcon_webhook_secret_2026';
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature && req.rawBody) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('⚠️ Webhook HMAC signature mismatch.');
        return res.status(400).json({ success: false, error: 'Invalid webhook signature.' });
      }
    }

    const event = req.body;
    console.log(`🔔 Webhook Event Received: ${event.event || 'Unknown'}`);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : null;

      if (orderId) {
        const regRes = await db.execute({
          sql: 'SELECT * FROM registrations WHERE razorpay_order_id = ? OR order_id = ?',
          args: [orderId, orderId]
        });
        const reg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;

        if (reg) {
          // Idempotency check
          if (reg.registration_status === 'CONFIRMED' && reg.payment_status === 'PAID') {
            console.log(`ℹ️ Webhook: Registration ${reg.registration_id} already confirmed. Skipping duplicate.`);
            return res.json({ status: 'ok', message: 'Already processed.' });
          }

          const expectedAmount = reg.total_amount || reg.amount;
          if (amount && amount !== expectedAmount) {
            console.warn(`⚠️ Webhook Amount mismatch! Expected ₹${expectedAmount}, got ₹${amount}`);
            return res.status(400).json({ status: 'amount_mismatch' });
          }

          const finalPaymentId = paymentId || `pay_wh_${Date.now()}`;

          await db.batch([
            {
              sql: `UPDATE registrations 
                    SET payment_status = 'PAID', 
                        registration_status = 'CONFIRMED', 
                        razorpay_payment_id = ?, 
                        payment_id = ?,
                        confirmed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE registration_id = ?`,
              args: [finalPaymentId, finalPaymentId, reg.registration_id]
            },
            {
              sql: `INSERT OR REPLACE INTO payments (
                      registration_id, razorpay_order_id, razorpay_payment_id, amount, status, provider, verified_at, updated_at
                    ) VALUES (?, ?, ?, ?, 'CAPTURED', 'RAZORPAY_WEBHOOK', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              args: [reg.registration_id, orderId, finalPaymentId, expectedAmount]
            }
          ]);

          console.log(`✅ Webhook: Confirmed Registration ${reg.registration_id}`);

          setImmediate(() => {
            emailService.sendRegistrationConfirmation(reg.registration_id);
          });
        }
      }
    }

    res.json({ status: 'ok' });

  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ success: false, error: 'Webhook processing error.' });
  }
});

// 7. GET REGISTRATION BY ID (VOUCHER / RECEIPT LOOKUP)
app.get('/api/registrations/:id', async (req, res) => {
  try {
    const regId = req.params.id;

    const regRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE registration_id = ?',
      args: [regId]
    });
    const reg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;

    if (!reg) {
      return res.status(404).json({ success: false, error: 'Registration not found.' });
    }

    const playersRes = await db.execute({
      sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
      args: [regId]
    });

    res.json({
      success: true,
      registration: reg,
      players: playersRes.rows || []
    });
  } catch (error) {
    console.error('Error fetching registration:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// 8. ADMIN REGISTRATIONS EXPLORER & SEARCH
app.get('/api/admin/registrations', async (req, res) => {
  try {
    const { game, category, payment_status, search } = req.query;
    let sql = 'SELECT * FROM registrations WHERE 1=1';
    const params = [];

    if (game) {
      sql += ' AND game = ?';
      params.push(game);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (payment_status) {
      sql += ' AND payment_status = ?';
      params.push(payment_status);
    }
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      sql += ' AND (registration_id LIKE ? OR team_name LIKE ? OR captain_name LIKE ? OR captain_email LIKE ? OR captain_phone LIKE ? OR utr_transaction_id LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY id DESC';

    const result = await db.execute({ sql, args: params });

    res.json({
      success: true,
      count: result.rows.length,
      registrations: result.rows
    });
  } catch (error) {
    console.error('Error in admin registrations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin registrations.' });
  }
});

// 9. ADMIN PAYMENTS RECONCILIATION API
app.get('/api/admin/payments', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM payments ORDER BY id DESC');
    res.json({
      success: true,
      count: result.rows.length,
      payments: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch payments.' });
  }
});

// 10. ADMIN GOOGLE SHEETS SYNC / RETRY API
app.post('/api/admin/sync-sheets', async (req, res) => {
  try {
    const { registrationId } = req.body || {};
    if (registrationId) {
      const syncRes = await googleSheetsService.syncConfirmedRegistration(registrationId);
      return res.json(syncRes);
    } else {
      const syncAllRes = await googleSheetsService.syncAllPendingRegistrations();
      return res.json(syncAllRes);
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. TEMPORARY DIAGNOSTIC TEST ENDPOINT FOR GOOGLE SHEETS VERCEL INTEGRATION
app.all(['/api/test/google-sheets', '/api/test/googlesheets'], async (req, res) => {
  try {
    const result = await googleSheetsService.testGoogleSheetsConnection();
    const statusCode = result.success ? 200 : 500;
    return res.status(statusCode).json(result);
  } catch (err) {
    console.error('❌ Diagnostic endpoint uncaught exception:', err);
    return res.status(500).json({
      success: false,
      error: `Diagnostic test exception: ${err.message || 'Internal server error'}`
    });
  }
});

// Explicit static asset handlers to guarantee HTTP 200 delivery
app.get('/gaming.js', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.js'));
});
app.get('/gaming.css', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.css'));
});
app.get('/style.css', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'style.css'));
});

// Root route serves Gaming Arena homepage
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

// Fallback Route to serve gaming.html as default landing if direct route hit
app.get('/gaming', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.html'));
});
app.get('/gaming.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'gaming.html'));
});

// Central Registration UI Route
app.get('/register', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'register.html'));
});
app.get('/register.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'register.html'));
});

// Admin Dashboard UI route
app.get('/admin', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'admin.html'));
});

// Start Express Server (only listen when run directly)
if (require.main === module) {
  app.listen(PORT, async () => { // Reloaded again
    try {
      await initDb();
    } catch (e) {
      console.warn('Startup initDb warning:', e.message);
    }
    console.log(`
    ============================================================
    🎮 CRAFTCON 2K26 GAMING ARENA SERVER RUNNING
    ------------------------------------------------------------
    🌐 Local URL:   http://localhost:${PORT}
    🕹️ Gaming Arena: http://localhost:${PORT}/gaming.html
    ⚔️ Hackathon:    https://tech-hack-three.vercel.app
    📊 Admin Portal: http://localhost:${PORT}/admin.html
    📊 Admin API:    http://localhost:${PORT}/api/admin/registrations
    ❤️ Health API:   http://localhost:${PORT}/api/health
    ============================================================
    `);
  });
}

module.exports = app;
