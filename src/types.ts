export type Category = 'design' | 'writing';

export interface Challenge {
  id: number;
  title: string;
  category: Category;
  subtitle?: string;
  promptGuidance?: string;
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
  status?: 'submitted' | 'reviewed' | 'winner' | 'rejected';
  submittedAt: number;
}

export interface AppChallengeState {
  category: Category | null;
  challenge: Challenge | null;
  locked: boolean;
  lockTimestamp: number | null;
  submission: SubmissionData | null;
}
