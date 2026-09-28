/**
 * CRAFTCON '26 — ZERO-LATENCY PROCEDURAL WEB AUDIO ENGINE
 * Synthesizes high-fidelity Minecraft & Cyberpunk tactile sound effects
 * using the Web Audio API without requiring any external MP3/WAV files.
 */

(function () {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let isMuted = false;
  let isInitialized = false;

  // Retrieve saved mute preference
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
      
      // Dynamic range compressor to prevent clipping and add punch
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
      compressor.knee.setValueAtTime(12, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.12, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.42, audioCtx.currentTime);

      masterGain.connect(compressor);
      compressor.connect(audioCtx.destination);
      isInitialized = true;
    } catch (err) {
      console.warn('Web Audio initialization error:', err);
    }

    return audioCtx;
  }

  /**
   * Haptic vibration feedback for mobile devices
   */
  function hapticFeedback(pattern = 14) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  /**
   * Procedural Sound Generators
   */
  const SoundSynthesizers = {
    // 1. Crisp, tactile, mechanical micro-click (general buttons & links)
    tactileClick(ctx, now) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.045);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(2.2, now);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    },

    // 2. Minecraft hotbar / inventory item select bubble pop
    bubblePop(ctx, now) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.065);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.07);
    },

    // 3. Cyber energy power chime for primary CTAs ("REGISTER NOW", "SUBMIT")
    cyberChime(ctx, now) {
      const chordNotes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6
      chordNotes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === chordNotes.length - 1 ? 'triangle' : 'sine';
        const start = now + idx * 0.038;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(start);
        osc.stop(start + 0.17);
      });
    },

    // 4. Subtle mechanical toggle switch (toggles, checkboxes, tabs)
    mechanicalSwitch(ctx, now) {
      // First click
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(780, now);
      osc1.frequency.exponentialRampToValueAtTime(320, now + 0.022);

      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.025);

      // Follow-up latch
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(420, now + 0.025);
      osc2.frequency.exponentialRampToValueAtTime(220, now + 0.05);

      gain2.gain.setValueAtTime(0.16, now + 0.025);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.025);
      osc2.stop(now + 0.055);
    },

    // 5. Soft whisper micro-tick (non-interactive clicks or subtle elements)
    softTick(ctx, now) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.03);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.032);
    },

    // 6. Smooth air whoosh (drawers, modal open/close, accordion)
    whoosh(ctx, now) {
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.07);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
      filter.Q.setValueAtTime(3, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.12);
    },

    // 7. Iconic Minecraft XP Level Up Arpeggio (reward, success modal, ticket print)
    levelUp(ctx, now) {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
        const start = now + idx * 0.06;

        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.16, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(start);
        osc.stop(start + 0.16);
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

      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(155, now + 0.12);
      osc1.frequency.exponentialRampToValueAtTime(175, now + 0.22);

      osc2.frequency.setValueAtTime(224, now);
      osc2.frequency.exponentialRampToValueAtTime(159, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(179, now + 0.22);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(780, now);
      filter.Q.setValueAtTime(4.2, now);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.23);
      osc2.stop(now + 0.23);
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

      const now = ctx.currentTime;

      switch (soundType) {
        case 'chime':
        case 'cyberChime':
        case 'primary':
          SoundSynthesizers.cyberChime(ctx, now);
          hapticFeedback(22);
          break;
        case 'pop':
        case 'bubblePop':
        case 'item':
          SoundSynthesizers.bubblePop(ctx, now);
          hapticFeedback(12);
          break;
        case 'switch':
        case 'toggle':
        case 'tab':
          SoundSynthesizers.mechanicalSwitch(ctx, now);
          hapticFeedback(15);
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
          hapticFeedback([20, 40, 25]);
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
          hapticFeedback(12);
          break;
      }
    },

    toggleMute() {
      isMuted = !isMuted;
      try {
        localStorage.setItem('craftcon_sound_muted', isMuted ? 'true' : 'false');
      } catch (e) {}

      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(isMuted ? 0 : 0.42, audioCtx.currentTime);
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
          background: rgba(14, 14, 24, 0.92);
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
   * Universal Click Delegator:
   * Triggers audio on ANY user click across the site, intelligently selecting
   * the most pleasing and appropriate sound based on context.
   */
  function handleGlobalClick(e) {
    // Resume context on first click if suspended
    if (!audioCtx) {
      initAudioContext();
    } else if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const target = e.target;
    if (!target) return;

    // Check if target is or is inside an interactive element
    const interactiveEl = target.closest(
      'button, a, input, select, textarea, label, summary, [role="button"], ' +
      '.btn, .nav-link, .mobile-link, .card, .event-card, .game-card, ' +
      '.mc-slot, .mc-hotbar-slot, .faq-item, .faq-question, .tab, .tag, ' +
      '.brand-wordmark, .hamburger-btn, .mobile-menu-btn, .chip, .pill, ' +
      '.ticket-actions button, .wizard-footer button, .filter-chip'
    );

    if (interactiveEl) {
      // Audio toggle button clicks are handled directly by toggleMute
      if (interactiveEl.id === 'audio-toggle' || interactiveEl.classList.contains('sound-fx-toggle-btn')) {
        SoundEngine.toggleMute();
        return;
      }

      // 1. Primary CTA / Register buttons -> Cyber Chime
      if (
        interactiveEl.matches(
          '.pill-cta-btn, .hero-primary-btn, .btn-gaming-primary, .nav-center-register-btn, ' +
          '#download-pass-btn, .open-gaming-reg-btn, .open-modal-btn, [type="submit"], ' +
          '#btn-wizard-next, .primary-cta'
        )
      ) {
        SoundEngine.play('cyberChime');
        return;
      }

      // 2. Toggles, Checkboxes, Tabs, Radios -> Mechanical Switch
      if (
        interactiveEl.matches(
          'input[type="checkbox"], input[type="radio"], .day-tab-btn, .codex-tab, ' +
          '.rules-tab, .filter-chip, .tab-btn'
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
      if (interactiveEl.matches('.faq-question, summary, details, .faq-item')) {
        SoundEngine.play('villager');
        return;
      }

      // 5. Cards, Game tiles, Hotbar slots -> Bubble Pop
      if (
        interactiveEl.matches(
          '.event-card, .game-card, .game-option-tile, .mc-hotbar-slot, .mc-slot, ' +
          '.track-card, .prize-card, .sponsor-card'
        )
      ) {
        SoundEngine.play('bubblePop');
        return;
      }

      // 6. Generic interactive element -> Tactile Click
      SoundEngine.play('tactileClick');
    } else {
      // User clicked regular body/text/empty space -> subtle whisper micro-tick
      SoundEngine.play('softTick');
    }
  }

  // Attach global click delegator
  window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });

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
