import React from 'react';
import { Volume2, VolumeX, ShieldAlert, Sparkles } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '../utils/sound';

interface HeaderProps {
  isLocked: boolean;
  onLogoClick?: () => void;
  onResetForDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isLocked, onLogoClick }) => {
  const [sound, setSound] = React.useState(isSoundEnabled());

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  };

  return (
    <header className="w-full border-b border-zinc-800/80 bg-[#0c0c0e]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Concept */}
        <div className="flex items-center space-x-3.5">
          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center group cursor-pointer text-left focus:outline-none"
            title="Return to Landing Page"
          >
            <span className="font-display font-extrabold text-2xl tracking-tighter text-white group-hover:text-zinc-200 transition-colors">
              24
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ff3b30] ml-1.5 animate-pulse" />
          </button>

          <div className="hidden sm:flex items-center text-xs font-mono-digits tracking-wider text-zinc-400 uppercase border-l border-zinc-800 pl-3">
            <span>24 Hours</span>
            <span className="mx-1.5 text-zinc-600">•</span>
            <span>1 Challenge</span>
            <span className="mx-1.5 text-zinc-600">•</span>
            <span className="text-zinc-300 font-semibold">No Rerolls</span>
          </div>
        </div>

        {/* Status indicator & Sound Toggle */}
        <div className="flex items-center space-x-3">
          {isLocked ? (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-red-950/40 border border-red-800/60 text-red-400 text-xs font-mono-digits">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="font-bold tracking-wider">LOCKED</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono-digits">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>FATE DECIDES</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSound}
            aria-label={sound ? 'Mute sound effects' : 'Enable sound effects'}
            className="p-2 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={sound ? 'Sound enabled' : 'Sound muted'}
          >
            {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>
        </div>
      </div>
    </header>
  );
};
