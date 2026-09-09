import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  lockTimestamp: number;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ lockTimestamp }) => {
  const TOTAL_DURATION_MS = 24 * 60 * 60 * 1000;
  const targetTimestamp = lockTimestamp + TOTAL_DURATION_MS;

  const calculateTimeLeft = () => {
    const diff = targetTimestamp - Date.now();
    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, totalRemainingMs: 0, isFinished: true };
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { hours, minutes, seconds, totalRemainingMs: diff, isFinished: false };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [lockTimestamp]);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Percentage for subtle progress indicator
  const progressPercent = Math.max(
    0,
    Math.min(100, (timeLeft.totalRemainingMs / TOTAL_DURATION_MS) * 100)
  );

  if (timeLeft.isFinished) {
    return (
      <div className="w-full p-6 sm:p-7 rounded-2xl bg-zinc-950 border-2 border-red-900/60 text-center space-y-2">
        <div className="inline-flex items-center space-x-2 text-red-400 font-mono-digits text-sm uppercase tracking-widest">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>WINDOW CLOSED</span>
        </div>
        <div className="font-display font-extrabold text-4xl sm:text-6xl text-red-500 tracking-tight">
          TIME'S UP.
        </div>
        <p className="text-zinc-400 text-sm font-mono-digits max-w-sm mx-auto">
          The 24-hour cycle has ended. Your challenge and work remain permanently locked in time.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 sm:p-7 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-4 shadow-xl">
      <div className="flex items-center justify-between text-xs font-mono-digits text-zinc-400 px-1">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-[#ff3b30] animate-pulse" />
          <span className="tracking-widest uppercase">TIME REMAINING</span>
        </div>
        <span className="text-zinc-400">EXACT 24H WINDOW</span>
      </div>

      {/* Main Big Monospace Digits */}
      <div className="flex items-center justify-center space-x-2 sm:space-x-4 py-2">
        {/* Hours */}
        <div className="flex flex-col items-center">
          <div className="font-mono-digits font-extrabold text-5xl sm:text-7xl md:text-8xl text-white tracking-tight bg-zinc-900/90 px-3 sm:px-5 py-2 rounded-xl border border-zinc-800 min-w-[85px] sm:min-w-[130px]">
            {pad(timeLeft.hours)}
          </div>
          <span className="text-[10px] sm:text-xs font-mono-digits text-zinc-400 mt-1.5 uppercase tracking-wider">
            HOURS
          </span>
        </div>

        <span className="font-mono-digits font-extrabold text-3xl sm:text-5xl text-zinc-600 -translate-y-3">
          :
        </span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <div className="font-mono-digits font-extrabold text-5xl sm:text-7xl md:text-8xl text-white tracking-tight bg-zinc-900/90 px-3 sm:px-5 py-2 rounded-xl border border-zinc-800 min-w-[85px] sm:min-w-[130px]">
            {pad(timeLeft.minutes)}
          </div>
          <span className="text-[10px] sm:text-xs font-mono-digits text-zinc-400 mt-1.5 uppercase tracking-wider">
            MINUTES
          </span>
        </div>

        <span className="font-mono-digits font-extrabold text-3xl sm:text-5xl text-zinc-600 -translate-y-3">
          :
        </span>

        {/* Seconds */}
        <div className="flex flex-col items-center">
          <div className="font-mono-digits font-extrabold text-5xl sm:text-7xl md:text-8xl text-[#ff3b30] tracking-tight bg-zinc-900/90 px-3 sm:px-5 py-2 rounded-xl border border-zinc-800 min-w-[85px] sm:min-w-[130px]">
            {pad(timeLeft.seconds)}
          </div>
          <span className="text-[10px] sm:text-xs font-mono-digits text-zinc-400 mt-1.5 uppercase tracking-wider">
            SECONDS
          </span>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-red-600 to-[#ff3b30] h-full transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
