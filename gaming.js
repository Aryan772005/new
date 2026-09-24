/**
 * CRAFTCON '26 — GAMING ARENA FRONTEND ENGINE
 * Centralized Registration Wizard State Machine, Payment Integration & Interactive Mechanics
 */

document.addEventListener('DOMContentLoaded', () => {
  // Page Load Animation Sequence Trigger
  setTimeout(() => {
    document.body.classList.add('page-load-ready');
  }, 60);

  initScrollProgress();
  initMobileNavMenu();
  initGamingCategoryFilter();
  initGameDetailsModal();
  initCentralizedRegistrationWizard();
  initScrollRevealObserver();
  initHeroParallax();
  initCardTiltPhysics();
  initThreeJSScene();
});

/* ==========================================================================
   GAMES REGISTRY & CONFIGURATION
   ========================================================================== */
const GAMES_CATALOGUE = {
  'BGMI': {
    id: 'BGMI',
    name: 'BGMI (Battlegrounds Mobile India)',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    feePerPerson: 50,
    description: 'Tactic-driven 36-minute Battle Royale squad showdown on Erangel. 4 players per squad.',
    image: 'assets/images/games/bgmi_banner.jpg'
  },
  'FREE_FIRE': {
    id: 'FREE_FIRE',
    name: 'Free Fire MAX',
    category: 'online',
    type: 'squad',
    minPlayers: 4,
    feePerPerson: 50,
    description: 'High-octane fast-paced 4v4 Clash Squad and Battle Royale arena combat. 4 players per squad.',
    image: 'assets/images/games/freefire_banner.jpg'
  },
  'MOBILE_LEGENDS': {
    id: 'MOBILE_LEGENDS',
    name: 'Mobile Legends: Bang Bang',
    category: 'online',
    type: 'squad',
    minPlayers: 5,
    feePerPerson: 50,
    description: '5v5 MOBA strategic lane warfare, jungle objectives, and base destruction. 5 players per squad.',
    image: 'assets/images/games/mlbb_banner.jpg'
  },
  'LUDO': {
    id: 'LUDO',
    name: 'Ludo King Championship',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    feePerPerson: 50,
    description: 'Physical board-to-table dice strategy combat with zero ping latency. Solo entry.',
    image: 'assets/images/games/ludo_banner.jpg'
  },
  'CHESS': {
    id: 'CHESS',
    name: 'Speed Chess Masters',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    feePerPerson: 50,
    description: '10-minute classical blitz & tactics tournament on physical chessboards. Solo entry.',
    image: 'assets/images/games/chess_banner.jpg'
  },
  'CARROM': {
    id: 'CARROM',
    name: 'Carrom Strike Tournament',
    category: 'offline',
    type: 'solo',
    minPlayers: 1,
    feePerPerson: 50,
    description: 'Precision striker control, pocket calculation, and queen cover battles. Solo entry.',
    image: 'assets/images/games/carrom_banner.jpg'
  }
};

const WHATSAPP_GROUPS = {
  online: 'https://chat.whatsapp.com/CkX2FAdIZP4BnTo61dVQaF',
  offline: 'https://chat.whatsapp.com/IQxUBMVvl7LH7wJ0ObDxJx'
};

/* ==========================================================================
   1. CATEGORY FILTER TABS
   ========================================================================== */
function initGamingCategoryFilter() {
  const filterBtns = document.querySelectorAll('.gaming-filter-tabs .filter-btn');
  const gameCards = document.querySelectorAll('.games-grid .game-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('click');

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      gameCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
          card.style.animation = 'fadeInStep 0.4s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   2. GAME DETAILS MODAL
   ========================================================================== */
function initGameDetailsModal() {
  const modal = document.getElementById('game-details-modal');
  const closeBtn = document.getElementById('close-details-modal-btn');
  const detailBtns = document.querySelectorAll('.btn-card-details');

  const titleEl = document.getElementById('details-modal-title');
  const imgEl = document.getElementById('details-modal-img');
  const descEl = document.getElementById('details-modal-desc');
  const typeEl = document.getElementById('details-modal-type');
  const playersEl = document.getElementById('details-modal-players');
  const totalEl = document.getElementById('details-modal-total');
  const regBtn = document.getElementById('details-modal-reg-btn');

  detailBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
      const gameId = btn.getAttribute('data-game-id');
      const config = GAMES_CATALOGUE[gameId];
      if (!config) return;

      titleEl.textContent = config.name;
      imgEl.src = config.image;
      descEl.textContent = config.description;
      typeEl.textContent = config.type.toUpperCase();
      playersEl.textContent = config.minPlayers;
      totalEl.textContent = `₹${config.minPlayers * 50}`;

      regBtn.setAttribute('data-preset-game', gameId);

      modal.classList.add('active');
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });
}

/* ==========================================================================
   3. CENTRALIZED REGISTRATION WIZARD STATE MACHINE
   ========================================================================== */
let wizardState = {
  step: 1,
  category: 'online', // 'online' or 'offline'
  gameId: 'BGMI',
  teamName: '',
  college: '',
  captain: { name: '', ign: '', email: '', phone: '' },
  players: [],
  playerCount: 4,
  feePerPerson: 50,
  totalAmount: 200,
  whatsappJoined: false,
  registrationId: null,
  orderId: null,
  paymentId: null
};

