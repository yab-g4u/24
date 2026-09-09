import { AppChallengeState, SubmissionData, Challenge, Category, LockedChallengeRecord } from '../types';

const STORAGE_KEY = '24_challenge_state_v2';
const LEGACY_STORAGE_KEY = '24_challenge_state_v1';

export function loadChallengeState(): AppChallengeState {
  const defaultState: AppChallengeState = {
    category: null,
    challenge: null,
    locked: false,
    lockTimestamp: null,
    submission: null,
    challenges: {
      design: null,
      writing: null,
    },
  };

  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    let parsed: any = null;

    if (raw) {
      parsed = JSON.parse(raw);
    } else {
      // Check legacy key for migration
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        parsed = JSON.parse(legacyRaw);
      }
    }

    if (!parsed) return defaultState;

    const challenges: { design: LockedChallengeRecord | null; writing: LockedChallengeRecord | null } = {
      design: parsed.challenges?.design || null,
      writing: parsed.challenges?.writing || null,
    };

    // If legacy single-challenge exists and not yet in challenges map
    if (parsed.challenge && parsed.challenge.category && parsed.locked) {
      const cat = parsed.challenge.category as Category;
      if (!challenges[cat]) {
        challenges[cat] = {
          challenge: parsed.challenge,
          lockTimestamp: typeof parsed.lockTimestamp === 'number' ? parsed.lockTimestamp : Date.now(),
          submission: parsed.submission || null,
        };
      }
    }

    // Determine primary/active challenge
    const activeCat: Category | null =
      parsed.category ||
      (challenges.design ? 'design' : challenges.writing ? 'writing' : null);

    const activeItem = activeCat ? challenges[activeCat] : null;
    const isLocked = Boolean(challenges.design || challenges.writing || parsed.locked);

    return {
      category: activeCat,
      challenge: activeItem?.challenge || parsed.challenge || null,
      locked: isLocked,
      lockTimestamp: activeItem?.lockTimestamp || parsed.lockTimestamp || null,
      submission: activeItem?.submission || parsed.submission || null,
      challenges,
    };
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
    return defaultState;
  }
}

export function saveChallengeState(state: Partial<AppChallengeState>): AppChallengeState {
  const current = loadChallengeState();
  const next: AppChallengeState = {
    ...current,
    ...state,
    challenges: {
      ...current.challenges,
      ...(state.challenges || {}),
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }

  return next;
}

export function lockSingleChallenge(challenge: Challenge, timestamp = Date.now()): AppChallengeState {
  const current = loadChallengeState();
  const cat = challenge.category;

  const newRecord: LockedChallengeRecord = {
    challenge,
    lockTimestamp: timestamp,
    submission: null,
  };

  const updatedChallenges = {
    ...current.challenges,
    [cat]: newRecord,
  };

  return saveChallengeState({
    category: cat,
    challenge,
    locked: true,
    lockTimestamp: timestamp,
    submission: null,
    challenges: updatedChallenges,
  });
}

export function saveSubmission(submission: SubmissionData): AppChallengeState {
  const current = loadChallengeState();
  const cat = submission.category || current.category || 'design';

  const existingRecord = current.challenges[cat];
  const updatedChallenges = {
    ...current.challenges,
    [cat]: existingRecord
      ? { ...existingRecord, submission }
      : {
          challenge: current.challenge!,
          lockTimestamp: current.lockTimestamp || Date.now(),
          submission,
        },
  };

  return saveChallengeState({
    submission,
    challenges: updatedChallenges,
  });
}
