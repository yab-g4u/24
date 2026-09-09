import React from 'react';
import { motion } from 'motion/react';
import { Palette, PenLine, ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Category } from '../types';

interface CategorySelectViewProps {
  onSelect: (category: Category) => void;
  onBack: () => void;
}

export const CategorySelectView: React.FC<CategorySelectViewProps> = ({ onSelect, onBack }) => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center text-xs font-mono-digits text-zinc-400 hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        BACK
      </button>

      {/* Title */}
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono-digits text-zinc-400 uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#ff3b30]" />
          <span>STEP 1 OF 2: CHOOSE BATTLEFIELD</span>
        </div>
        <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
          CHOOSE YOUR CATEGORY
        </h2>
        <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          Choose wisely. Once you spin the wheel, your fate and category are locked forever.
        </p>
      </div>

      {/* Two Large Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* DESIGN */}
        <motion.button
          whileHover={{ y: -4, borderColor: '#ffffff' }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => onSelect('design')}
          className="group text-left p-8 rounded-2xl bg-zinc-900/80 border-2 border-zinc-800 transition-all flex flex-col justify-between min-h-[260px] cursor-pointer shadow-lg"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-zinc-800/80 flex items-center justify-center border border-zinc-700 mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
              <Palette className="w-7 h-7 text-white group-hover:text-black transition-colors" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-3xl text-white tracking-tight">
                DESIGN
              </h3>
              <span className="text-xs font-mono-digits px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                15 PROMPTS
              </span>
            </div>
            <p className="text-zinc-400 text-base mt-3 leading-relaxed">
              Make something people haven't seen before.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono-digits text-zinc-400 group-hover:text-white transition-colors">
            <span>CHOOSE DESIGN</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#ff3b30]" />
          </div>
        </motion.button>

        {/* WRITING */}
        <motion.button
          whileHover={{ y: -4, borderColor: '#ffffff' }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => onSelect('writing')}
          className="group text-left p-8 rounded-2xl bg-zinc-900/80 border-2 border-zinc-800 transition-all flex flex-col justify-between min-h-[260px] cursor-pointer shadow-lg"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-zinc-800/80 flex items-center justify-center border border-zinc-700 mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
              <PenLine className="w-7 h-7 text-white group-hover:text-black transition-colors" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-3xl text-white tracking-tight">
                WRITING
              </h3>
              <span className="text-xs font-mono-digits px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                15 PROMPTS
              </span>
            </div>
            <p className="text-zinc-400 text-base mt-3 leading-relaxed">
              Think deeper. Write something worth reading.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono-digits text-zinc-400 group-hover:text-white transition-colors">
            <span>CHOOSE WRITING</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform text-[#ff3b30]" />
          </div>
        </motion.button>
      </div>

      {/* Reminder */}
      <div className="text-center mt-10 text-xs font-mono-digits text-zinc-500">
        REMINDER: Once selected, you cannot switch categories after spinning.
      </div>
    </div>
  );
};
