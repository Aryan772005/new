/**
 * CRAFTCON '26 — Desh Bhagat University Hackathon
 * Modern 3D Reel-Style Experience Engine:
 * - Three.js WebGL Real-Time 3D Floating Voxel Items & Particles
 * - Lenis Buttery Smooth Momentum Scrolling
 * - GSAP ScrollTrigger 3D Portal Camera Dive & Perspective Transforms
 * - Unique, Section-Specific 3D Scroll Animations across the Whole Website
 * - Interactive Minecraft UIs:
 *    * Sticky Floating HUD (Scroll XP Bar & Hearts Tracker)
 *    * About: 3x3 Crafting Table Assembly, Arrow Surge & Trophy Forge
 *    * Tracks: Enchantment Table 3D Card Deal & Runes Stream
 *    * Timeline: Smelting Furnace Heat Gauge & Sequential Redstone Circuit
 *    * Prizes: Interactive 9-Slot Hotbar, Audio Blip & Podium Elevation
 *    * Rules: 3D Quest Book Opening & Clickable Redstone Repeater
 *    * Sponsors: Skyward Beacon Light Beam Ray & Voxel Materialization
 *    * FAQ: Villager Dialogue Boxes with Synthesized "Hmm!" Audio
 * - 3D Card Gyroscope / Mouse Tilt with Specular Reflection
 * - Live Countdown, Audio Ambiance Synthesizer & Ticket Generator
 */

document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initLenisSmoothScroll();
  initThreeJSScene();
  initHero3DCameraDive();
  initSectionBackdropParallax();
  init3DCardTiltPhysics();
  initHUDScrollTracker();
  initAboutCrafting3DScroll();
  initTracks3DAnimation();
  initTimelineRedstoneAnimation();
  initPrizes3DAnimation();
  initRulesCodexAnimation();
  initSponsorsBeaconAnimation();
  initOrganizersAnimation();
  initVillagerFAQAnimation();
  initFinalCTAAnimation();
  initNavScrollspy();
  initMobileDrawer();
  initTimelineFilter();
  initCodexTabs();
  initRegistrationModal();
  initAudioAmbiance();
  initBrochureAction();
});

/* ==========================================================================
   GLOBAL WEB AUDIO SYNTHESIZER (NO EXTERNAL AUDIO FILES NEEDED)
   ========================================================================== */
let globalAudioCtx = null;

function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

function triggerHaptic(duration = 15) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {}
  }
}

function playMinecraftSound(type) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (type === 'click') {
    // Crisp 8-bit mechanical click (Redstone Repeater)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'pop') {
    // Quick bubbly item select blip (Hotbar / Inventory slot)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  } else if (type === 'level_up') {
    // Minecraft XP Level Up Chime arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.04, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.13);
    });
  } else if (type === 'villager') {
    // Playful synthesized Villager "Hmm!" / "Huh!" nasal sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';

    // Pitch bends down then slightly up
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(160, now + 0.14);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.24);

    osc2.frequency.setValueAtTime(224, now);
    osc2.frequency.exponentialRampToValueAtTime(164, now + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(184, now + 0.24);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(4, now);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.26);
    osc2.stop(now + 0.26);
  }
}

/* ==========================================================================
   1. LIVE COUNTDOWN TIMER
   ========================================================================== */
function initCountdown() {
  const targetDate = new Date('2026-10-24T09:00:00+05:30').getTime();

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-minutes');
  const secsEl = document.getElementById('cd-seconds');

  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

  function updateTimer() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % 1000) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(minutes).padStart(2, '0');
    secsEl.textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/* ==========================================================================
   2. LENIS SMOOTH MOMENTUM SCROLLING (REEL-FEEL BUTTERY PHYSICS)
   ========================================================================== */
let lenis = null;

function initLenisSmoothScroll() {
  if (typeof Lenis === 'undefined') return;

  const isTouchMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);

  if (isTouchMobile) {
    // On mobile devices, native touch momentum scrolling is hardware-accelerated 120Hz.
    // Lenis touch simulation causes severe input lag and inertia battles on phones.
    // Update progress bar and ScrollTrigger on native window scroll instead!
    const progressBar = document.getElementById('scroll-progress-bar');
    window.addEventListener('scroll', () => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.update();
      }
      if (progressBar) {
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight || 1;
        const scrollProgress = (scrollY / maxScroll) * 100;
        progressBar.style.width = `${scrollProgress}%`;
      }
    }, { passive: true });

    // Smooth scroll for internal anchor links using native behavior
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
          const targetEl = document.querySelector(targetId);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
    return;
  }

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchOrMobile = isTouch || isMobileUA || window.innerWidth <= 1024;

  lenis = new Lenis({
    duration: isTouchOrMobile ? 0.8 : 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.0,
    syncTouch: false // Native touch momentum on all touch devices prevents jumping/sticking on mobile desktop site!
  });

  const progressBar = document.getElementById('scroll-progress-bar');

  lenis.on('scroll', (e) => {
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.update();
    }

    // Update 3D scroll progress line
    if (progressBar) {
      const scrollProgress = e.progress * 100;
      progressBar.style.width = `${scrollProgress}%`;
    }
  });

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.config({
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize"
    });

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Support internal anchor clicks with Lenis smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: -60, duration: 1.2 });
        }
      }
    });
  });
}

/* ==========================================================================
   3. THREE.JS REAL-TIME 3D FLOATING VOXEL SCENE
   ========================================================================== */
let threeScene, threeCamera, threeRenderer;
const floating3DObjects = [];