let systemConfig = {
  paymentProvider: 'upi',
  upiQrUrl: '/assets/images/upi_qr.png',
  upiId: 'paytm.s2sp1kq@pty'
};

let currentBase64Screenshot = null;

async function fetchSystemConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.success) {
      systemConfig.paymentProvider = (data.paymentProvider || 'upi').toLowerCase().trim();
      systemConfig.upiQrUrl = data.upiQrUrl || '/assets/images/upi_qr.png';
      systemConfig.upiId = data.upiId || 'paytm.s2sp1kq@pty';
    }
  } catch (e) {
    console.warn('Config fetch notice:', e.message);
  }
}

function initCentralizedRegistrationWizard() {
  fetchSystemConfig();

  const modal = document.getElementById('gaming-registration-modal');
  const closeBtn = document.getElementById('close-reg-modal-btn');
  const openBtns = document.querySelectorAll('.open-gaming-reg-btn');

  const prevBtn = document.getElementById('btn-wizard-prev');
  const nextBtn = document.getElementById('btn-wizard-next');

  // Launch modal with optional preset game
  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof playMinecraftSound === 'function') playMinecraftSound('click');

      const presetGame = btn.getAttribute('data-preset-game');
      if (presetGame) {
        window.location.href = `/register?event=${presetGame}`;
      } else {
        window.location.href = '/register';
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Step 1: Category Selection Handler
  const categoryCards = document.querySelectorAll('.category-option-card');
  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
      categoryCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      wizardState.category = card.getAttribute('data-cat');
      // Set default game for category
      if (wizardState.category === 'online') {
        wizardState.gameId = 'BGMI';
      } else {
        wizardState.gameId = 'CHESS';
      }
    });
  });

  // Step 4: WhatsApp Group Handlers
  const btnJoinWhatsapp = document.getElementById('btn-join-whatsapp');
  const btnConfirmWhatsapp = document.getElementById('btn-confirm-whatsapp');

  if (btnJoinWhatsapp && btnConfirmWhatsapp) {
    btnJoinWhatsapp.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('click');
      btnConfirmWhatsapp.disabled = false;
      btnConfirmWhatsapp.style.opacity = '1';
      btnConfirmWhatsapp.style.cursor = 'pointer';
    });

    btnConfirmWhatsapp.addEventListener('click', () => {
      if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
      wizardState.whatsappJoined = true;
      wizardState.step = 5;
      renderWizardStep();
    });
  }

  // Navigation Buttons
  prevBtn.addEventListener('click', () => {
    if (typeof playMinecraftSound === 'function') playMinecraftSound('click');
    if (wizardState.step > 1 && wizardState.step < 6) {
      wizardState.step--;
      renderWizardStep('prev');
    }
  });

  nextBtn.addEventListener('click', () => {
    if (typeof playMinecraftSound === 'function') playMinecraftSound('click');
    validateAndAdvanceStep();
  });

  // Step 6 UPI & Razorpay Controls
  const btnRazorpay = document.getElementById('btn-trigger-razorpay');
  if (btnRazorpay) {
    btnRazorpay.addEventListener('click', () => {
      executeRazorpayPayment();
    });
  }

  const copyUpiBtn = document.getElementById('btn-copy-upi');
  if (copyUpiBtn) {
    copyUpiBtn.addEventListener('click', () => {
      const upiText = document.getElementById('upi-id-display')?.textContent || systemConfig.upiId;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(upiText).then(() => {
          const origText = copyUpiBtn.textContent;
          copyUpiBtn.textContent = 'COPIED!';
          setTimeout(() => { copyUpiBtn.textContent = origText; }, 2000);
        });
      }
    });
  }

  // Screenshot input file reader with client-side canvas compression
  const screenshotInput = document.getElementById('reg-screenshot-input');
  const previewWrap = document.getElementById('screenshot-preview-wrap');
  const previewImg = document.getElementById('screenshot-preview-img');

  if (screenshotInput) {
    screenshotInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds maximum 10MB limit. Please select a smaller payment screenshot.');
        screenshotInput.value = '';
        currentBase64Screenshot = null;
        if (previewWrap) previewWrap.style.display = 'none';
        return;
      }

      const reader = new FileReader();
      reader.onload = function(evt) {
        const rawDataUrl = evt.target.result;
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1000;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          currentBase64Screenshot = canvas.toDataURL('image/jpeg', 0.80);
          if (previewImg) previewImg.src = currentBase64Screenshot;
          if (previewWrap) previewWrap.style.display = 'block';
        };
        img.onerror = function() {
          currentBase64Screenshot = rawDataUrl;
          if (previewImg) previewImg.src = currentBase64Screenshot;
          if (previewWrap) previewWrap.style.display = 'block';
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // UPI Proof Submission Form Handler
  const upiProofForm = document.getElementById('upi-proof-form');
  const btnSubmitProof = document.getElementById('btn-submit-upi-proof');

  if (upiProofForm) {
    upiProofForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const utrInput = document.getElementById('reg-utr-input');
      const utrValue = utrInput ? utrInput.value.trim() : '';

      if (!utrValue || utrValue.length < 6) {
        alert('Please enter a valid 12-digit UTR / Transaction ID.');
        return;
      }

      if (!currentBase64Screenshot) {
        alert('Please select and upload a clear screenshot of your payment receipt.');
        return;
      }

      if (!wizardState.registrationId) {
        alert('Registration record not initialized. Please go back and try again.');
        return;
      }

      try {
        if (btnSubmitProof) {
          btnSubmitProof.disabled = true;
          btnSubmitProof.innerHTML = '<span>⏳ SUBMITTING PROOF...</span>';
        }

        const res = await fetch('/api/payments/submit-proof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            registrationId: wizardState.registrationId,
            utr: utrValue,
            utrTransactionId: utrValue,
            screenshot: currentBase64Screenshot,
            paymentScreenshotUrl: currentBase64Screenshot
          })
        });

        const dataText = await res.text();
        let data;
        try {
          data = JSON.parse(dataText);
        } catch(e) {
          console.error('Server response parse error:', dataText);
        }

        if (res.ok && data && data.success) {
          showRegistrationSuccess({
            registrationId: wizardState.registrationId,
            game: GAMES_CATALOGUE[wizardState.gameId] ? GAMES_CATALOGUE[wizardState.gameId].name : wizardState.gameId,
            teamName: wizardState.teamName,
            college: wizardState.college,
            status: 'PAYMENT_SUBMITTED'
          });
        } else {
          const errorMsg = (data && data.error) ? data.error : `Server returned HTTP ${res.status}`;
          alert(`Submission error: ${errorMsg}`);
          if (btnSubmitProof) {
            btnSubmitProof.disabled = false;
            btnSubmitProof.innerHTML = '<span>📥 SUBMIT PAYMENT PROOF</span>';
          }
        }
      } catch (err) {
        console.error('Submission network error:', err);
        alert('Network connection error while submitting payment proof. Please try again.');
        if (btnSubmitProof) {
          btnSubmitProof.disabled = false;
          btnSubmitProof.innerHTML = '<span>📥 SUBMIT PAYMENT PROOF</span>';
        }
      }
    });
  }

  const btnFinish = document.getElementById('btn-finish-reg');
  if (btnFinish) {
    btnFinish.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  const btnPrint = document.getElementById('btn-print-receipt');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }
}

