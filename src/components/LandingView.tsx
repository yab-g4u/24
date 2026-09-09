import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Palette, PenLine, Flame, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Category } from '../types';

interface LandingViewProps {
  onStart: () => void;
  onSelectCategoryQuick?: (category: Category) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStart, onSelectCategoryQuick }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14 flex flex-col items-center text-center">
      {/* Social proof banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 text-xs sm:text-sm font-mono-digits mb-8"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>127 creators creating right now</span>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-400">23 challenges locked today</span>
      </motion.div>

      {/* Main Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-4 max-w-3xl"
      >
        <div className="inline-block px-3 py-1 text-xs font-mono-digits tracking-widest text-[#ff3b30] uppercase bg-red-950/30 border border-red-900/40 rounded">
          THE INTERNET'S CREATIVE ROULETTE
        </div>

        <h1 className="font-display font-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight text-white uppercase leading-[0.95]">
          24 HOUR<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
            CHALLENGE
          </span>
        </h1>

        <p className="text-xl sm:text-2xl font-semibold text-zinc-200 tracking-tight pt-2">
          Use AI. Make something different. Let fate decide.
        </p>

        <p className="text-zinc-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Pick your battlefield. Spin once. Get your challenge. Lock it in. You have 24 hours.
        </p>
      </motion.div>

      {/* Battlefield Cards (Design vs Writing) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 my-10"
      >
        {/* DESIGN Card */}
        <div
          onClick={() => onSelectCategoryQuick?.('design')}
          className="group relative p-6 sm:p-7 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/60 group-hover:scale-105 transition-transform">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-mono-digits tracking-wider px-2.5 py-1 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/40">
              15 CHALLENGES
            </span>
          </div>
          <div>
            <h3 className="font-display font-bold text-2xl text-white tracking-tight flex items-center gap-2">
              DESIGN
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#ff3b30]" />
            </h3>
            <p className="text-sm text-zinc-400 mt-1.5 leading-snug">
              Visual, cultural, and conceptual design challenges. Make something people haven't seen before.
            </p>
          </div>
        </div>

        {/* WRITING Card */}
        <div
          onClick={() => onSelectCategoryQuick?.('writing')}
          className="group relative p-6 sm:p-7 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700/60 group-hover:scale-105 transition-transform">
              <PenLine className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-mono-digits tracking-wider px-2.5 py-1 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/40">
              15 CHALLENGES
            </span>
          </div>
          <div>
            <h3 className="font-display font-bold text-2xl text-white tracking-tight flex items-center gap-2">
              WRITING
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#ff3b30]" />
            </h3>
            <p className="text-sm text-zinc-400 mt-1.5 leading-snug">
              Philosophical inquiries, speculative essays, and thought experiments. Think deeper.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Prominent Golden Rule Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-lg p-4 rounded-lg bg-zinc-950/70 border border-zinc-800/90 text-center mb-8"
      >
        <p className="font-mono-digits text-sm sm:text-base font-bold text-zinc-200 tracking-tight">
          15 challenges. 1 spin. 24 hours. 0 excuses.
        </p>
        <p className="text-xs font-mono-digits text-zinc-400 mt-1 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-[#ff3b30]" />
          <span>You can only spin once. No rerolls. No cheating.</span>
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <button
          type="button"
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-8 sm:px-10 py-4 text-base sm:text-lg font-bold font-mono-digits uppercase tracking-wider text-black bg-white hover:bg-zinc-100 active:scale-[0.98] rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] cursor-pointer"
        >
          <span>LET FATE DECIDE</span>
          <ArrowRight className="w-5 h-5 ml-2.5 group-hover:translate-x-1 transition-transform text-black" />
        </button>
      </motion.div>
    </div>
  );
};
