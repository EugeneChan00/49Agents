// ─── Notification Sounds ──────────────────────────────────────────────────
// Web Audio API sound effects for Claude state change notifications.
// Pure functions — no DOM interaction, no side effects beyond audio output.

const SOUND_THROTTLE_MS = 500;
const SOUND_GLOBAL_MIN_MS = 500;
const lastSoundTimeByState = new Map(); // claudeState -> timestamp

let soundEnabled = true;

export function setSoundEnabled(val) { soundEnabled = val; }
export function getSoundEnabled() { return soundEnabled; }

// Subtle dismiss sound (shared for permission/question)
export function playDismissSound() {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 250);
  } catch (e) {
    // Audio not available
  }
}

function playTwoNoteTone(ctx, freq1, freq2, gainMul = 1.0, skipClose = false) {
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
  gain1.gain.setValueAtTime(0.15 * gainMul, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.2);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq2, ctx.currentTime + 0.15);
  gain2.gain.setValueAtTime(0.001, ctx.currentTime);
  gain2.gain.setValueAtTime(0.15 * gainMul, ctx.currentTime + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.4);
  if (!skipClose) setTimeout(() => ctx.close(), 500);
}

function playThreeNoteTone(ctx, freq1, freq2, freq3, gainMul = 1.0) {
  playTwoNoteTone(ctx, freq1, freq2, gainMul, true);
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(freq3, ctx.currentTime + 0.35);
  gain3.gain.setValueAtTime(0.001, ctx.currentTime);
  gain3.gain.setValueAtTime(0.15 * gainMul, ctx.currentTime + 0.35);
  gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
  osc3.connect(gain3).connect(ctx.destination);
  osc3.start(ctx.currentTime + 0.35);
  osc3.stop(ctx.currentTime + 0.6);
  setTimeout(() => ctx.close(), 700);
}

// Play notification sound via Web Audio API (distinct per state)
export function playNotificationSound(claudeState, escalationLevel = 0) {
  if (!soundEnabled) return;
  const now = Date.now();
  // Per-state throttle: each state type has its own cooldown
  const lastForState = lastSoundTimeByState.get(claudeState) || 0;
  if (now - lastForState < SOUND_THROTTLE_MS) return;
  // Global minimum to prevent overlapping garbled audio
  let lastGlobal = 0;
  for (const t of lastSoundTimeByState.values()) { if (t > lastGlobal) lastGlobal = t; }
  if (now - lastGlobal < SOUND_GLOBAL_MIN_MS) return;
  // Escalation: louder at level 5+
  const gainMultiplier = escalationLevel >= 5 ? 1.5 : 1.0;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (claudeState === 'permission') {
      if (escalationLevel >= 5) {
        playThreeNoteTone(ctx, 587, 440, 330, gainMultiplier);
      } else {
        playTwoNoteTone(ctx, 587, 440, gainMultiplier);
      }
    } else if (claudeState === 'question' || claudeState === 'inputNeeded') {
      if (escalationLevel >= 5) {
        playThreeNoteTone(ctx, 587, 784, 988, gainMultiplier);
      } else {
        playTwoNoteTone(ctx, 587, 784, gainMultiplier);
      }
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1 * gainMultiplier, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
      setTimeout(() => ctx.close(), 350);
    }
    // Only record timestamp AFTER audio successfully started
    lastSoundTimeByState.set(claudeState, now);
  } catch (e) {
    // Audio not available — don't update timestamp so next attempt isn't throttled
  }
}