let activeWizardStepIndex = 1;

/* Render Wizard Step UI with Directional Transitions */
function renderWizardStep(direction = 'next') {
  const progressFill = document.getElementById('wizard-progress-fill');
  const stepTitleEl = document.getElementById('wizard-step-title');
  const stepCounterEl = document.getElementById('wizard-step-counter');
  const footerControls = document.getElementById('wizard-footer-controls');

  const oldStep = activeWizardStepIndex;
  const newStep = wizardState.step;
  activeWizardStepIndex = newStep;

  const isForward = direction === 'next' || newStep > oldStep;

  // Update step panes visibility (7 panes in total) with smooth slide animation
  for (let i = 1; i <= 7; i++) {
    const pane = document.getElementById(`step-pane-${i}`);
    if (pane) {
      pane.classList.remove('slide-in-right', 'slide-in-left', 'slide-out-left', 'slide-out-right');

      if (i === newStep) {
        pane.classList.add('active');
        if (oldStep !== newStep) {
          pane.classList.add(isForward ? 'slide-in-right' : 'slide-in-left');
        }
      } else {
        pane.classList.remove('active');
      }
    }
  }

  // Update Progress Fill %
  const pct = Math.min((wizardState.step / 6) * 100, 100);
  if (progressFill) progressFill.style.width = `${pct}%`;

  if (stepCounterEl) {
    if (wizardState.step <= 6) {
      stepCounterEl.textContent = `STEP ${wizardState.step} OF 6`;
    } else {
      stepCounterEl.textContent = `COMPLETED`;
    }
  }

  if (wizardState.step === 1) {
    stepTitleEl.textContent = 'CHOOSE CATEGORY';
    const cards = document.querySelectorAll('.category-option-card');
    cards.forEach(c => {
      if (c.getAttribute('data-cat') === wizardState.category) c.classList.add('selected');
      else c.classList.remove('selected');
    });
  } else if (wizardState.step === 2) {
    stepTitleEl.textContent = 'SELECT GAME';
    populateStep2GameGrid();
  } else if (wizardState.step === 3) {
    stepTitleEl.textContent = 'ENTER DETAILS';
    populateStep3Form();
  } else if (wizardState.step === 4) {
    stepTitleEl.textContent = 'JOIN WHATSAPP GROUP';
    const btnJoin = document.getElementById('btn-join-whatsapp');
    const groupUrl = WHATSAPP_GROUPS[wizardState.category] || WHATSAPP_GROUPS.online;
    if (btnJoin) {
      btnJoin.href = groupUrl;
    }
    const btnConfirm = document.getElementById('btn-confirm-whatsapp');
    if (btnConfirm && !wizardState.whatsappJoined) {
      btnConfirm.disabled = true;
      btnConfirm.style.opacity = '0.6';
      btnConfirm.style.cursor = 'not-allowed';
    }
  } else if (wizardState.step === 5) {
    stepTitleEl.textContent = 'REVIEW SUMMARY';
    populateStep5Review();
  } else if (wizardState.step === 6) {
    stepTitleEl.textContent = 'PAYMENT PORTAL';
    if (footerControls) footerControls.style.display = 'none';
    prepareStep6Payment();
  } else if (wizardState.step === 7) {
    stepTitleEl.textContent = 'REGISTRATION SUBMITTED';
    if (footerControls) footerControls.style.display = 'none';
  }

  if (wizardState.step <= 5 && footerControls) {
    footerControls.style.display = 'flex';
  }
}