function initThreeJSScene() {
  if (typeof THREE === 'undefined') return;

  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  let width = window.innerWidth;
  let height = window.innerHeight;

  // Scene & Camera
  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  threeCamera.position.z = 24;

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchOrMobile = window.innerWidth <= 1024 || isTouch || isMobileUA;

  // Renderer
  threeRenderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: !isTouchOrMobile,
    powerPreference: 'high-performance'
  });
  threeRenderer.setSize(width, height);
  threeRenderer.setPixelRatio(isTouchOrMobile ? 1.0 : Math.min(window.devicePixelRatio, 1.75));
  threeRenderer.setClearColor(0x000000, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  threeScene.add(ambientLight);

  const purpleLight = new THREE.PointLight(0xc77dff, 2.5, 50);
  purpleLight.position.set(12, 8, 10);
  threeScene.add(purpleLight);

  const amberLight = new THREE.PointLight(0xf5a623, 2.2, 50);
  amberLight.position.set(-12, -8, 8);
  threeScene.add(amberLight);

  const emeraldLight = new THREE.PointLight(0x70e000, 1.8, 40);
  emeraldLight.position.set(0, 15, 5);
  threeScene.add(emeraldLight);

  // Materials for Voxel Cubes
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0x1f1633,
    roughness: 0.3,
    metalness: 0.8,
    emissive: 0x5a189a,
    emissiveIntensity: 0.35
  });

  const emeraldMat = new THREE.MeshStandardMaterial({
    color: 0x38b000,
    roughness: 0.2,
    metalness: 0.5,
    emissive: 0x70e000,
    emissiveIntensity: 0.4
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf5a623,
    roughness: 0.3,
    metalness: 0.6,
    emissive: 0xffbe53,
    emissiveIntensity: 0.4
  });

  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    roughness: 0.2,
    metalness: 0.7,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.4
  });

  // Create 3D Voxel Crystal (Center Floating Relic)
  const crystalGroup = new THREE.Group();
  const innerGeom = new THREE.OctahedronGeometry(1.6, 0);
  const outerGeom = new THREE.BoxGeometry(2.4, 2.4, 2.4);

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: 0xc77dff,
    wireframe: true,
    transparent: true,
    opacity: 0.65
  });

  const innerCrystal = new THREE.Mesh(innerGeom, obsidianMat);
  const outerFrame = new THREE.Mesh(outerGeom, wireframeMat);

  crystalGroup.add(innerCrystal);
  crystalGroup.add(outerFrame);
  crystalGroup.position.set(7.5, 2, 0);
  threeScene.add(crystalGroup);

  floating3DObjects.push({
    mesh: crystalGroup,
    rotSpeedX: 0.008,
    rotSpeedY: 0.012,
    baseY: 2,
    floatSpeed: 0.002,
    phase: 0
  });

  // Create Orbiting Voxel Debris
  const cubeGeom = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const smallCubeGeom = new THREE.BoxGeometry(0.7, 0.7, 0.7);

  const debrisConfigs = [
    { geom: cubeGeom, mat: emeraldMat, pos: [-8.5, 4.5, -4], rx: 0.01, ry: 0.015 },
    { geom: smallCubeGeom, mat: amberMat, pos: [-9.5, -3.5, 2], rx: -0.012, ry: 0.008 },
    { geom: cubeGeom, mat: cyanMat, pos: [9.5, -4.5, -2], rx: 0.007, ry: -0.014 },
    { geom: smallCubeGeom, mat: obsidianMat, pos: [6, 7, -5], rx: -0.009, ry: 0.011 },
    { geom: smallCubeGeom, mat: emeraldMat, pos: [-5, 8, -6], rx: 0.015, ry: -0.007 }
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
      floatSpeed: 0.0018 + idx * 0.0005,
      phase: idx * 1.2
    });
  });

  // Mouse Parallax on 3D Scene (Desktop mouse only)
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

  // Resize Handler
  window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    if (threeCamera) {
      threeCamera.aspect = width / height;
      threeCamera.updateProjectionMatrix();
    }
    if (threeRenderer) {
      threeRenderer.setSize(width, height);
    }
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh(true);
    }
  });

  // Animation Loop
  let clock = new THREE.Clock();
  let isAnimating = true;

  function animate() {
    if (!isAnimating) return;
    requestAnimationFrame(animate);

    // On touch/mobile screens, pause render if user is scrolled past the first 1.5 viewports
    if (isTouchOrMobile && window.pageYOffset > window.innerHeight * 1.5) {
      return;
    }

    const elapsedTime = clock.getElapsedTime();

    // Smooth Camera Track
    targetCamX = mouseX * 2.2;
    targetCamY = -mouseY * 1.8;
    threeCamera.position.x += (targetCamX - threeCamera.position.x) * 0.05;
    threeCamera.position.y += (targetCamY - threeCamera.position.y) * 0.05;

    // Camera scroll tracking: drift down through 3D space as user scrolls
    const scrollY = window.pageYOffset || 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight || 1;
    const scrollFrac = scrollY / maxScroll;

    threeCamera.position.z = 24 - scrollFrac * 10;
    threeScene.rotation.y = scrollFrac * 0.9;
    threeScene.position.y = -scrollFrac * 4;

    // Rotate and Bob 3D Voxel Objects
    floating3DObjects.forEach((obj) => {
      obj.mesh.rotation.x += obj.rotSpeedX;
      obj.mesh.rotation.y += obj.rotSpeedY;
      obj.mesh.position.y = obj.baseY + Math.sin(elapsedTime * 2 + obj.phase) * 0.4;
    });

    threeRenderer.render(threeScene, threeCamera);
  }

  animate();

  if (isTouchOrMobile) {
    window.addEventListener('scroll', () => {
      if (window.pageYOffset <= window.innerHeight * 1.5) {
        requestAnimationFrame(animate);
      }
    }, { passive: true });
  }
}

/* ==========================================================================
   4. HERO 3D PORTAL CAMERA DIVE (TECHFEST-STYLE PINNED ZOOM SEQUENCE)
   ========================================================================== */
