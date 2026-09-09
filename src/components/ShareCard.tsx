import React, { useState } from 'react';
import { Copy, Check, Share2, Download, Sparkles } from 'lucide-react';
import { Challenge } from '../types';

interface ShareCardProps {
  challenge: Challenge;
}

export const ShareCard: React.FC<ShareCardProps> = ({ challenge }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const shareText = `24 HOUR CHALLENGE\n\nI got: "${challenge.title.toUpperCase()}"\n\n24 HOURS. ONE CHALLENGE. NO REROLLS.\nCan I make it in time? #24HourChallenge`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '24 Hour Challenge',
          text: shareText,
          url: window.location.href,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyText();
    }
  };

  const handleDownloadCard = () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark tactile background
      ctx.fillStyle = '#0c0c0e';
      ctx.fillRect(0, 0, 1200, 1200);

      // Subtle background grid
      ctx.strokeStyle = '#1e1e24';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < 1200; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1200);
        ctx.stroke();
      }
      for (let y = 0; y < 1200; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // Outer border frame
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, 1080, 1080);

      // Top Header
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 36px "JetBrains Mono", monospace';
      ctx.fillText('24 HOUR CHALLENGE', 100, 140);

      ctx.fillStyle = '#71717a';
      ctx.font = '24px "JetBrains Mono", monospace';
      ctx.fillText(`CATEGORY: ${challenge.category.toUpperCase()} • 1 SPIN ONLY`, 100, 185);

      // Divider
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 220);
      ctx.lineTo(1100, 220);
      ctx.stroke();

      // "I got:"
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '32px "JetBrains Mono", monospace';
      ctx.fillText('I GOT:', 100, 340);

      // Big Challenge Title (wrap text)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 68px "Plus Jakarta Sans", sans-serif';

      const words = challenge.title.split(' ');
      let line = '';
      let y = 430;
      const maxWidth = 1000;
      const lineHeight = 80;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, 100, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 100, y);

      // Challenge subtitle
      if (challenge.subtitle) {
        ctx.fillStyle = '#71717a';
        ctx.font = '28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`“${challenge.subtitle}”`, 100, y + 65);
      }

      // Lock badge
      const badgeY = 820;
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(100, badgeY, 340, 60);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(100, badgeY, 340, 60);

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText('🔒 CHALLENGE LOCKED', 125, badgeY + 40);

      // Bottom statement
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px "JetBrains Mono", monospace';
      ctx.fillText('24 HOURS. NO REROLLS.', 100, 1020);

      ctx.fillStyle = '#71717a';
      ctx.font = '24px "JetBrains Mono", monospace';
      ctx.fillText('FATE CHOSE THIS. DON’T FIGHT IT.', 100, 1070);

      // Export
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `24-challenge-${challenge.id}.png`;
      a.click();
    } catch (err) {
      console.error('Card download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-mono-digits text-zinc-400">
          <Sparkles className="w-4 h-4 text-[#ff3b30]" />
          <span className="uppercase tracking-widest">SHARE MY CHALLENGE</span>
        </div>
        <span className="text-[11px] font-mono-digits text-zinc-400">#24HourChallenge</span>
      </div>

      {/* Visual Challenge Card for Social Media */}
      <div className="relative p-6 sm:p-7 rounded-xl bg-[#0c0c0e] border-2 border-zinc-700/80 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between text-xs font-mono-digits">
          <span className="text-[#ff3b30] font-bold tracking-wider">24 HOUR CHALLENGE</span>
          <span className="text-zinc-300 uppercase px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            {challenge.category}
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-mono-digits text-zinc-400">I GOT:</div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
            {challenge.title}
          </div>
          {challenge.subtitle && (
            <div className="text-xs text-zinc-400 italic">"{challenge.subtitle}"</div>
          )}
        </div>

        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-mono-digits text-zinc-400">
          <span className="font-bold text-zinc-200">24 HOURS. NO REROLLS.</span>
          <span className="text-red-400">🔒 LOCKED</span>
        </div>
      </div>

      {/* Share Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono-digits text-zinc-200 hover:text-white transition-colors"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedLink ? 'COPIED LINK' : 'COPY LINK'}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyText}
          className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono-digits text-zinc-200 hover:text-white transition-colors"
        >
          {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedText ? 'COPIED TEXT' : 'COPY TEXT'}</span>
        </button>

        <button
          type="button"
          onClick={handleNativeShare}
          className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono-digits text-zinc-200 hover:text-white transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>SHARE</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadCard}
          disabled={downloading}
          className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-mono-digits text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'SAVING...' : 'SAVE CARD'}</span>
        </button>
      </div>
    </div>
  );
};