async function prepareStep6Payment() {
  const upiSection = document.getElementById('upi-payment-section');
  const razorpaySection = document.getElementById('razorpay-payment-section');
  const qrImageEl = document.getElementById('upi-qr-image');
  const upiIdDisplayEl = document.getElementById('upi-id-display');
  const payAmountEl = document.getElementById('pay-amount-display');
  const payRegIdEl = document.getElementById('pay-reg-id-display');

  if (payAmountEl) payAmountEl.textContent = `₹${wizardState.totalAmount}`;

  // 1. Create PENDING registration in Turso DB if not already created for this session
  if (!wizardState.registrationId) {
    try {
      const createRes = await fetch('/api/registrations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: wizardState.gameId,
          teamName: wizardState.teamName,
          college: wizardState.college,
          captain: wizardState.captain,
          players: wizardState.players
        })
      });
      const createData = await createRes.json();
      if (createData.success) {
        wizardState.registrationId = createData.registrationId;
      } else {
        alert(createData.error || 'Failed to initialize registration record.');
        return;
      }
    } catch (e) {
      console.error('Error creating registration:', e);
      alert('Network error while initializing registration.');
      return;
    }
  }

  if (payRegIdEl) payRegIdEl.textContent = `REGISTRATION: ${wizardState.registrationId}`;

  // 2. Handle Feature Flag (upi vs razorpay)
  if (systemConfig.paymentProvider === 'upi') {
    if (upiSection) upiSection.style.display = 'block';
    if (razorpaySection) razorpaySection.style.display = 'none';

    if (qrImageEl) qrImageEl.src = systemConfig.upiQrUrl;
    if (upiIdDisplayEl) upiIdDisplayEl.textContent = systemConfig.upiId;
  } else {
    if (upiSection) upiSection.style.display = 'none';
    if (razorpaySection) razorpaySection.style.display = 'block';
  }
}

/* Step 2: Populate Game Selection Grid based on Category */
function populateStep2GameGrid() {
  const grid = document.getElementById('wizard-game-select-grid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.values(GAMES_CATALOGUE).forEach(config => {
    if (config.category === wizardState.category) {
      const tile = document.createElement('div');
      tile.className = `game-option-tile ${wizardState.gameId === config.id ? 'selected' : ''}`;
      tile.innerHTML = `
        <div class="tile-icon-wrap">🎮</div>
        <div>
          <div class="tile-title">${config.name}</div>
          <div class="tile-sub">${config.type.toUpperCase()} • ${config.minPlayers} Player(s) • ₹${config.minPlayers * 50} Total</div>
        </div>
      `;
      tile.addEventListener('click', () => {
        if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
        document.querySelectorAll('.game-option-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        wizardState.gameId = config.id;
      });
      grid.appendChild(tile);
    }
  });
}

/* Step 3: Populate Dynamic Form based on Game Selection */
function populateStep3Form() {
  const config = GAMES_CATALOGUE[wizardState.gameId];
  if (!config) return;

  wizardState.playerCount = config.minPlayers;
  wizardState.totalAmount = config.minPlayers * 50;

  const teamGroup = document.getElementById('team-name-group');
  const captainTitle = document.getElementById('captain-header-title');
  const addPlayersContainer = document.getElementById('additional-players-container');
  const calcBreakdown = document.getElementById('price-calc-breakdown');
  const calcTotal = document.getElementById('price-calc-total');

  if (calcBreakdown) calcBreakdown.textContent = `₹50 / person × ${wizardState.playerCount} Players`;
  if (calcTotal) calcTotal.textContent = `₹${wizardState.totalAmount}`;

  if (config.type === 'squad') {
    if (teamGroup) teamGroup.style.display = 'block';
    if (captainTitle) captainTitle.textContent = 'PLAYER 1 — CAPTAIN DETAILS';
  } else {
    if (teamGroup) teamGroup.style.display = 'none';
    if (captainTitle) captainTitle.textContent = 'PARTICIPANT DETAILS';
  }

  // Render Additional Player Input Forms for Squads
  if (addPlayersContainer) {
    addPlayersContainer.innerHTML = '';
    if (config.type === 'squad' && config.minPlayers > 1) {
      for (let i = 2; i <= config.minPlayers; i++) {
        const pBox = document.createElement('div');
        pBox.style.cssText = 'padding:16px; background:var(--bg-deep); border-radius:8px; margin-bottom:16px; border:1px solid var(--gaming-border);';
        pBox.innerHTML = `
          <h5 style="color:var(--text-white); font-family:'Space Grotesk', sans-serif; margin-bottom:12px;">PLAYER ${i} DETAILS</h5>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label class="form-label-custom">FULL NAME *</label>
              <input type="text" id="player-${i}-name" class="input-field-custom" required placeholder="Player ${i} Name">
            </div>
            <div>
              <label class="form-label-custom">IN-GAME NAME / ID *</label>
              <input type="text" id="player-${i}-ign" class="input-field-custom" required placeholder="In-Game ID">
            </div>
            <div>
              <label class="form-label-custom">EMAIL ADDRESS</label>
              <input type="email" id="player-${i}-email" class="input-field-custom" placeholder="player${i}@email.com">
            </div>
            <div>
              <label class="form-label-custom">PHONE NUMBER</label>
              <input type="tel" id="player-${i}-phone" class="input-field-custom" placeholder="Phone Number">
            </div>
          </div>
        `;
        addPlayersContainer.appendChild(pBox);
      }
    }
  }
}