function initHero3DCameraDive() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.config({
    ignoreMobileResize: true,
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load"
  });

  const heroWrapper = document.getElementById('hero-pinned-wrapper') || document.getElementById('hero');
  const heroStage = document.getElementById('hero');
  const heroBgLayer = document.getElementById('hero-bg-layer');
  const heroGlow = document.getElementById('hero-portal-glow');
  const heroVortex = document.getElementById('hero-portal-vortex');
  const heroContent = document.getElementById('hero-content-3d') || document.getElementById('tf-grand-hero');
  const showcase = document.getElementById('hero-portal-showcase');
  const card1 = document.getElementById('tf-card-1');
  const card2 = document.getElementById('tf-card-2');
  const card3 = document.getElementById('tf-card-3');
  const scrollPrompt = document.getElementById('tf-scroll-prompt');

  // Cloud Veil Elements
  const cloudLeft = document.getElementById('cloud-left');
  const cloudRight = document.getElementById('cloud-right');
  const cloudBottom = document.getElementById('cloud-bottom');
  const cloudCenterMist = document.getElementById('cloud-center-mist');
  const cloudTopDrift = document.getElementById('cloud-top-drift');

  if (!heroWrapper || !heroBgLayer) return;

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isMobileScreen = window.innerWidth <= 768;
  const isTouchOrMobile = isMobileScreen || isTouch || isMobileUA;

  // PINNED MULTI-STAGE CAMERA & CLOUD FLY-THROUGH (DESKTOP & MOBILE)
  const pinTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: heroWrapper,
      start: 'top top',
      end: 'bottom bottom',
      scrub: isTouchOrMobile ? 0.5 : 0.8,
      pin: heroStage,
      anticipatePin: 0,
      fastScrollEnd: true,
      invalidateOnRefresh: true
    }
  });

  // Stage 1: Left Corner Hero Content Moves UP & Dissolves into the Sky (0.00 -> 0.35)
  if (heroContent) {
    pinTimeline.to(heroContent, {
      y: isTouchOrMobile ? -60 : -140,
      scale: isTouchOrMobile ? 1.02 : 1.15,
      opacity: 0,
      filter: 'blur(4px)',
      ease: 'power1.in',
      pointerEvents: 'none'
    }, 0.02);
  }

  if (scrollPrompt) {
    pinTimeline.to(scrollPrompt, {
      opacity: 0,
      y: 20,
      ease: 'power1.out'
    }, 0);
  }

  // Stage 2: White Clouds Veil Parts & Disperses Outwards (Desktop only - mobile keeps pure Minecraft art)
  if (!isTouchOrMobile) {
    if (cloudLeft) {
      pinTimeline.to(cloudLeft, {
        xPercent: -110,
        opacity: 0,
        ease: 'power1.inOut'
      }, 0.04);
    }

    if (cloudRight) {
      pinTimeline.to(cloudRight, {
        xPercent: 110,
        opacity: 0,
        ease: 'power1.inOut'
      }, 0.04);
    }

    if (cloudBottom) {
      pinTimeline.to(cloudBottom, {
        yPercent: 85,
        opacity: 0,
        ease: 'power1.inOut'
      }, 0.05);
    }

    if (cloudCenterMist) {
      pinTimeline.to(cloudCenterMist, {
        scale: 2.2,
        opacity: 0,
        ease: 'power1.inOut'
      }, 0.02);
    }

    if (cloudTopDrift) {
      pinTimeline.to(cloudTopDrift, {
        yPercent: -70,
        opacity: 0,
        ease: 'power1.inOut'
      }, 0.03);
    }
  }

  // Stage 3: Background Portal Zooms in Smoothly (0.00 -> 0.70)
  pinTimeline
    .to(heroBgLayer, {
      scale: isTouchOrMobile ? 1.3 : 1.65,
      y: isTouchOrMobile ? 10 : 20,
      filter: 'brightness(1.15) contrast(1.08)',
      ease: 'none'
    }, 0)
    .to(heroGlow, {
      scale: 2.2,
      opacity: 1,
      ease: 'none'
    }, 0);

  if (heroVortex) {
    pinTimeline.to(heroVortex, {
      opacity: 0.9,
      scale: 1.4,
      ease: 'none'
    }, 0.1);
  }

  // Stage 4: Three.js Camera Drives Forward into Portal
  if (typeof threeCamera !== 'undefined') {
    pinTimeline.to(threeCamera.position, {
      z: 14,
      ease: 'none'
    }, 0);
  }

  // Stage 5: Techfest-Style 3D Floating Showcase Cards Fly In (0.24 -> 0.65)
  if (showcase) {
    pinTimeline
      .set(showcase, { visibility: 'visible' }, 0.20)
      .to(showcase, {
        opacity: 1,
        ease: 'power2.out',
        duration: 0.15
      }, 0.22);
  }

  if (card1 && card2 && card3) {
    pinTimeline
      .fromTo(card1,
        { opacity: 0, y: isTouchOrMobile ? 40 : 120, scale: 0.85, rotationY: isTouchOrMobile ? 0 : 14, z: isTouchOrMobile ? 0 : -250 },
        { opacity: 1, y: 0, scale: 1, rotationY: 0, z: 0, ease: 'power2.out' },
        0.24
      )
      .fromTo(card2,
        { opacity: 0, y: isTouchOrMobile ? 50 : 160, scale: 0.80, z: isTouchOrMobile ? 0 : -350 },
        { opacity: 1, y: 0, scale: 1, z: 0, ease: 'back.out(1.1)' },
        0.28
      )
      .fromTo(card3,
        { opacity: 0, y: isTouchOrMobile ? 40 : 120, scale: 0.85, rotationY: isTouchOrMobile ? 0 : -14, z: isTouchOrMobile ? 0 : -250 },
        { opacity: 1, y: 0, scale: 1, rotationY: 0, z: 0, ease: 'power2.out' },
        0.26
      );
  }

  // Stage 6: Smooth Outflow Transition to About Section (0.85 -> 1.0)
  if (showcase) {
    pinTimeline.to(showcase, {
      y: -50,
      opacity: 0,
      scale: 0.95,
      ease: 'power1.in'
    }, 0.88);
  }
}

/* ==========================================================================
   4B. SECTION 3D BACKDROP PARALLAX (CLEARLY VISIBLE ATMOSPHERIC ART)
   ========================================================================== */
