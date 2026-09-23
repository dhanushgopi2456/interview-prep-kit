'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle, Clock } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface GenerationProgressProps {
  steps: Step[];
  currentStep?: string;
}

export function GenerationProgress({ steps, currentStep }: GenerationProgressProps) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
        Generating Your Kit
      </h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              step.status === 'in_progress'
                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                : step.status === 'completed'
                ? 'bg-green-50 dark:bg-green-900/20'
                : step.status === 'error'
                ? 'bg-red-50 dark:bg-red-900/20'
                : 'bg-dark-50 dark:bg-dark-800/50'
            }`}
          >
            <div className="flex-shrink-0">
              {step.status === 'completed' ? (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : step.status === 'in_progress' ? (
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
              ) : step.status === 'error' ? (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 bg-dark-200 dark:bg-dark-700 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-dark-500">{index + 1}</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                step.status === 'completed'
                  ? 'text-green-700 dark:text-green-300'
                  : step.status === 'in_progress'
                  ? 'text-primary-700 dark:text-primary-300'
                  : step.status === 'error'
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-dark-500 dark:text-dark-400'
              }`}>
                {step.label}
              </p>
            </div>
            {step.status === 'in_progress' && (
              <Clock className="w-4 h-4 text-primary-500 animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}