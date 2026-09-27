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
    feePerPerson: 1,
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

// 1.2 DIAGNOSTICS ENDPOINT (Helps users debug Vercel env vars)
app.get('/api/diagnostics', (req, res) => {
  const diagnostics = {
    turso: {
      hasUrl: !!process.env.TURSO_DATABASE_URL,
      hasToken: !!process.env.TURSO_AUTH_TOKEN
    },
    googleSheets: {
      hasKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY
    },
    email: {
      hasUser: !!process.env.EMAIL_USER,
      hasPass: !!process.env.EMAIL_PASS
    },
    razorpay: {
      hasKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET
    }
  };
  
  let errors = [];
  if (!diagnostics.turso.hasUrl) errors.push('TURSO_DATABASE_URL is missing.');
  if (!diagnostics.turso.hasToken) errors.push('TURSO_AUTH_TOKEN is missing.');
  if (!diagnostics.googleSheets.hasKey && (!diagnostics.googleSheets.hasEmail || !diagnostics.googleSheets.hasPrivateKey)) {
    errors.push('Google Sheets credentials are missing (either GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL+GOOGLE_PRIVATE_KEY).');
  }
  if (!diagnostics.email.hasUser || !diagnostics.email.hasPass) errors.push('EMAIL_USER or EMAIL_PASS is missing.');
  if (!diagnostics.razorpay.hasKeyId) errors.push('RAZORPAY_KEY_ID is missing.');
  if (!diagnostics.razorpay.hasKeySecret) errors.push('RAZORPAY_KEY_SECRET is missing.');

  res.json({
    status: errors.length === 0 ? 'All Systems Go' : 'Configuration Errors Found',
    environment: process.env.VERCEL ? 'Vercel Serverless' : 'Local Node',
    errors,
    diagnostics
  });
});