function initSectionBackdropParallax() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  // On mobile screens and touch devices (including mobile desktop site), bypass heavy multi-layer GSAP parallax scrubs so phone scroll remains locked at 120fps
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (window.innerWidth <= 1024 || isTouch || isMobileUA) return;

  const backdropConfigs = [
    { id: '#about-bg-layer', trigger: '#about', yStart: -30, yEnd: 40, scale: 1.14 },
    { id: '#tracks-bg-layer', trigger: '#tracks', yStart: -40, yEnd: 50, scale: 1.12 },
    { id: '#timeline-bg-layer', trigger: '#timeline', yStart: -35, yEnd: 45, scale: 1.15 },
    { id: '#prizes-bg-layer', trigger: '#prizes', yStart: -40, yEnd: 50, scale: 1.14 },
    { id: '#rules-bg-layer', trigger: '#rules', yStart: -30, yEnd: 40, scale: 1.12 },
    { id: '#sponsors-bg-layer', trigger: '#sponsors', yStart: -40, yEnd: 50, scale: 1.15 },
    { id: '#faq-bg-layer', trigger: '#faq', yStart: -30, yEnd: 40, scale: 1.12 }
  ];

  backdropConfigs.forEach((cfg) => {
    const el = document.querySelector(cfg.id);
    const triggerEl = document.querySelector(cfg.trigger);

    if (el && triggerEl) {
      gsap.fromTo(el,
        { scale: 1.0, y: cfg.yStart },
        {
          scrollTrigger: {
            trigger: triggerEl,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8
          },
          scale: cfg.scale,
          y: cfg.yEnd,
          ease: 'none'
        }
      );
    }
  });
}

/* ==========================================================================
   5. INTERACTIVE 3D CARD GYROSCOPE / MOUSE TILT PHYSICS
   ========================================================================== */
