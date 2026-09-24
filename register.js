/**
 * CRAFTCON '26 — Central Registration System JS
 */

let EVENTS_CATALOGUE = {};
let WIZARD_STATE = {
  selectedEventId: null,
  teamName: '',
  college: '',
  captain: { name: '', email: '', phone: '' },
  participants: []
};

// DOM Elements
const steps = document.querySelectorAll('.wizard-step');
const eventsGrid = document.getElementById('events-grid');
const btnNext1 = document.getElementById('btn-next-1');
const btnNext2 = document.getElementById('btn-next-2');
const btnNext3 = document.getElementById('btn-next-3');
const btnSubmit = document.getElementById('btn-submit');
const participantsContainer = document.getElementById('participants-container');
const paymentSummary = document.getElementById('payment-summary');
const paymentActionArea = document.getElementById('payment-action-area');

// Helper to switch steps
function goToStep(stepNum) {
  steps.forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${stepNum}`).classList.add('active');
}

// Fetch Events on Load
async function fetchEvents() {
  try {
    const res = await fetch('/api/events');
    const data = await res.json();
    if (data.success && data.events) {
      EVENTS_CATALOGUE = data.events;
      renderEventsGrid();
    } else {
      eventsGrid.innerHTML = '<div style="grid-column: 1/-1; padding:20px; color:#ef4444;">Failed to load events catalogue.</div>';
    }
  } catch (err) {
    eventsGrid.innerHTML = '<div style="grid-column: 1/-1; padding:20px; color:#ef4444;">Error connecting to server.</div>';
  }
}

function renderEventsGrid() {
  eventsGrid.innerHTML = '';
  
  // Sort events so Hackathon is first
  const sortedIds = Object.keys(EVENTS_CATALOGUE).sort((a, b) => {
    if (a === 'HACKATHON') return -1;
    if (b === 'HACKATHON') return 1;
    return 0;
  });

  sortedIds.forEach(eventId => {
    const ev = EVENTS_CATALOGUE[eventId];
    if (!ev.active) return;

    const card = document.createElement('div');
    card.className = 'event-card';
    card.dataset.id = eventId;
    
    let feeText = ev.paymentRequired ? `₹${ev.feePerParticipant} per person` : 'FREE';
    if (ev.fixedFee > 0) feeText = `₹${ev.fixedFee} / Team`;
    
    card.innerHTML = `
      <h3>${ev.name}</h3>
      <span class="event-badge">${ev.category}</span>
      <span class="event-badge" style="background:rgba(251,191,36,0.2); color:#fbbf24;">${ev.registrationType}</span>
      <p style="margin-top:10px;">${ev.description}</p>
      <div style="color:#a1a1aa; font-size:0.85rem;">
        <strong>Team Size:</strong> ${ev.minParticipants === ev.maxParticipants ? ev.minParticipants : `${ev.minParticipants}-${ev.maxParticipants}`} <br>
        <strong>Fee:</strong> ${feeText}
      </div>
    `;

    card.addEventListener('click', () => {
      document.querySelectorAll('.event-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      WIZARD_STATE.selectedEventId = eventId;
      btnNext1.disabled = false;
    });
    eventsGrid.appendChild(card);
  });

  // Auto-select from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const presetEvent = urlParams.get('event');
  if (presetEvent) {
    const cardToClick = document.querySelector(`.event-card[data-id="${presetEvent.toUpperCase()}"]`);
    if (cardToClick) {
      cardToClick.click();
      setTimeout(() => goToStep(2), 500); // Auto-advance for better UX
    }
  }
}

// Step 1 -> Step 2
btnNext1.addEventListener('click', () => {
  if (!WIZARD_STATE.selectedEventId) return;
  const ev = EVENTS_CATALOGUE[WIZARD_STATE.selectedEventId];
  
  if (ev.registrationType === 'SOLO') {
    document.getElementById('reg-team-name').parentElement.style.display = 'none';
    document.getElementById('reg-team-name').value = 'SOLO_ENTRY';
  } else {
    document.getElementById('reg-team-name').parentElement.style.display = 'block';
    document.getElementById('reg-team-name').value = '';
  }
  
  goToStep(2);
});

// Step 2 -> Step 3
btnNext2.addEventListener('click', () => {
  const teamName = document.getElementById('reg-team-name').value.trim();
  const college = document.getElementById('reg-college').value.trim();
  const capName = document.getElementById('reg-captain-name').value.trim();
  const capEmail = document.getElementById('reg-captain-email').value.trim();
  const capPhone = document.getElementById('reg-captain-phone').value.trim();

  if (!teamName || !college || !capName || !capEmail || !capPhone) {
    alert("Please fill all fields.");
    return;
  }

  WIZARD_STATE.teamName = teamName;
  WIZARD_STATE.college = college;
  WIZARD_STATE.captain = { name: capName, email: capEmail, phone: capPhone };

  renderParticipantsForm();
  goToStep(3);
});

function renderParticipantsForm() {
  participantsContainer.innerHTML = '';
  const ev = EVENTS_CATALOGUE[WIZARD_STATE.selectedEventId];
  const count = ev.maxParticipants;
  
  // If solo, we can skip participant step or just show Captain as P1
  if (count <= 1) {
    participantsContainer.innerHTML = '<p>You are registering as a solo participant. The captain details will be used.</p>';
    return;
  }

  // Pre-fill Player 1 with Captain details
  for (let i = 1; i <= count; i++) {
    const required = i <= ev.minParticipants ? 'required' : '';
    const isRequiredLabel = i <= ev.minParticipants ? '*' : '(Optional)';
    
    let defaultName = i === 1 ? WIZARD_STATE.captain.name : '';
    
    const isGaming = ev.category === 'GAMING';
    const ingameField = isGaming ? `
      <div style="margin-top:10px; display:flex; gap:10px;">
        <input type="text" id="p${i}-ign" placeholder="In-Game Name (IGN)" ${required}>
        <input type="text" id="p${i}-uid" placeholder="Character UID" ${required}>
      </div>
    ` : '';

    const html = `
      <div class="participant-card">
        <h4>Member ${i} ${isRequiredLabel} ${i===1?'(Captain)':''}</h4>
        <div style="display:flex; gap:10px;">
          <input type="text" id="p${i}-name" placeholder="Full Name" value="${defaultName}" ${required}>
        </div>
        ${ingameField}
      </div>
    `;
    participantsContainer.insertAdjacentHTML('beforeend', html);
  }
}

// Step 3 -> Step 4
btnNext3.addEventListener('click', () => {
  const ev = EVENTS_CATALOGUE[WIZARD_STATE.selectedEventId];
  const participants = [];
  
  if (ev.maxParticipants > 1) {
    for (let i = 1; i <= ev.maxParticipants; i++) {
      const pName = document.getElementById(`p${i}-name`);
      if (!pName) continue;
      
      const nameVal = pName.value.trim();
      const ignEl = document.getElementById(`p${i}-ign`);
      const uidEl = document.getElementById(`p${i}-uid`);
      
      const isReq = i <= ev.minParticipants;
      
      if (isReq && !nameVal) {
        alert(`Please enter details for Member ${i}`);
        return;
      }
      
      if (nameVal) {
        participants.push({
          full_name: nameVal,
          in_game_name: ignEl ? ignEl.value.trim() : '',
          game_uid: uidEl ? uidEl.value.trim() : '',
          role: i === 1 ? 'CAPTAIN' : 'MEMBER'
        });
      }
    }
  } else {
    // Solo
    participants.push({
      full_name: WIZARD_STATE.captain.name,
      role: 'SOLO'
    });
  }

  WIZARD_STATE.participants = participants;
  renderPaymentStep();
  goToStep(4);
});

function renderPaymentStep() {
  const ev = EVENTS_CATALOGUE[WIZARD_STATE.selectedEventId];
  
  let fee = 0;
  if (ev.paymentRequired) {
    fee = ev.fixedFee > 0 ? ev.fixedFee : ev.feePerParticipant * WIZARD_STATE.participants.length;
  }

  paymentSummary.innerHTML = `
    <h3>Registration Summary</h3>
    <p><strong>Event:</strong> ${ev.name}</p>
    <p><strong>Team/Participant:</strong> ${WIZARD_STATE.teamName}</p>
    <p><strong>Total Fee:</strong> ₹${fee}</p>
  `;

  if (fee > 0) {
    paymentActionArea.innerHTML = `
      <div style="margin: 20px auto; max-width: 300px;">
        <img src="/assets/images/upi_qr.png" alt="UPI QR" style="width:100%; border-radius:8px;">
        <p style="margin-top:10px;">Scan to pay ₹${fee}</p>
        <div style="margin-top:15px; text-align:left;">
          <label>UTR / Transaction ID *</label>
          <input type="text" id="reg-utr" class="form-group" style="width:100%; padding:10px; margin-top:5px; background:rgba(0,0,0,0.5); color:#fff; border:1px solid rgba(255,255,255,0.2);" placeholder="Enter 12-digit UTR number" required>
        </div>
      </div>
    `;
  } else {
    paymentActionArea.innerHTML = `<p style="color:#10b981; font-weight:bold; font-size:1.2rem;">Free Entry. No payment required.</p>`;
  }
}

// Step 4 -> Submit
btnSubmit.addEventListener('click', async () => {
  const ev = EVENTS_CATALOGUE[WIZARD_STATE.selectedEventId];
  let fee = 0;
  if (ev.paymentRequired) {
    fee = ev.fixedFee > 0 ? ev.fixedFee : ev.feePerParticipant * WIZARD_STATE.participants.length;
  }

  let utr = null;
  if (fee > 0) {
    const utrEl = document.getElementById('reg-utr');
    if (!utrEl || !utrEl.value.trim()) {
      alert("Please enter the UTR / Transaction ID.");
      return;
    }
    utr = utrEl.value.trim();
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Processing...';

  const payload = {
    eventId: ev.id,
    category: ev.category,
    teamName: WIZARD_STATE.teamName,
    college: WIZARD_STATE.college,
    captain: WIZARD_STATE.captain,
    players: WIZARD_STATE.participants,
    utr: utr,
    amount: fee
  };

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (data.success || data.registrationId) {
      document.getElementById('success-reg-id').textContent = data.registrationId || data.registration?.registration_id || 'CFT-NEW-REG';
      goToStep('success');
    } else {
      alert("Registration failed: " + (data.error || 'Unknown error'));
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'SUBMIT REGISTRATION';
    }
  } catch (err) {
    alert("Network error: " + err.message);
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'SUBMIT REGISTRATION';
  }
});

// Auto fetch events on load
document.addEventListener('DOMContentLoaded', fetchEvents);