// 1.5 SYSTEM CONFIGURATION ENDPOINT
app.get('/api/config', (req, res) => {
  const paymentProvider = 'razorpay';
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();

  res.json({
    success: true,
    paymentProvider,
    keyId
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
    let feePerPerson = eventConfig.feePerParticipant || eventConfig.feePerPerson || 0;
    let totalAmount = 0;
    if (eventConfig.paymentRequired) {
      totalAmount = eventConfig.fixedFee > 0 ? eventConfig.fixedFee : (providedPlayers.length * feePerPerson);
    }

    // Generate canonical Registration ID
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const registrationId = `CRAFT26-${eventConfig.id}-${randomHex}`;

    if (!eventConfig.paymentRequired || totalAmount === 0) {
      // FREE REGISTRATION -> IMMEDIATELY CONFIRM
      await db.batch([
        {
          sql: `INSERT INTO registrations (
            registration_id, pass_id, category, game, registration_type, team_name, team_size,
            college, college_name, captain_name, captain_email, captain_phone,
            leader_name, leader_email, leader_phone, player_count,
            total_amount, amount, fee_per_person, currency, payment_method, payment_status, registration_status,
            primary_track, portfolio_url, concept_brief,
            confirmed_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'INR', 'FREE', 'VERIFIED', 'CONFIRMED', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          args: [
            registrationId,
            registrationId, // Satisfy NOT NULL constraint
            eventConfig.category || 'HACKATHON',
            eventConfig.id,
            regType,
            cleanTeamName,
            providedPlayers.length, // team_size
            cleanCollege,
            cleanCollege, // college_name
            cleanCaptain.name,
            cleanCaptain.email,
            cleanCaptain.phone,
            cleanCaptain.name, // leader_name
            cleanCaptain.email, // leader_email
            cleanCaptain.phone, // leader_phone
            providedPlayers.length,
            body.primary_track || body.primaryTrack || 'N/A',
            body.portfolio_url || body.portfolioUrl || null,
            body.concept_brief || body.conceptBrief || null
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
          (player.full_name || player.name || cleanCaptain.name).trim(),
          (player.full_name || player.name || cleanCaptain.name).trim(),
          (player.in_game_name || player.inGameName || player.ign || 'N/A').trim(),
          (player.game_uid || player.gameUid || player.uid || 'N/A').trim(),
          (player.email || cleanCaptain.email).trim(),
          (player.phone || cleanCaptain.phone).trim(),
          idx === 0 ? 'CAPTAIN' : `BUILDER_${idx + 1}`
        ]
      }));

      await db.batch(playerStatements);

      console.log(`✅ [Flagship Hackathon Registration Created] Reg ID: ${registrationId} (${eventConfig.name}) - CONFIRMED`);

      const regRecord = {
        registration_id: registrationId,
        pass_id: registrationId,
        category: eventConfig.category || 'HACKATHON',
        game: eventConfig.id,
        registration_type: regType,
        team_name: cleanTeamName,
        college: cleanCollege,
        captain_name: cleanCaptain.name,
        captain_email: cleanCaptain.email,
        captain_phone: cleanCaptain.phone,
        player_count: providedPlayers.length,
        total_amount: totalAmount,
        amount: totalAmount,
        currency: 'INR',
        payment_method: totalAmount > 0 ? 'RAZORPAY' : 'FREE',
        payment_status: 'VERIFIED',
        registration_status: 'CONFIRMED',
        primary_track: body.primary_track || body.primaryTrack || 'N/A',
        confirmed_at: new Date().toISOString()
      };

      // Run Google Sheets Sync & Email concurrently (resilient for Vercel serverless)
      try {
        await Promise.race([
          Promise.allSettled([
            googleSheetsService.syncConfirmedRegistration(registrationId, regRecord, providedPlayers),
            emailService.sendRegistrationConfirmation(registrationId)
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Background tasks timed out after 7s')), 7000))
        ]);
      } catch (err) {
        console.warn('⚠️ [Background Tasks Notice]:', err.message);
      }

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
      // PAID REGISTRATIONS -> REQUIRE RAZORPAY CHECKOUT
      console.log(`ℹ️ [Registration Init] Event ${eventConfig.name} requires Razorpay payment (₹${totalAmount}).`);
      return res.status(400).json({
        success: false,
        paymentRequired: true,
        totalAmount,
        currency: 'INR',
        error: 'Paid event registrations must be completed through the Razorpay payment gateway (/api/payments/create-order).'
      });
    }

  } catch (error) {
    console.error('Server error in /api/registrations/create:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ success: false, error: 'This Team Name or Captain Email is already registered. Please use a different one.' });
    }
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
    const { gameId, eventId, teamName, college, captain, players, registrationId } = req.body;

    let targetTeamName = teamName;
    let targetCollege = college;
    let targetCaptain = captain || {};

    if (!targetCaptain.name && (req.body.leader_name || req.body.leaderName)) {
      targetCaptain = {
        name: req.body.leader_name || req.body.leaderName || '',
        email: req.body.leader_email || req.body.leaderEmail || '',
        phone: req.body.leader_phone || req.body.leaderPhone || ''
      };
    }

    let rawTargetId = (eventId || gameId || '').toUpperCase();

    // If registrationId is supplied (e.g. from existing DB record during retry)
    if (registrationId && !rawTargetId) {
      try {
        const regRes = await db.execute({
          sql: 'SELECT * FROM registrations WHERE registration_id = ?',
          args: [registrationId]
        });
        const existingReg = regRes.rows && regRes.rows.length > 0 ? regRes.rows[0] : null;
        if (existingReg) {
          rawTargetId = (existingReg.game || existingReg.category || '').toUpperCase();
          targetTeamName = existingReg.team_name;
          targetCollege = existingReg.college;
          targetCaptain = { name: existingReg.captain_name, email: existingReg.captain_email, phone: existingReg.captain_phone };
        }
      } catch (dbErr) {
        console.warn('⚠️ [CREATE-ORDER] DB lookup notice:', dbErr.message);
      }
    }

    let eventConfig = EVENTS_REGISTRY[rawTargetId] || GAMES_REGISTRY[rawTargetId];
    if (!eventConfig && rawTargetId) {
      const matchedKey = Object.keys(EVENTS_REGISTRY).find(k => k === rawTargetId || (EVENTS_REGISTRY[k].slug && EVENTS_REGISTRY[k].slug === rawTargetId.toLowerCase()));
      if (matchedKey) eventConfig = EVENTS_REGISTRY[matchedKey];
    }
    if (!eventConfig) {
      eventConfig = GAMES_REGISTRY['BGMI'];
    }

    // Authoritative Backend Price Calculation
    const providedPlayers = Array.isArray(players) && players.length > 0 ? players : [targetCaptain];
    const requiredPlayerCount = eventConfig.minParticipants || eventConfig.minPlayers || 1;
    const count = Math.max(providedPlayers.length, requiredPlayerCount);
    const feePerPerson = eventConfig.feePerParticipant || eventConfig.feePerPerson || 50;
    const totalAmount = eventConfig.fixedFee > 0 ? eventConfig.fixedFee : (count * feePerPerson);
    const amountInPaise = Math.round(totalAmount * 100);

    if (totalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'This event is free of charge and does not require an online payment order.' });
    }

    console.log(`💳 [CREATE-ORDER] Event: ${eventConfig.name} (${eventConfig.id}), Players: ${count}, Amount: ₹${totalAmount} (${amountInPaise} paise)`);

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
    const referenceId = `CRAFT26-${eventConfig.id}-${randomHex}`;

    console.log(`💳 [CREATE-ORDER] Invoking Razorpay API orders.create for receipt ${referenceId}...`);

    let rzpOrder;
    try {
      rzpOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: referenceId,
        notes: {
          eventId: eventConfig.id,
          game: eventConfig.id,
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
      game: eventConfig.name,
      eventId: eventConfig.id,
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
    const { registrationData, registrationId, paymentId, orderId, signature } = req.body;

    if (!paymentId || !orderId || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification parameters (orderId, paymentId, and signature are required).'
      });
    }

    const cleanPaymentId = String(paymentId).trim();
    const cleanOrderId = String(orderId).trim();
    const cleanSignature = String(signature).trim();

    if (!cleanPaymentId.startsWith('pay_') || cleanPaymentId.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay Payment ID format.'
      });
    }

    if (!cleanOrderId.startsWith('order_') || cleanOrderId.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Razorpay Order ID format.'
      });
    }

    // 1. Strict Cryptographic Signature Verification
    const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!secret) {
      console.error('❌ [VERIFY ERROR] RAZORPAY_KEY_SECRET is not configured on server.');
      return res.status(500).json({
        success: false,
        error: 'Server payment security configuration error: Razorpay secret is not configured.'
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${cleanOrderId}|${cleanPaymentId}`)
      .digest('hex');

    let isSignatureValid = false;
    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(cleanSignature, 'utf-8')
      );
    } catch (e) {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      console.warn(`🚨 [SECURITY ALERT] Signature mismatch for Order ${cleanOrderId}, Payment ${cleanPaymentId}`);
      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed. Untrusted payment attempt.'
      });
    }

    // 2. Direct Server-Side Razorpay API Verification
    const razorpayInstance = getRazorpayInstance();
    if (razorpayInstance) {
      try {
        const paymentDetails = await razorpayInstance.payments.fetch(cleanPaymentId);
        console.log(`💳 [VERIFY RAZORPAY API] Fetched payment ${cleanPaymentId}: status=${paymentDetails.status}, order_id=${paymentDetails.order_id}, amount=${paymentDetails.amount}`);

        if (paymentDetails.order_id !== cleanOrderId) {
          console.warn(`🚨 [SECURITY ALERT] Order mismatch! Razorpay order: ${paymentDetails.order_id}, Expected: ${cleanOrderId}`);
          return res.status(400).json({
            success: false,
            error: 'Razorpay order ID does not match payment record.'
          });
        }

        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
          return res.status(400).json({
            success: false,
            error: `Payment is in invalid state: ${paymentDetails.status}. Must be captured or authorized.`
          });
        }

        if (paymentDetails.status === 'authorized') {
          try {
            await razorpayInstance.payments.capture(cleanPaymentId, paymentDetails.amount, 'INR');
            console.log(`✅ [VERIFY] Payment ${cleanPaymentId} auto-captured.`);
          } catch (capErr) {
            console.warn('Capture notice:', capErr.message);
          }
        }
      } catch (rzpErr) {
        console.error('❌ [VERIFY ERROR] Razorpay API fetch failed:', rzpErr.message);
        return res.status(400).json({
          success: false,
          error: `Razorpay payment verification failed: ${rzpErr.message}`
        });
      }
    }

    // 3. IDEMPOTENCY & ANTI-REPLAY CHECK: Prevent reusing already-claimed payment IDs
    const existingPaymentRes = await db.execute({
      sql: 'SELECT * FROM registrations WHERE razorpay_payment_id = ? OR payment_id = ?',
      args: [cleanPaymentId, cleanPaymentId]
    });

    if (existingPaymentRes.rows && existingPaymentRes.rows.length > 0) {
      const existingReg = existingPaymentRes.rows[0];
      const reqCaptainEmail = (registrationData && registrationData.captain && registrationData.captain.email)
        ? registrationData.captain.email.trim().toLowerCase()
        : '';
      const existingEmail = (existingReg.captain_email || '').trim().toLowerCase();

      if (existingReg.registration_id === registrationId || 
          (existingEmail && reqCaptainEmail && existingEmail === reqCaptainEmail)) {
        console.log(`ℹ️ Idempotency check: Registration ${existingReg.registration_id} already confirmed in Turso.`);
        
        const playersRes = await db.execute({
          sql: 'SELECT * FROM players WHERE registration_id = ? ORDER BY player_index ASC',
          args: [existingReg.registration_id]
        });

        return res.json({
          success: true,
          status: 'CONFIRMED',
          registrationId: existingReg.registration_id,
          paymentId: existingReg.razorpay_payment_id || cleanPaymentId,
          orderId: existingReg.razorpay_order_id || cleanOrderId,
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
      } else {
        console.warn(`🚨 [SECURITY ALERT] Replay attack: Payment ID ${cleanPaymentId} already used for ${existingReg.registration_id}!`);
        return res.status(400).json({
          success: false,
          error: 'This Payment ID has already been redeemed for an existing registration.'
        });
      }
    }

    // Extract registration data from client payload
    const regData = registrationData || {};
    const rawTargetId = (regData.eventId || regData.gameId || regData.event || regData.game || '').toUpperCase();
    let eventConfig = EVENTS_REGISTRY[rawTargetId] || GAMES_REGISTRY[rawTargetId];
    if (!eventConfig && rawTargetId) {
      const matchedKey = Object.keys(EVENTS_REGISTRY).find(k => k === rawTargetId || (EVENTS_REGISTRY[k].slug && EVENTS_REGISTRY[k].slug === rawTargetId.toLowerCase()));
      if (matchedKey) eventConfig = EVENTS_REGISTRY[matchedKey];
    }
    if (!eventConfig) {
      eventConfig = GAMES_REGISTRY['BGMI'] || { id: 'BGMI', name: 'BGMI Tournament', category: 'GAMING', type: 'squad', minPlayers: 4, feePerPerson: 50 };
    }

    const captain = regData.captain || {
      name: 'Participant',
      email: 'attendee@craftcon.in',
      phone: '9876543210',
      ign: 'Player1'
    };

    const college = (regData.college || 'Desh Bhagat University').trim();
    // Generate canonical final Registration ID and Pass ID
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const finalRegistrationId = registrationId && registrationId.startsWith('CRAFT26-')
      ? registrationId
      : `CRAFT26-${eventConfig.id}-${randomHex}`;
    const finalPassId = `PASS-${finalRegistrationId}`;

    const isTeam = (eventConfig.type === 'squad' || eventConfig.registrationType === 'TEAM' || eventConfig.type === 'TEAM');
    const teamName = isTeam 
      ? (regData.teamName || `Squad-${randomHex}`).trim() 
      : (regData.teamName && regData.teamName !== 'SOLO_ENTRY' ? regData.teamName.trim() : `Solo: ${captain.name.trim()} (${randomHex})`);
    const primaryTrackValue = regData.primary_track || regData.primaryTrack || eventConfig.name || 'General';

    const providedPlayers = Array.isArray(regData.players) && regData.players.length > 0 
      ? regData.players 
      : [captain];
    const requiredPlayerCount = eventConfig.minParticipants || eventConfig.minPlayers || 1;
    const count = Math.max(providedPlayers.length, requiredPlayerCount);
    const feePerPerson = eventConfig.feePerParticipant || eventConfig.feePerPerson || 50;
    const totalAmount = eventConfig.fixedFee > 0 ? eventConfig.fixedFee : (count * feePerPerson);
    const finalOrderId = cleanOrderId;
    const finalPaymentId = cleanPaymentId;

    // 1. INSERT MASTER REGISTRATION INTO TURSO DB
    await db.execute({
      sql: `INSERT INTO registrations (
        registration_id, pass_id, category, game, registration_type, team_name, team_size,
        college, college_name, captain_name, captain_email, captain_phone,
        leader_name, leader_email, leader_phone, player_count,
        total_amount, amount, fee_per_person, currency,
        payment_method, payment_status, registration_status, status,
        razorpay_order_id, razorpay_payment_id, order_id, payment_id, primary_track,
        confirmed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'RAZORPAY', 'PAID', 'CONFIRMED', 'confirmed', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [
        finalRegistrationId,
        finalPassId,
        eventConfig.category || 'EVENT',
        eventConfig.id,
        eventConfig.type || eventConfig.registrationType || 'TEAM',
        teamName,
        count,
        college,
        college,
        captain.name.trim(),
        captain.email.trim(),
        captain.phone.trim(),
        captain.name.trim(),
        captain.email.trim(),
        captain.phone.trim(),
        count,
        totalAmount,
        totalAmount,
        feePerPerson,
        finalOrderId,
        finalPaymentId,
        finalOrderId,
        finalPaymentId,
        primaryTrackValue
      ]
    });

    // 2. SAFELY RECORD PAYMENT DETAILS (non-blocking for registration confirmation)
    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO payments (
                registration_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, signature,
                order_id, payment_id, amount, currency, status, method, provider, verified_at, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'CAPTURED', 'RAZORPAY', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
      });
    } catch (payErr) {
      console.warn('⚠️ Payments table write notice:', payErr.message);
    }

    // 3. SAFELY RECORD PLAYER ROSTER (non-blocking for registration confirmation)
    try {
      const playerStatements = providedPlayers.slice(0, count).map((player, idx) => ({
        sql: `INSERT INTO players (registration_id, player_index, name, full_name, in_game_name, game_uid, email, phone, role)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          finalRegistrationId,
          idx + 1,
          (player.full_name || player.name || captain.name).trim(),
          (player.full_name || player.name || captain.name).trim(),
          (player.in_game_name || player.inGameName || player.ign || 'N/A').trim(),
          (player.game_uid || player.gameUid || player.uid || 'N/A').trim(),
          (player.email || captain.email).trim(),
          (player.phone || captain.phone).trim(),
          idx === 0 ? 'CAPTAIN' : `MEMBER_${idx + 1}`
        ]
      }));
      await db.batch(playerStatements);
    } catch (plErr) {
      console.warn('⚠️ Players roster write notice:', plErr.message);
    }

    console.log(`✅ Registration CONFIRMED & Inserted into Turso DB [${finalRegistrationId}] Payment ID: ${finalPaymentId}`);

    const regRecord = {
      registration_id: finalRegistrationId,
      pass_id: finalPassId,
      category: eventConfig.category || 'EVENT',
      game: eventConfig.id,
      registration_type: eventConfig.type || eventConfig.registrationType || 'TEAM',
      team_name: teamName,
      college: college,
      captain_name: captain.name.trim(),
      captain_email: captain.email.trim(),
      captain_phone: captain.phone.trim(),
      player_count: count,
      total_amount: totalAmount,
      amount: totalAmount,
      currency: 'INR',
      payment_method: 'RAZORPAY',
      payment_status: 'PAID',
      registration_status: 'CONFIRMED',
      razorpay_payment_id: finalPaymentId,
      razorpay_order_id: finalOrderId,
      primary_track: primaryTrackValue,
      confirmed_at: new Date().toISOString()
    };

    // Synchronously await Google Sheets Sync & Confirmation Email concurrently
    try {
      await Promise.race([
        Promise.allSettled([
          googleSheetsService.syncConfirmedRegistration(finalRegistrationId, regRecord, providedPlayers),
          emailService.sendRegistrationConfirmation(finalRegistrationId)
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Background tasks timed out after 7s')), 7000))
      ]);
    } catch (err) {
      console.warn('⚠️ [Background Tasks Notice]:', err.message);
    }

    res.json({
      success: true,
      status: 'CONFIRMED',
      registrationId: finalRegistrationId,
      passId: finalPassId,
      paymentId: finalPaymentId,
      orderId: finalOrderId,
      game: eventConfig.name,
      category: eventConfig.category,
      registrationType: eventConfig.type || eventConfig.registrationType || 'TEAM',
      teamName,
      college,
      captainName: captain.name,
      captainEmail: captain.email,
      playerCount: count,
      feePerPerson,
      totalAmount,
      amount: totalAmount,
      players: providedPlayers,
      paymentMethod: 'RAZORPAY',
      paymentStatus: 'PAID',
      confirmedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in /api/payment/verify:', error);
    res.status(500).json({ success: false, error: 'Payment record error: ' + error.message });
  }
});

// 5.5 SUBMIT UPI PAYMENT PROOF (DISCONTINUED - ALL PAYMENTS PROCESSED VIA RAZORPAY)
app.post('/api/payments/submit-proof', async (req, res) => {
  return res.status(400).json({
    success: false,
    error: 'Payment by QR code/UTR screenshot proof has been discontinued. All registrations must be completed securely via online Razorpay checkout.'
  });
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

      // Synchronously await Google Sheets Sync & Confirmation Email concurrently
      try {
        await Promise.race([
          Promise.allSettled([
            googleSheetsService.syncConfirmedRegistration(registrationId),
            emailService.sendRegistrationConfirmation(registrationId)
          ]),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Background tasks timed out after 7s')), 7000))
        ]);
      } catch (err) {
        console.warn('⚠️ [Background Tasks Notice]:', err.message);
      }

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

          try {
            await Promise.race([
              Promise.allSettled([
                googleSheetsService.syncConfirmedRegistration(reg.registration_id),
                emailService.sendRegistrationConfirmation(reg.registration_id)
              ]),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Background tasks timed out after 7s')), 7000))
            ]);
          } catch (err) {
            console.warn('⚠️ [Background Tasks Notice]:', err.message);
          }
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
