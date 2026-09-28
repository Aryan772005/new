/**
 * CRAFTCON '26 — ZERO-LATENCY PROCEDURAL WEB AUDIO ENGINE
 * Synthesizes ultra-pleasing, tactile, mobile-optimized UI audio feedback
 * using the Web Audio API with zero external file dependencies.
 *
 * Guaranteed 100% audio compatibility on iOS Safari, Android Chrome,
 * Windows, macOS, and Linux touch & desktop devices.
 */

(function () {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let isMuted = false;
  let isUnlocked = false;
  let lastSoundTime = 0;

  // Retrieve saved mute preference (defaults to unmuted / sound ON)
  try {
    const saved = localStorage.getItem('craftcon_sound_muted');
    if (saved !== null) {
      isMuted = saved === 'true';
    }
  } catch (e) {}

  /**
   * Lazily initialize AudioContext on user gesture
   */
  function initAudioContext() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioCtx = new AudioContextClass();

      // Punchy compressor to ensure rich, clear audio on phone speakers without clipping
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
      compressor.knee.setValueAtTime(10, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(4.5, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.002, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.1, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      // High-clarity volume calibrated for phone speakers & desktop headphones
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.82, audioCtx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(audioCtx.destination);
    } catch (err) {
      console.warn('Web Audio initialization error:', err);
    }

    return audioCtx;
  }

  /**
   * Permanent iOS / Android mobile gesture unlocker
   */
  function unlockAudioEngine() {
    const ctx = initAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (!isUnlocked) {
      try {
        // Play 1-sample silent buffer to satisfy iOS WebKit policy
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isUnlocked = true;
      } catch (e) {}
    }
  }

  // Pre-unlock on any initial user touch or keypress
  ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'].forEach(evt => {
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
   * High-End Procedural Sound Generators
   * Hand-crafted frequencies & envelopes for maximum satisfaction
   */
  const SoundSynthesizers = {
    // 1. Crisp, tactile, ASMR mechanical micro-click (buttons, links, pills)
    tactileClick(ctx, now) {
      // Layer A: Transient high snap
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1250, now);
      osc1.frequency.exponentialRampToValueAtTime(320, now + 0.022);

      gain1.gain.setValueAtTime(0.48, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.025);

      // Layer B: Resonant warm body
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(140, now + 0.038);

      gain2.gain.setValueAtTime(0.55, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now);
      osc2.stop(now + 0.04);
    },

    // 2. Juicy Minecraft hotbar / inventory item bubble pop (cards, tiles, slots, badges)
    bubblePop(ctx, now) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(1080, now + 0.055);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.62, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.06);
    },

    // 3. Shimmering Cyber Chime for Primary CTAs ("REGISTER NOW", "SUBMIT", "CONFIRM")
    cyberChime(ctx, now) {
      const chord = [
        { f: 587.33, t: 'triangle', g: 0.35, d: 0.00 }, // D5
        { f: 739.99, t: 'sine',     g: 0.38, d: 0.03 }, // F#5
        { f: 880.00, t: 'sine',     g: 0.42, d: 0.06 }, // A5
        { f: 1174.66, t: 'triangle', g: 0.45, d: 0.09 }, // D6
        { f: 1479.98, t: 'sine',     g: 0.30, d: 0.12 }  // F#6
      ];

      chord.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + note.d;

        osc.type = note.t;
        osc.frequency.setValueAtTime(note.f, start);

        gain.gain.setValueAtTime(note.g, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(start);
        osc.stop(start + 0.24);
      });
    },

    // 4. Dual-action mechanical toggle switch (toggles, checkboxes, tabs, switches)
    mechanicalSwitch(ctx, now) {
      // First click: push stroke
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(820, now);
      osc1.frequency.exponentialRampToValueAtTime(360, now + 0.02);

      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.022);

      // Second click: latch engagement
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(460, now + 0.024);
      osc2.frequency.exponentialRampToValueAtTime(240, now + 0.048);

      gain2.gain.setValueAtTime(0.38, now + 0.024);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.048);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.024);
      osc2.stop(now + 0.052);
    },

    // 5. Soft ambient page tap (clicking anywhere on the screen / canvas / background)
    softTick(ctx, now) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.025);

      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.028);
    },

    // 6. Smooth air whoosh (drawers, modal open/close, accordion toggles)
    whoosh(ctx, now) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.14);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.07);
      filter.frequency.exponentialRampToValueAtTime(280, now + 0.14);
      filter.Q.setValueAtTime(3.2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      noise.start(now);
      noise.stop(now + 0.14);
    },

    // 7. Iconic Minecraft XP Level Up Arpeggio (success modal, payment confirmed, ticket print)
    levelUp(ctx, now) {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        const start = now + idx * 0.055;

        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.42, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(start);
        osc.stop(start + 0.2);
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

      osc1.frequency.setValueAtTime(230, now);
      osc1.frequency.exponentialRampToValueAtTime(160, now + 0.11);
      osc1.frequency.exponentialRampToValueAtTime(180, now + 0.21);

      osc2.frequency.setValueAtTime(235, now);
      osc2.frequency.exponentialRampToValueAtTime(164, now + 0.11);
      osc2.frequency.exponentialRampToValueAtTime(184, now + 0.21);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(820, now);
      filter.Q.setValueAtTime(4.0, now);

      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    }
  };

  /**
   * Sound Engine Public API
   */
  const SoundEngine = {
    play(soundType = 'tactileClick') {
      if (isMuted) return;

      const ctx = initAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      switch (soundType) {
        case 'chime':
        case 'cyberChime':
        case 'primary':
          SoundSynthesizers.cyberChime(ctx, now);
          hapticFeedback(24);
          break;
        case 'pop':
        case 'bubblePop':
        case 'item':
          SoundSynthesizers.bubblePop(ctx, now);
          hapticFeedback(14);
          break;
        case 'switch':
        case 'toggle':
        case 'tab':
          SoundSynthesizers.mechanicalSwitch(ctx, now);
          hapticFeedback(16);
          break;
        case 'whoosh':
        case 'drawer':
        case 'modal':
          SoundSynthesizers.whoosh(ctx, now);
          hapticFeedback(18);
          break;
        case 'level_up':
        case 'levelUp':
        case 'success':
          SoundSynthesizers.levelUp(ctx, now);
          hapticFeedback([25, 45, 30]);
          break;
        case 'villager':
        case 'faq':
          SoundSynthesizers.villager(ctx, now);
          hapticFeedback(16);
          break;
        case 'tick':
        case 'softTick':
          SoundSynthesizers.softTick(ctx, now);
          hapticFeedback(8);
          break;
        case 'click':
        case 'tactileClick':
        default:
          SoundSynthesizers.tactileClick(ctx, now);
          hapticFeedback(14);
          break;
      }
    },

    toggleMute() {
      isMuted = !isMuted;
      try {
        localStorage.setItem('craftcon_sound_muted', isMuted ? 'true' : 'false');
      } catch (e) {}

      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(isMuted ? 0 : 0.82, audioCtx.currentTime);
      }

      this.updateToggleButtonsUI();
      this.showToast(isMuted ? '🔇 Sound Muted' : '🔊 Sound Effects ON');

      if (!isMuted) {
        this.play('cyberChime');
      }
      return !isMuted;
    },

    isMuted() {
      return isMuted;
    },

    updateToggleButtonsUI() {
      const toggleButtons = document.querySelectorAll('#audio-toggle, .sound-fx-toggle-btn, .audio-toggle-btn');
      toggleButtons.forEach(btn => {
        if (isMuted) {
          btn.classList.add('audio-muted');
          btn.setAttribute('title', 'Unmute Sound Effects');
          btn.setAttribute('aria-label', 'Unmute Sound Effects');
        } else {
          btn.classList.remove('audio-muted');
          btn.setAttribute('title', 'Mute Sound Effects');
          btn.setAttribute('aria-label', 'Mute Sound Effects');
        }
      });
    },

    showToast(message) {
      let toast = document.getElementById('sound-feedback-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'sound-feedback-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: rgba(14, 14, 24, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: #ffffff;
          border: 1px solid rgba(157, 78, 221, 0.45);
          box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(157, 78, 221, 0.3);
          border-radius: 999px;
          padding: 8px 18px;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          z-index: 100000;
          pointer-events: none;
          opacity: 0;
          transform: translateY(12px) scale(0.95);
          transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        document.body.appendChild(toast);
      }

      toast.textContent = message;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';

      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px) scale(0.95)';
      }, 2000);
    }
  };

  /**
   * Universal Instant Audio Interaction Delegator
   * Triggers with 0ms latency on pointerdown (touch or click)
   */
  function handleInteraction(e) {
    // Debounce rapid double-events (e.g. pointerdown followed by click)
    const nowMs = Date.now();
    if (nowMs - lastSoundTime < 65) return;
    lastSoundTime = nowMs;

    unlockAudioEngine();

    const target = e.target;
    if (!target) return;

    // Check if user tapped inside an interactive element
    const interactiveEl = target.closest(
      'button, a, input, select, textarea, label, summary, [role="button"], ' +
      '.btn, .nav-link, .mobile-link, .card, .event-card, .game-card, ' +
      '.voxel-stat-card, .dbu-institutional-card, .track-card, .loot-card, ' +
      '.mc-slot, .mc-hotbar-slot, .faq-item, .faq-question, .tab, .tag, ' +
      '.brand-wordmark, .hamburger-btn, .mobile-menu-btn, .chip, .pill, ' +
      '.ticket-actions button, .wizard-footer button, .filter-chip, .filter-btn'
    );

    if (interactiveEl) {
      // Audio toggle button clicks are handled directly by toggleMute
      if (interactiveEl.id === 'audio-toggle' || interactiveEl.classList.contains('sound-fx-toggle-btn')) {
        SoundEngine.toggleMute();
        return;
      }

      // 1. Primary CTA / Action buttons -> Shimmering Cyber Chime
      if (
        interactiveEl.matches(
          '.pill-cta-btn, .hero-primary-btn, .btn-gaming-primary, .btn-primary, .btn-success, ' +
          '.nav-center-register-btn, #download-pass-btn, .open-gaming-reg-btn, .open-modal-btn, ' +
          '[type="submit"], #btn-wizard-next, .primary-cta'
        )
      ) {
        SoundEngine.play('cyberChime');
        return;
      }

      // 2. Toggles, Checkboxes, Tabs, Radios -> Mechanical Switch
      if (
        interactiveEl.matches(
          'input[type="checkbox"], input[type="radio"], .day-tab-btn, .codex-tab, ' +
          '.rules-tab, .filter-chip, .tab-btn, .filter-btn'
        )
      ) {
        SoundEngine.play('mechanicalSwitch');
        return;
      }

      // 3. Hamburger, Drawer, Modal Close -> Whoosh
      if (
        interactiveEl.matches(
          '#hamburger-btn, #mobile-menu-btn, .modal-close-btn, .gep-close-btn, ' +
          '#modal-done-btn, .drawer-close'
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
          '.track-card, .prize-card, .sponsor-card, .voxel-stat-card, .battle-plan-card'
        )
      ) {
        SoundEngine.play('bubblePop');
        return;
      }

      // 6. Generic interactive element -> Tactile Click
      SoundEngine.play('tactileClick');
    } else {
      // User tapped regular page body, canvas, or text -> gentle subtle micro-tick
      SoundEngine.play('softTick');
    }
  }

  // Bind instant 0ms touch & click listeners
  window.addEventListener('pointerdown', handleInteraction, { capture: true, passive: true });
  window.addEventListener('click', handleInteraction, { capture: true, passive: true });

  // Expose global SoundEngine and backward-compatible playMinecraftSound
  window.SoundEngine = SoundEngine;
  window.playMinecraftSound = function (type) {
    SoundEngine.play(type);
  };

  // Sync toggle buttons once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      SoundEngine.updateToggleButtonsUI();
    });
  } else {
    SoundEngine.updateToggleButtonsUI();
  }

})();