/* Step Validation & Progression */
function validateAndAdvanceStep() {
  if (wizardState.step === 1) {
    wizardState.step = 2;
    renderWizardStep();
  } else if (wizardState.step === 2) {
    wizardState.step = 3;
    renderWizardStep();
  } else if (wizardState.step === 3) {
    // Validate inputs
    const config = GAMES_CATALOGUE[wizardState.gameId];
    const college = document.getElementById('reg-college') ? document.getElementById('reg-college').value.trim() : '';
    const capName = document.getElementById('captain-name') ? document.getElementById('captain-name').value.trim() : '';
    const capIgn = document.getElementById('captain-ign') ? document.getElementById('captain-ign').value.trim() : '';
    const capEmail = document.getElementById('captain-email') ? document.getElementById('captain-email').value.trim() : '';
    const capPhone = document.getElementById('captain-phone') ? document.getElementById('captain-phone').value.trim() : '';

    let teamName = '';
    if (config.type === 'squad') {
      const teamInput = document.getElementById('reg-team-name');
      teamName = teamInput ? teamInput.value.trim() : '';
      if (!teamName) {
        alert('Please enter a Team Name for your squad.');
        return;
      }
    }

    if (!college || !capName || !capEmail || !capPhone) {
      alert('Please fill in all mandatory Captain & Institution fields.');
      return;
    }

    wizardState.college = college;
    wizardState.teamName = teamName;
    wizardState.captain = { name: capName, ign: capIgn, email: capEmail, phone: capPhone };

    // Collect players
    wizardState.players = [{
      name: capName,
      inGameName: capIgn,
      email: capEmail,
      phone: capPhone
    }];

    if (config.type === 'squad' && config.minPlayers > 1) {
      for (let i = 2; i <= config.minPlayers; i++) {
        const pNameEl = document.getElementById(`player-${i}-name`);
        const pIgnEl = document.getElementById(`player-${i}-ign`);
        const pEmailEl = document.getElementById(`player-${i}-email`) || document.getElementById(`player-${i}-uid`);
        const pPhoneEl = document.getElementById(`player-${i}-phone`);

        const pName = pNameEl ? pNameEl.value.trim() : '';
        const pIgn = pIgnEl ? pIgnEl.value.trim() : '';
        const pEmail = pEmailEl ? pEmailEl.value.trim() : '';
        const pPhone = pPhoneEl ? pPhoneEl.value.trim() : '';

        if (!pName || !pIgn) {
          alert(`Please enter Player ${i}'s Name and In-Game ID.`);
          return;
        }

        wizardState.players.push({
          name: pName,
          inGameName: pIgn,
          email: pEmail,
          gameUid: pEmail,
          phone: pPhone
        });
      }
    }

    wizardState.step = 4;
    renderWizardStep();
  } else if (wizardState.step === 4) {
    if (!wizardState.whatsappJoined) {
      alert('Please join the WhatsApp group and click "I HAVE JOINED THE GROUP" to proceed.');
      return;
    }
    wizardState.step = 5;
    renderWizardStep();
  } else if (wizardState.step === 5) {
    // Step 5 is Review & Summary. Next button advances to Step 6 (Payment Portal) WITHOUT writing to DB yet.
    wizardState.step = 6;
    renderWizardStep();
  }
}

/* Step 5: Populate Review Screen */
function populateStep5Review() {
  const config = GAMES_CATALOGUE[wizardState.gameId];
  const gameNameEl = document.getElementById('review-game-name');
  const teamNameEl = document.getElementById('review-team-name');
  const collegeEl = document.getElementById('review-college');
  const countEl = document.getElementById('review-player-count');
  const totalEl = document.getElementById('review-total-amount');
  const whatsappEl = document.getElementById('review-whatsapp-status');
  const listEl = document.getElementById('review-players-list');

  if (gameNameEl) gameNameEl.textContent = config ? config.name : wizardState.gameId;
  if (teamNameEl) teamNameEl.textContent = (config && config.type === 'squad') ? wizardState.teamName : `Solo (${wizardState.captain.name})`;
  if (collegeEl) collegeEl.textContent = wizardState.college;
  if (countEl) countEl.textContent = wizardState.playerCount;
  if (totalEl) totalEl.textContent = `₹${wizardState.totalAmount}`;
  if (whatsappEl) whatsappEl.textContent = wizardState.whatsappJoined ? '✓ Joined / Confirmed' : 'Not Joined';

  if (listEl) {
    listEl.innerHTML = '';
    wizardState.players.forEach((p, idx) => {
      const li = document.createElement('li');
      li.textContent = `${idx === 0 ? 'Captain' : 'Player ' + (idx + 1)}: ${p.name} (${p.inGameName || 'No IGN'})`;
      listEl.appendChild(li);
    });
  }
}

