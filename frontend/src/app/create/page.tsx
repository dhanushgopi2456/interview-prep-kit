'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kitsApi, CreateKitInput } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { ArrowLeft, Briefcase, Loader2, FileText, Globe, Calendar } from 'lucide-react';

export default function CreateKitPage() {
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(7);
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (jobDescription.trim().length < 50) {
      toast.error('Job description is too short (minimum 50 characters)');
      return;
    }
    
    try {
      new URL(companyUrl);
    } catch {
      toast.error('Please enter a valid company URL');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const input: CreateKitInput = {
        jobDescription: jobDescription.trim(),
        companyUrl: companyUrl.trim(),
        days,
        role: role.trim() || undefined,
        location: location.trim() || undefined
      };
      
      const { data } = await kitsApi.create(input);
      toast.success('Kit created! Generating content...');
      router.push(`/kit/${data.kit._id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create kit');
    } finally {
      setIsLoading(false);
    }
  };

  const jdWordCount = jobDescription.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-dark-200/50 dark:border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="w-5 h-5 text-dark-500" />
              <span className="font-medium text-dark-700 dark:text-dark-300">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-dark-900 dark:text-white">Interview Prep Kit</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 animate-slide-up">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-dark-900 dark:text-white">Create New Kit</h1>
            <p className="text-dark-500 dark:text-dark-400 mt-2">
              Fill in the details below and we'll research the company and generate your prep kit
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="jobDescription" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Job Description
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="textarea"
                placeholder="Paste the full job description here...&#10;&#10;Example:&#10;Senior Backend Engineer&#10;&#10;We are looking for an experienced backend engineer...&#10;&#10;Requirements:&#10;- 5+ years experience with Node.js/Go&#10;- Experience with distributed systems&#10;- Strong database design skills&#10;&#10;Nice to have:&#10;- Kubernetes experience&#10;- GraphQL expertise"
                rows={12}
                required
              />
              <p className="mt-1 text-sm text-dark-500 dark:text-dark-400 text-right">
                {jdWordCount} words • Minimum 50 characters
              </p>
            </div>

            <div>
              <label htmlFor="companyUrl" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary-500" />
                Company Website URL
              </label>
              <input
                id="companyUrl"
                type="url"
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                className="input"
                placeholder="https://company.com"
                required
              />
              <p className="mt-1 text-sm text-dark-500 dark:text-dark-400">
                We'll crawl this site to understand the company and their hiring process
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="days" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-500" />
                  Days Until Interview
                </label>
                <input
                  id="days"
                  type="number"
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                  className="input"
                  min="1"
                  max="60"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Role Title (Optional)
                </label>
                <input
                  id="role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input"
                  placeholder="Senior Backend Engineer"
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                  Location (Optional)
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input"
                  placeholder="San Francisco, CA / Remote"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating kit...
                </span>
              ) : (
                'Create Kit & Start Research'
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
            <h3 className="font-medium text-dark-900 dark:text-white mb-3">What happens next?</h3>
            <ol className="space-y-2 text-sm text-dark-600 dark:text-dark-300">
              <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">1</span>We'll crawl the company website to understand what they do</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">2</span>We'll search for their hiring process and interview details</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">3</span>We'll extract requirements from the job description</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">4</span>We'll generate questions, flashcards, and a study schedule</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-bold">5</span>You'll get a complete, editable prep kit!</li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}