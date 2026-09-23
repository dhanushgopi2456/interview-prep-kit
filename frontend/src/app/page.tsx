'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { ArrowRight, Briefcase, Zap, Shield, Users, Code } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const features = [
    { icon: Briefcase, title: 'Company Research', desc: 'Automatically crawl company sites to understand what they do and how they hire' },
    { icon: Zap, title: 'Smart Question Generation', desc: 'AI-powered questions tailored to each requirement with coverage checking' },
    { icon: Shield, title: 'Personalized Schedule', desc: 'Day-by-day study plans that prioritize must-have requirements first' },
    { icon: Users, title: 'Interactive Practice', desc: 'Flashcards with confidence tracking and spaced repetition' },
    { icon: Code, title: 'Fully Editable Kits', desc: 'Regenerate sections without losing your custom edits and annotations' },
    { icon: ArrowRight, title: 'Batch Processing', desc: 'Process multiple job descriptions at once via CLI for evaluation' }
  ];

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-dark-200/50 dark:border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-dark-900 dark:text-white">Interview Prep Kit</span>
            </Link>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="btn-primary flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    <span>Go to Dashboard</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost text-dark-600 dark:text-dark-300">
                    Sign In
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center animate-slide-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-dark-900 dark:text-white mb-6">
              Turn Job Descriptions into{' '}
              <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
                Personalized Interview Kits
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-dark-600 dark:text-dark-300 max-w-3xl mx-auto mb-10">
              Paste a job description, add the company URL, and tell us how many days you have.
              We'll research the company, analyze the role, and generate a complete preparation kit
              with questions, flashcards, and a day-by-day study schedule.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={isAuthenticated ? "/dashboard" : "/register"} className="btn-primary text-lg px-8 py-3 w-full sm:w-auto">
                {isAuthenticated ? "Open Dashboard" : "Start Free - No Credit Card Required"}
              </Link>
              <Link href="#features" className="btn-secondary text-lg px-8 py-3 w-full sm:w-auto">
                See How It Works
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center text-dark-900 dark:text-white mb-12">
            Everything You Need to Prepare
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-dark-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-dark-600 dark:text-dark-300">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="card p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold text-dark-900 dark:text-white mb-4">
              Ready to Ace Your Next Interview?
            </h2>
            <p className="text-dark-600 dark:text-dark-300 mb-8 max-w-2xl mx-auto">
              Join thousands of candidates who use Interview Prep Kit to walk into interviews
              confident and prepared. Start building your kit in minutes.
            </p>
            <Link href={isAuthenticated ? "/dashboard" : "/register"} className="btn-primary text-lg px-10 py-3 inline-block">
              {isAuthenticated ? "Go to Dashboard" : "Create Your First Kit"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-dark-200/50 dark:border-dark-700/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-dark-500 dark:text-dark-400 text-sm">
          <p>Built for the Trao Engineering Assessment</p>
        </div>
      </footer>
    </div>
  );
}