/* Top Scroll Progress Indicator */
function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress-bar');
  if (!progressBar) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        progressBar.style.width = scrolled.toFixed(1) + '%';
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* Desktop Hero Subtle Parallax Depth */
function initHeroParallax() {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  if (isTouch || window.innerWidth <= 768) return;

  const heroContent = document.querySelector('.gaming-hero-content');
  if (!heroContent) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY < window.innerHeight * 1.2) {
          const translateY = Math.min(scrollY * 0.1, 25);
          heroContent.style.transform = `translateY(${translateY}px)`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* Razorpay Checkout Gateway Connection */
async function executeRazorpayPayment() {
  const pane6 = document.getElementById('step-pane-6');
  let overlay = null;

  if (pane6) {
    overlay = document.createElement('div');
    overlay.className = 'payment-loading-overlay';
    overlay.innerHTML = `
      <div class="payment-loading-spinner"></div>
      <div style="font-family:'Space Grotesk', sans-serif; font-size:1.1rem; color:var(--text-white); font-weight:700;">PREPARING SECURE PAYMENT...</div>
      <div style="font-size:0.8rem; color:var(--color-amber); margin-top:6px;">Connecting to Razorpay Order Gateway</div>
    `;
    pane6.style.position = 'relative';
    pane6.appendChild(overlay);
  }

  try {
    const orderRes = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: wizardState.gameId,
        playerCount: wizardState.playerCount,
        teamName: wizardState.teamName,
        captain: wizardState.captain
      })
    });
    const orderData = await orderRes.json();

    if (overlay) overlay.remove();

    if (!orderData.success) {
      alert(`Payment Initialization Error: ${orderData.error || 'Failed to create payment order.'}`);
      return;
    }

    const keyId = orderData.keyId;
    const orderId = orderData.orderId;
    const amountInPaise = orderData.amount;

    if (typeof Razorpay === 'undefined') {
      alert('Razorpay Checkout SDK is loading. Please try again in a moment.');
      return;
    }

    const options = {
      key: keyId,
      amount: amountInPaise,
      currency: orderData.currency || 'INR',
      name: "CRAFTCON '26 GAMING ARENA",
      description: `Registration for ${orderData.game || wizardState.gameId}`,
      image: 'assets/images/dbu_logo_cropped.png',
      order_id: orderId,
      handler: async function (response) {
        try {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: response.razorpay_order_id || orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              registrationData: wizardState
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            showRegistrationSuccess(verifyData);
          } else {
            alert(`Payment verification failed: ${verifyData.error || 'Invalid signature'}`);
          }
        } catch (e) {
          console.error('Payment verification error:', e);
          alert('Payment verification network error. Please contact tournament support.');
        }
      },
      modal: {
        ondismiss: function () {
          console.log('User closed Razorpay modal without completing payment.');
        }
      },
      prefill: {
        name: wizardState.captain ? wizardState.captain.name : '',
        email: wizardState.captain ? wizardState.captain.email : '',
        contact: wizardState.captain ? wizardState.captain.phone : ''
      },
      theme: { color: '#ff0054' }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    if (overlay) overlay.remove();
    console.error('Razorpay Gateway error:', err);
    alert('Unable to initialize Razorpay payment gateway. Please check connection and try again.');
  }
}

/* Render Final Success Screen */
function showRegistrationSuccess(data) {
  if (typeof playMinecraftSound === 'function') playMinecraftSound('pop');
  const regIdEl = document.getElementById('success-reg-id');
  const gameEl = document.getElementById('succ-game');
  const teamEl = document.getElementById('succ-team');
  const collegeEl = document.getElementById('succ-college');

  if (regIdEl) regIdEl.textContent = data.registrationId || wizardState.registrationId || 'CRAFT-26-PAID';
  if (gameEl) gameEl.textContent = data.game || (GAMES_CATALOGUE[wizardState.gameId] ? GAMES_CATALOGUE[wizardState.gameId].name : wizardState.gameId);
  if (teamEl) teamEl.textContent = data.teamName || wizardState.teamName || `Solo (${wizardState.captain.name})`;
  if (collegeEl) collegeEl.textContent = data.college || wizardState.college;

  wizardState.step = 7;
  renderWizardStep('next');
}

/* ==========================================================================
   4. SCROLL REVEAL OBSERVER & INTERACTIVE ANIMATIONS
   ========================================================================== */
function initScrollRevealObserver() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll, .section-header-centered, .pixel-mask-reveal');
  if (!revealElements.length) return;

  // Set initial visibility fallback so elements are never hidden
  revealElements.forEach(el => {
    el.classList.add('is-visible');
  });

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.05
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, observerOptions);

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // Scroll Spy for Navbar Active Link Indicator
  const sections = document.querySelectorAll('section[id], footer');
  const navLinks = document.querySelectorAll('.desktop-nav .nav-link');

  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href === `#${id}` || (id === 'hero' && href === '#hero')) {
            link.classList.add('active');
          } else if (href && href.startsWith('#') && href !== `#${id}`) {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(sec => spyObserver.observe(sec));
}

