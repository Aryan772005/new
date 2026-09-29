/**
 * CRAFTCON '26 — ZERO-LATENCY PROCEDURAL WEB AUDIO ENGINE
 * Synthesizes ultra-pleasing, tactile, mobile-optimized UI audio feedback
 * using the Web Audio API with zero external file dependencies.
 *
 * 100% audio compatibility on iOS Safari, Android Chrome, Samsung Internet,
 * Windows, macOS, and Linux touch & desktop devices.
 */

(function () {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let dynamicsLimiter = null;
  let isUnlocked = false;
  let lastSoundTime = 0;
  let lastInteractiveEl = null;

  // Track touch position to distinguish taps from scrolling on mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouchScroll = false;

  // Clear any legacy mute preferences so sound ALWAYS plays loud and clear
  try {
    localStorage.removeItem('craftcon_sound_muted');
  } catch (e) {}

  /**
   * Lazily initialize AudioContext on user gesture
   */
  function initAudioContext() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioCtx = new AudioContextClass();

      // Master output gain calibrated for punchy volume on phone speakers and headphones
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.94, audioCtx.currentTime);

      // Dynamics limiter with fast release for clean punch without clipping
      dynamicsLimiter = audioCtx.createDynamicsCompressor();
      dynamicsLimiter.threshold.setValueAtTime(-5, audioCtx.currentTime);
      dynamicsLimiter.knee.setValueAtTime(6, audioCtx.currentTime);
      dynamicsLimiter.ratio.setValueAtTime(2.0, audioCtx.currentTime);
      dynamicsLimiter.attack.setValueAtTime(0.002, audioCtx.currentTime);
      dynamicsLimiter.release.setValueAtTime(0.12, audioCtx.currentTime);

      masterGain.connect(dynamicsLimiter);
      dynamicsLimiter.connect(audioCtx.destination);
    } catch (err) {
      console.warn('Web Audio initialization error:', err);
    }

    return audioCtx;
  }

  /**
   * Universal audio unlocker for iOS Safari, Android Chrome, and Desktop
   * Must execute synchronously inside user interaction
   */
  function unlockAudioEngine() {
    const ctx = initAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      ctx.resume().catch(() => {});
    }

    if (!isUnlocked) {
      try {
        // Play 1-sample silent buffer directly to destination to satisfy iOS WebKit policy
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isUnlocked = true;
      } catch (e) {}
    }
  }

  // Pre-unlock on any initial user touch, click, or keypress
  ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudioEngine, { capture: true, passive: true });
  });

  /**
   * Haptic vibration feedback for mobile devices (supported on Android Chrome)
   */
  function hapticFeedback(pattern = 14) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  /**
   * High-End Procedural Sound Synthesizers
   * Specially calibrated frequencies & envelopes for maximum acoustic clarity on phone speakers & desktop
   */
  const SoundSynthesizers = {
    // 1. Crisp, tactile mechanical microswitch click (buttons, links, pills, standard actions)
    tactileClick(ctx, now) {
      // Layer A: Crisp high-frequency snap (audible on small phone speakers)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1900, now);
      osc1.frequency.exponentialRampToValueAtTime(650, now + 0.045);

      gain1.gain.setValueAtTime(0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // Layer B: Resonant punch body
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now);
      osc2.frequency.exponentialRampToValueAtTime(190, now + 0.06);

      gain2.gain.setValueAtTime(0.55, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now);
      osc2.stop(now + 0.08);
    },

    // 2. Juicy Minecraft hotbar / inventory item bubble pop (cards, tiles, slots, badges)
    bubblePop(ctx, now) {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(460, now);
      osc1.frequency.exponentialRampToValueAtTime(1420, now + 0.07);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);

      gain1.gain.setValueAtTime(0.85, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.085);

      // Subtle bright overtone pip for sparkling clarity
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(920, now);
      osc2.frequency.exponentialRampToValueAtTime(2600, now + 0.06);

      gain2.gain.setValueAtTime(0.40, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now);
      osc2.stop(now + 0.07);
    },

    // 3. Shimmering Cyber Chime for Primary CTAs ("REGISTER NOW", "SUBMIT", "CONFIRM", "PAY")
    cyberChime(ctx, now) {
      const chord = [
        { f: 587.33, t: 'triangle', g: 0.50, d: 0.00 }, // D5
        { f: 783.99, t: 'sine',     g: 0.52, d: 0.03 }, // G5
        { f: 987.77, t: 'triangle', g: 0.55, d: 0.06 }, // B5
        { f: 1174.66, t: 'sine',    g: 0.58, d: 0.09 }, // D6
        { f: 1567.98, t: 'triangle', g: 0.50, d: 0.12 }  // G6
      ];

      chord.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + note.d;

        osc.type = note.t;
        osc.frequency.setValueAtTime(note.f, start);

        gain.gain.setValueAtTime(note.g, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(start);
        osc.stop(start + 0.28);
      });
    },

    // 4. Dual-action mechanical toggle switch (toggles, checkboxes, tabs, switches)
    mechanicalSwitch(ctx, now) {
      // First click: push stroke
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(960, now);
      osc1.frequency.exponentialRampToValueAtTime(420, now + 0.028);

      gain1.gain.setValueAtTime(0.55, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.03);

      // Second click: latch engagement snap
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(560, now + 0.025);
      osc2.frequency.exponentialRampToValueAtTime(260, now + 0.065);

      gain2.gain.setValueAtTime(0.65, now + 0.025);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.025);
      osc2.stop(now + 0.07);
    },

    // 5. Soft ambient page tap (clicking anywhere on the screen / canvas / background)
    softTick(ctx, now) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(820, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.045);
    },

    // 6. Smooth air whoosh (drawers, modal open/close, accordion toggles)
    whoosh(ctx, now) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.16);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(380, now);
      filter.frequency.exponentialRampToValueAtTime(1900, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.16);
      filter.Q.setValueAtTime(3.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      noise.start(now);
      noise.stop(now + 0.16);
    },

    // 7. Iconic Minecraft XP Level Up Arpeggio (success modal, payment confirmed, ticket print)
    levelUp(ctx, now) {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        const start = now + idx * 0.06;

        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.58, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(start);
        osc.stop(start + 0.24);
      });
    },

    // 8. Playful synthesized Villager "Hmm!" sound for FAQ
    villager(ctx, now) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(240, now);
      osc1.frequency.exponentialRampToValueAtTime(165, now + 0.12);
      osc1.frequency.exponentialRampToValueAtTime(185, now + 0.22);

      osc2.frequency.setValueAtTime(246, now);
      osc2.frequency.exponentialRampToValueAtTime(170, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(190, now + 0.22);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(840, now);
      filter.Q.setValueAtTime(4.2, now);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.24);
      osc2.stop(now + 0.24);
    }
  };

  let lastPlayedSoundType = '';
  let lastPlayedSoundTime = 0;

  /**
   * Sound Engine Public API
   */
  const SoundEngine = {
    play(soundType = 'tactileClick') {
      const nowMs = Date.now();
      if (soundType === lastPlayedSoundType && nowMs - lastPlayedSoundTime < 60) {
        return;
      }
      lastPlayedSoundType = soundType;
      lastPlayedSoundTime = nowMs;

      const ctx = initAudioContext();
      if (!ctx) return;

      const trigger = () => {
        const now = ctx.currentTime;
        switch (soundType) {
          case 'chime':
          case 'cyberChime':
          case 'primary':
            SoundSynthesizers.cyberChime(ctx, now);
            hapticFeedback(25);
            break;
          case 'pop':
          case 'bubblePop':
          case 'item':
            SoundSynthesizers.bubblePop(ctx, now);
            hapticFeedback(16);
            break;
          case 'switch':
          case 'toggle':
          case 'tab':
            SoundSynthesizers.mechanicalSwitch(ctx, now);
            hapticFeedback(18);
            break;
          case 'whoosh':
          case 'drawer':
          case 'modal':
            SoundSynthesizers.whoosh(ctx, now);
            hapticFeedback(20);
            break;
          case 'level_up':
          case 'levelUp':
          case 'success':
            SoundSynthesizers.levelUp(ctx, now);
            hapticFeedback([30, 50, 35]);
            break;
          case 'villager':
          case 'faq':
            SoundSynthesizers.villager(ctx, now);
            hapticFeedback(18);
            break;
          case 'tick':
          case 'softTick':
            SoundSynthesizers.softTick(ctx, now);
            hapticFeedback(10);
            break;
          case 'click':
          case 'tactileClick':
          default:
            SoundSynthesizers.tactileClick(ctx, now);
            hapticFeedback(15);
            break;
        }
      };

      if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
        ctx.resume().then(() => {
          trigger();
        }).catch(() => {
          trigger();
        });
      } else {
        trigger();
      }
    },

    isMuted() {
      return false; // Sound is always enabled by default
    },

    status() {
      return {
        hasContext: !!audioCtx,
        state: audioCtx ? audioCtx.state : 'uninitialized',
        isUnlocked: isUnlocked
      };
    }
  };

  /**
   * Universal Instant Audio Interaction Delegator
   * Supports Desktop Click, Mouse Down, Touch, and Mobile Gestures
   */
  function handleInteraction(e) {
    // If it's a touch gesture that was actually scrolling, don't trigger clicks
    if (e.type === 'touchend' && isTouchScroll) {
      return;
    }

    const target = e.target;
    if (!target) return;

    // Check if user tapped inside an interactive element
    const interactiveEl = target.closest(
      'button, a, input, select, textarea, label, summary, [role="button"], ' +
      '.btn, .nav-link, .mobile-link, .card, .event-card, .game-card, ' +
      '.voxel-stat-card, .dbu-institutional-card, .track-card, .loot-card, ' +
      '.mc-slot, .mc-hotbar-slot, .faq-item, .faq-question, .tab, .tag, ' +
      '.brand-wordmark, .hamburger-btn, .mobile-menu-btn, .chip, .pill, ' +
      '.ticket-actions button, .wizard-footer button, .filter-chip, .filter-btn, ' +
      '.clickable, [onclick], [data-action], .print-pass-btn, .ghost-cta-btn'
    );

    const nowMs = Date.now();

    // Prevent double-triggering when pointerdown is followed immediately by click on the same element
    if (interactiveEl && lastInteractiveEl === interactiveEl && nowMs - lastSoundTime < 180) {
      return;
    }
    // Prevent rapid repeated sounds within 40ms
    if (nowMs - lastSoundTime < 40) {
      return;
    }

    lastSoundTime = nowMs;
    lastInteractiveEl = interactiveEl;

    unlockAudioEngine();

    if (interactiveEl) {
      // 1. Primary CTA / Action buttons -> Shimmering Cyber Chime
      if (
        interactiveEl.matches(
          '.pill-cta-btn, .hero-primary-btn, .btn-gaming-primary, .btn-primary, .btn-success, ' +
          '.nav-center-register-btn, #download-pass-btn, .open-gaming-reg-btn, .open-modal-btn, ' +
          '[type="submit"], #btn-wizard-next, .primary-cta, .btn-submit'
        )
      ) {
        SoundEngine.play('cyberChime');
        return;
      }

      // 2. Toggles, Checkboxes, Tabs, Radios -> Mechanical Switch
      if (
        interactiveEl.matches(
          'input[type="checkbox"], input[type="radio"], .day-tab-btn, .codex-tab, ' +
          '.rules-tab, .filter-chip, .tab-btn, .filter-btn, .tab'
        )
      ) {
        SoundEngine.play('mechanicalSwitch');
        return;
      }

      // 3. Hamburger, Drawer, Modal Close -> Whoosh
      if (
        interactiveEl.matches(
          '#hamburger-btn, #mobile-menu-btn, .modal-close-btn, .gep-close-btn, ' +
          '#modal-done-btn, .drawer-close, .close-btn, #close-details-modal-btn'
        )
      ) {
        SoundEngine.play('whoosh');
        return;
      }

      // 4. FAQ / Accordion -> Villager "Hmm!"
      if (interactiveEl.matches('.faq-question, summary, details, .faq-item, .faq-accordion-card')) {
        SoundEngine.play('villager');
        return;
      }

      // 5. Cards, Game tiles, Hotbar slots, Stat boxes -> Bubble Pop
      if (
        interactiveEl.matches(
          '.event-card, .game-card, .game-option-tile, .mc-hotbar-slot, .mc-slot, ' +
          '.track-card, .prize-card, .sponsor-card, .voxel-stat-card, .battle-plan-card, ' +
          '.btn-card-details, .btn-quick-reg'
        )
      ) {
        SoundEngine.play('bubblePop');
        return;
      }

      // 6. Generic interactive element -> Crisp Tactile Click
      SoundEngine.play('tactileClick');
    } else {
      // User tapped regular page body, canvas, or background -> gentle subtle micro-tick
      SoundEngine.play('softTick');
    }
  }

  // Mobile scroll detection so scrolling down doesn't falsely trigger click sounds
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isTouchScroll = false;
    }
    unlockAudioEngine();
  }, { capture: true, passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > 10 || dy > 10) {
        isTouchScroll = true;
      }
    }
  }, { capture: true, passive: true });

  // On Desktop: pointerdown for mouse clicks gives 0ms instant click response
  if (window.PointerEvent) {
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        handleInteraction(e);
      }
    }, { capture: true, passive: true });
  } else {
    window.addEventListener('mousedown', handleInteraction, { capture: true, passive: true });
  }

  // On Mobile: touchend triggers sound when tapped without scrolling
  window.addEventListener('touchend', (e) => {
    if (!isTouchScroll) {
      handleInteraction(e);
    }
  }, { capture: true, passive: true });

  // Standard click fallback for keyboard navigation (Enter / Space) or programmatic clicks
  window.addEventListener('click', handleInteraction, { capture: true, passive: true });

  // Expose global SoundEngine and backward-compatible playMinecraftSound
  window.SoundEngine = SoundEngine;
  window.playMinecraftSound = function (type) {
    SoundEngine.play(type);
  };

})();
