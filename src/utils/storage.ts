import { AppChallengeState, SubmissionData, Challenge, Category } from '../types';

const STORAGE_KEY = '24_challenge_state_v1';

export function loadChallengeState(): AppChallengeState {
  if (typeof window === 'undefined') {
    return {
      category: null,
      challenge: null,
      locked: false,
      lockTimestamp: null,
      submission: null,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        category: null,
        challenge: null,
        locked: false,
        lockTimestamp: null,
        submission: null,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      category: parsed.category || null,
      challenge: parsed.challenge || null,
      locked: Boolean(parsed.locked),
      lockTimestamp: typeof parsed.lockTimestamp === 'number' ? parsed.lockTimestamp : null,
      submission: parsed.submission || null,
    };
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
    return {
      category: null,
      challenge: null,
      locked: false,
      lockTimestamp: null,
      submission: null,
    };
  }
}

export function saveChallengeState(state: Partial<AppChallengeState>): AppChallengeState {
  const current = loadChallengeState();
  const next: AppChallengeState = {
    ...current,
    ...state,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }

  return next;
}

export function saveSubmission(submission: SubmissionData): AppChallengeState {
  return saveChallengeState({ submission });
}
