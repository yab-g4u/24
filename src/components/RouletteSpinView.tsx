import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Sparkles, ArrowRight, ShieldAlert, Zap } from 'lucide-react';
import { Category, Challenge } from '../types';
import { playTickSound, playLockSound, playChimeSound } from '../utils/sound';
import { triggerCelebration } from '../utils/confetti';

interface RouletteSpinViewProps {
  category: Category;
  challenges: Challenge[];
  onChallengeLocked: (challenge: Challenge) => void;
  onBackToCategory?: () => void;
}

export const RouletteSpinView: React.FC<RouletteSpinViewProps> = ({
  category,
  challenges,
  onChallengeLocked,
  onBackToCategory,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [activeDisplayIndex, setActiveDisplayIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready to surrender your fate?');

  const spinIntervalRef = useRef<number | null>(null);
  const audioIntervalRef = useRef<number | null>(null);

  // Clean up timers if unmounted
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  const handleStartSpin = () => {
    if (spinning || hasSpun) return;

    setSpinning(true);
    setStatusMessage('CHOOSING YOUR FATE...');

    // Pick winning index in advance
    const winningIndex = Math.floor(Math.random() * challenges.length);
    const targetChallenge = challenges[winningIndex];

    let currentIdx = activeDisplayIndex;
    let speed = 40; // initial milliseconds per step
    const totalSteps = 45 + Math.floor(Math.random() * 15); // enough steps to build momentum
    let stepCount = 0;

    const runStep = () => {
      stepCount++;
      currentIdx = (currentIdx + 1) % challenges.length;
      setActiveDisplayIndex(currentIdx);
      playTickSound(1 + (speed < 70 ? 0.3 : 0));

      if (stepCount >= totalSteps && currentIdx === winningIndex) {
        // We landed on the winner!
        setSpinning(false);
        setHasSpun(true);
        setSelectedChallenge(targetChallenge);
        setStatusMessage('FATE HAS SPOKEN.');

        // Dramatic feedback
        playLockSound();
        playChimeSound();
        triggerCelebration();

        // Lock state permanently
        onChallengeLocked(targetChallenge);
      } else {
        // Deceleration curve: speed increases (delay between ticks increases) as we near the end
        if (stepCount > totalSteps * 0.5) {
          const slowProgress = (stepCount - totalSteps * 0.5) / (totalSteps * 0.5);
          speed = Math.floor(40 + Math.pow(slowProgress, 2.4) * 320);
        }
        spinIntervalRef.current = window.setTimeout(runStep, speed);
      }
    };

    runStep();
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14 text-center">
      {/* Category indicator & Back button if hasn't spun */}
      <div className="flex items-center justify-between max-w-xl mx-auto mb-6">
        {!hasSpun && !spinning ? (
          <button
            type="button"
            onClick={onBackToCategory}
            className="text-xs font-mono-digits text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← CHANGE CATEGORY
          </button>
        ) : (
          <div className="text-xs font-mono-digits text-zinc-600">LOCKED TO CATEGORY</div>
        )}

        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono-digits text-zinc-300 uppercase">
          <span>{category.toUpperCase()} ARENA</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400">15 CHALLENGES</span>
        </div>
      </div>

      {/* Dynamic Status Title */}
      <div className="mb-6 sm:mb-8">
        <p className="text-xs sm:text-sm font-mono-digits tracking-widest uppercase text-zinc-400 mb-2">
          {spinning ? 'DECIDING...' : hasSpun ? 'LOCKED IN STONE' : 'STEP 2: THE LOTTERY'}
        </p>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
          {statusMessage}
        </h2>
      </div>

      {/* Roulette Chamber / Mechanical Reel */}
      <div className="relative max-w-xl mx-auto my-6 p-1 rounded-2xl bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 shadow-2xl">
        <div className="relative overflow-hidden rounded-xl bg-[#09090b] border border-zinc-800 p-6 sm:p-8 min-h-[280px] sm:min-h-[320px] flex flex-col items-center justify-center">
          {/* Subtle background grid pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Center Target Indicator Brackets */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-24 border-y-2 border-dashed border-[#ff3b30]/60 pointer-events-none flex items-center justify-between px-3">
            <span className="text-[10px] font-mono-digits text-[#ff3b30] tracking-widest uppercase font-bold bg-[#09090b]/80 px-1 py-0.5 rounded">
              [ FATE ]
            </span>
            <span className="text-[10px] font-mono-digits text-[#ff3b30] tracking-widest uppercase font-bold bg-[#09090b]/80 px-1 py-0.5 rounded">
              [ TARGET ]
            </span>
          </div>

          {/* Reel Display Window */}
          <div className="w-full relative z-10 py-4 flex flex-col items-center justify-center">
            {/* Previous preview (faded above) */}
            <div className="text-xs sm:text-sm font-mono-digits text-zinc-600 truncate max-w-md select-none opacity-40 mb-3">
              {challenges[(activeDisplayIndex - 1 + challenges.length) % challenges.length]?.title}
            </div>

            {/* Active Challenge Spotlight */}
            <motion.div
              key={activeDisplayIndex}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.05 }}
              className={`w-full max-w-lg p-5 sm:p-6 rounded-xl border transition-all ${
                hasSpun
                  ? 'bg-zinc-900 border-white shadow-[0_0_40px_rgba(255,255,255,0.15)] ring-2 ring-[#ff3b30]'
                  : 'bg-zinc-950/80 border-zinc-700/70'
              }`}
            >
              <div className="text-xs font-mono-digits text-zinc-400 mb-2 flex items-center justify-center gap-2">
                <span>CHALLENGE #{challenges[activeDisplayIndex]?.id} OF 15</span>
                {hasSpun && (
                  <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold">
                    LOCKED
                  </span>
                )}
              </div>

              <div className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight leading-tight">
                {challenges[activeDisplayIndex]?.title}
              </div>

              {challenges[activeDisplayIndex]?.subtitle && (
                <div className="text-xs sm:text-sm text-zinc-400 mt-2">
                  {challenges[activeDisplayIndex]?.subtitle}
                </div>
              )}
            </motion.div>

            {/* Next preview (faded below) */}
            <div className="text-xs sm:text-sm font-mono-digits text-zinc-600 truncate max-w-md select-none opacity-40 mt-3">
              {challenges[(activeDisplayIndex + 1) % challenges.length]?.title}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="max-w-xl mx-auto mt-8">
        {!hasSpun ? (
          <div>
            <button
              type="button"
              disabled={spinning}
              onClick={handleStartSpin}
              className={`w-full sm:w-auto px-12 py-5 rounded-xl font-mono-digits text-lg sm:text-xl font-extrabold uppercase tracking-widest transition-all cursor-pointer shadow-xl ${
                spinning
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  : 'bg-[#ff3b30] hover:bg-[#ff453a] text-white active:scale-95 shadow-[0_0_35px_rgba(255,59,48,0.4)]'
              }`}
            >
              {spinning ? (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 animate-bounce" />
                  SPINNING ROULETTE...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  SPIN THE WHEEL
                </span>
              )}
            </button>

            <div className="mt-4 text-xs font-mono-digits text-zinc-400 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#ff3b30]" />
              <span>ONE SPIN ONLY. NO REROLLS.</span>
            </div>
          </div>
        ) : (
          /* Post-spin Locked Confirmation */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded bg-red-950/60 border border-red-800/80 text-red-400 text-xs font-mono-digits font-bold">
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>CHALLENGE PERMANENTLY LOCKED</span>
            </div>

            <p className="font-display text-xl text-white font-bold">
              Fate chose this. Don't fight it.
            </p>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Your 24-hour window starts now. No rerolls. You asked for this.
            </p>

            <div className="pt-2">
              <div className="text-xs font-mono-digits text-zinc-300">
                Opening your 24-hour workspace...
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
