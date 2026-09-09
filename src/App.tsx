import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppChallengeState, Category, Challenge, SubmissionData } from './types';
import { DESIGN_CHALLENGES, WRITING_CHALLENGES } from './data/challenges';
import { loadChallengeState, saveChallengeState, saveSubmission } from './utils/storage';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { CategorySelectView } from './components/CategorySelectView';
import { RouletteSpinView } from './components/RouletteSpinView';
import { ActiveChallengeView } from './components/ActiveChallengeView';
import { AdminView } from './components/AdminView';

type ViewMode = 'landing' | 'category_select' | 'spin' | 'active';

export default function App() {
  const [state, setState] = useState<AppChallengeState>(() => loadChallengeState());
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin') ||
        window.location.hash === '#admin'
      );
    }
    return false;
  });
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    const initial = loadChallengeState();
    if (initial.locked && initial.challenge) {
      return 'active';
    }
    return 'landing';
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(() => {
    const initial = loadChallengeState();
    return initial.category || null;
  });

  // Listen to browser navigation changes
  useEffect(() => {
    const handleLocationCheck = () => {
      const isNowAdmin =
        window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin') ||
        window.location.hash === '#admin';
      setIsAdminRoute(isNowAdmin);
    };

    window.addEventListener('popstate', handleLocationCheck);
    window.addEventListener('hashchange', handleLocationCheck);
    return () => {
      window.removeEventListener('popstate', handleLocationCheck);
      window.removeEventListener('hashchange', handleLocationCheck);
    };
  }, []);

  // Keep state synced
  useEffect(() => {
    if (state.locked && state.challenge && currentView !== 'active') {
      setCurrentView('active');
    }
  }, [state.locked, state.challenge, currentView]);

  // Navigate to category select
  const handleStartFlow = () => {
    if (state.locked) {
      setCurrentView('active');
      return;
    }
    setCurrentView('category_select');
  };

  // Select category
  const handleSelectCategory = (cat: Category) => {
    if (state.locked) return;
    setSelectedCategory(cat);
    saveChallengeState({ category: cat });
    setCurrentView('spin');
  };

  // Lock challenge permanently
  const handleChallengeLocked = (challenge: Challenge) => {
    const now = Date.now();
    const updated = saveChallengeState({
      category: challenge.category,
      challenge,
      locked: true,
      lockTimestamp: now,
    });
    setState(updated);

    // After celebration briefly shows on roulette, transition to workspace
    setTimeout(() => {
      setCurrentView('active');
    }, 2200);
  };

  // Submit work
  const handleSubmitWork = (submission: SubmissionData) => {
    const updated = saveSubmission(submission);
    setState(updated);
  };

  const navigateToAdmin = (e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
  };

  if (isAdminRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-[#0c0c0e] text-[#f4f4f5] selection:bg-[#ff3b30] selection:text-white">
        <Header isLocked={Boolean(state.locked)} />
        <main className="flex-1 flex flex-col">
          <AdminView onBackToApp={navigateToHome} />
        </main>
        <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs font-mono-digits text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-zinc-400 font-bold">24</span> • ORGANIZER PORTAL
            </div>
            <button
              onClick={navigateToHome}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Return to Participant View
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0e] text-[#f4f4f5] selection:bg-[#ff3b30] selection:text-white">
      <Header isLocked={Boolean(state.locked)} />

      <main className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {currentView === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LandingView
                onStart={handleStartFlow}
                onSelectCategoryQuick={handleSelectCategory}
              />
            </motion.div>
          )}

          {currentView === 'category_select' && (
            <motion.div
              key="category_select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <CategorySelectView
                onSelect={handleSelectCategory}
                onBack={() => setCurrentView('landing')}
              />
            </motion.div>
          )}

          {currentView === 'spin' && selectedCategory && (
            <motion.div
              key="spin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <RouletteSpinView
                category={selectedCategory}
                challenges={selectedCategory === 'design' ? DESIGN_CHALLENGES : WRITING_CHALLENGES}
                onChallengeLocked={handleChallengeLocked}
                onBackToCategory={() => setCurrentView('category_select')}
              />
            </motion.div>
          )}

          {currentView === 'active' && state.challenge && state.lockTimestamp && (
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ActiveChallengeView
                challenge={state.challenge}
                lockTimestamp={state.lockTimestamp}
                submission={state.submission}
                onSubmitWork={handleSubmitWork}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs font-mono-digits text-zinc-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-zinc-400 font-bold">24</span> • 24 HOURS. ONE CHALLENGE. NO REROLLS.
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-zinc-400">Let fate decide.</span>
            <a
              href="/admin"
              onClick={navigateToAdmin}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Organizer Access
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
