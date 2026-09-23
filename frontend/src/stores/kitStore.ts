'use client';

import { create } from 'zustand';
import { Kit, Requirement, Question, Flashcard, ScheduleDay } from '@/lib/api';

interface ItemState<T> {
  data: T;
  status: 'generated' | 'edited' | 'pinned';
  originalData?: T;
}

interface KitState {
  currentKit: Kit | null;
  isGenerating: boolean;
  generationProgress: string;
  generationError: string | null;
  
  setKit: (kit: Kit | null) => void;
  setGenerating: (generating: boolean) => void;
  setProgress: (progress: string) => void;
  setError: (error: string | null) => void;
  
  updateRequirement: (id: string, requirement: Partial<Requirement>) => void;
  addRequirement: (requirement: Requirement) => void;
  deleteRequirement: (id: string) => void;
  reorderRequirements: (ids: string[]) => void;
  
  updateQuestion: (id: string, question: Partial<Question>) => void;
  addQuestion: (question: Question) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestions: (ids: string[]) => void;
  moveQuestion: (id: string, newCategory: Question['category']) => void;
  pinQuestion: (id: string) => void;
  unpinQuestion: (id: string) => void;
  regenerateQuestions: (category: Question['category']) => void;
  
  updateFlashcard: (id: string, flashcard: Partial<Flashcard>) => void;
  addFlashcard: (flashcard: Flashcard) => void;
  deleteFlashcard: (id: string) => void;
  reorderFlashcards: (ids: string[]) => void;
  
  updateScheduleDay: (day: number, scheduleDay: Partial<ScheduleDay>) => void;
  regenerateSchedule: () => void;
  
  updateCompanyBrief: (brief: Partial<Kit['companyBrief']>) => void;
  regenerateCompanyBrief: () => void;
  
  resetSection: (section: keyof Kit) => void;
}

function createItemState<T>(data: T): ItemState<T> {
  return { data, status: 'generated' };
}

export const useKitStore = create<KitState>((set, get) => ({
  currentKit: null,
  isGenerating: false,
  generationProgress: '',
  generationError: null,
  
  setKit: (kit) => set({ currentKit: kit, generationError: null }),
  
  setGenerating: (isGenerating) => set({ isGenerating }),
  
  setProgress: (generationProgress) => set({ generationProgress }),
  
  setError: (generationError) => set({ generationError, isGenerating: false }),
  
  updateRequirement: (id, updates) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        role: {
          ...state.currentKit.role,
          requirements: state.currentKit.role.requirements.map(req =>
            req.id === id ? { ...req, ...updates } : req
          )
        }
      }
    };
  }),
  
  addRequirement: (requirement) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        role: {
          ...state.currentKit.role,
          requirements: [...state.currentKit.role.requirements, requirement]
        }
      }
    };
  }),
  
  deleteRequirement: (id) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        role: {
          ...state.currentKit.role,
          requirements: state.currentKit.role.requirements.filter(r => r.id !== id)
        }
      }
    };
  }),
  
  reorderRequirements: (ids) => set((state) => {
    if (!state.currentKit) return state;
    const reqMap = new Map(state.currentKit.role.requirements.map(r => [r.id, r]));
    return {
      currentKit: {
        ...state.currentKit,
        role: {
          ...state.currentKit.role,
          requirements: ids.map(id => reqMap.get(id)!).filter(Boolean)
        }
      }
    };
  }),
  
  updateQuestion: (id, updates) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        questions: state.currentKit.questions.map(q =>
          q.id === id ? { ...q, ...updates, status: 'edited' as const } : q
        )
      }
    };
  }),
  
  addQuestion: (question) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        questions: [...state.currentKit.questions, { ...question, status: 'edited' as const }]
      }
    };
  }),
  
  deleteQuestion: (id) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        questions: state.currentKit.questions.filter(q => q.id !== id),
        schedule: {
          ...state.currentKit.schedule,
          days: state.currentKit.schedule.days.map(d => ({
            ...d,
            questionIds: d.questionIds.filter(qid => qid !== id)
          }))
        }
      }
    };
  }),
  
  reorderQuestions: (ids) => set((state) => {
    if (!state.currentKit) return state;
    const qMap = new Map(state.currentKit.questions.map(q => [q.id, q]));
    return {
      currentKit: {
        ...state.currentKit,
        questions: ids.map(id => qMap.get(id)!).filter(Boolean)
      }
    };
  }),
  
  moveQuestion: (id, newCategory) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        questions: state.currentKit.questions.map(q =>
          q.id === id ? { ...q, category: newCategory, status: 'edited' as const } : q
        )
      }
    };
  }),
  
  pinQuestion: (id) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        questions: state.currentKit.questions.map(q =>
          q.id === id ? { ...q, status: 'pinned' as const } : q
        )
      }
    };
  }),
  
  unpinQuestion: (id) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        questions: state.currentKit.questions.map(q =>
          q.id === id && q.status === 'pinned' ? { ...q, status: 'generated' as const } : q
        )
      }
    };
  }),
  
  regenerateQuestions: (category) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        questions: state.currentKit.questions.map(q =>
          q.category === category && q.status !== 'pinned'
            ? { ...q, status: 'generated' as const }
            : q
        )
      }
    };
  }),
  
  updateFlashcard: (id, updates) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        flashcards: state.currentKit.flashcards.map(f =>
          f.id === id ? { ...f, ...updates, status: 'edited' as const } : f
        )
      }
    };
  }),
  
  addFlashcard: (flashcard) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        flashcards: [...state.currentKit.flashcards, { ...flashcard, status: 'edited' as const }]
      }
    };
  }),
  
  deleteFlashcard: (id) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        flashcards: state.currentKit.flashcards.filter(f => f.id !== id)
      }
    };
  }),
  
  reorderFlashcards: (ids) => set((state) => {
    if (!state.currentKit) return state;
    const fMap = new Map(state.currentKit.flashcards.map(f => [f.id, f]));
    return {
      currentKit: {
        ...state.currentKit,
        flashcards: ids.map(id => fMap.get(id)!).filter(Boolean)
      }
    };
  }),
  
  updateScheduleDay: (day, updates) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        schedule: {
          ...state.currentKit.schedule,
          days: state.currentKit.schedule.days.map(d =>
            d.day === day ? { ...d, ...updates } : d
          )
        }
      }
    };
  }),
  
  regenerateSchedule: () => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        schedule: {
          ...state.currentKit.schedule,
          days: state.currentKit.schedule.days.map(d => ({ ...d, status: 'generated' as const }))
        }
      }
    };
  }),
  
  updateCompanyBrief: (brief) => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        companyBrief: { ...state.currentKit.companyBrief, ...brief, status: 'edited' as const }
      }
    };
  }),
  
  regenerateCompanyBrief: () => set((state) => {
    if (!state.currentKit) return state;
    return {
      currentKit: {
        ...state.currentKit,
        companyBrief: { ...state.currentKit.companyBrief, status: 'generated' as const }
      }
    };
  }),
  
  resetSection: (section) => set((state) => {
    if (!state.currentKit) return state;
    // This would need the original kit data to truly reset
    // For now, we mark the section as generated
    return state;
  })
}));