function init3DCardTiltPhysics() {
  // Only enable on desktop mouse pointers to prevent interfering with mobile touch scrolling
  if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768)) return;

  const cards = document.querySelectorAll('.tilt-3d-card');

  cards.forEach((card) => {
    let bounds;

    function onMouseEnter() {
      bounds = card.getBoundingClientRect();
      card.style.transition = 'transform 0.12s ease-out, box-shadow 0.12s ease-out';
    }

    function onMouseMove(e) {
      if (!bounds) bounds = card.getBoundingClientRect();

      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      const xPct = mouseX / bounds.width;
      const yPct = mouseY / bounds.height;

      // Calculate tilt angles (-12deg to +12deg)
      const rotateX = (0.5 - yPct) * 16;
      const rotateY = (xPct - 0.5) * 16;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(12px)`;
      card.style.setProperty('--mouse-x', `${xPct * 100}%`);
      card.style.setProperty('--mouse-y', `${yPct * 100}%`);
    }

    function onMouseLeave() {
      card.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
    }

    card.addEventListener('mouseenter', onMouseEnter);
    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('mouseleave', onMouseLeave);
  });
}

/* ==========================================================================
   6. MINECRAFT HUD SCROLL TRACKER (XP LEVEL & DYNAMIC HEARTS)
   ========================================================================== */
function initHUDScrollTracker() {
  const xpFill = document.getElementById('mc-xp-fill');
  const xpLevel = document.getElementById('mc-xp-level');
  const hudBar = document.getElementById('mc-hud-bar');

  if (!xpFill || !xpLevel) return;

  let lastLevel = 1;

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset || 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight || 1;
    const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

    // Fill bar matches scroll percentage
    const fillPercent = Math.min(100, Math.max(5, progress * 100));
    xpFill.style.width = `${fillPercent}%`;

    // Dynamic Level from 1 up to 24 as you scroll (matching 24-hour hackathon)
    const currentLevel = Math.max(1, Math.floor(1 + progress * 23));
    if (currentLevel !== lastLevel) {
      xpLevel.textContent = currentLevel;

      // Level up animation burst
      if (currentLevel > lastLevel) {
        xpLevel.style.transform = 'scale(1.4)';
        xpLevel.style.color = '#fff';
        setTimeout(() => {
          xpLevel.style.transform = 'scale(1)';
          xpLevel.style.color = '#70e000';
        }, 220);

        if (currentLevel % 5 === 0) {
          playMinecraftSound('level_up');
        }
      }
      lastLevel = currentLevel;
    }
  }, { passive: true });

  if (hudBar) {
    hudBar.addEventListener('click', () => {
      playMinecraftSound('level_up');
      triggerHaptic(25);
      xpLevel.style.transform = 'scale(1.5)';
      xpLevel.style.color = '#fff';
      setTimeout(() => {
        xpLevel.style.transform = 'scale(1)';
        xpLevel.style.color = '#70e000';
      }, 250);
    });
  }
}

/* ==========================================================================
   7. ABOUT SECTION: 3x3 CRAFTING TABLE ASSEMBLY & ISOMETRIC STAT CONVERGENCE
   ========================================================================== */
function initAboutCrafting3DScroll() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const aboutSection = document.getElementById('about');
  const craftingTable = document.getElementById('crafting-table-module');
  const slots = document.querySelectorAll('#crafting-grid .mc-slot');
  const arrow = document.getElementById('mc-crafting-arrow');
  const outputSlot = document.getElementById('crafting-output-slot');
  const statCards = document.querySelectorAll('.voxel-stat-card');

  if (!aboutSection) return;

  // Master timeline for Crafting Bench assembly
  const craftTL = gsap.timeline({
    scrollTrigger: {
      trigger: aboutSection,
      start: 'top 75%',
      toggleActions: 'play none none none'
    }
  });

  if (craftingTable) {
    craftTL.from(craftingTable, {
      opacity: 0,
      y: 60,
      rotationX: 18,
      duration: 0.8,
      ease: 'power3.out'
    });
  }

  // 3x3 grid slots pop in sequentially with spring bounce
  if (slots.length > 0) {
    craftTL.from(slots, {
      opacity: 0,
      scale: 0,
      rotation: -30,
      duration: 0.45,
      stagger: 0.05,
      ease: 'back.out(2.2)'
    }, '-=0.4');
  }

  // Arrow pulses forward with intense purple energy stream
  if (arrow) {
    craftTL.fromTo(arrow, 
      { scale: 0.6, x: -25, opacity: 0 },
      { scale: 1.25, x: 5, opacity: 1, duration: 0.5, ease: 'power2.out' },
      '-=0.2'
    ).to(arrow, { scale: 1, x: 0, duration: 0.3 });
  }

  // Output trophy pops with golden burst and rotation
  if (outputSlot) {
    craftTL.fromTo(outputSlot,
      { scale: 0.2, rotation: -90, opacity: 0 },
      { scale: 1.25, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(2.5)' },
      '-=0.1'
    ).to(outputSlot, { scale: 1, duration: 0.3 });
  }

  // 3D Isometric Convergence on the 4 Voxel Stat Cards:
  // Each card flies in from its respective corner
  if (statCards.length >= 4) {
    const directions = [
      { x: -60, y: -40, rotX: 18, rotY: -20 }, // Top-Left (Purple)
      { x: 60, y: -40, rotX: 18, rotY: 20 },   // Top-Right (Amber)
      { x: -60, y: 40, rotX: -18, rotY: -20 }, // Bottom-Left (Green)
      { x: 60, y: 40, rotX: -18, rotY: 20 }    // Bottom-Right (Cyan)
    ];

    statCards.forEach((card, idx) => {
      const dir = directions[idx % 4];
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          toggleActions: 'play none none none'
        },
        opacity: 0,
        x: dir.x,
        y: dir.y,
        rotationX: dir.rotX,
        rotationY: dir.rotY,
        duration: 0.85,
        ease: 'power3.out'
      });
    });
  }

  // Interactive Mobile & Desktop Tap on Crafting Slots
  slots.forEach((slot) => {
    slot.addEventListener('click', () => {
      slot.classList.remove('slot-tapped');
      void slot.offsetWidth; // force DOM reflow
      slot.classList.add('slot-tapped');
      playMinecraftSound('pop');
      triggerHaptic(14);
    });
  });

  // Tapping crafting arrow or output triggers craft level-up chime and haptic feedback
  if (arrow && arrow.parentElement) {
    arrow.parentElement.addEventListener('click', () => {
      playMinecraftSound('level_up');
      triggerHaptic(25);
      if (outputSlot) {
        outputSlot.classList.remove('slot-tapped');
        void outputSlot.offsetWidth;
        outputSlot.classList.add('slot-tapped');
      }
    });
  }
  if (outputSlot) {
    outputSlot.addEventListener('click', () => {
      playMinecraftSound('level_up');
      triggerHaptic(25);
      outputSlot.classList.remove('slot-tapped');
      void outputSlot.offsetWidth;
      outputSlot.classList.add('slot-tapped');
    });
  }
}

/* ==========================================================================
   8. TRACKS SECTION: 3D REEL-STYLE CARD DEAL & FLOATING RUNES
   ========================================================================== */
function initTracks3DAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const tracksSection = document.getElementById('tracks');
  const runes = document.querySelectorAll('.rune-glyph');
  const trackCards = document.querySelectorAll('.track-card');

  if (!tracksSection) return;

  // Floating Enchantment Runes wave
  if (runes.length > 0) {
    gsap.timeline({
      scrollTrigger: {
        trigger: '.mc-enchantment-banner',
        start: 'top 85%'
      }
    }).from(runes, {
      opacity: 0,
      y: 20,
      scale: 0.5,
      stagger: 0.08,
      duration: 0.6,
      ease: 'back.out(2)'
    });
  }

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouchOrMobile = window.innerWidth <= 1024 || isTouch || isMobileUA;

  // 3D Card Deal & Fan-Out:
  // On desktop mouse: 3D perspective fan. On touch/mobile: silky clean 2D glide
  trackCards.forEach((card, idx) => {
    const col = idx % 3;
    let fromConfig = { opacity: 0, duration: 0.8, ease: 'power3.out' };

    if (isTouchOrMobile) {
      fromConfig.y = 35;
      fromConfig.scale = 0.95;
    } else if (col === 0) {
      fromConfig.x = -80;
      fromConfig.rotationY = -24;
      fromConfig.rotationZ = -3;
    } else if (col === 1) {
      fromConfig.y = 70;
      fromConfig.scale = 0.88;
      fromConfig.rotationX = 20;
    } else {
      fromConfig.x = 80;
      fromConfig.rotationY = 24;
      fromConfig.rotationZ = 3;
    }

    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 82%',
        toggleActions: 'play none none none'
      },
      ...fromConfig
    });

    // Sound effect on hover
    card.addEventListener('mouseenter', () => {
      playMinecraftSound('pop');
    });
  });
}

/* ==========================================================================
   9. TIMELINE SECTION: FURNACE COMBUSTION & REDSTONE CIRCUIT PROPAGATION
   ========================================================================== */
function initTimelineRedstoneAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const timelineSection = document.getElementById('timeline');
  const fuelFill = document.querySelector('#timeline .fuel-level-fill');
  const redstoneLamp = document.querySelector('#timeline .redstone-lamp');
  const nodes = document.querySelectorAll('.crafting-node');

  if (!timelineSection) return;

  // Furnace Heat-Up ignition on scroll entry
  ScrollTrigger.create({
    trigger: '#timeline .mc-furnace-banner',
    start: 'top 80%',
    onEnter: () => {
      if (fuelFill) fuelFill.classList.add('ignited');
      if (redstoneLamp) {
        redstoneLamp.style.boxShadow = '0 0 20px #ff2222';
      }
    }
  });

  // Redstone current propagates down each timeline node sequentially
  nodes.forEach((node, idx) => {
    const markerCube = node.querySelector('.marker-cube');
    const redstoneWire = node.querySelector('.redstone-wire');
    const contentBox = node.querySelector('.node-content');

    // 3D Perspective entrance of milestone node
    gsap.from(contentBox, {
      scrollTrigger: {
        trigger: node,
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      x: 55,
      rotationY: 14,
      duration: 0.75,
      ease: 'power3.out'
    });

    // Redstone Wire Signal travel
    ScrollTrigger.create({
      trigger: node,
      start: 'top 75%',
      onEnter: () => {
        if (markerCube) markerCube.classList.add('powered');
        if (redstoneWire) redstoneWire.classList.add('powered');
      },
      onLeaveBack: () => {
        if (markerCube) markerCube.classList.remove('powered');
        if (redstoneWire) redstoneWire.classList.remove('powered');
      }
    });
  });
}

/* ==========================================================================
   10. PRIZES SECTION: 9-SLOT HOTBAR SWEEP & 3D PODIUM ELEVATION
   ========================================================================== */
function initPrizes3DAnimation() {
  const prizesSection = document.getElementById('prizes');
  const hotbarSlots = document.querySelectorAll('.mc-hotbar-slot');
  const tooltipTitle = document.getElementById('hotbar-tooltip-title');
  const tooltipDesc = document.getElementById('hotbar-tooltip-desc');
  const podiumCards = document.querySelectorAll('.loot-card');

  if (!prizesSection) return;

  // 1. Hotbar Quick-Draw sweep animation on entering section
  let sweepDone = false;
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.create({
      trigger: '#prizes .mc-hotbar-showcase',
      start: 'top 80%',
      onEnter: () => {
        if (sweepDone) return;
        sweepDone = true;

        hotbarSlots.forEach((slot, index) => {
          setTimeout(() => {
            hotbarSlots.forEach((s) => s.classList.remove('active'));
            slot.classList.add('active');
            if (index === hotbarSlots.length - 1) {
              setTimeout(() => {
                hotbarSlots.forEach((s) => s.classList.remove('active'));
                hotbarSlots[0].classList.add('active');
                updateTooltip(hotbarSlots[0]);
              }, 120);
            } else {
              updateTooltip(slot);
            }
          }, index * 80);
        });
      }
    });
  }

  // 2. Interactive Hotbar selection & audio
  function updateTooltip(slot) {
    const title = slot.getAttribute('data-title');
    const desc = slot.getAttribute('data-desc');
    if (tooltipTitle && title) tooltipTitle.textContent = title;
    if (tooltipDesc && desc) tooltipDesc.textContent = desc;
  }

  hotbarSlots.forEach((slot) => {
    function selectSlot() {
      hotbarSlots.forEach((s) => s.classList.remove('active'));
      slot.classList.add('active');
      updateTooltip(slot);

      // 3D bounce scale
      slot.style.transform = 'scale(1.22) translateY(-4px)';
      setTimeout(() => {
        slot.style.transform = '';
      }, 200);

      playMinecraftSound('pop');
      triggerHaptic(15);
      if (window.innerWidth <= 768) {
        slot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    slot.addEventListener('click', selectSlot);
    slot.addEventListener('mouseenter', selectSlot);
  });

  // 3. 3D Tiered Podium Elevation on scroll
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    const runnerUp = document.querySelector('.loot-runner-up');
    const grandChamp = document.querySelector('.loot-grand-champion');
    const thirdPlace = document.querySelector('.loot-third-place');

    if (runnerUp) {
      gsap.from(runnerUp, {
        scrollTrigger: { trigger: '.prizes-podium-grid', start: 'top 75%' },
        opacity: 0,
        x: -60,
        y: 80,
        rotationY: -16,
        duration: 0.9,
        ease: 'power3.out'
      });
    }

    if (grandChamp) {
      gsap.from(grandChamp, {
        scrollTrigger: { trigger: '.prizes-podium-grid', start: 'top 75%' },
        opacity: 0,
        y: 110,
        scale: 0.8,
        rotationX: 18,
        duration: 1.1,
        delay: 0.15,
        ease: 'back.out(1.8)'
      });
    }

    if (thirdPlace) {
      gsap.from(thirdPlace, {
        scrollTrigger: { trigger: '.prizes-podium-grid', start: 'top 75%' },
        opacity: 0,
        x: 60,
        y: 80,
        rotationY: 16,
        duration: 0.9,
        delay: 0.25,
        ease: 'power3.out'
      });
    }

    // Special category bounties 3D flip-in
    const bounties = document.querySelectorAll('.bounty-pill-card');
    if (bounties.length > 0) {
      gsap.from(bounties, {
        scrollTrigger: { trigger: '.special-bounties-wrap', start: 'top 85%' },
        opacity: 0,
        rotationX: 45,
        y: 40,
        stagger: 0.08,
        duration: 0.7,
        ease: 'back.out(1.6)'
      });
    }
  }
}

/* ==========================================================================
   11. RULES SECTION: ENCHANTED CODEX BOOK OPENING & REDSTONE REPEATER
   ========================================================================== */
function initRulesCodexAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const rulesSection = document.getElementById('rules');
  const bookContainer = document.querySelector('.mc-book-gui');
  const repeaterWidget = document.getElementById('mc-repeater');
  const movableTorch = document.getElementById('repeater-toggle-torch');

  if (!rulesSection) return;

  // 3D Book Cover Unfold on scroll
  if (bookContainer) {
    gsap.from(bookContainer, {
      scrollTrigger: {
        trigger: bookContainer,
        start: 'top 80%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      rotationY: -35,
      transformOrigin: 'left center',
      duration: 1.0,
      ease: 'power3.out'
    });
  }

  // Interactive Redstone Repeater Delay Clicker
  if (repeaterWidget && movableTorch) {
    let tickSetting = 1;
    const offsets = [0, 6, 12, 18]; // px translation

    repeaterWidget.addEventListener('click', () => {
      tickSetting = (tickSetting % 4) + 1;
      const xOffset = offsets[tickSetting - 1];
      movableTorch.style.transform = `translateX(${xOffset}px)`;

      const infoStrong = repeaterWidget.querySelector('.repeater-info strong');
      if (infoStrong) {
        infoStrong.textContent = `REDSTONE REPEATER DELAY: ${tickSetting} TICK${tickSetting > 1 ? 'S' : ''}`;
      }

      playMinecraftSound('click');
      triggerHaptic(18);
    });
  }
}

/* ==========================================================================
   12. SPONSORS SECTION: SKYWARD BEACON LASER IGNITION
   ========================================================================== */
function initSponsorsBeaconAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const beaconContainer = document.querySelector('.mc-beacon-container');
  const beaconRay = document.querySelector('.beacon-beam-ray');
  const sponsorCards = document.querySelectorAll('.sponsor-card');

  if (!beaconContainer) return;

  // Skyward laser beam shooting to the heavens on scroll
  if (beaconRay) {
    gsap.fromTo(beaconRay,
      { scaleY: 0, opacity: 0 },
      {
        scrollTrigger: {
          trigger: beaconContainer,
          start: 'top 80%'
        },
        scaleY: 1,
        opacity: 1,
        duration: 0.9,
        transformOrigin: 'bottom center',
        ease: 'power2.out'
      }
    );
  }

  // Sponsor cards 3D block placement (staggered block drop)
  if (sponsorCards.length > 0) {
    gsap.from(sponsorCards, {
      scrollTrigger: {
        trigger: '.sponsors-section',
        start: 'top 75%'
      },
      opacity: 0,
      scale: 0.75,
      y: 40,
      rotationX: 20,
      stagger: 0.07,
      duration: 0.75,
      ease: 'back.out(1.8)'
    });
  }
}

/* ==========================================================================
   13. ORGANIZING COUNCIL: 3D CARD HOVER & ENTRANCE
   ========================================================================== */
function initOrganizersAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const councilCards = document.querySelectorAll('.organizer-card');
  if (councilCards.length > 0) {
    gsap.from(councilCards, {
      scrollTrigger: {
        trigger: '#organizers',
        start: 'top 80%'
      },
      opacity: 0,
      y: 50,
      rotationY: 20,
      stagger: 0.12,
      duration: 0.8,
      ease: 'power3.out'
    });
  }
}

/* ==========================================================================
   14. FAQ: VILLAGER DIALOGUE CASCADE & NPC "HMM!" AUDIO
   ========================================================================== */
function initVillagerFAQAnimation() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length === 0) return;

  // 3D Staggered entrance
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.from(faqItems, {
      scrollTrigger: {
        trigger: '#faq',
        start: 'top 80%'
      },
      opacity: 0,
      y: 35,
      rotationZ: (i) => (i % 2 === 0 ? -1.5 : 1.5),
      stagger: 0.1,
      duration: 0.7,
      ease: 'power3.out'
    });
  }

  // Playful Villager sound on toggle
  faqItems.forEach((item) => {
    const summary = item.querySelector('.faq-question');
    if (summary) {
      summary.addEventListener('click', () => {
        playMinecraftSound('villager');
        triggerHaptic(15);
      });
    }
  });
}

/* ==========================================================================
   15. FINAL CTA SECTION: 3D PORTAL PUNCH
   ========================================================================== */
function initFinalCTAAnimation() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const finalBox = document.querySelector('.final-cta-box');
  if (finalBox) {
    gsap.from(finalBox, {
      scrollTrigger: {
        trigger: finalBox,
        start: 'top 80%'
      },
      opacity: 0,
      scale: 0.88,
      rotationX: 16,
      duration: 0.9,
      ease: 'back.out(1.5)'
    });
  }
}

/* ==========================================================================
   16. STICKY NAV BLUR & SCROLLSPY (WITH TECHFEST DOCK SYNC)
   ========================================================================== */
function initNavScrollspy() {
  const header = document.getElementById('site-header');
  const navLinks = document.querySelectorAll('.desktop-nav .nav-link');
  const dockLinks = document.querySelectorAll('.tf-dock-left .tf-dock-item');
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const scrollY = window.pageYOffset;

    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    let currentSectionId = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 180;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (!currentSectionId && scrollY < 600) {
      currentSectionId = 'hero';
    }

    navLinks.forEach((link) => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });

    dockLinks.forEach((item) => {
      item.classList.remove('active');
      const targetSec = item.getAttribute('data-section');
      if (targetSec === currentSectionId || (currentSectionId === 'hero-pinned-wrapper' && targetSec === 'hero')) {
        item.classList.add('active');
      }
    });
  }, { passive: true });

  // Smooth scroll for left dock items
  dockLinks.forEach((item) => {
    item.addEventListener('click', (e) => {
      const targetSec = item.getAttribute('href');
      if (targetSec) {
        e.preventDefault();
        const targetEl = document.querySelector(targetSec);
        if (targetEl) {
          if (typeof lenis !== 'undefined' && lenis) {
            lenis.scrollTo(targetEl, { offset: -40, duration: 1.2 });
          } else {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });
  });
}

/* ==========================================================================
   17. MOBILE DRAWER MENU
   ========================================================================== */
function initMobileDrawer() {
  const hamburger = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-link, .mobile-drawer .open-modal-btn');

  if (!hamburger || !drawer) return;

  function toggleMenu() {
    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    } else {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
  }

  hamburger.addEventListener('click', toggleMenu);

  mobileLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (drawer.classList.contains('open')) {
        toggleMenu();
      }
    });
  });
}

/* ==========================================================================
   18. TIMELINE DAY FILTER
   ========================================================================== */
function initTimelineFilter() {
  const tabs = document.querySelectorAll('.day-tab-btn');
  const nodes = document.querySelectorAll('.crafting-node');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-day');

      nodes.forEach((node) => {
        const day = node.getAttribute('data-day');
        if (filter === 'all' || day === filter) {
          node.classList.remove('hidden');
        } else {
          node.classList.add('hidden');
        }
      });

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });
  });
}

/* ==========================================================================
   19. RULES & CODEX TABS SWITCHER
   ========================================================================== */
function initCodexTabs() {
  const tabs = document.querySelectorAll('.codex-tab');
  const panes = document.querySelectorAll('.codex-pane');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `pane-${tab.getAttribute('data-tab')}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      playMinecraftSound('pop');

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });
  });
}

