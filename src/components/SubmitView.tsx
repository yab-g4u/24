import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Lock, ArrowRight, Zap, ShieldAlert, Layers, Feather } from 'lucide-react';
import { Challenge, SubmissionData, Category, LockedChallengeRecord } from '../types';
import { CountdownTimer } from './CountdownTimer';
import { SubmissionForm } from './SubmissionForm';
import { ShareCard } from './ShareCard';

interface SubmitViewProps {
  challenge: Challenge | null;
  lockTimestamp: number | null;
  submission: SubmissionData | null;
  dualState?: {
    design: LockedChallengeRecord | null;
    writing: LockedChallengeRecord | null;
  };
  initialCategory?: Category;
  onSubmitWork: (data: SubmissionData) => void;
  onBackToHome: () => void;
  onBackToChallenge: () => void;
}

export const SubmitView: React.FC<SubmitViewProps> = ({
  challenge,
  lockTimestamp,
  submission,
  dualState,
  initialCategory,
  onSubmitWork,
  onBackToHome,
  onBackToChallenge,
}) => {
  const hasDesign = Boolean(dualState?.design);
  const hasWriting = Boolean(dualState?.writing);
  const hasBoth = hasDesign && hasWriting;

  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    if (initialCategory && dualState?.[initialCategory]) return initialCategory;
    if (challenge?.category) return challenge.category;
    if (hasDesign) return 'design';
    if (hasWriting) return 'writing';
    return 'design';
  });

  // Active target challenge & lock data based on category tab
  const activeRecord = hasBoth
    ? dualState?.[activeCategory]
    : dualState?.[activeCategory] || (challenge && lockTimestamp ? { challenge, lockTimestamp, submission } : null);

  const activeChallenge = activeRecord?.challenge || challenge;
  const activeTimestamp = activeRecord?.lockTimestamp || lockTimestamp;
  const activeSubmission = activeRecord?.submission || (challenge?.category === activeCategory ? submission : null);

  // If user hasn't locked any challenge
  if (!activeChallenge || !activeTimestamp) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/60 flex items-center justify-center mx-auto text-[#ff3b30]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            NO ACTIVE CHALLENGE
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            You must spin and lock a challenge before submitting your work. Fate decides the prompt, you have 24 hours to execute.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBackToChallenge}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white text-black font-mono-digits text-sm font-bold uppercase tracking-wider hover:bg-zinc-100 transition-all cursor-pointer"
          >
            SPIN FOR CHALLENGE →
          </button>
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono-digits text-sm hover:text-white transition-colors cursor-pointer"
          >
            ← Back to Landing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <button
          type="button"
          onClick={onBackToChallenge}
          className="inline-flex items-center text-xs font-mono-digits text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          CHALLENGE WORKSPACE
        </button>

        <button
          type="button"
          onClick={onBackToHome}
          className="text-xs font-mono-digits text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          LANDING & SHOWCASE →
        </button>
      </div>

      {/* Dual Submission Category Selector if participant locked both */}
      {hasBoth && (
        <div className="flex items-center justify-center p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('design')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-mono-digits uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeCategory === 'design'
                ? 'bg-zinc-800 text-white font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>SUBMIT DESIGN #{dualState?.design?.challenge.id}</span>
            {dualState?.design?.submission && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ✓
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('writing')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-mono-digits uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeCategory === 'writing'
                ? 'bg-zinc-800 text-white font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            <span>SUBMIT WRITING #{dualState?.writing?.challenge.id}</span>
            {dualState?.writing?.submission && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ✓
              </span>
            )}
          </button>
        </div>
      )}

      {/* Active Challenge Header Summary */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 text-left">
          <div className="inline-flex items-center space-x-1.5 text-xs font-mono-digits text-[#ff3b30] uppercase font-bold tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>
              SUBMITTING {activeChallenge.category.toUpperCase()} #{activeChallenge.id}
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
            {activeChallenge.title}
          </h2>
          {activeChallenge.subtitle && (
            <p className="text-zinc-400 text-xs italic">
              "{activeChallenge.subtitle}"
            </p>
          )}
        </div>

        <div className="shrink-0">
          <CountdownTimer lockTimestamp={activeTimestamp} />
        </div>
      </div>

      {/* The Submission Form */}
      <SubmissionForm
        key={activeChallenge.id + activeChallenge.category}
        category={activeChallenge.category}
        challenge={activeChallenge}
        submission={activeSubmission}
        onSubmit={onSubmitWork}
      />

      {/* Post-submission Navigation / Share Card */}
      {activeSubmission && (
        <div className="space-y-6 pt-4">
          <ShareCard challenge={activeChallenge} />

          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
            <h3 className="font-display font-bold text-xl text-white">
              YOUR PROJECT IS RECORDED
            </h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Your {activeChallenge.category} work is safely stored in the community showcase.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-white text-black font-mono-digits text-sm font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer shadow-lg"
              >
                <span>VIEW SHOWCASE ON LANDING PAGE</span>
                <ArrowRight className="w-4 h-4 ml-2 text-black" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
