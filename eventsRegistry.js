/**
 * CRAFTCON '26 — CENTRALIZED EVENT REGISTRY
 * Authoritative system configuration for all CRAFTCON events across Hackathon, Gaming Arena, and Technical track categories.
 */

const EVENTS_REGISTRY = {
  'HACKATHON': {
    id: 'HACKATHON',
    slug: 'hackathon',
    name: "CRAFTCON '26 Flagship Hackathon",
    category: 'HACKATHON',
    registrationType: 'TEAM',
    minParticipants: 2,
    maxParticipants: 4,
    feePerParticipant: 0,
    fixedFee: 0,
    paymentRequired: false,
    active: true,
    description: '24-hour flagship sandbox hackathon hosted at Desh Bhagat University. Imagine, build, and ship real-world breakthroughs across AI, Web3, Cybersecurity, and CleanTech.',
    image: 'assets/images/hero_dribbble_portal.jpg',
    badge: 'TEAM (2–4 BUILDERS)',
    rules: 'Bring your laptops, student ID cards, and ideation gear. 24 hours of continuous crafting, mentorship, and live demos.',
    tracks: [
      'AI / Machine Learning (Enchanted Forest Biome)',
      'FinTech & Web3 (Nether Trading Post)',
      'Cybersecurity & Privacy (Fortified Citadel)',
      'Sustainability & CleanTech (Overworld Eco-Biome)',
      'Hardware & IoT (Redstone Foundry)',
      'Open Innovation Sandbox (Creative Mode)'
    ]
  },

  'BGMI': {
    id: 'BGMI',
    slug: 'bgmi',
    name: 'BGMI (Battlegrounds Mobile India)',
    category: 'GAMING',
    registrationType: 'SQUAD',
    minParticipants: 4,
    maxParticipants: 4,
    feePerParticipant: 50,
    fixedFee: 200,
    paymentRequired: true,
    active: true,
    description: 'Tactic-driven 36-minute Battle Royale squad showdown on Erangel. 4 players per squad.',
    image: 'assets/images/games/bgmi_banner.jpg',
    badge: 'SQUAD REGISTRATION (4 PLAYERS)'
  },

  'FREE_FIRE': {
    id: 'FREE_FIRE',
    slug: 'free-fire',
    name: 'Free Fire MAX',
    category: 'GAMING',
    registrationType: 'SQUAD',
    minParticipants: 4,
    maxParticipants: 4,
    feePerParticipant: 50,
    fixedFee: 200,
    paymentRequired: true,
    active: true,
    description: 'High-octane fast-paced 4v4 Clash Squad and Battle Royale arena combat. 4 players per squad.',
    image: 'assets/images/games/freefire_banner.jpg',
    badge: 'SQUAD REGISTRATION (4 PLAYERS)'
  },

  'MOBILE_LEGENDS': {
    id: 'MOBILE_LEGENDS',
    slug: 'mobile-legends',
    name: 'Mobile Legends: Bang Bang',
    category: 'GAMING',
    registrationType: 'SQUAD',
    minParticipants: 5,
    maxParticipants: 5,
    feePerParticipant: 50,
    fixedFee: 250,
    paymentRequired: true,
    active: true,
    description: '5v5 MOBA strategic lane warfare, jungle objectives, and base destruction. 5 players per squad.',
    image: 'assets/images/games/mlbb_banner.jpg',
    badge: 'SQUAD REGISTRATION (5 PLAYERS)'
  },

  'LUDO': {
    id: 'LUDO',
    slug: 'ludo',
    name: 'Ludo King Championship',
    category: 'GAMING',
    registrationType: 'SOLO',
    minParticipants: 1,
    maxParticipants: 1,
    feePerParticipant: 50,
    fixedFee: 50,
    paymentRequired: true,
    active: true,
    description: 'Physical board-to-table dice strategy combat with zero ping latency. Solo entry.',
    image: 'assets/images/games/ludo_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  },

  'CHESS': {
    id: 'CHESS',
    slug: 'chess',
    name: 'Speed Chess Masters',
    category: 'GAMING',
    registrationType: 'SOLO',
    minParticipants: 1,
    maxParticipants: 1,
    feePerParticipant: 50,
    fixedFee: 50,
    paymentRequired: true,
    active: true,
    description: '10-minute classical blitz & tactics tournament on physical chessboards. Solo entry.',
    image: 'assets/images/games/chess_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  },

  'CARROM': {
    id: 'CARROM',
    slug: 'carrom',
    name: 'Carrom Strike Tournament',
    category: 'GAMING',
    registrationType: 'SOLO',
    minParticipants: 1,
    maxParticipants: 1,
    feePerParticipant: 50,
    fixedFee: 50,
    paymentRequired: true,
    active: true,
    description: 'Precision striker control, pocket calculation, and queen cover battles. Solo entry.',
    image: 'assets/images/games/carrom_banner.jpg',
    badge: 'SOLO REGISTRATION (1 PLAYER)'
  }
};

/**
 * Calculates authoritative server-side registration fee
 * @param {Array<string>} selectedEventIds
 * @param {Object} eventParticipantCounts { HACKATHON: 3, BGMI: 4 }
 */
function calculateRegistrationFee(selectedEventIds, eventParticipantCounts = {}) {
  let totalAmount = 0;
  const eventBreakdown = [];

  const eventIds = Array.isArray(selectedEventIds) ? selectedEventIds : [selectedEventIds];

  eventIds.forEach(eventId => {
    const config = EVENTS_REGISTRY[eventId];
    if (!config || !config.active) return;

    if (!config.paymentRequired) {
      eventBreakdown.push({
        eventId,
        name: config.name,
        amount: 0,
        note: 'Free Entry'
      });
      return;
    }

    const count = eventParticipantCounts[eventId] || config.minParticipants;
    const eventTotal = count * config.feePerParticipant;
    totalAmount += eventTotal;

    eventBreakdown.push({
      eventId,
      name: config.name,
      participantCount: count,
      feePerParticipant: config.feePerParticipant,
      amount: eventTotal
    });
  });

  return {
    totalAmount,
    amountInPaise: Math.round(totalAmount * 100),
    currency: 'INR',
    breakdown: eventBreakdown
  };
}

module.exports = {
  EVENTS_REGISTRY,
  calculateRegistrationFee
};
