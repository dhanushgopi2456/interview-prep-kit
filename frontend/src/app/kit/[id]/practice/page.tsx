'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useKitStore } from '@/stores/kitStore';
import { kitsApi, Flashcard } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Check, X, Brain, Target, TrendingUp, ArrowRight } from 'lucide-react';

interface FlashcardProgress {
  id: string;
  confidence: number;
  lastReviewed: Date;
  nextReview: Date;
  reviewCount: number;
}

function sortFlashcardsByConfidence(
  flashcards: Flashcard[],
  progress: Map<string, FlashcardProgress>
): Flashcard[] {
  return [...flashcards].sort((a, b) => {
    const pA = progress.get(a.id);
    const pB = progress.get(b.id);
    const confA = pA ? pA.confidence : 0;
    const confB = pB ? pB.confidence : 0;
    return confA - confB;
  });
}

function calculateNextReview(confidence: number, reviewCount: number): Date {
  const intervals = [1, 2, 4, 8, 16, 32];
  const days = intervals[Math.min(reviewCount, intervals.length - 1)] * (confidence > 0.7 ? 2 : 1);
  const next = new Date();
  next.setDate(next.getDate() + Math.max(1, days));
  return next;
}

export default function PracticePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { currentKit, setKit } = useKitStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [progress, setProgress] = useState<Map<string, FlashcardProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) checkAuth();
  }, [isAuthenticated, checkAuth]);

  useEffect(() => {
    if (isAuthenticated && params.id) loadKit();
  }, [isAuthenticated, params.id]);

  const loadKit = async () => {
    try {
      const { data } = await kitsApi.get(params.id as string);
      setKit(data.kit);
      const savedProgress = localStorage.getItem(`practice-${params.id}`);
      if (savedProgress) {
        setProgress(new Map(JSON.parse(savedProgress)));
      }
    } catch {
      toast.error('Failed to load kit');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const sortedFlashcards = useMemo(() => {
    if (!currentKit) return [];
    return sortFlashcardsByConfidence(currentKit.flashcards, progress);
  }, [currentKit?.flashcards, progress]);

  const currentFlashcard = sortedFlashcards[currentIndex];

  const handleConfidence = (confidence: number) => {
    if (!currentFlashcard) return;
    const newProgress = new Map(progress);
    const existing = newProgress.get(currentFlashcard.id);
    const newCount = (existing?.reviewCount || 0) + 1;
    newProgress.set(currentFlashcard.id, {
      id: currentFlashcard.id,
      confidence,
      lastReviewed: new Date(),
      nextReview: calculateNextReview(confidence, newCount),
      reviewCount: newCount
    });
    setProgress(newProgress);
    localStorage.setItem(`practice-${params.id}`, JSON.stringify(Array.from(newProgress.entries())));
    setIsFlipped(false);
    if (currentIndex < sortedFlashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
      toast.success('Session complete! Cards will repeat weakest first.');
    }
  };

  const stats = useMemo(() => {
    const reviewed = Array.from(progress.values());
    const total = currentKit?.flashcards.length || 0;
    const reviewedCount = reviewed.length;
    const avgConfidence = reviewed.length > 0 ? reviewed.reduce((sum, p) => sum + p.confidence, 0) / reviewed.length : 0;
    const covered = reviewed.filter(p => p.confidence >= 0.6).length;
    return { total, reviewedCount, avgConfidence, covered };
  }, [progress, currentKit?.flashcards.length]);

  if (isLoading || !currentKit) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-dark-600 dark:text-dark-400">Loading practice session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sortedFlashcards.length === 0) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="card p-8 text-center max-w-md">
            <Brain className="w-16 h-16 text-primary-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">No Flashcards</h2>
            <p className="text-dark-500 dark:text-dark-400 mb-6">
              This kit doesn't have any flashcards yet. Go back and generate them first.
            </p>
            <Link href={`/kit/${params.id}`} className="btn-primary">
              Back to Kit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-dark-200/50 dark:border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href={`/kit/${params.id}`} className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-dark-500" />
                <span className="font-medium text-dark-700 dark:text-dark-300">Back to Kit</span>
              </Link>
              <div className="h-6 w-px bg-dark-200 dark:bg-dark-700" />
              <h1 className="text-lg font-semibold text-dark-900 dark:text-white">Practice Mode</h1>
            </div>
            <button onClick={() => setShowStats(!showStats)} className="btn-secondary text-sm">
              <TrendingUp className="w-4 h-4 mr-1" />
              Stats
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showStats && (
          <div className="card p-6 mb-6 animate-slide-up">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">Session Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                <p className="text-2xl font-bold text-primary-600">{stats.total}</p>
                <p className="text-sm text-dark-500">Total Cards</p>
              </div>
              <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{stats.reviewedCount}</p>
                <p className="text-sm text-dark-500">Reviewed</p>
              </div>
              <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{stats.covered}</p>
                <p className="text-sm text-dark-500">Mastered</p>
              </div>
              <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{Math.round(stats.avgConfidence * 100)}%</p>
                <p className="text-sm text-dark-500">Avg Confidence</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-500 dark:text-dark-400">
              Card {currentIndex + 1} of {sortedFlashcards.length}
            </span>
            <span className="text-sm text-dark-500 dark:text-dark-400">
              Sorted by confidence (weakest first)
            </span>
          </div>
          <div className="h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / sortedFlashcards.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="perspective-1000 mb-8">
          <div
            className={`relative w-full min-h-[400px] cursor-pointer transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
            role="button"
            tabIndex={0}
            aria-label="Flip card"
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') setIsFlipped(!isFlipped);
            }}
          >
            <div className="absolute inset-0 backface-hidden">
              <div className="card p-8 h-full flex flex-col items-center justify-center text-center">
                <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 mb-4">
                  Question
                </span>
                <p className="text-xl md:text-2xl font-medium text-dark-900 dark:text-white leading-relaxed">
                  {currentFlashcard.front}
                </p>
                <p className="text-sm text-dark-400 dark:text-dark-500 mt-6">
                  Click to reveal answer
                </p>
              </div>
            </div>
            <div className="absolute inset-0 backface-hidden rotate-y-180">
              <div className="card p-8 h-full flex flex-col items-center justify-center text-center">
                <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 mb-4">
                  Answer
                </span>
                <p className="text-lg text-dark-700 dark:text-dark-300 leading-relaxed">
                  {currentFlashcard.back}
                </p>
                {currentFlashcard.requirementIds && currentFlashcard.requirementIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4 justify-center">
                    {currentFlashcard.requirementIds.map((rid: string) => (
                      <span key={rid} className="badge text-xs bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-300">
                        {rid}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-dark-400 dark:text-dark-500 mt-6">
                  Rate your confidence below
                </p>
              </div>
            </div>
          </div>
        </div>

        {isFlipped && (
          <div className="flex items-center justify-center gap-3 mb-8 animate-slide-up">
            <button
              onClick={() => handleConfidence(0.2)}
              className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <X className="w-6 h-6" />
              <span className="text-sm font-medium">Again</span>
            </button>
            <button
              onClick={() => handleConfidence(0.5)}
              className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
            >
              <RotateCcw className="w-6 h-6" />
              <span className="text-sm font-medium">Hard</span>
            </button>
            <button
              onClick={() => handleConfidence(0.8)}
              className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Check className="w-6 h-6" />
              <span className="text-sm font-medium">Good</span>
            </button>
            <button
              onClick={() => handleConfidence(1.0)}
              className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            >
              <Target className="w-6 h-6" />
              <span className="text-sm font-medium">Easy</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setIsFlipped(false); }}
            disabled={currentIndex === 0}
            className="btn-secondary"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Previous
          </button>
          <button
            onClick={() => {
              const shuffled = [...sortedFlashcards];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              setCurrentIndex(0);
              setIsFlipped(false);
              toast.success('Cards shuffled!');
            }}
            className="btn-ghost"
          >
            <RotateCcw className="w-5 h-5 mr-1" />
            Shuffle
          </button>
          <button
            onClick={() => { setCurrentIndex(Math.min(sortedFlashcards.length - 1, currentIndex + 1)); setIsFlipped(false); }}
            disabled={currentIndex === sortedFlashcards.length - 1}
            className="btn-secondary"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-3">Progress by Confidence</h3>
          <div className="flex flex-wrap gap-2">
            {sortedFlashcards.map((fc, i) => {
              const p = progress.get(fc.id);
              const conf = p ? p.confidence : 0;
              const color = conf >= 0.8 ? 'bg-green-500' : conf >= 0.5 ? 'bg-yellow-500' : conf > 0 ? 'bg-red-500' : 'bg-dark-300 dark:bg-dark-600';
              return (
                <button
                  key={fc.id}
                  onClick={() => { setCurrentIndex(i); setIsFlipped(false); }}
                  className={`w-8 h-8 rounded-lg ${color} text-white text-xs font-bold flex items-center justify-center transition-transform hover:scale-110 ${i === currentIndex ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-900' : ''}`}
                  title={`${fc.front.slice(0, 40)}... - ${conf > 0 ? `${Math.round(conf * 100)}% confidence` : 'Not reviewed'}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 card p-6">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-3">Study Tips</h3>
          <ul className="space-y-2 text-sm text-dark-600 dark:text-dark-400">
            <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Weakest cards appear first due to confidence-weighted sorting</li>
            <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Rate honestly - overconfident ratings lead to forgetting</li>
            <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>"Again" cards return immediately; "Easy" cards are spaced further out</li>
            <li className="flex items-start gap-2"><span className="text-primary-500 mt-0.5">•</span>Progress is saved locally so you can continue later</li>
          </ul>
        </div>
      </main>
    </div>
  );
}