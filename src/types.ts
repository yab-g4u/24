export type Category = 'design' | 'writing';

export interface Challenge {
  id: number;
  title: string;
  category: Category;
  subtitle?: string;
  promptGuidance?: string;
}

export interface SubmissionImageItem {
  url?: string;
  path?: string;
  name?: string;
  size?: number;
  type?: string;
}

export interface SubmissionData {
  id?: string;
  handle: string;
  name?: string;
  email?: string;
  category?: Category;
  challengeNumber?: number;
  challengeTitle?: string;
  link?: string;
  notes?: string;
  submissionText?: string;
  submissionUrl?: string;
  filePath?: string;
  fileName?: string;
  fileDataUrl?: string;
  fileType?: string;
  fileSize?: number;
  images?: SubmissionImageItem[];
  status?: 'submitted' | 'reviewed' | 'winner' | 'rejected';
  submittedAt: number;
}

export interface LockedChallengeRecord {
  challenge: Challenge;
  lockTimestamp: number;
  submission: SubmissionData | null;
}

export interface AppChallengeState {
  // Legacy / active selection pointers for backwards compatibility
  category: Category | null;
  challenge: Challenge | null;
  locked: boolean;
  lockTimestamp: number | null;
  submission: SubmissionData | null;

  // Maximum 2 challenges (1 design, 1 writing)
  challenges: {
    design: LockedChallengeRecord | null;
    writing: LockedChallengeRecord | null;
  };
}
