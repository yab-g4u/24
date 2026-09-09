import React from 'react';
import { motion } from 'motion/react';
import { Lock, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { Challenge, SubmissionData } from '../types';
import { CountdownTimer } from './CountdownTimer';
import { ShareCard } from './ShareCard';
import { SubmissionForm } from './SubmissionForm';

interface ActiveChallengeViewProps {
  challenge: Challenge;
  lockTimestamp: number;
  submission: SubmissionData | null;
  onSubmitWork: (data: SubmissionData) => void;
}

export const ActiveChallengeView: React.FC<ActiveChallengeViewProps> = ({
  challenge,
  lockTimestamp,
  submission,
  onSubmitWork,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      {/* Locked Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-red-950/30 border border-red-900/40 text-red-300 text-xs sm:text-sm font-mono-digits"
      >
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-[#ff3b30] shrink-0" />
          <span className="font-bold tracking-wider uppercase text-white">CHALLENGE LOCKED</span>
          <span className="hidden sm:inline text-red-400">• Fate chose this. Don't fight it.</span>
        </div>

        <div className="text-zinc-400 text-xs uppercase tracking-wider">
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

      {/* "CREATE SOMETHING." section */}
      <div className="p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-left space-y-3">
        <div className="flex items-center space-x-2 text-xs font-mono-digits text-zinc-400 uppercase tracking-widest">
          <Sparkles className="w-4 h-4 text-zinc-300" />
          <span>DIRECTIVE</span>
        </div>

        <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
          CREATE SOMETHING.
        </h2>

        <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
          You have 24 hours. Use AI if you want. Interpret the challenge however you want. Just make something.
        </p>

        <div className="pt-2 text-xs font-mono-digits text-zinc-400 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>No rules on style, format, or tools. Pure creative liberty.</span>
        </div>
      </div>

      {/* Shareable Challenge Card */}
      <ShareCard challenge={challenge} />

      {/* Submission Section */}
      <SubmissionForm
        challenge={challenge}
        category={challenge.category}
        submission={submission}
        onSubmit={onSubmitWork}
      />
    </div>
  );
};