/* ==========================================================================
   20. REGISTRATION MODAL & DIGITAL HACKER PASS GENERATOR
   ========================================================================== */
function initRegistrationModal() {
  const modal = document.getElementById('register-modal');
  const openBtns = document.querySelectorAll('.open-modal-btn');
  const closeBtn = document.querySelector('.modal-close-btn');
  const doneBtn = document.getElementById('modal-done-btn');
  const regForm = document.getElementById('hacker-reg-form');

  const stepForm = document.getElementById('modal-step-form');
  const stepTicket = document.getElementById('modal-step-ticket');
  const printPassBtn = document.getElementById('download-pass-btn');

  if (!modal) return;

  function openModal(e) {
    if (e) e.preventDefault();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    playMinecraftSound('pop');
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  openBtns.forEach((btn) => btn.addEventListener('click', openModal));

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (doneBtn) doneBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  // Handle Form Submission with SQLite Database Persistence
  if (regForm) {
    const errorBox = document.getElementById('reg-error-box');
    const submitBtn = document.getElementById('submit-ticket-btn');

    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.textContent = '';
      }

      const teamName = document.getElementById('team-name').value.trim();
      const teamSize = document.getElementById('team-size').value;
      const leaderName = document.getElementById('leader-name').value.trim();
      const leaderEmail = document.getElementById('leader-email').value.trim();
      const leaderPhone = document.getElementById('leader-phone').value.trim();
      const collegeName = document.getElementById('college-name').value.trim();
      const track = document.getElementById('primary-track').value;
      const portfolioUrl = (document.getElementById('portfolio-url')?.value || '').trim();
      const conceptBrief = (document.getElementById('concept-brief')?.value || '').trim();

      // Loading state on button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>FORGING SQUAD PASS IN DATABASE...</span>';
      }

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_name: teamName,
            team_size: teamSize,
            leader_name: leaderName,
            leader_email: leaderEmail,
            leader_phone: leaderPhone,
            college_name: collegeName,
            primary_track: track,
            portfolio_url: portfolioUrl,
            concept_brief: conceptBrief
          })
        });

        let data = {};
        try {
          data = await response.json();
        } catch (jsonErr) {
          // Non-JSON response
        }

        if (!response.ok) {
          throw new Error(data.error || `Server responded with status ${response.status}. Please try again.`);
        }

        // Use the pass ID from the database response
        const passId = (data.registration && data.registration.pass_id) 
          ? data.registration.pass_id 
          : `CFT-${Math.floor(1000 + Math.random() * 9000)}-DBU`;

        // Populate and generate hall ticket pass
        document.getElementById('pass-team-name').textContent = teamName;
        document.getElementById('pass-leader-name').textContent = leaderName;
        document.getElementById('pass-team-size').textContent = `${teamSize} Crafters`;
        document.getElementById('pass-track-name').textContent = track.split('—')[1]?.trim() || track;
        document.getElementById('pass-unique-id').textContent = passId;

        // Switch View to Ticket Celebration
        stepForm.classList.remove('active');
        stepTicket.classList.add('active');

        playMinecraftSound('level_up');

        // 3D Entrance on Ticket
        if (typeof gsap !== 'undefined') {
          gsap.from('#digital-pass-card', {
            scale: 0.85,
            rotationY: 15,
            opacity: 0,
            duration: 0.6,
            ease: 'back.out(1.7)'
          });
        }
      } catch (err) {
        console.error('Registration flow error:', err);
        // Show error to user
        if (errorBox) {
          errorBox.textContent = err.message || 'Registration failed. Please try again.';
          errorBox.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>GENERATE HACKER TICKET</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
        }
      }
    });
  }

  // Print Pass
  if (printPassBtn) {
    printPassBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

/* ==========================================================================
   21. SYNTHESIZED WEB AUDIO AMBIANCE (PORTAL HUM)
   ========================================================================== */
function initAudioAmbiance() {
  const audioBtn = document.getElementById('audio-toggle');
  if (!audioBtn) return;

  let audioCtx = null;
  let isPlaying = false;
  let osc1 = null;
  let osc2 = null;
  let gainNode = null;

  audioBtn.addEventListener('click', () => {
    if (!audioCtx) {
      audioCtx = getAudioContext();
    }

    if (isPlaying) {
      if (gainNode) {
        gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        setTimeout(() => {
          if (osc1) { osc1.stop(); osc1.disconnect(); }
          if (osc2) { osc2.stop(); osc2.disconnect(); }
        }, 450);
      }
      isPlaying = false;
      audioBtn.classList.add('audio-muted');
      audioBtn.setAttribute('title', 'Play portal ambiance');
    } else {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      osc1 = audioCtx.createOscillator();
      osc2 = audioCtx.createOscillator();
      gainNode = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65.41, audioCtx.currentTime); // C2

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(98.0, audioCtx.currentTime); // G2

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(240, audioCtx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 1.2);

      osc1.start();
      osc2.start();

      isPlaying = true;
      audioBtn.classList.remove('audio-muted');
      audioBtn.setAttribute('title', 'Mute portal ambiance');
    }
  });

  audioBtn.classList.add('audio-muted');
}