function initCardTiltPhysics() {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  if (isTouch || window.innerWidth <= 768) return;

  const cards = document.querySelectorAll('.game-card, .arena-stat-card, .battle-plan-card');

  cards.forEach(card => {
    let ticking = false;
    card.addEventListener('mousemove', (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateX = ((y - centerY) / centerY) * -6;
          const rotateY = ((x - centerX) / centerX) * 6;

          card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px) scale(1.02)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ==========================================================================
   4. PROFESSIONAL THREE.JS REAL-TIME 3D FLOATING VOXEL ANIMATION ENGINE
   ========================================================================== */
let threeScene, threeCamera, threeRenderer;
const floating3DObjects = [];
let particleSystem = null;
let mouseLight = null;

function initThreeJSScene() {
  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = window.innerWidth;
  let height = window.innerHeight;

  // 1. Scene & Camera Setup
  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  threeCamera.position.set(0, 0, 24);

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchOrMobile = window.innerWidth <= 1024 || isTouch || isMobileUA;

  // 2. High-Performance WebGL Renderer
  threeRenderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: !isTouchOrMobile,
    powerPreference: 'high-performance'
  });
  threeRenderer.setSize(width, height);
  threeRenderer.setPixelRatio(isTouchOrMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.5));
  threeRenderer.setClearColor(0x000000, 0);

  // 3. Optimized Dynamic Lighting Rig (1 Ambient, 1 Key Directional, 1 Mouse Specular)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
  threeScene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(5, 12, 10);
  threeScene.add(keyLight);

  // Cursor Specular Point Light (Follows mouse on desktop)
  mouseLight = new THREE.PointLight(0x00f2fe, 2.5, 40);
  mouseLight.position.set(0, 0, 12);
  threeScene.add(mouseLight);

  // 4. Low-Overhead Shaders & Materials for Voxel Cubes
  const obsidianMat = new THREE.MeshPhongMaterial({
    color: 0x1a0933,
    shininess: 60,
    emissive: 0x3a0ca3,
    emissiveIntensity: 0.35
  });

  const emeraldMat = new THREE.MeshPhongMaterial({
    color: 0x00e676,
    shininess: 70,
    emissive: 0x007722,
    emissiveIntensity: 0.35
  });

  const amberMat = new THREE.MeshPhongMaterial({
    color: 0xffbe0b,
    shininess: 70,
    emissive: 0xd97706,
    emissiveIntensity: 0.35
  });

  const cyanMat = new THREE.MeshPhongMaterial({
    color: 0x00f2fe,
    shininess: 80,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4
  });

  const redstoneMat = new THREE.MeshPhongMaterial({
    color: 0xff0054,
    shininess: 70,
    emissive: 0xbe123c,
    emissiveIntensity: 0.4
  });

  // 5. 3D Beacon Relic Group (Floating Hero Feature)
  const relicGroup = new THREE.Group();
  const innerOctaGeom = new THREE.OctahedronGeometry(1.7, 0);
  const innerCoreGeom = new THREE.IcosahedronGeometry(1.1, 0);
  const outerBoxGeom = new THREE.BoxGeometry(2.7, 2.7, 2.7);
  const ringGeom = new THREE.TorusGeometry(3.3, 0.08, 12, 48);

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    wireframe: true,
    transparent: true,
    opacity: 0.7
  });

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffbe0b,
    wireframe: true,
    transparent: true,
    opacity: 0.55
  });

  const innerGem = new THREE.Mesh(innerOctaGeom, obsidianMat);
  const innerCore = new THREE.Mesh(innerCoreGeom, cyanMat);
  const outerCage = new THREE.Mesh(outerBoxGeom, wireframeMat);
  const energyRing = new THREE.Mesh(ringGeom, ringMat);
  energyRing.rotation.x = Math.PI / 3;

  relicGroup.add(innerGem);
  relicGroup.add(innerCore);
  relicGroup.add(outerCage);
  relicGroup.add(energyRing);

  // Position Relic on upper right hero viewport space
  relicGroup.position.set(window.innerWidth > 768 ? 8.5 : 0, 1.8, 0);
  threeScene.add(relicGroup);

  floating3DObjects.push({
    mesh: relicGroup,
    rotSpeedX: 0.007,
    rotSpeedY: 0.011,
    baseY: 1.8,
    floatSpeed: 0.002,
    phase: 0
  });

  // 6. Orbiting Voxel Debris Field (Floating Blocks throughout depth)
  const cubeGeom = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  const midCubeGeom = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const smallCubeGeom = new THREE.BoxGeometry(0.7, 0.7, 0.7);

  const debrisConfigs = [
    { geom: cubeGeom, mat: emeraldMat, pos: [-9.5, 4.8, -3], rx: 0.011, ry: 0.014 },
    { geom: midCubeGeom, mat: amberMat, pos: [-10.5, -4.2, 2], rx: -0.013, ry: 0.009 },
    { geom: cubeGeom, mat: cyanMat, pos: [10.2, -5.2, -2], rx: 0.008, ry: -0.015 },
    { geom: smallCubeGeom, mat: redstoneMat, pos: [6.8, 7.2, -4], rx: -0.01, ry: 0.012 },
    { geom: midCubeGeom, mat: obsidianMat, pos: [-6.2, 8.5, -5], rx: 0.014, ry: -0.008 },
    { geom: smallCubeGeom, mat: emeraldMat, pos: [-4.5, -7.5, -3], rx: 0.012, ry: 0.011 },
    { geom: cubeGeom, mat: redstoneMat, pos: [9.0, 6.0, -6], rx: -0.008, ry: 0.013 },
    { geom: smallCubeGeom, mat: amberMat, pos: [-8.0, 1.5, 3], rx: 0.015, ry: -0.01 }
  ];

  debrisConfigs.forEach((cfg, idx) => {
    const mesh = new THREE.Mesh(cfg.geom, cfg.mat);
    mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    threeScene.add(mesh);

    floating3DObjects.push({
      mesh: mesh,
      rotSpeedX: cfg.rx,
      rotSpeedY: cfg.ry,
      baseY: cfg.pos[1],
      floatSpeed: 0.0018 + idx * 0.0004,
      phase: idx * 1.1
    });
  });

  // 7. High-Performance GPU Particle Dust System
  const particleCount = isTouchOrMobile ? 35 : 80;
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 36;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 36;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
  }

  const particleGeom = new THREE.BufferGeometry();
  particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xffbe0b,
    size: 0.2,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending
  });

  particleSystem = new THREE.Points(particleGeom, particleMat);
  threeScene.add(particleSystem);

  // 8. Mouse Interactive Tracking (Desktop Only)
  let mouseX = 0;
  let mouseY = 0;
  let targetCamX = 0;
  let targetCamY = 0;

  if (!isTouch) {
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // 9. Resize Handler (Throttled)
  let resizeTimeout = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      width = window.innerWidth;
      height = window.innerHeight;
      threeCamera.aspect = width / height;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(width, height);

      if (relicGroup) {
        relicGroup.position.x = width > 768 ? 8.5 : 0;
      }
    }, 100);
  }, { passive: true });

  // 10. Animation Render Loop & Tab/Viewport Pause Observer
  const clock = new THREE.Clock();
  let isCanvasVisible = true;
  let animFrameId = null;
  let currentScrollFrac = 0;

  if ('IntersectionObserver' in window) {
    const canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isCanvasVisible = entry.isIntersecting;
        if (isCanvasVisible && !animFrameId) {
          animFrameId = requestAnimationFrame(animate);
        }
      });
    }, { threshold: 0.02 });
    canvasObserver.observe(canvas);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isCanvasVisible = false;
    } else {
      isCanvasVisible = true;
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(animate);
      }
    }
  });

  function animate() {
    animFrameId = null;

    if (!isCanvasVisible || prefersReducedMotion) {
      return;
    }

    // On mobile devices, suspend rendering when scrolled past 1.5 viewports
    if (isTouchOrMobile && window.pageYOffset > window.innerHeight * 1.5) {
      return;
    }

    const delta = Math.min(clock.getDelta(), 0.1);
    const deltaFactor = delta * 60; // Normalize for 60 FPS
    const elapsedTime = clock.getElapsedTime();

    // Smooth Camera & Specular Mouse Light Track
    targetCamX = mouseX * 2.2;
    targetCamY = -mouseY * 1.8;

    threeCamera.position.x += (targetCamX - threeCamera.position.x) * 0.06 * deltaFactor;
    threeCamera.position.y += (targetCamY - threeCamera.position.y) * 0.06 * deltaFactor;

    if (mouseLight) {
      mouseLight.position.x = mouseX * 15;
      mouseLight.position.y = -mouseY * 11;
    }

    // Lerped Scroll Camera Depth Tracking for buttery smooth motion
    const scrollY = window.pageYOffset || 0;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const targetScrollFrac = scrollY / maxScroll;
    currentScrollFrac += (targetScrollFrac - currentScrollFrac) * 0.08 * deltaFactor;

    threeCamera.position.z = 24 - currentScrollFrac * 12;
    threeScene.rotation.y = currentScrollFrac * 0.85;
    threeScene.position.y = -currentScrollFrac * 4.5;

    // Rotate and Bob 3D Voxel Objects using Delta Time
    floating3DObjects.forEach((obj) => {
      obj.mesh.rotation.x += obj.rotSpeedX * deltaFactor;
      obj.mesh.rotation.y += obj.rotSpeedY * deltaFactor;
      obj.mesh.position.y = obj.baseY + Math.sin(elapsedTime * 2.0 + obj.phase) * 0.45;
    });

    // GPU Floating Dust Rotation (Zero CPU Buffer Re-upload overhead!)
    if (particleSystem) {
      particleSystem.rotation.y += 0.0006 * deltaFactor;
      particleSystem.position.y = Math.sin(elapsedTime * 0.5) * 0.6;
    }

    threeRenderer.render(threeScene, threeCamera);
    animFrameId = requestAnimationFrame(animate);
  }

  animFrameId = requestAnimationFrame(animate);

  if (isTouchOrMobile) {
    window.addEventListener('scroll', () => {
      if (isCanvasVisible && window.pageYOffset <= window.innerHeight * 1.5 && !animFrameId) {
        animFrameId = requestAnimationFrame(animate);
      }
    }, { passive: true });
  }
}


/* ==========================================================================
   5. MOBILE NAVIGATION MENU DRAWER CONTROLLER
   ========================================================================== */
function initMobileNavMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const drawer = document.getElementById('mobile-nav-drawer');
  const navLinks = document.querySelectorAll('.mobile-nav-link, .mobile-action-btn');

  if (!menuBtn || !drawer) return;

  function toggleMenu() {
    const isActive = drawer.classList.contains('active');
    if (isActive) {
      drawer.classList.remove('active');
      menuBtn.classList.remove('active');
    } else {
      drawer.classList.add('active');
      menuBtn.classList.add('active');
    }
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('active');
      menuBtn.classList.remove('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('active') && !drawer.contains(e.target) && !menuBtn.contains(e.target)) {
      drawer.classList.remove('active');
      menuBtn.classList.remove('active');
    }
  });
}



