"use client";

/**
 * Synthesizes a soft, professional medical notification chime using the Web Audio API.
 * Uses a warm, two-tone ascending melody (E5: 659.25Hz -> A5: 880Hz) with smooth gain envelope.
 */
export function playNotificationChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.36);

    // Tone 2: A5 (880.00 Hz) - Higher resolution, gentle bell decay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, now + 0.12);

    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.12);
    osc2.stop(now + 0.76);

    // Cleanup audio context after playback
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Audio playback not allowed or blocked by browser policy
  }
}

/**
 * Checks if a sound alert should be played for an unseen notification key.
 * Allows playing at most twice per day until the key is marked as seen.
 */
export function checkAndPlayNotificationAlert(notificationKey: string | null | undefined): void {
  if (!notificationKey || typeof window === "undefined") return;

  const storageKey = `saans_sound_alert_${notificationKey}`;
  const now = Date.now();

  try {
    const recordStr = localStorage.getItem(storageKey);
    let record: { count: number; timestamps: number[] } = { count: 0, timestamps: [] };

    if (recordStr) {
      try {
        record = JSON.parse(recordStr);
      } catch {
        record = { count: 0, timestamps: [] };
      }
    }

    // Filter out timestamps older than 24 hours
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentTimestamps = (record.timestamps || []).filter((ts) => ts > oneDayAgo);

    // If played less than 2 times in the past 24h, and last played at least 4 hours ago (or first time)
    const lastPlayed = recentTimestamps[recentTimestamps.length - 1] || 0;
    const canPlay = recentTimestamps.length < 2 && (now - lastPlayed > 4 * 60 * 60 * 1000 || recentTimestamps.length === 0);

    if (canPlay) {
      playNotificationChime();
      recentTimestamps.push(now);
      localStorage.setItem(storageKey, JSON.stringify({
        count: recentTimestamps.length,
        timestamps: recentTimestamps,
      }));
    }
  } catch {
    // Fallback: simple one-time play
    playNotificationChime();
  }
}
