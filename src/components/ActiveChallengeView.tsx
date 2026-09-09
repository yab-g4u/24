import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Layers,
  Feather,
  PlusCircle,
} from 'lucide-react';
import { Challenge, SubmissionData, Category, LockedChallengeRecord } from '../types';
import { DESIGN_CHALLENGES, WRITING_CHALLENGES } from '../data/challenges';
import { CountdownTimer } from './CountdownTimer';
import { ShareCard } from './ShareCard';

interface ActiveChallengeViewProps {
  challenge: Challenge;
  lockTimestamp: number;
  submission: SubmissionData | null;
  dualState?: {
    design: LockedChallengeRecord | null;
    writing: LockedChallengeRecord | null;
  };
  activeCategory?: Category;
  onSelectCategoryTab?: (cat: Category) => void;
  onSpinOtherCategory?: (otherCat: Category) => void;
  onGoToSubmit: (cat?: Category) => void;
  onBackToHome: () => void;
}

export const ActiveChallengeView: React.FC<ActiveChallengeViewProps> = ({
  challenge,
  lockTimestamp,
  submission,
  dualState,
  activeCategory = challenge.category,
  onSelectCategoryTab,
  onSpinOtherCategory,
  onGoToSubmit,
  onBackToHome,
}) => {
  const [showOtherCategory, setShowOtherCategory] = useState(false);

  const hasDesign = Boolean(dualState?.design);
  const hasWriting = Boolean(dualState?.writing);
  const hasBoth = hasDesign && hasWriting;

  const otherCategory: Category = challenge.category === 'design' ? 'writing' : 'design';
  const otherChallenges = otherCategory === 'design' ? DESIGN_CHALLENGES : WRITING_CHALLENGES;
  const isOtherLocked = Boolean(dualState?.[otherCategory]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Navigation & Status Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center text-xs font-mono-digits text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          LANDING PAGE
        </button>

        <div className="flex items-center space-x-2 text-xs font-mono-digits text-zinc-500">
          <span>{hasBoth ? '2 OF 2 CHALLENGES ACTIVE' : '1 OF 2 CHALLENGES ACTIVE'}</span>
        </div>
      </div>

      {/* Dual Challenge Switcher Tabs if both are locked */}
      {hasBoth && onSelectCategoryTab && (
        <div className="flex items-center justify-center p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 gap-2">
          <button
            type="button"
            onClick={() => onSelectCategoryTab('design')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-mono-digits uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeCategory === 'design'
                ? 'bg-zinc-800 text-white font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>DESIGN #{dualState?.design?.challenge.id}</span>
            {dualState?.design?.submission && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                SUBMITTED
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectCategoryTab('writing')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-mono-digits uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeCategory === 'writing'
                ? 'bg-zinc-800 text-white font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            <span>WRITING #{dualState?.writing?.challenge.id}</span>
            {dualState?.writing?.submission && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                SUBMITTED
              </span>
            )}
          </button>
        </div>
      )}

      {/* Locked Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 rounded-xl bg-red-950/30 border border-red-900/40 text-red-300 text-xs sm:text-sm font-mono-digits gap-2"
      >
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-[#ff3b30] shrink-0" />
          <span className="font-bold tracking-wider uppercase text-white">
            {challenge.category.toUpperCase()} CHALLENGE LOCKED
          </span>
          <span className="hidden sm:inline text-red-400">• Fate chose this directive.</span>
        </div>

        <div className="text-zinc-400 text-xs uppercase tracking-wider font-bold">
          NO REROLLS
        </div>
      </motion.div>

      {/* Main Challenge Hero Banner */}
      <div className="text-center space-y-4 pt-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono-digits text-zinc-300 uppercase">
          <Zap className="w-3.5 h-3.5 text-[#ff3b30]" />
          <span>YOUR FATE: {challenge.category.toUpperCase()} #{challenge.id}</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-6xl md:text-7xl text-white tracking-tight leading-[1.05] uppercase">
          {challenge.title}
        </h1>

        {challenge.subtitle && (
          <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto italic font-medium">
            "{challenge.subtitle}"
          </p>
        )}
      </div>

      {/* 24-Hour Countdown Timer */}
      <CountdownTimer lockTimestamp={lockTimestamp} />

      {/* "CREATE SOMETHING." directive section */}
      <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-left space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono-digits text-zinc-400 uppercase tracking-widest">
          <Sparkles className="w-4 h-4 text-zinc-300" />
          <span>DIRECTIVE</span>
        </div>

        <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
          CREATE SOMETHING.
        </h2>

        <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
          {challenge.category === 'writing'
            ? 'You have 24 hours. Craft your piece directly, write in your tool of choice, or export a PDF. Interpret the theme however you want.'
            : 'You have 24 hours. Use AI if you want. Interpret the challenge however you want. Just make something.'}
        </p>

        <div className="pt-2 text-xs font-mono-digits text-zinc-400 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pure creative liberty. Lock in proof before your clock runs out.</span>
        </div>
      </div>

      {/* Shareable Challenge Card */}
      <ShareCard challenge={challenge} />

      {/* Take on Second Challenge Banner (If user only has 1 challenge locked) */}
      {!hasBoth && !isOtherLocked && onSpinOtherCategory && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono-digits text-[#ff3b30] uppercase font-bold tracking-wider">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>DUAL CHALLENGE (MAXIMUM 2)</span>
            </div>
            <h3 className="font-display font-bold text-xl text-white">
              WANT TO CONQUER {otherCategory.toUpperCase()} TOO?
            </h3>
            <p className="text-xs text-zinc-400 max-w-md">
              You can lock in up to 2 challenges (1 Design, 1 Writing). Each challenge gets its own independent 24-hour countdown clock.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSpinOtherCategory(otherCategory)}
            className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono-digits font-bold uppercase tracking-wider transition-colors shrink-0 cursor-pointer flex items-center gap-2"
          >
            {otherCategory === 'writing' ? <Feather className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            <span>SPIN FOR {otherCategory.toUpperCase()} →</span>
          </button>
        </div>
      )}

      {/* CLEAR PATH TO /submit */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-zinc-700 text-center space-y-4 shadow-2xl"
      >
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-red-950/40 border border-red-800/60 text-xs font-mono-digits text-red-400 uppercase font-bold">
          <span>TURN IN YOUR {challenge.category.toUpperCase()} PROJECT</span>
        </div>

        <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
          READY TO SUBMIT?
        </h3>

        <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
          {submission
            ? `Your submission for ${challenge.category} #${challenge.id} is verified and locked. You can review it or submit your other challenge.`
            : `Submit your ${challenge.category === 'writing' ? 'written piece or PDF document' : 'design artifact'} to lock your work into the community repository.`}
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onGoToSubmit(challenge.category)}
            className="group inline-flex items-center justify-center px-8 sm:px-10 py-4 text-base sm:text-lg font-bold font-mono-digits uppercase tracking-wider text-black bg-white hover:bg-zinc-100 active:scale-[0.98] rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-pointer"
          >
            <span>
              {submission
                ? `VIEW ${challenge.category.toUpperCase()} SUBMISSION (/submit)`
                : `SUBMIT ${challenge.category.toUpperCase()} WORK (/submit)`}
            </span>
            <ArrowRight className="w-5 h-5 ml-2.5 group-hover:translate-x-1 transition-transform text-black" />
          </button>
        </div>
      </motion.div>

      {/* Browse Other Category (Curiosity Mode) */}
      <div className="pt-4 border-t border-zinc-900">
        <button
          type="button"
          onClick={() => setShowOtherCategory(!showOtherCategory)}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-900 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              {otherCategory === 'writing' ? (
                <Feather className="w-4 h-4 text-white" />
              ) : (
                <Layers className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <div className="text-xs font-mono-digits text-zinc-300 font-bold uppercase">
                Browse All {otherCategory.toUpperCase()} Prompts
              </div>
              <div className="text-[11px] font-mono-digits text-zinc-500">
                Inspect the full list of 15 {otherCategory} directives
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-zinc-400">
            <span className="text-xs font-mono-digits hidden sm:inline">
              {showOtherCategory ? 'Hide' : 'Inspect'}
            </span>
            {showOtherCategory ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showOtherCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {otherChallenges.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-left"
                    >
                      <div className="text-[11px] font-mono-digits text-zinc-500 uppercase">
                        {otherCategory} #{item.id}
                      </div>
                      <div className="text-sm font-bold text-white font-display mt-0.5">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-xs text-zinc-400 italic mt-1 line-clamp-2">
                          "{item.subtitle}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Return to Landing Footer Link */}
      <div className="text-center pt-6">
        <button
          type="button"
          onClick={onBackToHome}
          className="text-xs font-mono-digits text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          ← Return to Landing Page & Showcase
        </button>
      </div>
    </div>
  );
};
