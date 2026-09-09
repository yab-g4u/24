/**
 * 24-Hour Cycle Management Utility
 * Calculates and persists the 24-hour challenge deadline ending tomorrow at midnight
 * in the user's current local timezone.
 */

const CYCLE_STORAGE_KEY = '24_challenge_cycle_deadline_v2';

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time';
  } catch {
    return 'Local Time';
  }
}

/**
 * Returns the cycle deadline timestamp (in ms).
 * If none is saved or if expired, initializes the deadline to tomorrow at midnight
 * (end of tomorrow at 24:00:00) in the user's current local timezone.
 */
export function getCycleDeadlineTimestamp(): number {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(CYCLE_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > Date.now()) {
          return parsed;
        }
      }
    } catch (e) {
      console.debug('Failed to read cycle deadline from storage:', e);
    }
  }

  // Calculate tomorrow at midnight (24:00:00) in user's current local timezone
  const now = new Date();
  const tomorrowMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    24,
    0,
    0,
    0
  );

  const targetTs = tomorrowMidnight.getTime();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CYCLE_STORAGE_KEY, String(targetTs));
    } catch {}
  }
  return targetTs;
}

export interface CountdownBreakdown {
  hours: string;
  minutes: string;
  seconds: string;
  totalRemainingMs: number;
  isFinished: boolean;
  userTimeZone: string;
}

/**
 * Computes the remaining time for the 24-hour countdown cycle.
 * Caps at 24 hours so it provides an exact 24h countdown window down to midnight tomorrow.
 */
export function calculate24HourCountdown(targetTimestamp?: number): CountdownBreakdown {
  const target = targetTimestamp || getCycleDeadlineTimestamp();
  const now = Date.now();
  const diffMs = Math.max(0, target - now);

  if (diffMs <= 0) {
    return {
      hours: '00',
      minutes: '00',
      seconds: '00',
      totalRemainingMs: 0,
      isFinished: true,
      userTimeZone: getUserTimeZone(),
    };
  }

  // Exact 24-hour window: at most 24 hours
  const effectiveMs = Math.min(diffMs, 24 * 60 * 60 * 1000);
  const totalSeconds = Math.floor(effectiveMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
    totalRemainingMs: effectiveMs,
    isFinished: false,
    userTimeZone: getUserTimeZone(),
  };
}
