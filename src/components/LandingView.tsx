import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Layers, Feather, Lock, ChevronDown } from 'lucide-react';
import { Category, Challenge, LockedChallengeRecord } from '../types';
import { ShowcaseView } from './ShowcaseView';

interface LandingViewProps {
  onStart: () => void;
  onSelectCategoryQuick?: (category: Category) => void;
  lockedChallenge?: Challenge | null;
  lockTimestamp?: number | null;
  dualChallenges?: {
    design: LockedChallengeRecord | null;
    writing: LockedChallengeRecord | null;
  };
  onGoToSubmit?: (cat?: Category) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStart,
  onSelectCategoryQuick,
  lockedChallenge,
  dualChallenges,
  onGoToSubmit,
}) => {
  const hasDesign = Boolean(dualChallenges?.design);
  const hasWriting = Boolean(dualChallenges?.writing);
  const hasBoth = hasDesign && hasWriting;
  const hasAny = hasDesign || hasWriting || Boolean(lockedChallenge);

  // Persistent 24-hour cycle countdown (starts at midnight / 12:00, lasts for 24h)
  const [countdown, setCountdown] = useState({
    hours: '24',
    minutes: '00',
    seconds: '00',
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Calculate remaining time until next midnight (end of 24h cycle)
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());

      const totalSec = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      setCountdown({
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleScrollToShowcase = () => {
    const el = document.getElementById('community-showcase');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex flex-col items-center bg-black text-white selection:bg-[#ff3b30] selection:text-white">
      {/* ========================================================================= */}
      {/* CINEMATIC HERO SECTION                                                   */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[90vh] sm:min-h-[94vh] flex flex-col items-center justify-between overflow-hidden px-4 sm:px-6 pt-12 pb-8">
        {/* Ambient Dark Jellyfish Video Background */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
          <video
            className="w-full h-full object-cover scale-105 opacity-80 filter contrast-125"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          {/* Cinematic Vignette & Edge Masks */}
          <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
        </div>

        {/* Top Header: Persistent 24h Live Cycle Countdown */}
        <div className="relative z-20 w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 border border-zinc-800/80 backdrop-blur-md text-[11px] sm:text-xs font-mono-digits tracking-wider text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3b30] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff3b30]" />
            </span>
            <span className="text-zinc-400">CYCLE ACTIVE</span>
            <span className="text-zinc-600 font-light">•</span>
            <span className="text-white font-bold tracking-widest">
              {countdown.hours} : {countdown.minutes} : {countdown.seconds}
            </span>
            <span className="text-[10px] text-zinc-500 font-normal">REMAINING</span>
          </div>

          {/* Quick status if participant has a locked challenge */}
          {hasAny && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-950/70 border border-red-800/60 backdrop-blur-md text-xs font-mono-digits text-red-200"
            >
              <Lock className="w-3.5 h-3.5 text-[#ff3b30]" />
              <span className="font-semibold truncate max-w-[200px]">
                {hasBoth
                  ? 'Design & Writing Locked'
                  : dualChallenges?.design
                  ? `Design #${dualChallenges.design.challenge.id} Locked`
                  : dualChallenges?.writing
                  ? `Writing #${dualChallenges.writing.challenge.id} Locked`
                  : 'Challenge Active'}
              </span>
              <button
                type="button"
                onClick={onStart}
                className="text-white hover:text-red-300 underline font-bold ml-1 cursor-pointer"
              >
                Workspace →
              </button>
            </motion.div>
          )}
        </div>

        {/* Centerpiece: Monumental "24" with Translucent Jellyfish Flowing Behind/Through */}
        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center justify-center my-auto text-center pointer-events-none select-none">
          {/* Atmospheric Crimson Glow behind 24 */}
          <div className="absolute w-[340px] h-[340px] sm:w-[540px] sm:h-[540px] rounded-full bg-[#ff3b30]/12 blur-[130px] -z-10 pointer-events-none" />

          {/* Enormous Monumental 24 Typography */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center"
          >
            {/* Soft Ambient Blurred Shadow */}
            <span
              aria-hidden="true"
              className="absolute text-[36vw] sm:text-[30vw] md:text-[26vw] lg:text-[21rem] font-black font-display tracking-tighter leading-none text-white/5 blur-md"
            >
              24
            </span>

            {/* Translucent Sculptural 24: jellyfish swim directly through glyph apertures */}
            <span
              className="relative text-[36vw] sm:text-[30vw] md:text-[26vw] lg:text-[21rem] font-black font-display tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/35 via-white/10 to-transparent"
              style={{
                WebkitTextStroke: '1.5px rgba(255, 255, 255, 0.45)',
                textShadow: '0 0 90px rgba(255, 59, 48, 0.22), 0 0 20px rgba(255, 255, 255, 0.15)',
              }}
            >
              24
            </span>
          </motion.div>

          {/* Minimal Editorial Subtitle directly below the 24 */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="relative mt-2 sm:mt-4 pointer-events-auto"
          >
            <p className="font-mono-digits text-xs sm:text-sm tracking-[0.28em] sm:tracking-[0.35em] text-zinc-400 uppercase font-medium">
              DESIGN + WRITING <span className="text-[#ff3b30] font-bold">/</span> NO REROLLS.
            </p>
          </motion.div>
        </div>

        {/* Bottom Bar: Action CTAs and Editorial Category Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative z-20 w-full max-w-2xl mx-auto flex flex-col items-center space-y-5"
        >
          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onStart}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-white text-black font-mono-digits text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] cursor-pointer"
            >
              <span>{hasAny ? 'RESUME WORKSPACE' : 'LET FATE DECIDE'}</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform text-[#ff3b30]" />
            </button>

            {/* Direct category spin shortcuts */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectCategoryQuick?.('design')}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono-digits uppercase tracking-wider backdrop-blur-md transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-[#ff3b30]" />
                <span>DESIGN</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCategoryQuick?.('writing')}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono-digits uppercase tracking-wider backdrop-blur-md transition-all cursor-pointer"
              >
                <Feather className="w-3.5 h-3.5 text-amber-400" />
                <span>WRITING</span>
              </button>
            </div>
          </div>

          {/* Scroll down prompt */}
          <button
            type="button"
            onClick={handleScrollToShowcase}
            className="group inline-flex items-center gap-1.5 text-[11px] font-mono-digits text-zinc-500 hover:text-zinc-300 tracking-widest uppercase transition-colors cursor-pointer pt-2"
          >
            <span>EXPLORE COMMUNITY ARCHIVE</span>
            <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform text-[#ff3b30]" />
          </button>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* SHOWCASE SECTION                                                         */}
      {/* ========================================================================= */}
      <div id="community-showcase" className="w-full">
        <ShowcaseView />
      </div>
    </div>
  );
};
