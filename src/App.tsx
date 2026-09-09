import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppChallengeState, Category, Challenge, SubmissionData } from './types';
import { DESIGN_CHALLENGES, WRITING_CHALLENGES } from './data/challenges';
import { loadChallengeState, lockSingleChallenge, saveSubmission } from './utils/storage';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { CategorySelectView } from './components/CategorySelectView';
import { RouletteSpinView } from './components/RouletteSpinView';
import { ActiveChallengeView } from './components/ActiveChallengeView';
import { SubmitView } from './components/SubmitView';
import { AdminView } from './components/AdminView';

export type AppRoute = '/' | '/challenge' | '/submit' | '/admin';

function getInitialRoute(): AppRoute {
  if (typeof window === 'undefined') return '/';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path === '/admin' || path.startsWith('/admin') || hash === '#admin') {
    return '/admin';
  }
  if (path === '/submit' || path.startsWith('/submit') || hash === '#submit') {
    return '/submit';
  }
  if (path === '/challenge' || path.startsWith('/challenge') || hash === '#challenge') {
    return '/challenge';
  }
  return '/';
}

export default function App() {
  const [state, setState] = useState<AppChallengeState>(() => loadChallengeState());
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<Category>(() => {
    const initial = loadChallengeState();
    if (initial.challenges?.design) return 'design';
    if (initial.challenges?.writing) return 'writing';
    return initial.category || 'design';
  });
  const [submitCategoryTarget, setSubmitCategoryTarget] = useState<Category>('design');

  // Client-side navigation handler
  const navigate = useCallback((to: AppRoute, replace = false) => {
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState({}, '', to);
      } else if (window.location.pathname !== to) {
        window.history.pushState({}, '', to);
      }
    }
    setCurrentRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen to browser navigation changes (Back / Forward buttons, URL hash)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(getInitialRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Check URL search params for category preselection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const catParam = searchParams.get('category');
      if (catParam === 'design' || catParam === 'writing') {
        const cat = catParam as Category;
        if (state.challenges?.[cat]) {
          setActiveCategoryTab(cat);
        } else {
          setSelectedCategory(cat);
        }
      }
    }
  }, [state.challenges]);

  // Quick category selection from landing cards
  const handleQuickSelectCategory = (cat: Category) => {
    if (state.challenges?.[cat]) {
      // Already locked -> go straight to its active workspace
      setActiveCategoryTab(cat);
      setSelectedCategory(null);
    } else {
      // Not yet locked -> spin the wheel for this category
      setSelectedCategory(cat);
    }
    navigate('/challenge');
  };

  // Lock challenge permanently
  const handleChallengeLocked = (challenge: Challenge) => {
    const updated = lockSingleChallenge(challenge);
    setState(updated);
    setSelectedCategory(null);
    setActiveCategoryTab(challenge.category);
    setSubmitCategoryTarget(challenge.category);
  };

  // Submit work
  const handleSubmitWork = (submission: SubmissionData) => {
    const updated = saveSubmission(submission);
    setState(updated);
  };

  // Check which challenges are locked
  const hasDesign = Boolean(state.challenges?.design);
  const hasWriting = Boolean(state.challenges?.writing);
  const hasAnyLocked = hasDesign || hasWriting || state.locked;

  // Active challenge item to display on workspace
  const currentChallengeRecord =
    state.challenges?.[activeCategoryTab] ||
    (activeCategoryTab === 'design' ? state.challenges?.writing : state.challenges?.design) ||
    (state.challenge && state.lockTimestamp ? { challenge: state.challenge, lockTimestamp: state.lockTimestamp, submission: state.submission } : null);

  // Render Admin View
  if (currentRoute === '/admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#0c0c0e] text-[#f4f4f5] selection:bg-[#ff3b30] selection:text-white">
        <Header
          isLocked={hasAnyLocked}
          onLogoClick={() => navigate('/')}
        />
        <main className="flex-1 flex flex-col">
          <AdminView onBackToApp={() => navigate('/')} />
        </main>
        <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs font-mono-digits text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-zinc-400 font-bold">24</span> • ORGANIZER PORTAL
            </div>
            <button
              onClick={() => navigate('/')}
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
      <Header
        isLocked={hasAnyLocked}
        onLogoClick={() => navigate('/')}
      />

      <main className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* ROUTE 1: Landing Page (/) */}
          {currentRoute === '/' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LandingView
                onStart={() => {
                  if (hasAnyLocked) {
                    setSelectedCategory(null);
                  }
                  navigate('/challenge');
                }}
                onSelectCategoryQuick={handleQuickSelectCategory}
                lockedChallenge={currentChallengeRecord?.challenge || null}
                lockTimestamp={currentChallengeRecord?.lockTimestamp || null}
                dualChallenges={state.challenges}
                onGoToSubmit={(cat) => {
                  if (cat) setSubmitCategoryTarget(cat);
                  navigate('/submit');
                }}
              />
            </motion.div>
          )}

          {/* ROUTE 2: Challenge Page (/challenge) */}
          {currentRoute === '/challenge' && (
            <motion.div
              key="challenge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {selectedCategory && !state.challenges?.[selectedCategory] ? (
                /* Spin roulette view for unlocked category */
                <RouletteSpinView
                  category={selectedCategory}
                  challenges={selectedCategory === 'design' ? DESIGN_CHALLENGES : WRITING_CHALLENGES}
                  onChallengeLocked={handleChallengeLocked}
                  onBackToCategory={() => {
                    setSelectedCategory(null);
                    if (!hasAnyLocked) navigate('/');
                  }}
                />
              ) : hasAnyLocked && currentChallengeRecord ? (
                /* Active challenge workspace with dual support */
                <ActiveChallengeView
                  challenge={currentChallengeRecord.challenge}
                  lockTimestamp={currentChallengeRecord.lockTimestamp}
                  submission={currentChallengeRecord.submission}
                  dualState={state.challenges}
                  activeCategory={currentChallengeRecord.challenge.category}
                  onSelectCategoryTab={(cat) => {
                    setActiveCategoryTab(cat);
                    setSelectedCategory(null);
                  }}
                  onSpinOtherCategory={(otherCat) => {
                    setSelectedCategory(otherCat);
                  }}
                  onGoToSubmit={(cat) => {
                    if (cat) setSubmitCategoryTarget(cat);
                    navigate('/submit');
                  }}
                  onBackToHome={() => navigate('/')}
                />
              ) : selectedCategory ? (
                <RouletteSpinView
                  category={selectedCategory}
                  challenges={selectedCategory === 'design' ? DESIGN_CHALLENGES : WRITING_CHALLENGES}
                  onChallengeLocked={handleChallengeLocked}
                  onBackToCategory={() => setSelectedCategory(null)}
                />
              ) : (
                /* Category Selection view */
                <CategorySelectView
                  onSelect={(cat) => setSelectedCategory(cat)}
                  onBack={() => navigate('/')}
                />
              )}
            </motion.div>
          )}

          {/* ROUTE 3: Submission Page (/submit) */}
          {currentRoute === '/submit' && (
            <motion.div
              key="submit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SubmitView
                challenge={currentChallengeRecord?.challenge || null}
                lockTimestamp={currentChallengeRecord?.lockTimestamp || null}
                submission={currentChallengeRecord?.submission || null}
                dualState={state.challenges}
                initialCategory={submitCategoryTarget}
                onSubmitWork={handleSubmitWork}
                onBackToHome={() => navigate('/')}
                onBackToChallenge={() => navigate('/challenge')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 text-center text-xs font-mono-digits text-zinc-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-zinc-400 font-bold">24</span> • 24 HOURS. MAXIMUM 2 CHALLENGES. NO REROLLS.
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-zinc-400">Let fate decide.</span>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin');
              }}
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