/* ==========================================================================
   22. BROCHURE DOWNLOAD NOTIFICATION
   ========================================================================== */
function initBrochureAction() {
  const brochureBtn = document.getElementById('brochure-btn');
  if (!brochureBtn) return;

  brochureBtn.addEventListener('click', (e) => {
    e.preventDefault();
    playMinecraftSound('pop');

    const note = document.createElement('div');
    note.style.cssText = `
      position: fixed;
      bottom: 28px;
      right: 28px;
      background: #191929;
      border: 1px solid #c77dff;
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 8px;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.88rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(157, 78, 221, 0.3);
      z-index: 300;
      display: flex;
      align-items: center;
      gap: 12px;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.25s ease-out;
    `;
    note.innerHTML = `
      <span style="font-size: 1.2rem;">📑</span>
      <div>
        <strong>CRAFTCON '26 Handbook</strong>
        <div style="font-size: 0.76rem; color: #9e9eb4;">Official DBU event dossier dispatched.</div>
      </div>
    `;

    document.body.appendChild(note);

    requestAnimationFrame(() => {
      note.style.transform = 'translateY(0)';
      note.style.opacity = '1';
    });

    setTimeout(() => {
      note.style.transform = 'translateY(20px)';
      note.style.opacity = '0';
      setTimeout(() => note.remove(), 300);
    }, 3800);
  });
}
